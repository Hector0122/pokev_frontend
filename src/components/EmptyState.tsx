import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import Button from './Button';

interface Props {
  /** Emoji (string, tamaño fijo 56) o un nodo propio (p.ej. `AppIcon`) cuando el emoji no encaja temáticamente. */
  icon: string | React.ReactNode;
  title: string;
  description: string;
  ctaLabel?: string;
  /** Icono opcional a la izquierda del CTA — ver `Button.icon`. */
  ctaIcon?: React.ReactNode;
  onPressCta?: () => void;
}

/**
 * Estado vacío amigable — nunca "0 de X" (§3.1), siempre una invitación a
 * la primera acción. Usado en Colección, Nuestros Pokémon y Favoritas.
 */
export default function EmptyState({ icon, title, description, ctaLabel, ctaIcon, onPressCta }: Props) {
  const { colors, spacing, type, fontFamily } = useTheme();
  return (
    <View style={[styles.container, { padding: spacing.xxl, gap: spacing.sm }]}>
      {typeof icon === 'string' ? <Text style={styles.icon}>{icon}</Text> : icon}
      <Text
        style={[
          styles.textCenter,
          { fontSize: type.h1.fontSize, lineHeight: type.h1.lineHeight, fontFamily: fontFamily.display, color: colors.text },
        ]}
      >
        {title}
      </Text>
      <Text style={[styles.textCenter, { ...type.body, color: colors.textSecondary }]}>{description}</Text>
      {ctaLabel && onPressCta ? (
        <Button title={ctaLabel} icon={ctaIcon} onPress={onPressCta} style={{ marginTop: spacing.md }} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 56 },
  textCenter: { textAlign: 'center' },
});
