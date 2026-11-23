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

export interface TcgPricing {
  tcgplayer?: { unit: 'USD' } & Record<string, { marketPrice?: number | null } | string | undefined>;
  cardmarket?: { unit: 'EUR'; trend?: number | null; avg?: number | null };
}

export interface CardPrice {
  amount: number;
  currency: 'USD' | 'EUR';
}

export interface TcgCardDetail extends TcgCardSummary {
  /** "Pokémon" | "Entrenador" | "Energía" */
  category?: string;
  pricing?: TcgPricing;
  hp?: number;
  /** `damage` viene como número (30) o texto con modificador ("30+", "20×"). */
  attacks?: { name: string; damage?: number | string }[];
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

  let results = await fetchCardList(params);
  // TCGdex distingue acentos ("Energia" → 0, "Energía" → 387) y un niño no
  // los escribe: si no hubo nada, probamos con una tilde en cada vocal.
  if (results.length === 0 && trimmedName) {
    const lists = await Promise.all(
      accentVariants(trimmedName).map((variant) => {
        const variantParams = new URLSearchParams(params);
        variantParams.set('name', variant);
        return fetchCardList(variantParams).catch(() => [] as TcgCardSummary[]);
      }),
    );
    const seen = new Set<string>();
    results = lists.flat().filter((card) => {
      if (seen.has(card.id)) return false;
      seen.add(card.id);
      return true;
    });
  }
  return results.slice(0, limit);
}

async function fetchCardList(params: URLSearchParams): Promise<TcgCardSummary[]> {
  const response = await fetch(`${BASE_URL}/cards?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`TCGdex respondió ${response.status} al buscar cartas`);
  }
  return (await response.json()) as TcgCardSummary[];
}

const ACCENTED: Record<string, string> = { a: 'á', e: 'é', i: 'í', o: 'ó', u: 'ú' };

/** "energia" → ["énergia", "enérgia", "energía", "energiá"] — una tilde por variante. Vacío si ya trae tildes. */
export function accentVariants(text: string): string[] {
  if (/[áéíóú]/i.test(text)) return [];
  const variants: string[] = [];
  for (let i = 0; i < text.length && variants.length < 8; i++) {
    const accented = ACCENTED[text[i].toLowerCase()];
    if (accented) variants.push(text.slice(0, i) + accented + text.slice(i + 1));
  }
  return variants;
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

/**
 * Precio de referencia de una carta: precio de mercado de TCGplayer (USD),
 * prefiriendo el acabado normal; si TCGplayer no la tiene, la tendencia de
 * Cardmarket (EUR). Null si ninguna fuente tiene precio.
 */
export function pickPrice(pricing: TcgPricing | undefined): CardPrice | null {
  const tcg = pricing?.tcgplayer;
  if (tcg) {
    for (const key of ['normal', 'holofoil', 'reverse-holofoil', ...Object.keys(tcg)]) {
      const entry = tcg[key];
      if (typeof entry === 'object' && entry?.marketPrice) return { amount: entry.marketPrice, currency: 'USD' };
    }
  }
  const eur = pricing?.cardmarket?.trend || pricing?.cardmarket?.avg;
  return eur ? { amount: eur, currency: 'EUR' } : null;
}

/**
 * Ids de TCGdex candidatos para una carta guardada. Las cartas nuevas traen
 * `tcgdexId`; las viejas solo tienen nombre de expansión + número, así que
 * se cruza con la lista de sets. TCGdex rellena con ceros en sets nuevos
 * ("sv01-005") y no en otros ("cel25-5"), por eso van las dos formas.
 */
export function tcgdexIdCandidates(
  card: { tcgdexId?: string | null; setName: string; cardNumber: string },
  sets: TcgSet[],
): string[] {
  if (card.tcgdexId) return [card.tcgdexId];
  const wanted = card.setName.trim().toLowerCase();
  const set = sets.find((s) => s.name.trim().toLowerCase() === wanted);
  const number = card.cardNumber.trim();
  if (!set || !number) return [];
  const padded = /^\d+$/.test(number) ? number.padStart(3, '0') : number;
  return Array.from(new Set([`${set.id}-${number}`, `${set.id}-${padded}`]));
}

/**
 * Detalle de TCGdex (precio, HP, ataques, rareza) de una carta guardada —
 * null si no la encontramos. Un solo request alimenta precio, brillo y juegos.
 */
export async function fetchOwnedCardDetail(card: {
  tcgdexId?: string | null;
  setName: string;
  cardNumber: string;
}): Promise<TcgCardDetail | null> {
  for (const id of tcgdexIdCandidates(card, await fetchSetsList())) {
    const response = await fetch(`${BASE_URL}/cards/${id}`);
    if (response.status === 404) continue;
    if (!response.ok) throw new Error(`TCGdex respondió ${response.status} al pedir la carta ${id}`);
    return (await response.json()) as TcgCardDetail;
  }
  return null;
}

/** Daño del ataque más fuerte ("30+" → 30, "20×" → 20); 0 si no tiene ataques con daño. */
export function strongestAttack(attacks: { name: string; damage?: number | string }[] | undefined) {
  let best: { name: string; damage: number } | null = null;
  for (const attack of attacks ?? []) {
    const damage = typeof attack.damage === 'number' ? attack.damage : parseInt(attack.damage ?? '', 10) || 0;
    if (!best || damage > best.damage) best = { name: attack.name, damage };
  }
  return best;
}

/** "$1.25 USD" / "€0.80" */
export function formatPrice(price: CardPrice): string {
  return price.currency === 'USD' ? `$${price.amount.toFixed(2)} USD` : `€${price.amount.toFixed(2)}`;
}
