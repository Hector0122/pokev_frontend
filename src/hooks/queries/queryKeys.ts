/** Claves de TanStack Query — una sola fuente de verdad para invalidar en el lugar correcto. */
export const queryKeys = {
  trainers: ['trainers'] as const,
  trainer: (role: string) => ['trainers', role] as const,
  cards: ['cards'] as const,
  card: (id: string) => ['cards', id] as const,
  cardStats: ['cards', 'stats'] as const,
  /** Fuera de ['cards'] a propósito: invalidar la colección no debe volver a pedir precios a TCGdex. */
  cardPrice: (lookup: string) => ['cardPrice', lookup] as const,
  discoveredPokemon: ['pokemon'] as const,
  pokemon: (id: number) => ['pokemon', id] as const,
  achievements: ['achievements'] as const,
};
