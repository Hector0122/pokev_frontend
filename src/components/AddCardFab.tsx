import React from 'react';
import { Pressable, StyleProp, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useTheme } from '../theme/ThemeContext';
import { motion } from '../theme/tokens';
import AppIcon from './AppIcon';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface Props {
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * Botón flotante de "agregar carta" — solo la pokébola, sin texto (pedido
 * explícito: reemplaza al `Button` con label que había antes). Mismo
 * feedback de tap (spring) que `Button.tsx`, ver `arcd_kit/README.md#motion`.
 */
export default function AddCardFab({ onPress, style }: Props) {
  const { elevation } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.92, motion.spring.press);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, motion.spring.press);
      }}
      accessibilityRole="button"
      accessibilityLabel="Agregar carta"
      style={[
        {
          position: 'absolute',
          right: 20,
          bottom: 20,
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: '#FFFFFF',
          alignItems: 'center',
          justifyContent: 'center',
        },
        elevation.lg,
        animatedStyle,
        style,
      ]}
    >
      <AppIcon name="pokebola" size={56} />
    </AnimatedPressable>
  );
}
