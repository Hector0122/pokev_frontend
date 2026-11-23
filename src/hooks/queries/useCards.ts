import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createCard, deleteCard, fetchCard, fetchCardStats, fetchCards, setCardFavorite, updateCard } from '../../api/cards';
import type { Card, CreateCardInput, TrainerRole, UpdateCardInput } from '../../api/types';
import { fetchOwnedCardDetail, pickPrice, type TcgCardDetail } from '../../services/tcgdex';
import { queryKeys } from './queryKeys';

/** "Mi colección" (§5) — exclusivamente cartas que realmente poseen. */
export function useCards() {
  return useQuery({ queryKey: queryKeys.cards, queryFn: fetchCards });
}

export function useCard(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.card(id ?? ''),
    queryFn: () => fetchCard(id as string),
    enabled: !!id,
  });
}

const PRICE_STALE_MS = 12 * 60 * 60 * 1000; // TCGdex actualiza precios ~1 vez al día

type TcgLookup = Pick<Card, 'tcgdexId' | 'setName' | 'cardNumber'>;
const NO_CARD: TcgLookup = { tcgdexId: null, setName: '', cardNumber: '' };

/** Detalle TCGdex de una carta guardada (precio, HP, ataques, rareza) — un request por carta, compartido por toda la app. */
export function cardTcgQuery(card: TcgLookup) {
  return {
    queryKey: queryKeys.cardTcg(card.tcgdexId ?? `${card.setName}#${card.cardNumber}`),
    queryFn: () => fetchOwnedCardDetail(card),
    staleTime: PRICE_STALE_MS,
  };
}

/** Precio en vivo — mismo request que `cardTcgQuery`, solo extrae el precio. */
export function cardPriceQuery(card: TcgLookup) {
  return {
    ...cardTcgQuery(card),
    select: (detail: TcgCardDetail | null) => (detail ? pickPrice(detail.pricing) : null),
  };
}

export function useCardTcg(card: Card | undefined) {
  return useQuery({ ...cardTcgQuery(card ?? NO_CARD), enabled: !!card });
}

export function useCardPrice(card: Card | undefined) {
  return useQuery({ ...cardPriceQuery(card ?? NO_CARD), enabled: !!card });
}

/** Contadores + próximo logro de la home (§4). */
export function useCardStats() {
  return useQuery({ queryKey: queryKeys.cardStats, queryFn: fetchCardStats });
}

function invalidateAfterCollectionChange(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: queryKeys.cards });
  queryClient.invalidateQueries({ queryKey: queryKeys.cardStats });
  queryClient.invalidateQueries({ queryKey: queryKeys.discoveredPokemon });
}

export function useCreateCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCardInput) => createCard(input),
    onSuccess: () => invalidateAfterCollectionChange(queryClient),
  });
}

export function useUpdateCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateCardInput }) => updateCard(id, input),
    onSuccess: (_card, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.card(variables.id) });
      invalidateAfterCollectionChange(queryClient);
    },
  });
}

export function useDeleteCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCard(id),
    onSuccess: () => invalidateAfterCollectionChange(queryClient),
  });
}

export function useSetCardFavorite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role, isFavorite }: { id: string; role: TrainerRole; isFavorite: boolean }) =>
      setCardFavorite(id, role, isFavorite),
    onSuccess: (_card, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.card(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.cards });
      queryClient.invalidateQueries({ queryKey: queryKeys.cardStats });
    },
  });
}
