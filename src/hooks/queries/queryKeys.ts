/** Claves de TanStack Query — una sola fuente de verdad para invalidar en el lugar correcto. */
export const queryKeys = {
  trainers: ['trainers'] as const,
  trainer: (role: string) => ['trainers', role] as const,
  cards: ['cards'] as const,
  card: (id: string) => ['cards', id] as const,
  cardStats: ['cards', 'stats'] as const,
  discoveredPokemon: ['pokemon'] as const,
  pokemon: (id: number) => ['pokemon', id] as const,
  achievements: ['achievements'] as const,
};
