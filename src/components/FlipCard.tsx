import React, { useEffect } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import RareShine from './RareShine';

const CARD_RATIO = 3.5 / 2.5; // alto/ancho de una carta TCG real

/**
 * Carta que empieza boca abajo (el dorso de assets/icons) y se voltea al
 * pasar `flipped` a true — "abrir carta" y la batalla la usan.
 */
export default function FlipCard({
  imageUri,
  flipped,
  width,
  rarity,
}: {
  imageUri: string | null;
  flipped: boolean;
  width: number;
  rarity?: string | null;
}) {
  const turn = useSharedValue(0);
  useEffect(() => {
    turn.value = withSpring(flipped ? 1 : 0, { damping: 14, stiffness: 90 });
  }, [flipped, turn]);

  const backStyle = useAnimatedStyle(() => ({
    opacity: turn.value < 0.5 ? 1 : 0,
    transform: [{ perspective: 1000 }, { rotateY: `${interpolate(turn.value, [0, 1], [0, 180])}deg` }],
  }));
  const frontStyle = useAnimatedStyle(() => ({
    opacity: turn.value >= 0.5 ? 1 : 0,
    transform: [{ perspective: 1000 }, { rotateY: `${interpolate(turn.value, [0, 1], [-180, 0])}deg` }],
  }));

  const size = { width, height: width * CARD_RATIO };
  return (
    <View style={size}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.face, backStyle]}>
        <Image source={require('../../assets/icons/card_reverse.png')} style={size} resizeMode="contain" />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, styles.face, frontStyle]}>
        {imageUri ? <Image source={{ uri: imageUri }} style={size} resizeMode="contain" /> : null}
        {flipped ? <RareShine rarity={rarity} /> : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  face: { backfaceVisibility: 'hidden', borderRadius: 12, overflow: 'hidden' },
});
