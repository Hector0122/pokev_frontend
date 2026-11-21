import type { Card } from '../api/types';

/** Título visible de una carta: la especie si es de Pokémon, si no el nombre impreso (Entrenador/Energía). */
export function cardTitle(card: Pick<Card, 'pokemon' | 'name'>): string {
  return card.pokemon?.name ?? card.name ?? 'Carta';
}

export function cardArtwork(card: Pick<Card, 'imageUrl' | 'pokemon'>): string | null {
  return card.imageUrl ?? card.pokemon?.spriteUrl ?? null;
}

/** Emoji para cartas sin Pokémon (no tienen tipo del que sacar color/icono). */
export function categoryIcon(category: string | null | undefined): string {
  return category === 'Energía' ? '⚡' : '🎒';
}
