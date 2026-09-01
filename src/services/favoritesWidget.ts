/**
 * Widget de Android con una carta favorita en la pantalla de inicio.
 *
 * Fuente de datos: caché en AsyncStorage que la app va escribiendo cada vez
 * que carga la colección (decisión: mostrar la última foto que la app vio,
 * no pegarle a Railway desde el proceso del widget — ver conversación y
 * `android/app/src/main/res/xml/favorite_card_widget_info.xml`,
 * `updatePeriodMillis="0"`). El widget "rota": cada vez que la app empuja
 * una actualización (abrir la app, marcar/desmarcar una favorita) se elige
 * una carta al azar entre las favoritas de ese momento.
 *
 * `registerWidgetTaskHandler` (index.js) corre en un contexto headless —
 * sin QueryClient ni pantallas montadas — por eso lee directo de acá, no de
 * TanStack Query.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import {
  FlexWidget,
  ImageWidget,
  requestWidgetUpdate,
  type WidgetInfo,
  type WidgetTaskHandlerProps,
} from 'react-native-android-widget';
import type { Card } from '../api/types';

export const WIDGET_NAME = 'FavoriteCard';
const CACHE_KEY = 'favorite_cards_widget_cache_v1';

export interface FavoriteCardSummary {
  pokemonName: string;
  imageUrl: string | null;
}

function toSummary(card: Card): FavoriteCardSummary {
  return {
    pokemonName: card.pokemon.name,
    imageUrl: card.imageUrl ?? card.pokemon.spriteUrl,
  };
}

function pickRandom<T>(items: T[]): T | null {
  if (items.length === 0) return null;
  return items[Math.floor(Math.random() * items.length)];
}

/** Ratio real de una carta TCG (63×88mm, 2.5×3.5in) — width/height. */
const CARD_RATIO = 2.5 / 3.5;

/** Más grande que entra en `maxWidth`×`maxHeight` sin deformar el ratio pedido. */
function fitWithRatio(maxWidth: number, maxHeight: number, ratio: number): { width: number; height: number } {
  let width = maxWidth;
  let height = width / ratio;
  if (height > maxHeight) {
    height = maxHeight;
    width = height * ratio;
  }
  return { width: Math.round(width), height: Math.round(height) };
}

/**
 * JSX del widget — mismo render tanto si lo dispara la app abierta como el
 * handler headless. Solo la carta, sin texto (pedido explícito: "no me
 * interesa que traiga el nombre, con que se mire la carta con eso"). El
 * widget en sí puede quedar casi cuadrado (lo elige el usuario al agregarlo/
 * cambiarle el tamaño), pero la carta SIEMPRE mantiene su proporción real
 * (2.5×3.5) adentro — antes se estiraba a `width`×`height` del widget y
 * quedaba con forma rara ("cover" recortando una carta rectangular contra un
 * marco casi cuadrado).
 */
function FavoriteCardWidget({ card, width, height }: { card: FavoriteCardSummary | null; width: number; height: number }) {
  const image = card?.imageUrl ?? require('../../assets/icons/pokebola.png');
  const size = card ? fitWithRatio(width, height, CARD_RATIO) : fitWithRatio(width * 0.5, height * 0.5, 1);
  return React.createElement(
    FlexWidget,
    {
      clickAction: 'OPEN_APP',
      style: {
        height: 'match_parent',
        width: 'match_parent',
        // Transparente a propósito: la carta no llena el widget entero (se
        // respeta su proporción real, ver fitWithRatio) — con fondo blanco
        // eso dejaba un marco blanco feo a los costados; transparente deja
        // ver el fondo de pantalla ahí en vez de una caja blanca.
        backgroundColor: '#00000000',
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
      },
    },
    React.createElement(ImageWidget, {
      image,
      imageWidth: size.width,
      imageHeight: size.height,
      resizeMode: 'contain',
      radius: 0,
    }),
  );
}

async function loadCache(): Promise<FavoriteCardSummary[]> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as FavoriteCardSummary[]) : [];
  } catch {
    return [];
  }
}

/** Se llama cada vez que la app tiene datos frescos de la colección (ver hooks/useSyncFavoritesWidget.ts). */
export async function syncFavoritesWidget(cards: Card[]): Promise<void> {
  const favorites = cards.filter((c) => c.favoritedBy.length > 0).map(toSummary);

  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(favorites));
  } catch {
    // Persistir es best-effort — si falla, el widget se queda con lo último que sí guardó.
  }

  await requestWidgetUpdate({
    widgetName: WIDGET_NAME,
    renderWidget: (info: WidgetInfo) =>
      React.createElement(FavoriteCardWidget, { card: pickRandom(favorites), width: info.width, height: info.height }),
  });
}

/** Handler headless (index.js) — corre incluso con la app cerrada (widget agregado, reiniciado el teléfono, etc). */
export async function favoriteCardWidgetTaskHandler(props: WidgetTaskHandlerProps): Promise<void> {
  if (props.widgetInfo.widgetName !== WIDGET_NAME) return;

  const favorites = await loadCache();
  props.renderWidget(
    React.createElement(FavoriteCardWidget, {
      card: pickRandom(favorites),
      width: props.widgetInfo.width,
      height: props.widgetInfo.height,
    }),
  );
}
