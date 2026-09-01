import React from 'react';
import { Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';

interface Props {
  icon: string;
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
      style={{
        flex: 1,
        backgroundColor: colors.background,
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.xxl,
        gap: spacing.sm,
      }}
    >
      <Text style={{ fontSize: 48 }}>{icon}</Text>
      {/* Sin spreadear `type.h1` (trae fontWeight, rompe la fuente custom en
          Android — ver nota junto a `label`/`caption` en theme/tokens.ts). */}
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
      <Text style={{ ...type.body, color: colors.textSecondary, textAlign: 'center' }}>
        {description}
      </Text>
    </SafeAreaView>
  );
}
