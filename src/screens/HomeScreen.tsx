import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import type { MainTabParamList } from '../navigation/types';

// Datos de ejemplo — la pantalla real se conecta a la colección local en
// V0.1 (ver CLAUDE.md, "V0.1 es local-only"). El objetivo de este mock es
// que la pantalla ya se vea y navegue como en el spec (§4) mientras se
// conecta a datos reales en la siguiente change de OpenSpec.
const MOCK_STATS = {
  totalCards: 0,
  discoveredPokemon: 0,
  favorites: 0,
};
const NEXT_MILESTONE = { title: '10 cartas', icon: '🃏' };

const QUICK_LINKS: Array<{
  icon: string;
  label: string;
  tab: keyof MainTabParamList;
}> = [
  { icon: '🃏', label: 'Mi colección', tab: 'Coleccion' },
  { icon: '🔎', label: 'Buscar cartas', tab: 'Buscador' },
  { icon: '📖', label: 'Nuestros Pokémon', tab: 'Pokedex' },
  { icon: '🏆', label: 'Logros', tab: 'Logros' },
  { icon: '❤️', label: 'Favoritas', tab: 'Favoritos' },
];

export default function HomeScreen() {
  const { colors, spacing, radius, type, fontFamily } = useTheme();
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();

  return (
    // edges sin "bottom": la tab bar de abajo ya respeta su propio inset.
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'left', 'right']}>
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}
    >
      <Text style={{ ...type.display, fontFamily: fontFamily.display, color: colors.text }}>
        Nuestra colección
      </Text>

      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <StatPill icon="🃏" value={MOCK_STATS.totalCards} label="cartas" />
        <StatPill icon="⚡" value={MOCK_STATS.discoveredPokemon} label="Pokémon" />
        <StatPill icon="⭐" value={MOCK_STATS.favorites} label="favoritas" />
      </View>

      <View
        style={{
          backgroundColor: colors.primarySoft,
          borderRadius: radius.lg,
          padding: spacing.lg,
        }}
      >
        <Text style={{ ...type.label, color: colors.primary }}>PRÓXIMO LOGRO</Text>
        <Text style={{ ...type.h1, color: colors.text, marginTop: spacing.xxs }}>
          {NEXT_MILESTONE.icon} {NEXT_MILESTONE.title}
        </Text>
      </View>

      <View style={{ gap: spacing.sm }}>
        {QUICK_LINKS.map((link) => (
          <QuickLink
            key={link.tab}
            icon={link.icon}
            label={link.label}
            onPress={() => navigation.navigate(link.tab)}
          />
        ))}
      </View>
    </ScrollView>
    </SafeAreaView>
  );
}

function StatPill({ icon, value, label }: { icon: string; value: number; label: string }) {
  const { colors, spacing, radius, type, fontFamily } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.cardBg,
        borderRadius: radius.md,
        padding: spacing.sm,
        alignItems: 'center',
        gap: spacing.xxs,
      }}
    >
      <Text style={{ fontSize: 22 }}>{icon}</Text>
      {/* No se spreadea `type.h1` acá: trae `fontWeight`, y combinarlo con
          `fontFamily.mono` rompe la resolución de fuente en Android (ver
          nota en tokens.ts junto a `label`/`caption`). */}
      <Text style={{ fontSize: type.h1.fontSize, lineHeight: type.h1.lineHeight, fontFamily: fontFamily.mono, color: colors.text }}>
        {value}
      </Text>
      <Text style={{ ...type.caption, color: colors.textSecondary }}>{label}</Text>
    </View>
  );
}

function QuickLink({
  icon,
  label,
  onPress,
}: {
  icon: string;
  label: string;
  onPress: () => void;
}) {
  const { colors, spacing, radius, type } = useTheme();
  return (
    <Text
      onPress={onPress}
      style={{
        ...type.body,
        color: colors.text,
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      {icon}  {label}
    </Text>
  );
}
