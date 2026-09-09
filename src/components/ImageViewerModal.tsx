import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type BlendMode,
  type FilterFunction,
  type LinearGradientValue,
  type RadialGradientValue,
} from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

// Brillo holo calcado de la técnica REAL de la demo de referencia
// (simeydotme/pokemon-cards-css — leída en vivo, no copiada: es GPLv3, no se
// pueden usar sus imágenes/código, pero la RECETA (qué capas, qué
// blend-modes, qué filtros) no es un asset, así que sí se puede reproducir
// con piezas propias). Su `.card__shine` real (ver public/css/cards/base.css
// y regular-holo.css del repo) NO es una foto de foil: son 2-3 capas de puro
// `background-image` (gradientes) con `mix-blend-mode` Y ADEMÁS
// `filter: brightness() contrast() saturate()` en cada capa — ese `filter`
// es lo que nos faltaba antes (solo usábamos blend-mode) y por lo que se
// veía "lavado" en vez de metálico. RN soporta las tres cosas (`filter`,
// `mixBlendMode`, `experimental_backgroundImage`) desde 0.76+ en New
// Architecture, Android 10+ (ya prendida en este proyecto).
//
// 3 capas por variante, mismo rol en las 3:
//   1. "main"  — el streak/arcoíris de color, mix-blend-mode color-dodge.
//   2. "grain" — rayas finas tipo scanline (su equivalente de la textura),
//                mix-blend-mode hard-light — reemplaza la imagen de foil que
//                probamos antes (no tileaba bien en Android de todos modos).
//   3. "glare" — resplandor radial que seguía el mouse en la demo; acá sigue
//                el tilt en su lugar, mix-blend-mode overlay.
//
// `fullart` (Ultra Rara/Rara Ilustración) se había sacado por un corte
// rectangular de Android al inclinar la carta (bug de plataforma,
// facebook/react-native#55605 — mixBlendMode + ancestro con rotateX/rotateY).
// Volvió porque ahora el holo entero vive fuera del árbol que rota en 3D
// (solo se mueve con `translate`, ver *PanStyle más abajo) — el bug era
// específicamente rotateX/rotateY + mixBlendMode, no translate + mixBlendMode.
type HoloLayer = {
  gradient: LinearGradientValue | RadialGradientValue;
  blendMode: BlendMode;
  filter: FilterFunction[];
};
type HoloPreset = {
  layers: [main: HoloLayer, grain: HoloLayer, glare: HoloLayer];
  colors: string[]; // paleta para los destellos puntuales (Sparkle)
  baseOpacity: number;
  maxOpacity: number;
};

/** Gradiente repetido varias veces (equivalente a `repeating-linear-gradient`, que RN no tiene como tipo aparte) — el streak de color principal. */
function repeatingLinear(colors: string[], direction: string, repeats = 6): LinearGradientValue {
  const seq = Array.from({ length: repeats }, () => colors).flat();
  const colorStops = seq.map((color, i) => ({
    color,
    positions: [`${(i / (seq.length - 1)) * 100}%`],
  }));
  return { type: 'linear-gradient', direction, colorStops };
}

/** Rayas finas alternadas — el "grano" de la referencia (ahí es una textura real; acá, gradiente puro para no depender de una imagen que además no tileaba bien en Android). */
function scanlines(direction: string, bands = 30): LinearGradientValue {
  const colorStops: { color: string; positions: string[] }[] = [];
  for (let i = 0; i < bands; i++) {
    const start = (i / bands) * 100;
    const mid = ((i + 0.5) / bands) * 100;
    const color = i % 2 === 0 ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.4)';
    colorStops.push({ color, positions: [`${start}%`] }, { color, positions: [`${mid}%`] });
  }
  return { type: 'linear-gradient', direction, colorStops };
}

/** Resplandor radial — el "glare" que en la demo sigue el mouse; acá lo desplaza el tilt (ver glarePanStyle). Mismo para las 3 variantes. */
function glareRadial(): RadialGradientValue {
  return {
    type: 'radial-gradient',
    shape: 'circle',
    size: 'farthest-corner',
    position: { top: '50%', left: '50%' },
    colorStops: [
      { color: 'rgba(255,255,255,0.85)', positions: ['0%'] },
      { color: 'rgba(255,255,255,0.35)', positions: ['30%'] },
      { color: 'rgba(0,0,0,0.4)', positions: ['100%'] },
    ],
  };
}

/** Ondas concéntricas blanco-negro-blanco — el patrón "sin máscara" de reverse-holo.css cuando no hay foto de foil por carta (nuestro caso siempre). */
function rippleRadial(): RadialGradientValue {
  return {
    type: 'radial-gradient',
    shape: 'circle',
    size: 'farthest-side',
    position: { top: '50%', left: '50%' },
    colorStops: [
      { color: '#FFFFFF', positions: ['5%'] },
      { color: '#000000', positions: ['50%'] },
      { color: '#FFFFFF', positions: ['80%'] },
    ],
  };
}

/** Banda diagonal negro-blanco-negro — la segunda mitad del patrón "sin máscara" de reverse-holo.css. */
function diagonalBand(): LinearGradientValue {
  return {
    type: 'linear-gradient',
    direction: '-45deg',
    colorStops: [
      { color: '#000000', positions: ['15%'] },
      { color: '#FFFFFF', positions: ['50%'] },
      { color: '#000000', positions: ['85%'] },
    ],
  };
}

// Paletas: "sunpillar" para classic es la misma que usa regular-holo.css
// (6 tonos pastel, --sunpillar-1..6 de base.css). rainbow usa tonos más
// oscuros/saturados, como rainbow-holo.css (--r-clr-1..7), para que se note
// la diferencia de "un escalón más" con classic.
const SUNPILLARS = ['#FF6B61', '#FFE066', '#A6FF61', '#61FFEC', '#7A9DFF', '#C87AFF'];
const RAINBOW_DEEP = ['#8C2F2F', '#8C7A2F', '#3F8C2F', '#2F8C86', '#2F5A8C', '#5A2F8C', '#8C2F6E'];

const HOLO_PRESETS: Record<'classic' | 'fullart' | 'reverse' | 'rainbow', HoloPreset> = {
  classic: {
    layers: [
      {
        gradient: repeatingLinear(SUNPILLARS, '110deg'),
        blendMode: 'color-dodge',
        filter: [{ brightness: 1.05 }, { contrast: 1.1 }, { saturate: 1.05 }],
      },
      {
        gradient: scanlines('100deg'),
        blendMode: 'hard-light',
        filter: [{ brightness: 1.15 }, { contrast: 1.1 }],
      },
      {
        gradient: glareRadial(),
        blendMode: 'overlay',
        filter: [{ brightness: 0.8 }, { contrast: 1.5 }],
      },
    ],
    colors: SUNPILLARS,
    // `color-dodge` es un blend-mode muy potente: incluso poca opacidad
    // explota a blanco puro sobre cualquier zona clara de la foto (el borde
    // de cartón, sobre todo). 0.35 base se veía como bandas de color sólidas
    // tapando toda la carta — bajado a una fracción de eso.
    baseOpacity: 0.12,
    maxOpacity: 0.32,
  },
  reverse: {
    layers: [
      {
        gradient: rippleRadial(),
        blendMode: 'color-dodge',
        filter: [{ brightness: 0.6 }, { contrast: 1.5 }],
      },
      {
        gradient: diagonalBand(),
        blendMode: 'color-dodge',
        filter: [{ brightness: 0.6 }, { contrast: 1.5 }],
      },
      {
        gradient: glareRadial(),
        blendMode: 'overlay',
        filter: [{ brightness: 0.7 }, { contrast: 1.5 }],
      },
    ],
    colors: ['#00E5FF', '#7C4DFF', '#00E5A8'],
    baseOpacity: 0.12,
    maxOpacity: 0.32,
  },
  rainbow: {
    layers: [
      {
        gradient: repeatingLinear(RAINBOW_DEEP, '-30deg'),
        blendMode: 'color-dodge',
        filter: [{ brightness: 0.85 }, { contrast: 2.2 }, { saturate: 0.85 }],
      },
      {
        gradient: repeatingLinear([...RAINBOW_DEEP].reverse(), '-60deg'),
        blendMode: 'color-dodge',
        filter: [{ brightness: 0.75 }, { contrast: 2 }, { saturate: 1 }],
      },
      {
        gradient: glareRadial(),
        blendMode: 'hard-light',
        filter: [{ brightness: 0.9 }, { contrast: 1.75 }],
      },
    ],
    colors: ['#B18CFF', '#6BD6FF', '#8BFF8B', '#FFF34D', '#FFB86B', '#FF6B6B'],
    baseOpacity: 0.14,
    maxOpacity: 0.36,
  },
  // Vuelve la variante que se había sacado (ver v-full-art.css del repo de
  // referencia: bandas verticales + banda metálica angulada + oscurecido en
  // las esquinas) — se sacó porque el corte rectangular de Android al
  // inclinar se notaba más ahí. Ahora el holo entero va sin ninguna rotación
  // (solo translate, ver *PanStyle), así que ya no debería aplicar el mismo
  // bug (era rotateX/rotateY + mixBlendMode, no translate + mixBlendMode).
  fullart: {
    layers: [
      {
        gradient: repeatingLinear(SUNPILLARS, '0deg', 6),
        blendMode: 'color-dodge',
        filter: [{ brightness: 1.05 }, { contrast: 1.2 }, { saturate: 1.15 }],
      },
      {
        gradient: scanlines('133deg', 20),
        blendMode: 'hard-light',
        filter: [{ brightness: 1.1 }, { contrast: 1.2 }],
      },
      {
        gradient: glareRadial(),
        blendMode: 'hard-light',
        filter: [{ brightness: 1 }, { contrast: 1.2 }, { saturate: 1 }],
      },
    ],
    colors: SUNPILLARS,
    baseOpacity: 0.14,
    maxOpacity: 0.34,
  },
};
type HoloKind = 'none' | keyof typeof HOLO_PRESETS;
const HOLO_KINDS: (keyof typeof HOLO_PRESETS)[] = ['classic', 'fullart', 'reverse', 'rainbow'];
const HOLO_CHOICE_LABELS: Record<HoloKind | 'auto', string> = {
  auto: '✨ Auto',
  none: '—',
  classic: '🟡',
  fullart: '⚪',
  reverse: '🔷',
  rainbow: '🌈',
};

// El texto de rareza (33 valores distintos en TCGdex, de "Común" a "Rara
// Ilustración Especial" — GET /v2/es/rarities) NO dice por sí solo si una
// carta tiene foil: hay Promos con `variants.holo: true` cuya rareza es solo
// "Promo" (p.ej. Pikachu V SWSH145, dorada por el sello de 25º Aniversario).
// La señal real de si brilla es `variants.holo`/`variants.reverse` — la
// rareza solo decide, entre las que sí tienen holo, cuál look usar.
// Verificado contra la API real: "Ultra Rara" y "Rara Ilustración" SÍ llevan
// holo=true (fullart), igual que "Rara Ilustración Especial" y "Rara Híper"
// (rainbow, el escalón más alto).
const TOP_TIER_RARITY = /secret|secreta|híper|hyper|corona|variocolor|especial/;
const FULL_ART_RARITY = /ultra|ilustraci[oó]n|radiante|estrella|shiny|vmax|vstar/;

function tierFromRarity(r: string): 'classic' | 'fullart' | 'rainbow' {
  if (TOP_TIER_RARITY.test(r)) return 'rainbow';
  if (FULL_ART_RARITY.test(r)) return 'fullart';
  return 'classic';
}

/**
 * `variants.holo`/`variants.reverse` de TCGdex (si están disponibles — las
 * cartas ya guardadas localmente no los persisten, solo `rarity`) + el texto
 * de rareza → qué preset de brillo usar.
 */
function getHoloKind(
  rarity?: string | null,
  holoVariant?: boolean,
  reverseVariant?: boolean,
): HoloKind {
  const r = rarity?.toLowerCase() ?? '';
  // Con flags de variants disponibles (Buscador): son la señal real.
  if (holoVariant) return tierFromRarity(r);
  if (reverseVariant) return 'reverse';
  // Sin flags (carta ya guardada, ver Props.reverseHolo): solo queda inferir
  // por el texto — "Holo ..." o un nivel de rareza que casi siempre trae foil.
  if (/holo/.test(r) || TOP_TIER_RARITY.test(r) || FULL_ART_RARITY.test(r)) {
    return tierFromRarity(r);
  }
  return 'none';
}

/** Una capa de gradiente + blend-mode + filter, dentro de una caja sobredimensionada para poder desplazarla con el tilt (`panStyle`) sin que se le vean los bordes. */
function GradientPanLayer({
  layer,
  panStyle,
}: {
  layer: HoloLayer;
  panStyle: ReturnType<typeof useAnimatedStyle>;
}) {
  return (
    <Animated.View style={[styles.panBox, panStyle]}>
      <View
        style={[
          StyleSheet.absoluteFill,
          // `experimental_backgroundImage`/`mixBlendMode`/`filter`: RN 0.76+,
          // New Architecture, Android 10+ (ver comentario de HOLO_PRESETS).
          {
            experimental_backgroundImage: [layer.gradient],
            mixBlendMode: layer.blendMode,
            filter: layer.filter,
          },
        ]}
      />
    </Animated.View>
  );
}

// Destellos puntuales (además de las capas de gradiente) — puntitos fijos en
// la carta que titilan solos en loop, independiente del tilt, como el
// sparkle real del foil visto de cerca. Cada uno es su propio componente (no
// un `.map` llamando hooks) porque cada punto necesita su propio shared
// value con fase/duración propia para no titilar todos sincronizados.
const SPARKLE_COUNT = 18;
const SPARKLE_MIN_OPACITY = 0.4;

function Sparkle({
  left,
  top,
  delay,
  duration,
  color,
}: {
  left: number;
  top: number;
  delay: number;
  duration: number;
  color: string;
}) {
  const twinkle = useSharedValue(SPARKLE_MIN_OPACITY);

  useEffect(() => {
    twinkle.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration }),
          withTiming(SPARKLE_MIN_OPACITY, { duration }),
        ),
        -1,
        true,
      ),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dotStyle = useAnimatedStyle(() => ({
    opacity: twinkle.value,
    transform: [{ scale: 0.6 + twinkle.value * 0.6 }],
  }));
  const haloStyle = useAnimatedStyle(() => ({
    opacity: twinkle.value * 0.4,
    transform: [{ scale: 0.6 + twinkle.value * 0.8 }],
  }));

  return (
    <>
      <Animated.View
        style={[styles.sparkleHalo, { left: `${left}%`, top: `${top}%`, backgroundColor: color }, haloStyle]}
      />
      <Animated.View
        style={[styles.sparkle, { left: `${left}%`, top: `${top}%`, backgroundColor: color }, dotStyle]}
      />
    </>
  );
}

interface Props {
  visible: boolean;
  imageUri: string | null;
  onClose: () => void;
  /** Rareza de la carta (`rarity` de TCGdex o del registro local) — decide el preset de brillo holo, si corresponde. */
  rarity?: string | null;
  /** `variants.holo`/`variants.reverse` de TCGdex — no disponibles para cartas ya guardadas localmente (no se persisten hoy, ver `rarity`-only fallback en `getHoloKind`). */
  holoVariant?: boolean;
  reverseHolo?: boolean;
}

/**
 * Visor a pantalla completa para la foto de una carta — pinch-to-zoom, tilt
 * 3D libre al arrastrar (vuelve a plano al soltar, como una carta física que
 * inclinás con el dedo) y tap simple para voltearla y ver el reverso
 * (`card_reverse.png`, el mismo dibujo genérico para todas). Antes, tocar la
 * imagen en CardDetailScreen navegaba a la especie del Pokémon (ya duplicado
 * por el enlace "Ver Pokémon →" debajo) y no había forma de verla en grande
 * — importa más ahora que la imagen es la foto real escaneada (recortada),
 * no solo arte genérico.
 *
 * Nada de esto existe en el widget de pantalla de inicio — ahí es imposible
 * animar nada (RemoteViews, ver favoritesWidget.ts), pero acá corre en
 * nuestro propio proceso con Reanimated.
 */
export default function ImageViewerModal({
  visible,
  imageUri,
  onClose,
  rarity,
  holoVariant,
  reverseHolo,
}: Props) {
  const { width, height } = useWindowDimensions();
  const holoKind = getHoloKind(rarity, holoVariant, reverseHolo);

  // Elegir manualmente qué variante ver (chips abajo) — no persiste entre
  // cartas, se resetea sola en cada una (ver useEffect de abajo). `null` =
  // usar la que le corresponde de verdad a la carta (holoKind).
  const [styleOverride, setStyleOverride] = useState<HoloKind | null>(null);
  const effectiveKind = styleOverride ?? holoKind;
  const holoPreset = effectiveKind !== 'none' ? HOLO_PRESETS[effectiveKind] : null;

  // Posiciones/timings de los destellos — una sola vez por carta (no en cada
  // render), lejos del borde (8%-88%) para que no queden cortados por el clip.
  const sparkles = useMemo(
    () =>
      Array.from({ length: SPARKLE_COUNT }, () => ({
        left: 8 + Math.random() * 80,
        top: 8 + Math.random() * 80,
        delay: Math.random() * 1400,
        duration: 700 + Math.random() * 600,
      })),
    // Dispara con cada carta nueva aunque no se use adentro (posiciones al azar).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [imageUri],
  );

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  // Tilt 3D libre — sigue el dedo mientras se arrastra, vuelve a (0,0) con
  // resorte al soltar. Reproduce el patrón que encontró el usuario
  // ("Interactive3DCard"): nada de estados de reposo ni lógica de a dónde
  // "cae" — siempre vuelve al mismo lugar, por eso no hace falta la danza de
  // cancelAnimation/dragStart que tenía el intento anterior (ese sí tenía
  // ambigüedad de destino — 0 o 180 — y ahí se rompía).
  const tiltX = useSharedValue(0);
  const tiltY = useSharedValue(0);

  // Volteo (frente/reverso) — independiente del tilt, solo por tap. 0 =
  // frente, 180 = reverso. Un shared value REAL animado desde el tap (no
  // calculado adentro de useAnimatedStyle, como el ejemplo "FlipCard" que
  // encontró el usuario) — probado eso primero y el valor usado para decidir
  // qué cara mostrar (la opacidad) no seguía el progreso cuadro a cuadro de
  // la animación, se veía siempre el reverso sin importar el ángulo real.
  const spin = useSharedValue(0);

  // Arranca siempre sin zoom, sin tilt y mostrando el frente, no importa cómo quedó la última carta que se vio.
  useEffect(() => {
    if (!visible) return;
    scale.value = 1;
    savedScale.value = 1;
    translateX.value = 0;
    translateY.value = 0;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
    tiltX.value = 0;
    tiltY.value = 0;
    spin.value = 0;
    setStyleOverride(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, imageUri]);

  const pinch = Gesture.Pinch()
    .onUpdate(e => {
      scale.value = Math.max(1, Math.min(savedScale.value * e.scale, 5));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  // Con zoom: arrastrar explora la imagen (translateX/Y, comportamiento de
  // siempre). Sin zoom: arrastrar inclina la carta en 3D seguiendo el dedo
  // — clamp a ±25° para que se sienta como "inclinar", no como "voltear"
  // (para eso ya está el tap). Al soltar, vuelve a plano con resorte.
  const pan = Gesture.Pan()
    .onUpdate(e => {
      if (savedScale.value > 1) {
        translateX.value = savedTranslateX.value + e.translationX;
        translateY.value = savedTranslateY.value + e.translationY;
        return;
      }
      tiltY.value = Math.max(-25, Math.min(25, e.translationX / 6));
      tiltX.value = Math.max(-25, Math.min(25, -e.translationY / 6));
    })
    .onEnd(() => {
      if (savedScale.value > 1) {
        savedTranslateX.value = translateX.value;
        savedTranslateY.value = translateY.value;
        return;
      }
      tiltX.value = withSpring(0);
      tiltY.value = withSpring(0);
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      const resetTo = savedScale.value > 1 ? 1 : 2; // doble tap: zoom in si estaba normal, reset si ya tenía zoom
      scale.value = withSpring(resetTo);
      savedScale.value = resetTo;
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
    });

  // Tap simple = voltear la carta. `Gesture.Exclusive(doubleTap, singleTap)`
  // prueba primero el doble tap — si no llega un segundo toque a tiempo,
  // recién ahí cuenta el primero como "simple" y dispara el flip. (Probado
  // primero con `requireExternalGestureToFail` en vez de `Exclusive`, mezclado
  // con `Simultaneous` — nunca disparaba, ni con tap real en el dispositivo.)
  const singleTap = Gesture.Tap()
    .numberOfTaps(1)
    .onEnd(() => {
      spin.value = withTiming(spin.value === 0 ? 180 : 0, { duration: 400 });
    });

  const composed = Gesture.Simultaneous(
    pinch,
    pan,
    Gesture.Exclusive(doubleTap, singleTap),
  );

  const zoomStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const tiltStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1000 },
      { rotateX: `${tiltX.value}deg` },
      { rotateY: `${tiltY.value}deg` },
    ],
  }));

  // Dos caras superpuestas (position: absolute, una encima de la otra) que
  // giran juntas. `backfaceVisibility: hidden` (lo que "debería" ocultar
  // cada cara al pasar los 90°) no anda en Android en esta versión de RN —
  // se ve el reverso de entrada, encima del frente, sin importar el ángulo.
  // Por eso la ocultamos a mano con `opacity` leyendo `spin.value` directo
  // (0-90 = frente visible, 90-180 = reverso visible) — SIN pasar por
  // withTiming/interpolate acá, `spin` ya es el valor animado en sí.
  const frontStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1000 }, { rotateY: `${spin.value}deg` }],
    opacity: spin.value < 90 ? 1 : 0,
  }));
  const backStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1000 }, { rotateY: `${spin.value + 180}deg` }],
    opacity: spin.value < 90 ? 0 : 1,
  }));

  // Brillo holo falso — TCGdex no da textura/patrón real de foil por carta,
  // solo el texto de rareza (getHoloKind lo mapea a un preset de HOLO_PRESETS).
  // Se hace más intenso cuanto más se inclina la carta, como el reflejo que
  // sigue el gesto en la app real. Se apaga sola al mostrar el reverso.
  const holoOpacityStyle = useAnimatedStyle(() => {
    if (!holoPreset) return { opacity: 0 };
    const magnitude = (Math.abs(tiltX.value) + Math.abs(tiltY.value)) / 50;
    return {
      opacity:
        spin.value < 90
          ? Math.min(holoPreset.maxOpacity, holoPreset.baseOpacity + magnitude)
          : 0,
    };
  });

  // Cada capa se desplaza (`pan`) con el tilt a su propia velocidad — el
  // glare se mueve más que el streak principal, y las rayas de grano casi no
  // se mueven, para dar sensación de profundidad (varias superficies a
  // distinta "distancia"), como el mouse-tracking de la demo de referencia.
  const mainPanStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tiltY.value * 4 }, { translateY: tiltX.value * -4 }],
  }));
  const grainPanStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tiltY.value * 1.5 }, { translateY: tiltX.value * -1.5 }],
  }));
  const glarePanStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tiltY.value * 6 }, { translateY: tiltX.value * -6 }],
  }));

  // Los destellos titilan solos (Sparkle ya anima su propio loop) — este
  // contenedor solo los oculta al mostrar el reverso, sin depender del tilt.
  const sparkleContainerStyle = useAnimatedStyle(() => ({
    opacity: spin.value < 90 ? 1 : 0,
  }));

  // Caja del visor con el aspecto real de una carta Pokémon (2.5x3.5") en vez
  // de un rectángulo suelto relativo a la pantalla — con `resizeMode="contain"`,
  // una caja de otro aspecto deja franjas vacías arriba/abajo (o a los lados)
  // de la foto, y ahí el brillo holo (que llena toda la caja) se veía "salido"
  // de la carta aunque estuviera bien recortado dentro del visor.
  const CARD_ASPECT = 2.5 / 3.5;
  const maxWidth = width * 0.92;
  const maxHeight = height * 0.75;
  let cardWidth = maxWidth;
  let cardHeight = cardWidth / CARD_ASPECT;
  if (cardHeight > maxHeight) {
    cardHeight = maxHeight;
    cardWidth = cardHeight * CARD_ASPECT;
  }
  const imageSize = { width: cardWidth, height: cardHeight };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      // Sin esto, en Android el diálogo del Modal no cubre la franja del
      // status bar — como la pantalla de atrás (Buscador) dibuja edge-to-edge
      // debajo del status bar, esa franja se veía como agujero directo a
      // SearchScreen (no como transparencia), con una barra blanca arriba.
      statusBarTranslucent
    >
      {/* `Modal` de RN abre su propia ventana nativa — el `GestureHandlerRootView`
          de App.tsx no la alcanza, así que sin este segundo acá los gestos
          (tap simple para voltear, sobre todo) no se reconocían bien: el
          pinch/pan "colaban" por accidente pero el tap nunca disparaba. */}
      <GestureHandlerRootView style={styles.root}>
        <Pressable
          onPress={onClose}
          hitSlop={16}
          accessibilityRole="button"
          accessibilityLabel="Cerrar"
          style={styles.closeButton}
        >
          <Text style={styles.closeIcon}>✕</Text>
        </Pressable>

        <GestureDetector gesture={composed}>
          <Animated.View style={[styles.centered, zoomStyle]}>
            {imageUri ? (
              // `tiltStyle` (rotateX/rotateY, 3D real) va SOLO en la imagen de
              // la carta. El holo (blend-mode) es un hermano aparte, sin ese
              // transform 3D — Android no recorta bien un View con
              // `mixBlendMode` cuando un ancestro tiene rotateX/rotateY (bug
              // de la plataforma, ver comentario de HOLO_PRESETS). Sacando el
              // blend-mode del árbol rotado, el brillo ya no rota en 3D junto
              // con la carta, solo la sigue con translate (ver *PanStyle).
              <View style={imageSize}>
                <Animated.View style={[StyleSheet.absoluteFill, tiltStyle]}>
                  <View style={[StyleSheet.absoluteFill, styles.cardClip]}>
                    <Animated.Image
                      source={{ uri: imageUri }}
                      style={[styles.face, frontStyle]}
                      resizeMode="contain"
                    />
                    <Animated.Image
                      source={require('../../assets/icons/card_reverse.png')}
                      style={[styles.face, styles.backFace, backStyle]}
                      resizeMode="contain"
                    />
                  </View>
                </Animated.View>
                {holoPreset ? (
                  <View
                    pointerEvents="none"
                    style={[StyleSheet.absoluteFill, styles.cardClip]}
                  >
                    <Animated.View style={[styles.holoOverlay, holoOpacityStyle]}>
                      <GradientPanLayer layer={holoPreset.layers[0]} panStyle={mainPanStyle} />
                      <GradientPanLayer layer={holoPreset.layers[1]} panStyle={grainPanStyle} />
                      <GradientPanLayer layer={holoPreset.layers[2]} panStyle={glarePanStyle} />
                    </Animated.View>
                    <Animated.View
                      style={[styles.holoOverlay, sparkleContainerStyle]}
                    >
                      {sparkles.map((s, i) => (
                        <Sparkle
                          key={i}
                          left={s.left}
                          top={s.top}
                          delay={s.delay}
                          duration={s.duration}
                          color={holoPreset.colors[i % holoPreset.colors.length]}
                        />
                      ))}
                    </Animated.View>
                  </View>
                ) : null}
              </View>
            ) : (
              <View style={imageSize} />
            )}
          </Animated.View>
        </GestureDetector>

        {imageUri ? (
          // Elegir a mano qué variante de brillo ver (o "Ninguno" para ver la
          // carta lisa aunque sea holo de verdad) — no se guarda, cada carta
          // nueva vuelve a "Auto" sola.
          <View style={styles.styleRow} pointerEvents="box-none">
            {([null, 'none', ...HOLO_KINDS] as (HoloKind | null)[]).map(kind => {
              const active = styleOverride === kind;
              return (
                <Pressable
                  key={kind ?? 'auto'}
                  onPress={() => setStyleOverride(kind)}
                  style={[styles.styleChip, active && styles.styleChipActive]}
                >
                  <Text style={styles.styleChipLabel}>{HOLO_CHOICE_LABELS[kind ?? 'auto']}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  closeButton: {
    position: 'absolute',
    top: 48,
    right: 20,
    zIndex: 1,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: { color: '#FFFFFF', fontSize: 22 },
  face: { width: '100%', height: '100%', backfaceVisibility: 'hidden' },
  backFace: { position: 'absolute', top: 0, left: 0 },
  cardClip: { overflow: 'hidden', borderRadius: 12 },
  holoOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  // Caja más grande que la carta — al desplazarla con el tilt (*PanStyle)
  // el `cardClip` de afuera recorta a los límites reales sin que se le vean
  // los bordes vacíos.
  panBox: {
    position: 'absolute',
    top: '-30%',
    left: '-30%',
    width: '160%',
    height: '160%',
  },
  // mixBlendMode 'screen': el punto ilumina en vez de tapar con un círculo
  // de color plano.
  sparkle: {
    position: 'absolute',
    width: 7,
    height: 7,
    borderRadius: 4,
    marginLeft: -3.5,
    marginTop: -3.5,
    mixBlendMode: 'screen',
  },
  sparkleHalo: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    marginLeft: -8,
    marginTop: -8,
    mixBlendMode: 'screen',
  },
  styleRow: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  styleChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  styleChipActive: { backgroundColor: 'rgba(255,255,255,0.35)' },
  styleChipLabel: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
});
