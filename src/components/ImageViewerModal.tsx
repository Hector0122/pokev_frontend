import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
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

// Cuatro variantes según la rareza real de la carta (getHoloKind), cada una
// con su propia mecánica de animación — no solo un recolor de la misma, que
// es lo que había antes y se sentía repetido:
//   - classic ("Holo Rara"): streak diagonal sólido, dorado, 2 bandas anchas.
//   - fullart ("Ultra Rara"/"Rara Ilustración"): el arte completo lleva
//     textura holográfica, no un brillo puntual — resplandor radial (como
//     reflejo en una superficie curva) en vez de una franja.
//   - reverse (`variants.reverse`): patrón de malla cruzada (dos grupos de
//     bandas en diagonales opuestas), cian/violeta — se siente a "rejilla",
//     no a streak, como el print reverse real.
//   - rainbow (Secreta/Híper/Ilustración Especial): streak arcoíris vívido
//     de 6 colores, el escalón más alto.
type HoloPreset = {
  mechanic: 'sheen' | 'crosshatch' | 'radial';
  colors: string[];
  bandWidth?: number; // solo mechanic 'sheen'/'crosshatch'
  baseOpacity: number;
  maxOpacity: number;
};

const HOLO_PRESETS: Record<'classic' | 'fullart' | 'reverse' | 'rainbow', HoloPreset> = {
  classic: {
    mechanic: 'sheen',
    colors: ['#FFB300', '#FFD54F'],
    bandWidth: 22,
    baseOpacity: 0.12,
    maxOpacity: 0.40,
  },
  fullart: {
    mechanic: 'radial',
    colors: ['#FFFFFF', '#CFFFF3', '#CFE8FF'],
    baseOpacity: 0.14,
    maxOpacity: 0.50,
  },
  reverse: {
    mechanic: 'crosshatch',
    colors: ['#00BCD4', '#7C4DFF', '#00E5A8'],
    baseOpacity: 0.14,
    maxOpacity: 0.50,
  },
  rainbow: {
    mechanic: 'sheen',
    colors: ['#B18CFF', '#6BD6FF', '#8BFF8B', '#FFF34D', '#FFB86B', '#FF6B6B'],
    bandWidth: 18,
    baseOpacity: 0.12,
    maxOpacity: 0.55,
  },
};
type HoloKind = 'none' | keyof typeof HOLO_PRESETS;
const HOLO_KINDS: (keyof typeof HOLO_PRESETS)[] = ['classic', 'fullart', 'reverse', 'rainbow'];
const HOLO_CHOICE_LABELS: Record<HoloKind | 'auto', string> = {
  auto: '✨ Auto',
  none: '— Ninguno',
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
// rareza solo decide, entre las que sí tienen holo, cuál de los 4 looks.
// Verificado contra la API real (no solo supuesto): "Ultra Rara" y "Rara
// Ilustración" SÍ llevan holo=true (fullart), igual que "Rara Ilustración
// Especial" y "Rara Híper" (rainbow, el escalón más alto).
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

const sheenBandOpacity = (i: number, count: number) =>
  1 - Math.abs(i - (count - 1) / 2) / (count / 2);

/** Un grupo de bandas diagonales — mechanic 'sheen' lo usa una vez a 30°, 'crosshatch' lo usa dos veces (30° y -30°) para formar una malla. */
function BandGroup({ preset, rotateDeg }: { preset: HoloPreset; rotateDeg: number }) {
  const bandWidth = preset.bandWidth ?? 18;
  return (
    <View style={[styles.sheenRotate, { transform: [{ rotate: `${rotateDeg}deg` }] }]}>
      {preset.colors.map((color, i, { length }) => (
        <View
          key={i}
          style={[
            styles.sheenBand,
            {
              backgroundColor: color,
              width: `${bandWidth}%`,
              left: `${
                length > 1 ? (i * (100 - bandWidth)) / (length - 1) : (100 - bandWidth) / 2
              }%`,
              opacity: sheenBandOpacity(i, length),
            },
          ]}
        />
      ))}
    </View>
  );
}

// Cantidad de líneas por dirección en la malla — más y más finas que un
// BandGroup normal, con opacidad pareja (no en campana): con la campana, la
// línea del medio de cada grupo quedaba casi opaca y las dos (30°/-30°) se
// cruzaban justo en el centro formando una "X" grande y rara en vez de una
// textura pareja de malla. Cada línea es en realidad 3 capas superpuestas del mismo color
// centradas en el mismo punto — un "core" fino y brillante más un halo ancho
// y tenue detrás — para simular que está difuminada (RN no tiene blur nativo
// sin agregar una librería nueva; este truco de capas es el equivalente barato).
const CROSSHATCH_LINES = 7;
const GLOW_LAYERS = [
  { width: 12, opacity: 0.10 },
  { width: 6, opacity: 0.20 },
  { width: 2, opacity: 0.55 },
] as const;

function GlowBand({ centerLeft, color }: { centerLeft: number; color: string }) {
  return (
    <>
      {GLOW_LAYERS.map((layer, i) => (
        <View
          key={i}
          style={[
            styles.sheenBand,
            {
              backgroundColor: color,
              width: `${layer.width}%`,
              left: `${centerLeft - layer.width / 2}%`,
              opacity: layer.opacity,
            },
          ]}
        />
      ))}
    </>
  );
}

/** Una dirección de la malla cruzada (mechanic 'crosshatch') — `BandGroup` la usa dos veces (30°/-30°, desfasadas con `offset`) para que las líneas no coincidan en el mismo punto. */
function CrosshatchLines({
  preset,
  rotateDeg,
  offset,
}: {
  preset: HoloPreset;
  rotateDeg: number;
  offset: number;
}) {
  return (
    <View style={[styles.sheenRotate, { transform: [{ rotate: `${rotateDeg}deg` }] }]}>
      {Array.from({ length: CROSSHATCH_LINES }, (_, i) => (
        <GlowBand
          key={i}
          centerLeft={(offset + i * (100 / CROSSHATCH_LINES)) % 100}
          color={preset.colors[i % preset.colors.length]}
        />
      ))}
    </View>
  );
}

// Anillos del resplandor radial: del más chico (centro, más opaco) al más
// grande (borde, casi transparente) — así el ojo lee un glow que se apaga
// hacia afuera. Antes iba al revés (el anillo más GRANDE era el más opaco),
// y como ese anillo pasaba del ancho de la carta, `cardClip` lo recortaba en
// seco — se veía un círculo grande cortado feo en vez de un brillo suave.
// El factor más alto (0.9) queda por debajo de 1 a propósito: nunca se pasa
// del lado más corto de la carta, así no hay nada que recortar.
const RADIAL_RINGS = [
  { factor: 0.9, opacity: 0.08 },
  { factor: 0.68, opacity: 0.14 },
  { factor: 0.48, opacity: 0.22 },
  { factor: 0.3, opacity: 0.32 },
  { factor: 0.15, opacity: 0.42 },
];

/** Resplandor radial (mechanic 'fullart') — anillos concéntricos que se desvanecen hacia afuera, como un reflejo en una superficie curva en vez de una franja recta. */
function RadialGlow({ preset, size }: { preset: HoloPreset; size: number }) {
  return (
    <>
      {RADIAL_RINGS.map(({ factor, opacity }, i) => {
        const d = size * factor;
        return (
          <View
            key={i}
            style={[
              styles.radialRing,
              {
                width: d,
                height: d,
                marginLeft: -d / 2,
                marginTop: -d / 2,
                borderRadius: d / 2,
                backgroundColor: preset.colors[i % preset.colors.length],
                opacity,
              },
            ]}
          />
        );
      })}
    </>
  );
}

// Destellos puntuales (además del sheen diagonal) — puntitos fijos en la
// carta que titilan solos en loop, independiente del tilt, como el sparkle
// real del foil visto de cerca. Cada uno es su propio componente (no un
// `.map` llamando hooks) porque cada punto necesita su propio shared value
// con fase/duración propia para no titilar todos sincronizados.
// 18 (antes 10) y con un piso de opacidad de 0.4 (antes 0.15) — se
// reportaron como "muy sutiles o muy poquitos". Cada uno suma un halo ancho
// y tenue detrás del punto brillante (mismo truco que GlowBand) para que se
// note más incluso cuando está en el valle del titileo.
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
  // El sheen diagonal se desplaza con el mismo tilt de arrastrar (tiltX/tiltY,
  // ya calculado arriba) — más visible cuanto más se inclina la carta, como
  // el reflejo que sigue el gesto en la app real. Se apaga sola al mostrar el
  // reverso (spin >= 90).
  const holoStyle = useAnimatedStyle(() => {
    if (!holoPreset) return { opacity: 0 };
    const magnitude = (Math.abs(tiltX.value) + Math.abs(tiltY.value)) / 50;
    return {
      opacity:
        spin.value < 90
          ? Math.min(holoPreset.maxOpacity, holoPreset.baseOpacity + magnitude)
          : 0,
      transform: [
        { translateX: tiltY.value * 4 },
        { translateY: tiltX.value * -4 },
      ],
    };
  });

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
              // El transform 3D (tiltStyle) va en este wrapper de afuera, sin
              // overflow propio — en Android, `overflow: hidden` no recorta
              // una vista que a la vez tiene rotateX/rotateY, así que el
              // holoOverlay (más grande que la carta, para poder barrerla en
              // diagonal) se veía sin recortar por toda la pantalla. El
              // recorte real vive en el `View` plano de adentro (cardClip),
              // que no tiene transform propio.
              <Animated.View style={[imageSize, tiltStyle]}>
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
                  {holoPreset ? (
                    <Animated.View
                      pointerEvents="none"
                      style={[styles.holoOverlay, holoStyle]}
                    >
                      {holoPreset.mechanic === 'radial' ? (
                        <RadialGlow preset={holoPreset} size={Math.min(cardWidth, cardHeight)} />
                      ) : holoPreset.mechanic === 'crosshatch' ? (
                        <>
                          <CrosshatchLines preset={holoPreset} rotateDeg={30} offset={0} />
                          <CrosshatchLines
                            preset={holoPreset}
                            rotateDeg={-30}
                            offset={50 / CROSSHATCH_LINES}
                          />
                        </>
                      ) : (
                        <BandGroup preset={holoPreset} rotateDeg={30} />
                      )}
                    </Animated.View>
                  ) : null}
                  {holoPreset ? (
                    <Animated.View
                      pointerEvents="none"
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
                  ) : null}
                </View>
              </Animated.View>
            ) : (
              <View style={imageSize} />
            )}
          </Animated.View>
        </GestureDetector>

        {imageUri ? (
          // Elegir a mano qué variante de brillo ver, para las 4 aunque la
          // carta no sea de esa rareza en realidad (para jugar/comparar) —
          // no se guarda, cada carta nueva vuelve a "Auto" solo.
          <View style={styles.styleRow} pointerEvents="box-none">
            {([null, ...HOLO_KINDS] as (HoloKind | null)[]).map(kind => {
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
  // Franja diagonal más grande que la carta (para que al rotarla 30° siga
  // cubriendo de punta a punta) — el `cardClip` de afuera la recorta a los
  // límites reales de la carta.
  sheenRotate: {
    position: 'absolute',
    top: '-60%',
    left: '-20%',
    width: '140%',
    height: '220%',
    transform: [{ rotate: '30deg' }],
  },
  sheenBand: { position: 'absolute', top: 0, bottom: 0 },
  radialRing: { position: 'absolute', top: '50%', left: '50%' },
  sparkle: { position: 'absolute', width: 7, height: 7, borderRadius: 4, marginLeft: -3.5, marginTop: -3.5 },
  sparkleHalo: { position: 'absolute', width: 16, height: 16, borderRadius: 8, marginLeft: -8, marginTop: -8 },
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
