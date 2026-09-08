/**
 * Integración con TCGdex (tcgdex.dev) — catálogo de cartas TCG en español,
 * sin API key. Ver Buscador (§7): "la aplicación debe mostrar todas las
 * cartas de [un Pokémon] disponibles en la base de datos, independientemente
 * de si forman parte de la colección" — a diferencia de pokeapi.ts (datos de
 * la especie), esto es catálogo de *cartas* con imagen, expansión y rareza.
 *
 * Se probó en vivo antes de elegirla: pokemontcg.io (la alternativa más
 * conocida) fue absorbida por Scrydex y su endpoint quedó caído; TCGdex
 * sigue gratis, sin key, y devuelve todo ya en español.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'https://api.tcgdex.net/v2/es';
const SETS_CACHE_KEY = 'tcgdex_sets_list_v1';

export interface TcgCardSummary {
  id: string; // p.ej. "cel25-5"
  localId: string; // número de carta dentro del set, p.ej. "5"
  name: string;
  /** URL base sin extensión/calidad — armar con `cardImageUrl`. */
  image?: string;
}

export interface TcgSet {
  id: string;
  name: string;
  logo?: string;
  symbol?: string;
}

export interface TcgCardDetail extends TcgCardSummary {
  rarity?: string;
  illustrator?: string;
  set: TcgSet;
  /** Acabados de impresión existentes de esta carta puntual (no cartas distintas). */
  variants?: {
    normal: boolean;
    reverse: boolean;
    holo: boolean;
    firstEdition: boolean;
    wPromo: boolean;
  };
}

/** Arma la URL final de una imagen de carta/set — la API la da sin extensión ni calidad. */
export function cardImageUrl(base: string, quality: 'low' | 'high' = 'low', ext: 'png' | 'webp' | 'jpg' = 'webp'): string {
  return `${base}/${quality}.${ext}`;
}

export interface SearchCardsParams {
  /** Nombre a buscar — la propia API hace el filtro (case-insensitive, parcial). */
  name?: string;
  /** Id de expansión a la que restringir la búsqueda (p.ej. "swsh1"). */
  setId?: string;
}

/**
 * Cartas que matchean `name` y/o pertenecen a `setId`. Al menos uno de los
 * dos debe venir — sin ninguno se devuelve `[]` en vez de traer el catálogo
 * completo. El filtro de set usa el prefijo `eq:` porque TCGdex matchea por
 * defecto substring ("swsh1" también matchea "swsh11", "swsh12", etc.).
 *
 * `limit` default cubre la expansión más grande del catálogo (Secret Rares
 * incluidas, ~300 cartas) — antes estaba en 60 y cortaba sets grandes
 * (p.ej. Heroes Ascendentes, 295 cartas) sin avisar.
 */
export async function searchCards({ name, setId }: SearchCardsParams, limit = 500): Promise<TcgCardSummary[]> {
  const trimmedName = name?.trim();
  if (!trimmedName && !setId) return [];

  const params = new URLSearchParams();
  if (trimmedName) params.set('name', trimmedName);
  if (setId) params.set('set.id', `eq:${setId}`);

  const response = await fetch(`${BASE_URL}/cards?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`TCGdex respondió ${response.status} al buscar cartas`);
  }
  const results = (await response.json()) as TcgCardSummary[];
  return results.slice(0, limit);
}

/**
 * Lista completa de sets/expansiones (~150, liviana) — se pide una vez y se
 * cachea, así resolver el set de cada carta de un resultado de búsqueda no
 * implica pedir el detalle completo carta por carta (mismo patrón que
 * `fetchSpeciesList` en pokeapi.ts).
 */
export async function fetchSetsList(): Promise<TcgSet[]> {
  try {
    const cached = await AsyncStorage.getItem(SETS_CACHE_KEY);
    if (cached) return JSON.parse(cached) as TcgSet[];
  } catch {
    // Cache corrupta o inaccesible: seguimos a la red.
  }

  const response = await fetch(`${BASE_URL}/sets`);
  if (!response.ok) {
    throw new Error(`TCGdex respondió ${response.status} al listar sets`);
  }
  const list = (await response.json()) as TcgSet[];

  try {
    await AsyncStorage.setItem(SETS_CACHE_KEY, JSON.stringify(list));
  } catch {
    // Persistir es best-effort.
  }

  return list;
}

export async function getSetsMap(): Promise<Map<string, TcgSet>> {
  const list = await fetchSetsList();
  return new Map(list.map((set) => [set.id, set]));
}

/** Deriva el id de set a partir del id de carta ("cel25-5" → "cel25"). Verificado contra /sets. */
export function setIdFromCardId(cardId: string): string {
  const idx = cardId.lastIndexOf('-');
  return idx === -1 ? cardId : cardId.slice(0, idx);
}

/** Detalle completo de una carta (rareza, ilustrador, set) — se pide solo al abrir el detalle, no en la lista de resultados. */
export async function fetchCardDetail(id: string): Promise<TcgCardDetail> {
  const response = await fetch(`${BASE_URL}/cards/${id}`);
  if (!response.ok) {
    throw new Error(`TCGdex respondió ${response.status} al pedir la carta ${id}`);
  }
  return (await response.json()) as TcgCardDetail;
}
