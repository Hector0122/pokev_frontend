import React, { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQueries } from '@tanstack/react-query';
import { useTheme } from '../theme/ThemeContext';
import { cardPriceQuery, useCards } from '../hooks/queries/useCards';
import { cardArtwork, cardTitle } from '../services/cardDisplay';
import { formatPrice, type CardPrice } from '../services/tcgdex';
import { pickValuePair } from '../services/games';
import { buzz } from '../services/haptics';
import ScreenHeader from '../components/ScreenHeader';
import Confetti from '../components/Confetti';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import type { Card } from '../api/types';

type Priced = { card: Card; price: CardPrice; amount: number };

/** "¿Cuál vale más?" — dos cartas propias con precio en USD; adiviná cuál cuesta más. */
export default function ValueGameScreen() {
  const { colors, spacing, radius, type, fontFamily, elevation } = useTheme();
  const cardsQuery = useCards();
  const all = useMemo(() => cardsQuery.data ?? [], [cardsQuery.data]);
  const priceQueries = useQueries({ queries: all.map((card) => cardPriceQuery(card)) });
  const loading = cardsQuery.isLoading || priceQueries.some((q) => q.isLoading);

  // Solo USD, para comparar peras con peras.
  const priced: Priced[] = all.flatMap((card, i) => {
    const price = priceQueries[i]?.data;
    return price?.currency === 'USD' ? [{ card, price, amount: price.amount }] : [];
  });

  const [pair, setPair] = useState<[Priced, Priced] | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);

  useEffect(() => {
    if (!pair && !loading) setPair(pickValuePair(priced));
  }, [pair, loading, priced]);

  const winnerId = pair ? (pair[0].amount > pair[1].amount ? pair[0].card.id : pair[1].card.id) : null;
  const correct = chosen !== null && chosen === winnerId;

  function choose(id: string) {
    if (chosen) return;
    setChosen(id);
    if (id === winnerId) {
      buzz('win');
      setStreak((s) => {
        setBest((b) => Math.max(b, s + 1));
        return s + 1;
      });
    } else {
      buzz();
      setStreak(0);
    }
  }

  function nextRound() {
    setChosen(null);
    setPair(pickValuePair(priced));
  }

  const header = (
    <ScreenHeader
      title="¿Cuál vale más?"
      right={<Text style={{ ...type.h2, color: colors.text }}>🔥 {streak}</Text>}
    />
  );

  if (loading && !pair) {
    return (
      <SafeAreaView style={[styles.flex1, { backgroundColor: colors.background }]}>
        {header}
        <View style={[styles.flex1, styles.center, { gap: spacing.md }]}>
          <LoadingSpinner />
          <Text style={{ ...type.body, color: colors.textSecondary }}>Preguntando precios…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!pair) {
    return (
      <SafeAreaView style={[styles.flex1, { backgroundColor: colors.background }]}>
        {header}
        <EmptyState
          icon="💰"
          title="¡Necesitamos más cartas con precio!"
          description="Cuando tengamos al menos 2 cartas con precio distinto, podemos jugar."
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.flex1, { backgroundColor: colors.background }]}>
      {header}
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
        <Text style={[styles.textCenter, { ...type.body, color: colors.textSecondary }]}>
          {chosen ? (correct ? '¡Correcto! 🎉' : '¡Uy, casi!') : 'Tocá la carta que creés que vale más'}
        </Text>
        <View style={[styles.row, { gap: spacing.md }]}>
          {pair.map(({ card, price }) => {
            const isWinner = chosen !== null && card.id === winnerId;
            const isWrongPick = chosen === card.id && !correct;
            return (
              <Pressable
                key={card.id}
                onPress={() => choose(card.id)}
                style={[
                  styles.option,
                  {
                    gap: spacing.xs,
                    padding: spacing.sm,
                    borderRadius: radius.lg,
                    backgroundColor: colors.cardBg,
                    borderColor: isWinner ? colors.success : isWrongPick ? colors.danger : colors.border,
                    ...elevation.sm,
                  },
                ]}
              >
                {cardArtwork(card) ? (
                  <Image source={{ uri: cardArtwork(card)! }} style={styles.image} resizeMode="contain" />
                ) : null}
                <Text numberOfLines={1} style={[styles.capitalize, { ...type.bodySm, color: colors.text }]}>
                  {cardTitle(card)}
                </Text>
                <Text style={{ ...type.h2, fontFamily: fontFamily.display, color: isWinner ? colors.success : colors.text }}>
                  {chosen ? `${isWinner ? '👑 ' : ''}${formatPrice(price)}` : '???'}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {chosen ? <Button title="Otra ronda" onPress={nextRound} /> : null}
        {best > 0 ? (
          <Text style={[styles.textCenter, { ...type.caption, color: colors.textSecondary }]}>Mejor racha: {best} 🔥</Text>
        ) : null}
      </ScrollView>
      {correct ? <Confetti key={streak} /> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row' },
  option: { flex: 1, alignItems: 'center', borderWidth: 3 },
  image: { width: '100%', aspectRatio: 2.5 / 3.5 },
  textCenter: { textAlign: 'center' },
  capitalize: { textTransform: 'capitalize' },
});
