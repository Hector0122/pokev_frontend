import React, { useEffect } from 'react';
import { Modal, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

interface Props {
  visible: boolean;
  imageUri: string | null;
  onClose: () => void;
}

/**
 * Visor a pantalla completa con pinch-to-zoom y flip (tap simple) para la
 * foto de una carta. Antes, tocar la imagen en CardDetailScreen navegaba a
 * la especie del Pokémon (ya duplicado por el enlace "Ver Pokémon →"
 * debajo) y no había forma de verla en grande — importa más ahora que la
 * imagen es la foto real escaneada (recortada), no solo arte genérico.
 *
 * El flip (girar y mostrar el reverso — `card_reverse.png`, el mismo dibujo
 * genérico para todas las cartas) SOLO existe acá, no en el widget de
 * pantalla de inicio: ahí es imposible animar nada (RemoteViews, ver
 * favoritesWidget.ts), pero acá corre en nuestro propio proceso con
 * Reanimated, igual que el zoom.
 */
export default function ImageViewerModal({ visible, imageUri, onClose }: Props) {
  const { width, height } = useWindowDimensions();

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  // 0 = mostrando el frente, 180 = mostrando el reverso — ver frontStyle/backStyle.
  // Se mueve libre mientras se arrastra (pan) y "cae" al lado más cercano al soltar.
  const flipRotation = useSharedValue(0);
  const isFlipped = useSharedValue(false);
  const dragStartRotation = useSharedValue(0);

  // Arranca siempre sin zoom y mostrando el frente, no importa cómo quedó la última carta que se vio.
  useEffect(() => {
    if (!visible) return;
    scale.value = 1;
    savedScale.value = 1;
    translateX.value = 0;
    translateY.value = 0;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
    flipRotation.value = 0;
    isFlipped.value = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, imageUri]);

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.max(1, Math.min(savedScale.value * e.scale, 5));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  // Sin zoom, arrastrar gira la carta siguiendo el dedo (de punta a punta de
  // la pantalla, varias veces, = una vuelta completa) — pedido explícito:
  // "que vaya siguiendo el dedo", no solo el toggle de golpe del tap. Con
  // zoom, el mismo gesto sigue arrastrando la imagen para explorarla
  // (comportamiento de antes) — un solo `pan`, ramificado por si hay zoom o no.
  //
  // `activeOffsetX([-8, 8])`: sin esto, el gesto arrancaba con el roce más
  // mínimo (hasta un tap accidentalmente lo activaba un toque) — "apenas
  // pongo el dedo y ya está girando como loca". Ahora hace falta arrastrar
  // de verdad al menos 8dp para que empiece a girar. La sensibilidad también
  // bajó bastante (antes: ancho de pantalla completo = 180°, se sentía muy
  // brusco) — ahora hacen falta ~2.5 pantallas de arrastre para una vuelta.
  const pan = Gesture.Pan()
    .activeOffsetX([-8, 8])
    .onStart(() => {
      dragStartRotation.value = flipRotation.value;
    })
    .onUpdate((e) => {
      if (savedScale.value > 1) {
        translateX.value = savedTranslateX.value + e.translationX;
        translateY.value = savedTranslateY.value + e.translationY;
        return;
      }
      // Pequeño margen de rebote (-20/200) al pasar de los extremos, para que no se sienta "topado" en seco.
      const next = dragStartRotation.value + (e.translationX / (width * 2.5)) * 180;
      flipRotation.value = Math.max(-20, Math.min(200, next));
    })
    .onEnd(() => {
      if (savedScale.value > 1) {
        savedTranslateX.value = translateX.value;
        savedTranslateY.value = translateY.value;
        return;
      }
      const restingRotation = flipRotation.value <= 90 ? 0 : 180;
      isFlipped.value = restingRotation === 180;
      flipRotation.value = withSpring(restingRotation, { damping: 15 });
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
      isFlipped.value = !isFlipped.value;
      flipRotation.value = withSpring(isFlipped.value ? 180 : 0, { damping: 15 });
    });

  const composed = Gesture.Simultaneous(pinch, pan, Gesture.Exclusive(doubleTap, singleTap));

  const zoomStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }, { scale: scale.value }],
  }));

  // Dos caras superpuestas (position: absolute, una encima de la otra) que
  // giran juntas. `backfaceVisibility: hidden` (lo que "debería" ocultar
  // cada cara al pasar los 90°) no anda en Android en esta versión de RN —
  // se ve el reverso de entrada, encima del frente, sin importar el ángulo.
  // Por eso la ocultamos a mano con `opacity` según de qué lado del giro
  // está `flipRotation` (0-90 = frente visible, 90-180 = reverso visible).
  // La del reverso arranca ya girada 180° (por eso el rango de interpolación
  // es [180, 360], no [0, 180]) para que gire "para el mismo lado" que el frente.
  const frontStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1200 }, { rotateY: `${flipRotation.value}deg` }],
    opacity: flipRotation.value < 90 ? 1 : 0,
  }));
  const backStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1200 }, { rotateY: `${interpolate(flipRotation.value, [0, 180], [180, 360])}deg` }],
    opacity: flipRotation.value < 90 ? 0 : 1,
  }));

  const imageSize = { width: width * 0.92, height: height * 0.75 };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {/* `Modal` de RN abre su propia ventana nativa — el `GestureHandlerRootView`
          de App.tsx no la alcanza, así que sin este segundo acá los gestos
          (tap simple para voltear, sobre todo) no se reconocían bien: el
          pinch/pan "colaban" por accidente pero el tap nunca disparaba. */}
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.92)' }}>
        <Pressable
          onPress={onClose}
          hitSlop={16}
          accessibilityRole="button"
          accessibilityLabel="Cerrar"
          style={{
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
          }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 22 }}>✕</Text>
        </Pressable>

        <GestureDetector gesture={composed}>
          <Animated.View style={[{ flex: 1, alignItems: 'center', justifyContent: 'center' }, zoomStyle]}>
            {imageUri ? (
              <View style={imageSize}>
                <Animated.Image
                  source={{ uri: imageUri }}
                  style={[{ width: '100%', height: '100%', backfaceVisibility: 'hidden' }, frontStyle]}
                  resizeMode="contain"
                />
                <Animated.Image
                  source={require('../../assets/icons/card_reverse.png')}
                  style={[
                    { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backfaceVisibility: 'hidden' },
                    backStyle,
                  ]}
                  resizeMode="contain"
                />
              </View>
            ) : null}
          </Animated.View>
        </GestureDetector>
      </GestureHandlerRootView>
    </Modal>
  );
}
