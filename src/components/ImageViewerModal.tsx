import React, { useEffect } from 'react';
import { Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

interface Props {
  visible: boolean;
  imageUri: string | null;
  onClose: () => void;
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
export default function ImageViewerModal({ visible, imageUri, onClose }: Props) {
  const { width, height } = useWindowDimensions();

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, imageUri]);

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
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
    .onUpdate((e) => {
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

  const composed = Gesture.Simultaneous(pinch, pan, Gesture.Exclusive(doubleTap, singleTap));

  const zoomStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }, { scale: scale.value }],
  }));

  const tiltStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1000 }, { rotateX: `${tiltX.value}deg` }, { rotateY: `${tiltY.value}deg` }],
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

  const imageSize = { width: width * 0.92, height: height * 0.75 };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
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
              <Animated.View style={[imageSize, tiltStyle]}>
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
              </Animated.View>
            ) : (
              <View style={imageSize} />
            )}
          </Animated.View>
        </GestureDetector>
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
});
