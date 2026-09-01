import React from 'react';
import { Modal, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import Button from './Button';

interface Props {
  visible: boolean;
  /** Emoji (string, tamaño fijo 64) o un nodo propio (p.ej. `AppIcon`) cuando el emoji no encaja temáticamente. */
  icon: string | React.ReactNode;
  title: string;
  subtitle?: string;
  onDismiss: () => void;
}

/**
 * Momento celebratorio compartido — "¡Nuevo Pokémon descubierto!" (§10) y
 * desbloqueo de logro (§15). Siempre en positivo, nunca compara contra lo
 * que falta (§3.1).
 */
export default function CelebrationModal({ visible, icon, title, subtitle, onDismiss }: Props) {
  const { colors, spacing, radius, type, fontFamily, elevation } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View
        style={{
          flex: 1,
          backgroundColor: colors.overlay,
          alignItems: 'center',
          justifyContent: 'center',
          padding: spacing.xl,
        }}
      >
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: radius.xl,
            padding: spacing.xxl,
            alignItems: 'center',
            gap: spacing.sm,
            maxWidth: 360,
            width: '100%',
            ...elevation.lg,
          }}
        >
          {typeof icon === 'string' ? <Text style={{ fontSize: 64 }}>{icon}</Text> : icon}
          <Text
            style={{
              fontSize: type.h1.fontSize,
              lineHeight: type.h1.lineHeight,
              fontFamily: fontFamily.display,
              color: colors.text,
              textAlign: 'center',
            }}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text style={{ ...type.body, color: colors.textSecondary, textAlign: 'center' }}>{subtitle}</Text>
          ) : null}
          <Button title="¡Genial!" onPress={onDismiss} style={{ marginTop: spacing.md, alignSelf: 'stretch' }} />
        </View>
      </View>
    </Modal>
  );
}
