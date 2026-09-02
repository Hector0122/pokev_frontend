import React, { useEffect } from 'react';
import { Modal, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

interface Props {
  visible: boolean;
  imageUri: string | null;
  onClose: () => void;
}

/**
 * Visor a pantalla completa con pinch-to-zoom para la foto de una carta.
 * Antes, tocar la imagen en CardDetailScreen navegaba a la especie del
 * Pokémon (ya duplicado por el enlace "Ver Pokémon →" debajo) y no había
 * forma de verla en grande — importa más ahora que la imagen es la foto
 * real escaneada (recortada), no solo arte genérico.
 */
export default function ImageViewerModal({ visible, imageUri, onClose }: Props) {
  const { width, height } = useWindowDimensions();

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  // Arranca siempre sin zoom, no importa cómo quedó la última carta que se vio.
  useEffect(() => {
    if (!visible) return;
    scale.value = 1;
    savedScale.value = 1;
    translateX.value = 0;
    translateY.value = 0;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, imageUri]);

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.max(1, Math.min(savedScale.value * e.scale, 5));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      if (savedScale.value <= 1) return; // sin zoom no hay nada que arrastrar
      translateX.value = savedTranslateX.value + e.translationX;
      translateY.value = savedTranslateY.value + e.translationY;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
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

  const composed = Gesture.Simultaneous(pinch, pan, doubleTap);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }, { scale: scale.value }],
  }));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.92)' }}>
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
          <Animated.View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            {imageUri ? (
              <Animated.Image
                source={{ uri: imageUri }}
                style={[{ width: width * 0.92, height: height * 0.75 }, animatedStyle]}
                resizeMode="contain"
              />
            ) : null}
          </Animated.View>
        </GestureDetector>
      </View>
    </Modal>
  );
}
