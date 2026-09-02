/**
 * Widget de Android con una carta favorita en la pantalla de inicio.
 *
 * Fuente de datos: caché en AsyncStorage que la app va escribiendo cada vez
 * que carga la colección (decisión: mostrar la última foto que la app vio,
 * no pegarle a Railway desde el proceso del widget). El widget se comporta
 * como una carta física que se puede voltear — dos caras, `front`/`back` —
 * ya que un flip animado de verdad no es posible acá (RemoteViews, lo que
 * hay debajo de `react-native-android-widget`, no soporta animaciones en
 * absoluto — límite del sistema de widgets de Android, no de esta librería
 * ni de tiempo de desarrollo).
 *
 * La secuencia (pedida explícitamente): frente de una favorita → toco la
 * carta → se ve el reverso (mismo dibujo para todas, `card_reverse.png`) →
 * toco de nuevo → se ve el frente de OTRA favorita (nunca la misma que
 * antes, si hay más de una) → así. Si no la tocan en más de una hora,
 * Android dispara el mismo paso solo (`updatePeriodMillis`, ver
 * favorite_card_widget_info.xml) — "que cada cierto tiempo se gire sola".
 * Ninguno de los dos casos pega a Railway desde el proceso del widget.
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
  OverlapWidget,
  requestWidgetUpdate,
  type ImageWidgetSource,
  type WidgetInfo,
  type WidgetTaskHandlerProps,
} from 'react-native-android-widget';
import type { Card } from '../api/types';

export const WIDGET_NAME = 'FavoriteCard';
const CACHE_KEY = 'favorite_cards_widget_cache_v1';
const STATE_KEY = 'favorite_cards_widget_state_v1';
const IMAGE_CACHE_PREFIX = 'favorite_widget_image_cache_v1:';

export interface FavoriteCardSummary {
  id: string;
  pokemonName: string;
  imageUrl: string | null;
}

type Face = 'front' | 'back';

interface WidgetState {
  /** Id de la última favorita mostrada de frente — null si nunca se mostró ninguna. */
  lastShownId: string | null;
  face: Face;
}

const DEFAULT_STATE: WidgetState = { lastShownId: null, face: 'front' };

function toSummary(card: Card): FavoriteCardSummary {
  return {
    id: card.id,
    pokemonName: card.pokemon.name,
    imageUrl: card.imageUrl ?? card.pokemon.spriteUrl,
  };
}

/** Elige una al azar entre `items`, evitando repetir `excludeId` si hay más de una opción. */
function pickNext<T extends { id: string }>(items: T[], excludeId: string | null): T | null {
  if (items.length === 0) return null;
  const candidates = excludeId && items.length > 1 ? items.filter((i) => i.id !== excludeId) : items;
  return candidates[Math.floor(Math.random() * candidates.length)];
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

/** Tamaño (dp) del botón redondo de "abrir app" en la esquina — ver FavoriteCardWidget. */
const OPEN_APP_BUTTON_SIZE = 36;
const OPEN_APP_BUTTON_MARGIN = 6;

/**
 * JSX del widget — mismo render tanto si lo dispara la app abierta como el
 * handler headless. Solo la carta, sin texto (pedido explícito: "no me
 * interesa que traiga el nombre, con que se mire la carta con eso"). El
 * widget en sí puede quedar casi cuadrado (lo elige el usuario al agregarlo/
 * cambiarle el tamaño), pero la carta SIEMPRE mantiene su proporción real
 * (2.5×3.5) adentro — el reverso (`card_reverse.png`) también, a tamaño
 * completo igual que el frente (antes se achicaba por error al 90%, se veía
 * "más chico que la carta").
 *
 * `imageSource` ya viene resuelto por quien llama (ver `resolveImageSource`)
 * — nunca es una URL remota acá: o es un `require()` local (reverso / ícono
 * placeholder si no hay ninguna favorita) o un `data:` con la foto ya
 * cacheada, para no descargar la foto entera de R2 cada vez que se voltea.
 *
 * Dos zonas superpuestas (`OverlapWidget`, ya que RemoteViews no deja tener
 * dos `clickAction` en el mismo elemento):
 *   - La carta entera: `clickAction: 'FLIP_CARD'` — tocarla la voltea (ver
 *     el módulo), no abre la app como antes.
 *   - Un botón redondo chico en la esquina inferior derecha, superpuesto
 *     encima con `margin` (no cubre el resto de la carta, que sigue
 *     recibiendo el tap de voltear): `clickAction: 'OPEN_APP'` — para no
 *     perder la forma de entrar a la app directo desde el widget que pedía
 *     la spec original, ahora que tocar la carta hace otra cosa.
 */
function FavoriteCardWidget({
  face,
  imageSource,
  hasCard,
  width,
  height,
}: {
  face: Face;
  imageSource: ImageWidgetSource;
  hasCard: boolean;
  width: number;
  height: number;
}) {
  // Solo el ícono placeholder (nunca hubo ninguna favorita) queda chico y
  // cuadrado — el reverso y cualquier foto real ocupan la carta completa.
  const size = face === 'front' && !hasCard ? fitWithRatio(width * 0.5, height * 0.5, 1) : fitWithRatio(width, height, CARD_RATIO);

  return React.createElement(
    OverlapWidget,
    { style: { height: 'match_parent', width: 'match_parent' } },
    React.createElement(
      FlexWidget,
      {
        clickAction: 'FLIP_CARD',
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
        image: imageSource,
        imageWidth: size.width,
        imageHeight: size.height,
        resizeMode: 'contain',
        radius: 0,
      }),
    ),
    React.createElement(
      FlexWidget,
      {
        clickAction: 'OPEN_APP',
        accessibilityLabel: 'Abrir PokeV',
        style: {
          width: OPEN_APP_BUTTON_SIZE,
          height: OPEN_APP_BUTTON_SIZE,
          // OverlapWidget apila desde la esquina superior izquierda — estos
          // margins son lo que empuja el botón a la esquina inferior derecha.
          marginLeft: Math.max(0, width - OPEN_APP_BUTTON_SIZE - OPEN_APP_BUTTON_MARGIN),
          marginTop: Math.max(0, height - OPEN_APP_BUTTON_SIZE - OPEN_APP_BUTTON_MARGIN),
          borderRadius: OPEN_APP_BUTTON_SIZE / 2,
          backgroundColor: 'rgba(255, 255, 255, 0.85)',
          alignItems: 'center',
          justifyContent: 'center',
        },
      },
      React.createElement(ImageWidget, {
        image: require('../../assets/icons/pokebola.png'),
        imageWidth: OPEN_APP_BUTTON_SIZE - 12,
        imageHeight: OPEN_APP_BUTTON_SIZE - 12,
        resizeMode: 'contain',
        radius: 0,
      }),
    ),
  );
}

async function loadFavorites(): Promise<FavoriteCardSummary[]> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as FavoriteCardSummary[]) : [];
  } catch {
    return [];
  }
}

async function loadState(): Promise<WidgetState> {
  try {
    const raw = await AsyncStorage.getItem(STATE_KEY);
    return raw ? (JSON.parse(raw) as WidgetState) : DEFAULT_STATE;
  } catch {
    return DEFAULT_STATE;
  }
}

async function saveState(state: WidgetState): Promise<void> {
  try {
    await AsyncStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch {
    // Best-effort — si falla, el peor caso es repetir una cara/carta que ya se había mostrado.
  }
}

/** La favorita de frente actual — si ya no existe (se desfavoriteó), cae a elegir cualquier otra. */
function resolveFrontCard(favorites: FavoriteCardSummary[], lastShownId: string | null): FavoriteCardSummary | null {
  return favorites.find((f) => f.id === lastShownId) ?? pickNext(favorites, null);
}

const PLACEHOLDER_IMAGE = require('../../assets/icons/pokebola.png') as ImageWidgetSource;
const BACK_IMAGE = require('../../assets/icons/card_reverse.png') as ImageWidgetSource;

/**
 * Foto ya lista para dibujar, sin pegarle a la red si se puede evitar — la
 * primera vez que se muestra una carta se descarga y se cachea como `data:`
 * local (AsyncStorage); las siguientes veces se lee de ahí directo. Sin
 * esto, CADA vuelta al frente volvía a bajar la foto entera (~1-2MB) de R2
 * — "le doy clic y cambia pero se tarda mucho".
 */
async function resolveImageSource(url: string): Promise<ImageWidgetSource> {
  const cacheKey = IMAGE_CACHE_PREFIX + url;
  try {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) return cached as ImageWidgetSource;
  } catch {
    // Sigue al fetch de todos modos.
  }

  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const dataUri = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
    try {
      await AsyncStorage.setItem(cacheKey, dataUri);
    } catch {
      // AsyncStorage lleno o la imagen es muy grande — no es crítico, se
      // vuelve a intentar cachear la próxima vez que se muestre esta carta.
    }
    return dataUri as ImageWidgetSource;
  } catch {
    // Si falla el fetch/caché, al menos se intenta con la URL en vivo — el
    // comportamiento de antes de este cambio, nunca deja la carta en blanco.
    return url as ImageWidgetSource;
  }
}

/** Resuelve qué imagen y tamaño le corresponde a `face`+`card` — ver FavoriteCardWidget. */
async function resolveWidgetVisual(
  face: Face,
  card: FavoriteCardSummary | null,
): Promise<{ imageSource: ImageWidgetSource; hasCard: boolean }> {
  if (face === 'back') return { imageSource: BACK_IMAGE, hasCard: true };
  if (!card?.imageUrl) return { imageSource: PLACEHOLDER_IMAGE, hasCard: false };
  return { imageSource: await resolveImageSource(card.imageUrl), hasCard: true };
}

/** Renderiza el estado actual tal cual está guardado — no voltea nada (usado en resize y al refrescar datos). */
async function renderCurrentState(
  favorites: FavoriteCardSummary[],
  info: WidgetInfo,
): Promise<React.JSX.Element> {
  const state = await loadState();
  const card = state.face === 'front' ? resolveFrontCard(favorites, state.lastShownId) : null;
  if (state.face === 'front' && card?.id !== state.lastShownId) {
    await saveState({ ...state, lastShownId: card?.id ?? null });
  }
  const { imageSource, hasCard } = await resolveWidgetVisual(state.face, card);
  return React.createElement(FavoriteCardWidget, { face: state.face, imageSource, hasCard, width: info.width, height: info.height });
}

/**
 * Avanza un paso el volteo (frente → reverso, o reverso → frente de OTRA
 * favorita) y renderiza el resultado. Usado por el click y por el disparo
 * periódico de Android.
 */
async function advanceAndRender(favorites: FavoriteCardSummary[], info: WidgetInfo): Promise<React.JSX.Element> {
  const state = await loadState();
  let nextState: WidgetState;
  let card: FavoriteCardSummary | null = null;

  if (state.face === 'front') {
    nextState = { lastShownId: state.lastShownId, face: 'back' };
  } else {
    card = pickNext(favorites, state.lastShownId);
    nextState = { lastShownId: card?.id ?? null, face: 'front' };
  }

  await saveState(nextState);
  const { imageSource, hasCard } = await resolveWidgetVisual(nextState.face, card);
  return React.createElement(FavoriteCardWidget, { face: nextState.face, imageSource, hasCard, width: info.width, height: info.height });
}

/** Se llama cada vez que la app tiene datos frescos de la colección (ver hooks/useSyncFavoritesWidget.ts). */
export async function syncFavoritesWidget(cards: Card[]): Promise<void> {
  const favorites = cards.filter((c) => c.favoritedBy.length > 0).map(toSummary);

  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(favorites));
  } catch {
    // Persistir es best-effort — si falla, el widget se queda con lo último que sí guardó.
  }

  // No voltea nada acá — abrir la app o (des)favoritar una carta no debería
  // hacer que la carta del widget cambie sola; eso solo pasa al tocarla o
  // pasada la hora. Solo refresca los datos por si la que se mostraba dejó
  // de ser favorita.
  await requestWidgetUpdate({
    widgetName: WIDGET_NAME,
    renderWidget: (info: WidgetInfo) => renderCurrentState(favorites, info),
  });
}

/** Handler headless (index.js) — corre incluso con la app cerrada (widget agregado, click, actualización periódica, reiniciado el teléfono, etc). */
export async function favoriteCardWidgetTaskHandler(props: WidgetTaskHandlerProps): Promise<void> {
  if (props.widgetInfo.widgetName !== WIDGET_NAME) return;

  const { widgetAction, clickAction, widgetInfo, renderWidget } = props;

  if (widgetAction === 'WIDGET_DELETED') return;

  // Un click que no sea el de la carta (no debería haber otro hoy, pero por
  // las dudas si se agrega alguno más adelante) no voltea nada.
  if (widgetAction === 'WIDGET_CLICK' && clickAction !== 'FLIP_CARD') return;

  const favorites = await loadFavorites();

  // WIDGET_CLICK (tocaron la carta) y WIDGET_UPDATE (dispara Android solo
  // cada updatePeriodMillis, ~1h) voltean un paso. WIDGET_ADDED (recién
  // agregado) y WIDGET_RESIZED (solo cambió el tamaño) muestran el estado
  // actual tal cual, sin voltear nada.
  const element =
    widgetAction === 'WIDGET_CLICK' || widgetAction === 'WIDGET_UPDATE'
      ? await advanceAndRender(favorites, widgetInfo)
      : await renderCurrentState(favorites, widgetInfo);

  renderWidget(element);
}
