import type { Card } from '../api/types';
import { normalizeForSearch } from './pokeapi';

/** Título visible de una carta: la especie si es de Pokémon, si no el nombre impreso (Entrenador/Energía). */
export function cardTitle(card: Pick<Card, 'pokemon' | 'name'>): string {
  return card.pokemon?.name ?? card.name ?? 'Carta';
}

export function cardArtwork(card: Pick<Card, 'imageUrl' | 'pokemon'>): string | null {
  return card.imageUrl ?? card.pokemon?.spriteUrl ?? null;
}

/**
 * "¿Ya la tenemos?" para una carta del catálogo TCGdex: por `tcgdexId` si la
 * guardamos con él, si no por nombre + número (las cartas viejas tienen la
 * expansión como texto libre, no como id).
 */
export function ownedMatcher(
  cards: Pick<Card, 'pokemon' | 'name' | 'cardNumber' | 'tcgdexId'>[],
): (tcgCard: { id: string; name: string; localId: string }) => boolean {
  const keys = new Set<string>();
  for (const card of cards) {
    keys.add(`${normalizeForSearch(cardTitle(card))}__${card.cardNumber.trim()}`);
    if (card.tcgdexId) keys.add(card.tcgdexId);
  }
  return (tcgCard) =>
    keys.has(tcgCard.id) || keys.has(`${normalizeForSearch(tcgCard.name)}__${tcgCard.localId.trim()}`);
}

/** Emoji para cartas sin Pokémon (no tienen tipo del que sacar color/icono). */
export function categoryIcon(category: string | null | undefined): string {
  return category === 'Energía' ? '⚡' : '🎒';
}
