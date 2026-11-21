import React, { useMemo } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useQueries } from '@tanstack/react-query';
import { useTheme } from '../theme/ThemeContext';
import { cardPriceQuery, useCardStats, useCards } from '../hooks/queries/useCards';
import { cardArtwork, cardTitle } from '../services/cardDisplay';
import { formatPrice, type CardPrice } from '../services/tcgdex';
import AppIcon from '../components/AppIcon';
import AddCardFab from '../components/AddCardFab';
import type { Card } from '../api/types';
import type { MainTabNavigationProp } from '../navigation/types';

/** Misma carta todo el día, otra mañana — sin guardar nada. */
export function cardOfTheDay<T>(cards: T[], date = new Date()): T | null {
  if (cards.length === 0) return null;
  const day = Math.floor(date.getTime() / 86_400_000);
  return cards[day % cards.length];
}

/**
 * Valor del álbum: suma precio × cantidad de las cartas con precio en USD.
 * Las que solo tienen precio en EUR (Cardmarket) no se suman para no mezclar
 * monedas, pero sí pueden ser "la más valiosa" si son las únicas con precio.
 */
export function albumValue(cards: Card[], prices: (CardPrice | null | undefined)[]) {
  let totalUsd = 0;
  let top: { card: Card; price: CardPrice } | null = null;
  cards.forEach((card, i) => {
    const price = prices[i];
    if (!price) return;
    if (price.currency === 'USD') totalUsd += price.amount * card.quantity;
    const current = top as { card: Card; price: CardPrice } | null;
    const beats =
      !current ||
      (price.currency === current.price.currency ? price.amount > current.price.amount : price.currency === 'USD');
    if (beats) top = { card, price };
  });
  return { totalUsd, top: top as { card: Card; price: CardPrice } | null };
}

/**
 * Pantalla principal (§4) — lo que hace volver a la app: cuánto vale el
 * álbum (la curiosidad #1 del entrenador chico), la carta del día y las
 * últimas que consiguieron. La navegación a todo lo demás vive en la tab bar.
 */
export default function HomeScreen() {
  const { colors, spacing, radius, type, fontFamily, elevation } = useTheme();
  const navigation = useNavigation<MainTabNavigationProp<'Inicio'>>();
  const statsQuery = useCardStats();
  const cardsQuery = useCards();
  const stats = statsQuery.data;
  const cards = useMemo(() => cardsQuery.data ?? [], [cardsQuery.data]);

  // shortcut: un request a TCGdex por carta (cacheado 12 h); con miles de cartas convendría guardar el precio en el backend.
  const priceQueries = useQueries({ queries: cards.map((card) => cardPriceQuery(card)) });
  const pricesLoading = priceQueries.some((q) => q.isLoading);
  const { totalUsd, top } = albumValue(
    cards,
    priceQueries.map((q) => q.data),
  );

  const today = cardOfTheDay(cards);
  const recent = cards.slice(0, 8); // el backend ya las devuelve por createdAt desc
  const openCard = (card: Card) => navigation.navigate('CardDetail', { cardId: card.id });

  const sectionTitle = { ...type.h2, color: colors.text };

  return (
    <SafeAreaView style={[styles.flex1, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.xl, paddingBottom: spacing.huge }}
      >
        <View style={[styles.row, { gap: spacing.md }]}>
          <View style={[styles.flex1, { gap: spacing.xxs }]}>
            <Text style={{ ...type.display, fontFamily: fontFamily.display, color: colors.text }}>
              ¡Hola, entrenador!
            </Text>
            <Text style={{ ...type.body, color: colors.textSecondary }}>¿Listos para atrapar más cartas hoy?</Text>
          </View>
          <AppIcon name="pikachu" size={84} />
        </View>

        {cards.length === 0 && !cardsQuery.isLoading ? (
          // Primer arranque — mismo tono positivo que el resto de empty states (§3.1).
          <View
            style={[
              styles.row,
              { gap: spacing.lg, backgroundColor: colors.accentSoft, borderRadius: radius.xl, padding: spacing.lg },
            ]}
          >
            <AppIcon name="pokebola" size={56} />
            <Text style={[styles.flex1, { ...type.h1, color: colors.text }]}>
              Tocá la pokébola para agregar tu primera carta
            </Text>
          </View>
        ) : null}

        {cards.length > 0 ? (
          <View style={[styles.valueCard, { backgroundColor: colors.primary, borderRadius: radius.xl, padding: spacing.lg }]}>
            <Text style={[styles.whiteSoft, { ...type.label }]}>💰 NUESTRO ÁLBUM VALE</Text>
            <Text style={[styles.white, styles.valueAmount, { fontFamily: fontFamily.display }]}>
              {pricesLoading && totalUsd === 0 ? '…' : `$${totalUsd.toFixed(2)}`}
              <Text style={[styles.whiteSoft, { ...type.h2 }]}> USD</Text>
            </Text>
            {pricesLoading ? <Text style={[styles.whiteSoft, { ...type.caption }]}>Preguntando precios…</Text> : null}
            {top ? (
              <Pressable
                onPress={() => openCard(top.card)}
                style={[
                  styles.row,
                  styles.topCard,
                  { gap: spacing.sm, borderRadius: radius.md, padding: spacing.sm, marginTop: spacing.sm },
                ]}
              >
                {cardArtwork(top.card) ? (
                  <Image source={{ uri: cardArtwork(top.card)! }} style={styles.topImage} resizeMode="contain" />
                ) : null}
                <View style={styles.flex1}>
                  <Text style={[styles.whiteSoft, { ...type.caption }]}>👑 LA MÁS VALIOSA</Text>
                  <Text numberOfLines={1} style={[styles.white, styles.capitalize, { ...type.h2 }]}>
                    {cardTitle(top.card)}
                  </Text>
                  <Text style={[styles.white, { ...type.bodySm }]}>{formatPrice(top.price)}</Text>
                </View>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {today ? (
          <View style={{ gap: spacing.sm }}>
            <Text style={sectionTitle}>✨ Carta del día</Text>
            <Pressable
              onPress={() => openCard(today)}
              style={[
                styles.row,
                { gap: spacing.lg, backgroundColor: colors.cardBg, borderRadius: radius.lg, padding: spacing.md, ...elevation.sm },
              ]}
            >
              {cardArtwork(today) ? (
                <Image source={{ uri: cardArtwork(today)! }} style={styles.todayImage} resizeMode="contain" />
              ) : null}
              <View style={[styles.flex1, { gap: spacing.xxs }]}>
                <Text style={[styles.capitalize, { ...type.h1, color: colors.text }]}>{cardTitle(today)}</Text>
                <Text style={{ ...type.bodySm, color: colors.textSecondary }}>
                  {today.setName} · #{today.cardNumber}
                </Text>
                {today.memory ? (
                  <Text numberOfLines={3} style={[styles.italic, { ...type.bodySm, color: colors.text }]}>
                    📝 {today.memory}
                  </Text>
                ) : null}
                <Text style={[styles.bold, { ...type.bodySm, color: colors.primary }]}>Ver carta →</Text>
              </View>
            </Pressable>
          </View>
        ) : null}

        {recent.length > 1 ? (
          <View style={{ gap: spacing.sm }}>
            <Text style={sectionTitle}>🆕 Las últimas que conseguimos</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
              {recent.map((card) => (
                <Pressable key={card.id} onPress={() => openCard(card)} style={[styles.recentTile, { gap: spacing.xxs }]}>
                  <View
                    style={[
                      styles.recentImageWrap,
                      { backgroundColor: colors.cardBg, borderRadius: radius.md, borderColor: colors.border },
                    ]}
                  >
                    {cardArtwork(card) ? (
                      <Image source={{ uri: cardArtwork(card)! }} style={styles.recentImage} resizeMode="contain" />
                    ) : null}
                  </View>
                  <Text numberOfLines={1} style={[styles.capitalize, { ...type.caption, color: colors.text }]}>
                    {cardTitle(card)}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {stats && stats.totalCards > 0 ? (
          <View style={[styles.row, { gap: spacing.sm }]}>
            {[
              { icon: '🃏', value: stats.totalCards, label: 'cartas' },
              { icon: '🔍', value: stats.discoveredPokemonCount, label: 'Pokémon' },
              { icon: '❤️', value: stats.favoriteCardCount, label: 'favoritas' },
            ].map((stat) => (
              <View
                key={stat.label}
                style={[styles.stat, { backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: spacing.sm }]}
              >
                <Text style={styles.statIcon}>{stat.icon}</Text>
                <Text style={{ ...type.h1, fontFamily: fontFamily.display, color: colors.text }}>{stat.value}</Text>
                <Text style={{ ...type.caption, color: colors.textSecondary }}>{stat.label}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {stats?.nextMilestone ? (
          <View
            style={[
              styles.row,
              { gap: spacing.lg, backgroundColor: colors.accentSoft, borderRadius: radius.xl, padding: spacing.lg },
            ]}
          >
            <AppIcon name="corona" size={48} />
            <View style={[styles.flex1, { gap: spacing.xxs }]}>
              <Text style={{ ...type.label, color: colors.textSecondary }}>PRÓXIMO LOGRO</Text>
              <Text style={{ ...type.h2, color: colors.text }}>{stats.nextMilestone.title}</Text>
            </View>
          </View>
        ) : null}
      </ScrollView>
      <AddCardFab />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  bold: { fontWeight: '600' },
  italic: { fontStyle: 'italic' },
  capitalize: { textTransform: 'capitalize' },
  white: { color: '#FFFFFF' },
  whiteSoft: { color: 'rgba(255,255,255,0.8)' },
  valueCard: { gap: 2 },
  valueAmount: { fontSize: 40, lineHeight: 48 },
  topCard: { backgroundColor: 'rgba(255,255,255,0.15)' },
  topImage: { width: 44, height: 62 },
  todayImage: { width: 110, height: 154 },
  recentTile: { width: 96 },
  recentImageWrap: { height: 130, alignItems: 'center', justifyContent: 'center', borderWidth: 1, overflow: 'hidden' },
  recentImage: { width: '90%', height: '90%' },
  stat: { flex: 1, alignItems: 'center' },
  statIcon: { fontSize: 22 },
});
