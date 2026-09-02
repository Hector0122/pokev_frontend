import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';

interface Props {
  /** Emoji (string, tamaño fijo 48) o un nodo propio (p.ej. `AppIcon`) cuando el emoji no encaja temáticamente. */
  icon: string | React.ReactNode;
  title: string;
  description: string;
}

/**
 * Placeholder consistente para las pantallas cuyo contenido real (formularios,
 * grids de cartas, etc.) se construye en la siguiente change de OpenSpec —
 * ver openspec/changes/. Ya navegable y con el theme aplicado.
 */
export default function PlaceholderScreen({ icon, title, description }: Props) {
  const { colors, spacing, type, fontFamily } = useTheme();
  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.container, { backgroundColor: colors.background, padding: spacing.xxl, gap: spacing.sm }]}
    >
      {typeof icon === 'string' ? <Text style={styles.icon}>{icon}</Text> : icon}
      {/* Sin spreadear `type.h1` (trae fontWeight, rompe la fuente custom en
          Android — ver nota junto a `label`/`caption` en theme/tokens.ts). */}
      <Text
        style={[
          styles.textCenter,
          { fontSize: type.h1.fontSize, lineHeight: type.h1.lineHeight, fontFamily: fontFamily.display, color: colors.text },
        ]}
      >
        {title}
      </Text>
      <Text style={[styles.textCenter, { ...type.body, color: colors.textSecondary }]}>
        {description}
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 48 },
  textCenter: { textAlign: 'center' },
});
