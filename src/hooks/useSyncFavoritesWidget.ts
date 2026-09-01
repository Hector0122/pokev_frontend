import { useEffect } from 'react';
import { useCards } from './queries/useCards';
import { syncFavoritesWidget } from '../services/favoritesWidget';

/**
 * Empuja la colección actual al widget de cartas favoritas (Android) cada
 * vez que cambia — abrir la app, marcar/desmarcar favorita, agregar carta.
 * Ver services/favoritesWidget.ts.
 */
export function useSyncFavoritesWidget() {
  const cardsQuery = useCards();

  useEffect(() => {
    if (!cardsQuery.data) return;
    syncFavoritesWidget(cardsQuery.data).catch(() => {
      // Best-effort — sin widget agregado a la pantalla de inicio esto no hace nada, y no debe romper la app.
    });
  }, [cardsQuery.data]);
}
