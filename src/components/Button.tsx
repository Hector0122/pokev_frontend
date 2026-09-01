import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useTheme } from '../theme/ThemeContext';
import { radius, motion } from '../theme/tokens';
import LoadingSpinner from './LoadingSpinner';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type ButtonVariant = 'primary' | 'danger' | 'ghost';

interface Props {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  /**
   * primary (relleno, color de marca) · danger (relleno, semantic.danger) · ghost (texto, sin relleno)
   * Reemplaza al `color={colors.x}` del Button nativo de RN — ese componente
   * no acepta borderRadius y se ve distinto por plataforma, por eso no se usa.
   */
  variant?: ButtonVariant;
  style?: StyleProp<ViewStyle>;
  /**
   * Icono opcional a la izquierda del título (p.ej. `AppIcon` en algún CTA) —
   * desviación propia de PokeV sobre `arcd_kit/Button.tsx`:
   * el resto de la familia usa `MaterialCommunityIcons`, PokeV no (ver nota
   * en MainTabs.tsx). Prop opcional y aditiva, no rompe el resto de usos.
   */
  icon?: React.ReactNode;
}

/**
 * Botón estándar — el único que debería usarse en vez del `Button` nativo de
 * react-native. Ver arcd_kit/README.md#botones.
 *
 * Radio y curva de esquina tomados de referencia del estilo de controles de
 * Apple: esquina "continua" (superelipse, no arco circular) + radio ligero.
 * Mismo radio en las 6 apps — es lo que las hace sentir de la misma familia
 * aunque cada una tenga su propio `primary`.
 *
 * El feedback de press es un scale con `motion.spring.press` (Reanimated) —
 * mismo spring en las 6 apps, ver `## Motion` en el README.
 */
export default function Button({ title, onPress, disabled, loading, variant = 'primary', style, icon }: Props) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);

  const background =
    variant === 'primary' ? colors.primary : variant === 'danger' ? colors.danger : 'transparent';
  const textColor = variant === 'ghost' ? colors.textSecondary : '#FFFFFF';
  const isDisabled = disabled || loading;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={isDisabled}
      onPressIn={() => {
        scale.value = withSpring(0.96, motion.spring.press);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, motion.spring.press);
      }}
      style={[
        styles.base,
        { backgroundColor: background },
        isDisabled && styles.disabled,
        animatedStyle,
        style,
      ]}
    >
      {loading ? (
        <LoadingSpinner size={24} />
      ) : icon ? (
        <View style={styles.contentRow}>
          {icon}
          <Text style={[styles.text, { color: textColor }]}>{title}</Text>
        </View>
      ) : (
        <Text style={[styles.text, { color: textColor }]}>{title}</Text>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.sm,
    borderCurve: 'continuous', // esquina "continua" tipo iOS (RN 0.71+), no-op en Android
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  disabled: {
    opacity: 0.5,
  },
});
