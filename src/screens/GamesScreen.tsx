import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import type { MainTabNavigationProp } from '../navigation/types';

const GAMES: { route: 'GameBattle' | 'GameValue' | 'GameWho' | 'Sets'; emoji: string; title: string; description: string; color: string }[] = [
  {
    route: 'GameBattle',
    emoji: '⚔️',
    title: 'Batalla papá vs hijo',
    description: 'Cada uno saca una carta al azar. ¡Gana el ataque más fuerte!',
    color: '#EE1C25',
  },
  {
    route: 'GameValue',
    emoji: '💰',
    title: '¿Cuál vale más?',
    description: 'Salen dos de nuestras cartas. ¿Adivinás cuál cuesta más?',
    color: '#E8B923',
  },
  {
    route: 'GameWho',
    emoji: '❓',
    title: '¿Quién es ese Pokémon?',
    description: 'Mirá la sombra y adiviná qué Pokémon de nuestra colección es.',
    color: '#3B4CCA',
  },
  {
    route: 'Sets',
    emoji: '📚',
    title: 'Explorar expansiones',
    description: 'Todas las expansiones, con nuestras cartas brillando adentro.',
    color: '#2FBF71',
  },
];

/** Tab "Jugar" — los minijuegos con nuestras propias cartas, y Expansiones para explorar. */
export default function GamesScreen() {
  const { colors, spacing, radius, type, fontFamily, elevation } = useTheme();
  const navigation = useNavigation<MainTabNavigationProp<'Jugar'>>();

  return (
    <SafeAreaView style={[styles.flex1, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.huge }}>
        <Text style={{ ...type.display, fontFamily: fontFamily.display, color: colors.text }}>¡A jugar!</Text>
        {GAMES.map((game) => (
          <Pressable
            key={game.route}
            onPress={() => navigation.navigate(game.route)}
            style={[
              styles.row,
              {
                gap: spacing.md,
                padding: spacing.lg,
                borderRadius: radius.xl,
                backgroundColor: colors.cardBg,
                borderLeftColor: game.color,
                ...elevation.sm,
              },
            ]}
          >
            <Text style={styles.emoji}>{game.emoji}</Text>
            <View style={[styles.flex1, { gap: spacing.xxs }]}>
              <Text style={{ ...type.h2, color: colors.text }}>{game.title}</Text>
              <Text style={{ ...type.bodySm, color: colors.textSecondary }}>{game.description}</Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', borderLeftWidth: 6 },
  emoji: { fontSize: 44 },
});
