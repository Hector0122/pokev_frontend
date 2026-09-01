/**
 * Integración con PokeAPI (pokeapi.co, sin API key) — nombre/tipo/descripción
 * + artwork oficial por Pokémon, y búsqueda por nombre para el picker de
 * "Agregar carta" (§6). Ver openspec/changes/add-v01-first-album/specs/pokemon-sprites.
 *
 * Esta integración corre 100% en el cliente y es independiente del pivote a
 * `pokev_backend` (ver design.md "Pivot"): lo que se obtiene acá se envía a
 * `pokev_backend` para persistirlo (src/api/pokemon.ts), en vez de guardarse
 * en una tabla local.
 *
 * Nota de implementación (desviación documentada de design.md): el artwork
 * se referencia por URL estable (mismo patrón que devuelve la propia
 * PokeAPI: raw.githubusercontent.com/.../official-artwork/{id}.png) y se
 * muestra con <Image>, apoyándose en el cache HTTP nativo de la plataforma
 * para reuso sin pegarle a la red en cada render — no se agregó una
 * librería de filesystem (react-native-fs / blob-util) para bajar y
 * guardar el archivo en disco porque no estaba entre las dependencias ya
 * instaladas ni en el "Impact" del proposal.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translateTypeToSpanish } from './pokemonTypes';

const BASE_URL = 'https://pokeapi.co/api/v2';
const SPECIES_LIST_CACHE_KEY = 'pokeapi_species_list_v1';

export interface PokemonSpeciesListItem {
  id: number;
  name: string;
}

export interface PokemonEvolutionStep {
  id: number;
  name: string;
  spriteUrl: string | null;
}

export interface PokemonDetails {
  id: number;
  name: string;
  primaryType: string;
  secondaryType: string | null;
  region: string | null;
  heightCm: number | null;
  weightHg: number | null;
  spriteUrl: string;
  description: string | null;
  evolvesFromId: number | null;
  evolutionChain: PokemonEvolutionStep[];
}

export function officialArtworkUrl(pokemonId: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemonId}.png`;
}

/** Quita acentos y normaliza mayúsculas para que "pika" o "pikachú" encuentren "Pikachu". */
export function normalizeForSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

function extractIdFromUrl(url: string): number {
  const match = url.match(/\/(\d+)\/?$/);
  return match ? Number(match[1]) : NaN;
}

/**
 * Lista completa de especies (~1300, solo id+nombre) — se pide una vez y se
 * persiste en AsyncStorage para que la búsqueda funcione offline después
 * del primer uso online (pokemon-sprites spec, "Looking up a Pokémon
 * already cached").
 */
export async function fetchSpeciesList(): Promise<PokemonSpeciesListItem[]> {
  try {
    const cached = await AsyncStorage.getItem(SPECIES_LIST_CACHE_KEY);
    if (cached) {
      return JSON.parse(cached) as PokemonSpeciesListItem[];
    }
  } catch {
    // Cache corrupta o inaccesible: seguimos a la red.
  }

  const response = await fetch(`${BASE_URL}/pokemon-species?limit=2000`);
  if (!response.ok) {
    throw new Error(`PokeAPI respondió ${response.status} al listar especies`);
  }
  const body = (await response.json()) as { results: Array<{ name: string; url: string }> };
  const list = body.results.map((entry) => ({ id: extractIdFromUrl(entry.url), name: entry.name }));

  try {
    await AsyncStorage.setItem(SPECIES_LIST_CACHE_KEY, JSON.stringify(list));
  } catch {
    // Persistir es best-effort; la búsqueda igual funciona en memoria esta sesión.
  }

  return list;
}

/** Búsqueda por nombre, insensible a mayúsculas/acentos (pokemon-sprites spec). */
export async function searchPokemonSpecies(
  query: string,
  limit = 30,
): Promise<PokemonSpeciesListItem[]> {
  const normalizedQuery = normalizeForSearch(query);
  if (!normalizedQuery) return [];

  const all = await fetchSpeciesList();
  const matches = all.filter((item) => normalizeForSearch(item.name).includes(normalizedQuery));

  matches.sort((a, b) => {
    const aStarts = normalizeForSearch(a.name).startsWith(normalizedQuery);
    const bStarts = normalizeForSearch(b.name).startsWith(normalizedQuery);
    if (aStarts !== bStarts) return aStarts ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return matches.slice(0, limit);
}

interface EvolutionChainNode {
  species: { name: string; url: string };
  evolves_to: EvolutionChainNode[];
}

function flattenEvolutionChain(node: EvolutionChainNode): PokemonEvolutionStep[] {
  const id = extractIdFromUrl(node.species.url);
  const step: PokemonEvolutionStep = { id, name: node.species.name, spriteUrl: officialArtworkUrl(id) };
  return [step, ...node.evolves_to.flatMap(flattenEvolutionChain)];
}

const GENERATION_TO_REGION: Record<string, string> = {
  'generation-i': 'Kanto',
  'generation-ii': 'Johto',
  'generation-iii': 'Hoenn',
  'generation-iv': 'Sinnoh',
  'generation-v': 'Teselia',
  'generation-vi': 'Kalos',
  'generation-vii': 'Alola',
  'generation-viii': 'Galar',
  'generation-ix': 'Paldea',
};

function cleanFlavorText(text: string): string {
  return text.replace(/[\n\f\r]+/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Datos completos (especie + básicos + evoluciones) por id o nombre — task 2.1. */
export async function fetchPokemonDetails(idOrName: number | string): Promise<PokemonDetails> {
  const [basicRes, speciesRes] = await Promise.all([
    fetch(`${BASE_URL}/pokemon/${idOrName}`),
    fetch(`${BASE_URL}/pokemon-species/${idOrName}`),
  ]);
  if (!basicRes.ok || !speciesRes.ok) {
    throw new Error(`PokeAPI no encontró a "${idOrName}"`);
  }

  const basic = (await basicRes.json()) as {
    id: number;
    name: string;
    height: number;
    weight: number;
    types: Array<{ slot: number; type: { name: string } }>;
  };
  const species = (await speciesRes.json()) as {
    flavor_text_entries: Array<{ flavor_text: string; language: { name: string } }>;
    generation: { name: string };
    evolution_chain: { url: string } | null;
    evolves_from_species: { url: string } | null;
  };

  const sortedTypes = [...basic.types].sort((a, b) => a.slot - b.slot);
  const primaryType = sortedTypes[0] ? translateTypeToSpanish(sortedTypes[0].type.name) : 'desconocido';
  const secondaryType = sortedTypes[1] ? translateTypeToSpanish(sortedTypes[1].type.name) : null;

  const flavorEntry =
    species.flavor_text_entries.find((entry) => entry.language.name === 'es') ??
    species.flavor_text_entries.find((entry) => entry.language.name === 'en');

  let evolutionChain: PokemonEvolutionStep[] = [];
  if (species.evolution_chain) {
    try {
      const chainRes = await fetch(species.evolution_chain.url);
      if (chainRes.ok) {
        const chainBody = (await chainRes.json()) as { chain: EvolutionChainNode };
        evolutionChain = flattenEvolutionChain(chainBody.chain);
      }
    } catch {
      evolutionChain = [];
    }
  }

  return {
    id: basic.id,
    name: basic.name,
    primaryType,
    secondaryType,
    region: GENERATION_TO_REGION[species.generation.name] ?? null,
    heightCm: basic.height * 10,
    weightHg: basic.weight,
    spriteUrl: officialArtworkUrl(basic.id),
    description: flavorEntry ? cleanFlavorText(flavorEntry.flavor_text) : null,
    evolvesFromId: species.evolves_from_species ? extractIdFromUrl(species.evolves_from_species.url) : null,
    evolutionChain,
  };
}
