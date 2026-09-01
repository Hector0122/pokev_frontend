/**
 * Traducción y color por tipo de Pokémon — PokeAPI devuelve los tipos en
 * inglés (`electric`, `fire`...); el spec siempre los muestra en español
 * ("Tipo: Eléctrico", §9) y pide "colores asociados a tipos Pokémon" (§17)
 * para que un niño que todavía no lee reconozca el tipo por color.
 */
export interface TypeInfo {
  es: string;
  color: string;
  icon: string;
}

export const POKEMON_TYPES: Record<string, TypeInfo> = {
  normal: { es: 'Normal', color: '#A8A77A', icon: '⚪' },
  fire: { es: 'Fuego', color: '#EE8130', icon: '🔥' },
  water: { es: 'Agua', color: '#6390F0', icon: '💧' },
  electric: { es: 'Eléctrico', color: '#F7D02C', icon: '⚡' },
  grass: { es: 'Planta', color: '#7AC74C', icon: '🌿' },
  ice: { es: 'Hielo', color: '#96D9D6', icon: '❄️' },
  fighting: { es: 'Lucha', color: '#C22E28', icon: '🥊' },
  poison: { es: 'Veneno', color: '#A33EA1', icon: '☠️' },
  ground: { es: 'Tierra', color: '#E2BF65', icon: '🌍' },
  flying: { es: 'Volador', color: '#A98FF3', icon: '🕊️' },
  psychic: { es: 'Psíquico', color: '#F95587', icon: '🔮' },
  bug: { es: 'Bicho', color: '#A6B91A', icon: '🐛' },
  rock: { es: 'Roca', color: '#B6A136', icon: '🪨' },
  ghost: { es: 'Fantasma', color: '#735797', icon: '👻' },
  dragon: { es: 'Dragón', color: '#6F35FC', icon: '🐉' },
  dark: { es: 'Siniestro', color: '#705746', icon: '🌑' },
  steel: { es: 'Acero', color: '#B7B7CE', icon: '⚙️' },
  fairy: { es: 'Hada', color: '#D685AD', icon: '✨' },
  desconocido: { es: 'Desconocido', color: '#9AA3AD', icon: '❔' },
};

export function typeInfo(englishOrSpanishType: string): TypeInfo {
  const key = englishOrSpanishType.trim().toLowerCase();
  if (POKEMON_TYPES[key]) return POKEMON_TYPES[key];
  const bySpanish = Object.values(POKEMON_TYPES).find((t) => t.es.toLowerCase() === key);
  return bySpanish ?? POKEMON_TYPES.desconocido;
}

export function translateTypeToSpanish(englishType: string): string {
  return typeInfo(englishType).es;
}
