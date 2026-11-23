import React, { useMemo } from 'react';
import { Image, Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../theme/ThemeContext';
import { useCards } from '../hooks/queries/useCards';
import { fetchSetsList, setIdFromCardId, type TcgSet } from '../services/tcgdex';
import ScreenHeader from '../components/ScreenHeader';
import QueryState from '../components/QueryState';
import type { RootStackParamList } from '../navigation/types';

/** Cuántas cartas propias hay por expansión (por tcgdexId, o por nombre en las cartas viejas). */
export function ownedCountBySet(
  cards: { tcgdexId: string | null; setName: string }[],
  sets: TcgSet[],
): Map<string, number> {
  const byName = new Map(sets.map((s) => [s.name.trim().toLowerCase(), s.id]));
  const counts = new Map<string, number>();
  for (const card of cards) {
    const setId = card.tcgdexId ? setIdFromCardId(card.tcgdexId) : byName.get(card.setName.trim().toLowerCase());
    if (setId) counts.set(setId, (counts.get(setId) ?? 0) + 1);
  }
  return counts;
}

function pairs<T>(items: T[]): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2));
  return rows;
}

/**
 * Expansiones — primero las nuestras (con cuántas cartas tenemos), después
 * el resto para explorar, de la más nueva a la más vieja. Nunca "te faltan X" (§3.1).
 */
export default function SetsScreen() {
  const { colors, spacing, radius, type, elevation } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const setsQuery = useQuery({ queryKey: ['tcgSets'], queryFn: fetchSetsList, staleTime: Infinity });
  const cards = useCards().data;

  const sections = useMemo(() => {
    const sets = setsQuery.data ?? [];
    const counts = ownedCountBySet(cards ?? [], sets);
    const ours = sets.filter((s) => counts.has(s.id)).sort((a, b) => counts.get(b.id)! - counts.get(a.id)!);
    const rest = sets.filter((s) => !counts.has(s.id)).reverse();
    return [
      ...(ours.length ? [{ key: 'ours', title: '⭐ Nuestras expansiones', data: pairs(ours), counts }] : []),
      { key: 'rest', title: '🧭 Más para explorar', data: pairs(rest), counts },
    ];
  }, [setsQuery.data, cards]);

  return (
    <SafeAreaView style={[styles.flex1, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Expansiones" />
      <QueryState isLoading={setsQuery.isLoading} error={setsQuery.error} onRetry={() => setsQuery.refetch()}>
        <SectionList
          sections={sections}
          keyExtractor={(row) => row.map((s) => s.id).join()}
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.huge }}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <Text style={{ ...type.h2, color: colors.text, marginTop: spacing.md, marginBottom: spacing.xs }}>
              {section.title}
            </Text>
          )}
          renderItem={({ item: row, section }) => (
            <View style={[styles.row, { gap: spacing.sm }]}>
              {row.map((set) => {
                const count = section.counts.get(set.id);
                return (
                  <Pressable
                    key={set.id}
                    onPress={() => navigation.navigate('SetDetail', { setId: set.id, setName: set.name })}
                    style={[
                      styles.tile,
                      { gap: spacing.xs, padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.cardBg, ...elevation.sm },
                    ]}
                  >
                    {set.logo ? (
                      <Image source={{ uri: `${set.logo}.png` }} style={styles.logo} resizeMode="contain" />
                    ) : (
                      <Text style={styles.logoFallback}>📦</Text>
                    )}
                    <Text numberOfLines={2} style={[styles.textCenter, { ...type.caption, color: colors.text }]}>
                      {set.name}
                    </Text>
                    {count ? (
                      <Text style={{ ...type.label, color: colors.primary }}>🃏 {count}</Text>
                    ) : null}
                  </Pressable>
                );
              })}
              {row.length === 1 ? <View style={styles.tile} /> : null}
            </View>
          )}
        />
      </QueryState>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  row: { flexDirection: 'row' },
  tile: { flex: 1, alignItems: 'center' },
  logo: { width: '100%', height: 56 },
  logoFallback: { fontSize: 40 },
  textCenter: { textAlign: 'center' },
});
