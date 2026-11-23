import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../theme/ThemeContext';
import { cardTcgQuery, useCards } from '../hooks/queries/useCards';
import { useTrainers } from '../hooks/queries/useTrainers';
import { cardArtwork, cardTitle } from '../services/cardDisplay';
import { strongestAttack } from '../services/tcgdex';
import { battleWinner, shuffle } from '../services/games';
import { buzz } from '../services/haptics';
import ScreenHeader from '../components/ScreenHeader';
import FlipCard from '../components/FlipCard';
import Confetti from '../components/Confetti';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';
import type { Card, TrainerRole } from '../api/types';

interface Drawn {
  card: Card;
  attackName: string;
  damage: number;
  hp: number;
  rarity: string | null;
}

const SIDES: TrainerRole[] = ['DAD', 'KID'];
const GOLD = '#E8B923';

/**
 * Batalla papá vs hijo — cada uno saca una carta Pokémon al azar de la
 * colección compartida; gana el ataque más fuerte (empate → más HP). HP y
 * ataques salen de TCGdex (las cartas guardadas casi nunca los tienen cargados).
 */
export default function BattleScreen() {
  const { colors, spacing, radius, type, fontFamily } = useTheme();
  const { width } = useWindowDimensions();
  const queryClient = useQueryClient();
  const cardsQuery = useCards();
  const trainers = useTrainers().data ?? [];
  const pokemonCards = useMemo(() => (cardsQuery.data ?? []).filter((c) => c.pokemon), [cardsQuery.data]);

  const [drawn, setDrawn] = useState<Partial<Record<TrainerRole, Drawn>>>({});
  const [drawing, setDrawing] = useState<TrainerRole | null>(null);
  const [score, setScore] = useState({ DAD: 0, KID: 0 });
  const [result, setResult] = useState<'DAD' | 'KID' | 'tie' | null>(null);

  const nameOf = (role: TrainerRole) => trainers.find((t) => t.role === role)?.name ?? (role === 'DAD' ? 'Papá' : 'Hijo');
  const cardWidth = Math.min(170, (width - spacing.lg * 3) / 2);

  async function draw(role: TrainerRole) {
    setDrawing(role);
    buzz();
    const other = drawn[role === 'DAD' ? 'KID' : 'DAD']?.card.id;
    // Se prueban hasta 6 cartas: alguna puede no estar en TCGdex o no tener ataques con daño.
    let pick: Drawn | null = null;
    for (const card of shuffle(pokemonCards.filter((c) => c.id !== other)).slice(0, 6)) {
      const detail = await queryClient.fetchQuery(cardTcgQuery(card)).catch(() => null);
      const attack = strongestAttack(detail?.attacks ?? card.attacks ?? undefined);
      const hp = detail?.hp ?? card.hp ?? 0;
      pick = { card, attackName: attack?.name ?? 'Placaje', damage: attack?.damage ?? 0, hp, rarity: detail?.rarity ?? card.rarity };
      if (pick.damage > 0) break;
    }
    if (pick) setDrawn((prev) => ({ ...prev, [role]: pick }));
    setDrawing(null);
  }

  // Cuando los dos sacaron carta: esperar a que terminen de voltearse y anunciar al ganador.
  useEffect(() => {
    const dad = drawn.DAD;
    const kid = drawn.KID;
    if (!dad || !kid || result) return;
    const timer = setTimeout(() => {
      const winner = battleWinner(dad, kid);
      const outcome = winner === 'a' ? 'DAD' : winner === 'b' ? 'KID' : 'tie';
      setResult(outcome);
      if (outcome !== 'tie') setScore((s) => ({ ...s, [outcome]: s[outcome] + 1 }));
      buzz('win');
    }, 900);
    return () => clearTimeout(timer);
  }, [drawn, result]);

  function nextRound() {
    setDrawn({});
    setResult(null);
  }

  if (!cardsQuery.isLoading && pokemonCards.length < 2) {
    return (
      <SafeAreaView style={[styles.flex1, { backgroundColor: colors.background }]}>
        <ScreenHeader title="Batalla" />
        <EmptyState icon="⚔️" title="¡Casi listos para pelear!" description="Agreguen al menos 2 cartas de Pokémon para jugar." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.flex1, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title="Batalla"
        right={
          <Text style={{ ...type.h2, fontFamily: fontFamily.display, color: colors.text }}>
            {score.DAD} – {score.KID}
          </Text>
        }
      />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
        <View style={[styles.row, { gap: spacing.lg }]}>
          {SIDES.map((role) => {
            const mine = drawn[role];
            const won = result === role;
            return (
              <View
                key={role}
                style={[
                  styles.side,
                  won ? styles.winner : null,
                  { gap: spacing.sm, padding: spacing.sm, borderRadius: radius.lg },
                ]}
              >
                <Text style={{ ...type.h2, color: colors.text }}>
                  {won ? '👑 ' : ''}
                  {nameOf(role)}
                </Text>
                <FlipCard
                  imageUri={mine ? cardArtwork(mine.card) : null}
                  flipped={!!mine}
                  width={cardWidth}
                  rarity={mine?.rarity}
                />
                {mine ? (
                  <View style={styles.stats}>
                    <Text numberOfLines={1} style={[styles.capitalize, { ...type.bodySm, color: colors.text }]}>
                      {cardTitle(mine.card)}
                    </Text>
                    <Text style={{ ...type.h2, color: colors.danger }}>
                      ⚔️ {mine.damage}
                    </Text>
                    <Text numberOfLines={1} style={{ ...type.caption, color: colors.textSecondary }}>
                      {mine.attackName} · ❤️ {mine.hp} HP
                    </Text>
                  </View>
                ) : (
                  <Button
                    title={drawing === role ? 'Sacando…' : '¡Sacá tu carta!'}
                    onPress={() => draw(role)}
                    loading={drawing === role}
                    disabled={!!drawing}
                    style={styles.stretch}
                  />
                )}
              </View>
            );
          })}
        </View>

        {result ? (
          <View style={[styles.center, { gap: spacing.md }]}>
            <Text style={[styles.textCenter, { ...type.display, fontFamily: fontFamily.display, color: colors.text }]}>
              {result === 'tie' ? '¡Empate!' : `¡Gana ${nameOf(result)}!`}
            </Text>
            <Button title="Otra ronda" onPress={nextRound} style={styles.stretch} />
          </View>
        ) : null}
      </ScrollView>
      {result && result !== 'tie' ? <Confetti key={`${score.DAD}-${score.KID}`} /> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  row: { flexDirection: 'row', justifyContent: 'center' },
  side: { flex: 1, alignItems: 'center', borderWidth: 3, borderColor: 'transparent' },
  winner: { borderColor: GOLD, backgroundColor: GOLD + '22' },
  stats: { alignItems: 'center', gap: 2 },
  center: { alignItems: 'center' },
  textCenter: { textAlign: 'center' },
  capitalize: { textTransform: 'capitalize' },
  stretch: { alignSelf: 'stretch' },
});
