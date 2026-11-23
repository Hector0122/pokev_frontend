import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

const PIECES = ['🎉', '✨', '⭐', '🌟', '💫', '🎊'];
const COUNT = 28;

/** Una pieza = su propio shared value (como `Sparkle` en ImageViewerModal), si no caerían todas sincronizadas. */
function Piece({ emoji, x, delay, height }: { emoji: string; x: number; delay: number; height: number }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withDelay(delay, withTiming(1, { duration: 2200, easing: Easing.out(Easing.quad) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const style = useAnimatedStyle(() => ({
    opacity: progress.value === 0 ? 0 : 1 - progress.value * 0.7,
    transform: [{ translateY: -40 + progress.value * (height + 80) }, { rotate: `${progress.value * 540}deg` }],
  }));
  return (
    <Animated.View style={[styles.piece, { left: x }, style]}>
      <Text style={styles.emoji}>{emoji}</Text>
    </Animated.View>
  );
}

/** Lluvia de confeti de una sola pasada — se monta cuando hay algo que celebrar. */
export default function Confetti() {
  const { width, height } = useWindowDimensions();
  const pieces = useMemo(
    () =>
      Array.from({ length: COUNT }, (_, i) => ({
        emoji: PIECES[i % PIECES.length],
        x: Math.random() * (width - 24),
        delay: Math.random() * 600,
      })),
    [width],
  );
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((p, i) => (
        <Piece key={i} {...p} height={height} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  piece: { position: 'absolute', top: 0 },
  emoji: { fontSize: 24 },
});
