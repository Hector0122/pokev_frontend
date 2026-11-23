import React, { useMemo, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../theme/ThemeContext';
import { useCards } from '../hooks/queries/useCards';
import { ownedMatcher } from '../services/cardDisplay';
import { cardImageUrl, searchCards, type TcgCardSummary } from '../services/tcgdex';
import ScreenHeader from '../components/ScreenHeader';
import QueryState from '../components/QueryState';
import ImageViewerModal from '../components/ImageViewerModal';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'SetDetail'>;

const byNumber = (a: TcgCardSummary, b: TcgCardSummary) =>
  (parseInt(a.localId, 10) || 0) - (parseInt(b.localId, 10) || 0) || a.localId.localeCompare(b.localId);

/**
 * Una expansión completa: nuestras cartas a todo color, las demás apagadas
 * para descubrirlas. El contador solo dice cuántas tenemos — nunca "de X" (§3.1).
 */
export default function SetDetailScreen({ route }: Props) {
  const { setId, setName } = route.params;
  const { colors, spacing, radius, type, fontFamily } = useTheme();
  const setQuery = useQuery({
    queryKey: ['tcgSet', setId],
    queryFn: () => searchCards({ setId }),
    staleTime: Infinity,
  });
  const myCards = useCards().data;
  const isOwned = useMemo(() => ownedMatcher(myCards ?? []), [myCards]);
  const [viewing, setViewing] = useState<string | null>(null);

  const cards = useMemo(() => [...(setQuery.data ?? [])].sort(byNumber), [setQuery.data]);
  const ownedCount = cards.filter(isOwned).length;

  return (
    <SafeAreaView style={[styles.flex1, { backgroundColor: colors.background }]}>
      <ScreenHeader title={setName} />
      <QueryState isLoading={setQuery.isLoading} error={setQuery.error} onRetry={() => setQuery.refetch()}>
        <FlatList
          data={cards}
          keyExtractor={(card) => card.id}
          numColumns={3}
          columnWrapperStyle={{ gap: spacing.sm }}
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.huge }}
          ListHeaderComponent={
            <View
              style={[
                styles.banner,
                { padding: spacing.md, marginBottom: spacing.sm, borderRadius: radius.lg, backgroundColor: colors.accentSoft },
              ]}
            >
              <Text style={[styles.textCenter, { ...type.h2, fontFamily: fontFamily.display, color: colors.text }]}>
                {ownedCount > 0
                  ? `¡Tenemos ${ownedCount} ${ownedCount === 1 ? 'carta' : 'cartas'} de esta expansión! ✨`
                  : '¡A descubrir esta expansión! 🧭'}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const owned = isOwned(item);
            return (
              <Pressable
                onPress={() => item.image && setViewing(cardImageUrl(item.image, 'high', 'png'))}
                style={[styles.cell, { borderRadius: radius.sm }]}
              >
                {item.image ? (
                  <Image
                    source={{ uri: cardImageUrl(item.image) }}
                    style={[styles.image, owned ? null : styles.notOwned]}
                    resizeMode="contain"
                  />
                ) : (
                  <View style={[styles.image, styles.placeholder, { backgroundColor: colors.surfaceAlt }]}>
                    <Text style={{ ...type.caption, color: colors.textSecondary }}>#{item.localId}</Text>
                  </View>
                )}
                {owned ? <Text style={styles.ownedBadge}>✅</Text> : null}
              </Pressable>
            );
          }}
        />
      </QueryState>
      <ImageViewerModal visible={!!viewing} imageUri={viewing} onClose={() => setViewing(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  banner: { alignItems: 'center' },
  textCenter: { textAlign: 'center' },
  cell: { flex: 1 / 3, overflow: 'hidden' },
  image: { width: '100%', aspectRatio: 2.5 / 3.5 },
  // Apagadas y en gris: se ven para descubrirlas, pero las nuestras resaltan.
  notOwned: { opacity: 0.35, filter: [{ grayscale: 1 }] },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  ownedBadge: { position: 'absolute', top: 4, right: 4, fontSize: 16 },
});
