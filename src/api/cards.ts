import { api } from './client';
import type { Card, CardStats, CreateCardInput, TrainerRole, UpdateCardInput } from './types';

/** "Mi colección" (§5) — exclusivamente cartas que realmente poseen. */
export function fetchCards(): Promise<Card[]> {
  return api.get<Card[]>('/cards');
}

export function fetchCard(id: string): Promise<Card> {
  return api.get<Card>(`/cards/${id}`);
}

/** Contadores + próximo logro de la home (§4) — siempre reales, nunca un porcentaje. */
export function fetchCardStats(): Promise<CardStats> {
  return api.get<CardStats>('/cards/stats');
}

export function createCard(input: CreateCardInput): Promise<Card> {
  return api.post<Card>('/cards', input);
}

export function updateCard(id: string, input: UpdateCardInput): Promise<Card> {
  return api.patch<Card>(`/cards/${id}`, input);
}

export function deleteCard(id: string): Promise<void> {
  return api.delete<void>(`/cards/${id}`);
}

export function setCardFavorite(id: string, role: TrainerRole, isFavorite: boolean): Promise<Card> {
  return isFavorite
    ? api.put<Card>(`/cards/${id}/favorite/${role}`)
    : api.delete<Card>(`/cards/${id}/favorite/${role}`);
}
