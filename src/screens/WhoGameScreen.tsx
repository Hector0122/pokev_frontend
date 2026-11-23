import React, { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useDiscoveredPokemon } from '../hooks/queries/usePokemon';
import { buildWhoRound } from '../services/games';
import { buzz } from '../services/haptics';
import ScreenHeader from '../components/ScreenHeader';
import Confetti from '../components/Confetti';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import type { Pokemon } from '../api/types';

const WHITE = '#FFFFFF';

/** "¿Quién es ese Pokémon?" — la silueta de un Pokémon de nuestra colección y 3 opciones. */
export default function WhoGameScreen() {
  const { colors, spacing, radius, type, fontFamily } = useTheme();
  const query = useDiscoveredPokemon();
  const pokemon = useMemo(() => (query.data ?? []).filter((p) => p.spriteUrl), [query.data]);

  const [round, setRound] = useState<{ answer: Pokemon; options: Pokemon[] } | null>(null);
  const [chosen, setChosen] = useState<number | null>(null);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    if (!round && pokemon.length) setRound(buildWhoRound(pokemon));
  }, [round, pokemon]);

  const correct = chosen !== null && chosen === round?.answer.id;

  function choose(id: number) {
    if (chosen !== null || !round) return;
    setChosen(id);
    if (id === round.answer.id) {
      buzz('win');
      setStreak((s) => s + 1);
    } else {
      buzz();
      setStreak(0);
    }
  }

  function nextRound() {
    setChosen(null);
    setRound(buildWhoRound(pokemon, Math.random, round?.answer.id));
  }

  const header = (
    <ScreenHeader title="¿Quién es?" right={<Text style={{ ...type.h2, color: colors.text }}>🔥 {streak}</Text>} />
  );

  if (query.isLoading) {
    return (
      <SafeAreaView style={[styles.flex1, { backgroundColor: colors.background }]}>
        {header}
        <View style={[styles.flex1, styles.center]}>
          <LoadingSpinner />
        </View>
      </SafeAreaView>
    );
  }

  if (!round) {
    return (
      <SafeAreaView style={[styles.flex1, { backgroundColor: colors.background }]}>
        {header}
        <EmptyState
          icon="❓"
          title="¡Necesitamos más Pokémon!"
          description="Cuando tengamos cartas de al menos 3 Pokémon distintos, podemos jugar."
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.flex1, { backgroundColor: colors.background }]}>
      {header}
      <ScrollView contentContainerStyle={[styles.center, { padding: spacing.lg, gap: spacing.lg }]}>
        <View style={[styles.stage, { borderRadius: radius.xl, backgroundColor: colors.accentSoft }]}>
          <Image
            source={{ uri: round.answer.spriteUrl! }}
            // Sin responder: tintColor pinta todo pixel no transparente → silueta.
            style={[styles.sprite, chosen === null ? styles.silhouette : null]}
            resizeMode="contain"
          />
        </View>
        <Text style={[styles.textCenter, { ...type.h1, fontFamily: fontFamily.display, color: colors.text }]}>
          {chosen === null ? '¿Quién es ese Pokémon?' : correct ? `¡Es ${round.answer.name}!` : `Era ${round.answer.name}`}
        </Text>
        <View style={[styles.stretch, { gap: spacing.sm }]}>
          {round.options.map((option) => {
            const isAnswer = chosen !== null && option.id === round.answer.id;
            const isWrongPick = chosen === option.id && !correct;
            return (
              <Pressable
                key={option.id}
                onPress={() => choose(option.id)}
                style={[
                  styles.option,
                  {
                    padding: spacing.md,
                    borderRadius: radius.lg,
                    backgroundColor: isAnswer ? colors.success : isWrongPick ? colors.danger : colors.cardBg,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.capitalize,
                    styles.textCenter,
                    { ...type.h2, color: isAnswer || isWrongPick ? WHITE : colors.text },
                  ]}
                >
                  {option.name}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {chosen !== null ? <Button title="Siguiente" onPress={nextRound} style={styles.stretch} /> : null}
      </ScrollView>
      {correct ? <Confetti key={streak} /> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  stage: { width: 240, height: 240, alignItems: 'center', justifyContent: 'center' },
  sprite: { width: 200, height: 200 },
  silhouette: { tintColor: '#1B1B2F' },
  option: { borderWidth: 1 },
  stretch: { alignSelf: 'stretch' },
  textCenter: { textAlign: 'center' },
  capitalize: { textTransform: 'capitalize' },
});
