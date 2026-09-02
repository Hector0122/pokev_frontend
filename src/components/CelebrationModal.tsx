import React from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
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
      <View style={[styles.backdrop, { backgroundColor: colors.overlay, padding: spacing.xl }]}>
        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.xxl, gap: spacing.sm, ...elevation.lg },
          ]}
        >
          {typeof icon === 'string' ? <Text style={styles.icon}>{icon}</Text> : icon}
          <Text
            style={[
              styles.textCenter,
              { fontSize: type.h1.fontSize, lineHeight: type.h1.lineHeight, fontFamily: fontFamily.display, color: colors.text },
            ]}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text style={[styles.textCenter, { ...type.body, color: colors.textSecondary }]}>{subtitle}</Text>
          ) : null}
          <Button title="¡Genial!" onPress={onDismiss} style={[styles.stretchTop, { marginTop: spacing.md }]} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: { alignItems: 'center', maxWidth: 360, width: '100%' },
  icon: { fontSize: 64 },
  textCenter: { textAlign: 'center' },
  stretchTop: { alignSelf: 'stretch' },
});
