import React, { useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
import { useCards } from '../hooks/queries/useCards';
import { useTrainers } from '../hooks/queries/useTrainers';
import CardTile from '../components/CardTile';
import EmptyState from '../components/EmptyState';
import AppIcon from '../components/AppIcon';
import QueryState from '../components/QueryState';
import type { RootStackParamList } from '../navigation/types';
import type { Card, TrainerRole } from '../api/types';

function CardRow({ cards, onPressCard }: { cards: Card[]; onPressCard: (id: string) => void }) {
  const { spacing } = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
      {cards.map((card) => (
        <View key={card.id} style={{ width: 120 }}>
          <CardTile card={card} onPress={() => onPressCard(card.id)} />
        </View>
      ))}
    </ScrollView>
  );
}

function Section({ title, cards, onPressCard }: { title: string; cards: Card[]; onPressCard: (id: string) => void }) {
  const { colors, spacing, type } = useTheme();
  if (cards.length === 0) return null;
  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={{ ...type.h2, color: colors.text }}>{title}</Text>
      <CardRow cards={cards} onPressCard={onPressCard} />
    </View>
  );
}

type Props = NativeStackScreenProps<RootStackParamList, 'Special'>;

/**
 * Favoritas (§11) y Cartas especiales (§12) — ya no es una tab, se llega
 * desde un botón en el header de Colección (ver navigation/types.ts).
 */
export default function FavoritesScreen({ navigation }: Props) {
  const { colors, spacing, type, fontFamily } = useTheme();
  const cardsQuery = useCards();
  const trainersQuery = useTrainers();

  const trainers = trainersQuery.data ?? [];
  const trainerName = (role: TrainerRole) => trainers.find((t) => t.role === role)?.name ?? role;

  const grouped = useMemo(() => {
    const cards = cardsQuery.data ?? [];
    const favoritedByRole = (role: TrainerRole) =>
      cards.filter((card) => card.favoritedBy.some((f) => f.trainer.role === role));
    const shared = cards.filter((card) => {
      const roles = new Set(card.favoritedBy.map((f) => f.trainer.role));
      return roles.has('DAD') && roles.has('KID');
    });
    const mostValuable = [...cards]
      .filter((c) => c.estimatedValueUsd)
      .sort((a, b) => Number(b.estimatedValueUsd) - Number(a.estimatedValueUsd))
      .slice(0, 5);
    const firstCard = cards.filter((c) => c.isFirstCard);
    const withMemory = cards.filter((c) => c.memory && c.memory.trim().length > 0);

    return {
      dad: favoritedByRole('DAD'),
      kid: favoritedByRole('KID'),
      shared,
      mostValuable,
      firstCard,
      withMemory,
    };
  }, [cardsQuery.data]);

  const anyFavorites =
    grouped.dad.length > 0 ||
    grouped.kid.length > 0 ||
    grouped.shared.length > 0 ||
    grouped.mostValuable.length > 0 ||
    grouped.firstCard.length > 0 ||
    grouped.withMemory.length > 0;

  const goToCard = (id: string) => navigation.navigate('CardDetail', { cardId: id });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'left', 'right']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.md }}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={{ fontSize: 24, color: colors.text }}>←</Text>
        </Pressable>
      </View>
      <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }}>
        <Text style={{ ...type.display, fontFamily: fontFamily.display, color: colors.text }}>Favoritas</Text>
      </View>

      <QueryState isLoading={cardsQuery.isLoading} error={cardsQuery.error} onRetry={() => cardsQuery.refetch()}>
        {anyFavorites ? (
          <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.xl, paddingBottom: spacing.huge }}>
            <Section title={`❤️ Favoritas de ${trainerName('KID')}`} cards={grouped.kid} onPressCard={goToCard} />
            <Section title={`💙 Favoritas de ${trainerName('DAD')}`} cards={grouped.dad} onPressCard={goToCard} />
            <Section title="👨‍👦 Nuestra colección especial" cards={grouped.shared} onPressCard={goToCard} />

            <View>
              <Text style={{ ...type.h1, color: colors.text, marginBottom: spacing.sm }}>💎 Cartas especiales</Text>
              <View style={{ gap: spacing.lg }}>
                <Section title="💰 Más valiosas" cards={grouped.mostValuable} onPressCard={goToCard} />
                <Section title="🎁 Primera carta" cards={grouped.firstCard} onPressCard={goToCard} />
                <Section title="📖 Con un recuerdo" cards={grouped.withMemory} onPressCard={goToCard} />
              </View>
            </View>
          </ScrollView>
        ) : (
          <EmptyState
            icon={<AppIcon name="corazon" size={72} />}
            title="Todavía no hay favoritas"
            description="Marcá una carta como favorita desde su detalle."
          />
        )}
      </QueryState>
    </SafeAreaView>
  );
}
