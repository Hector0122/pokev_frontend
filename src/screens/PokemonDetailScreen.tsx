import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
import { usePokemonDetail } from '../hooks/queries/usePokemon';
import { typeInfo } from '../services/pokemonTypes';
import QueryState from '../components/QueryState';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'PokemonDetail'>;

function InfoRow({ label, value }: { label: string; value: string }) {
  const { colors, spacing, type } = useTheme();
  return (
    <View style={[styles.rowBetween, { paddingVertical: spacing.xxs }]}>
      <Text style={{ ...type.bodySm, color: colors.textSecondary }}>{label}</Text>
      <Text style={[styles.bold, { ...type.bodySm, color: colors.text }]}>{value}</Text>
    </View>
  );
}

/** Información del Pokémon (§9), escrita simple para un niño de 6 años. */
export default function PokemonDetailScreen({ route, navigation }: Props) {
  const { pokemonId } = route.params;
  const { colors, spacing, radius, type, fontFamily, elevation } = useTheme();
  const pokemonQuery = usePokemonDetail(pokemonId);

  return (
    <SafeAreaView style={[styles.flex1, { backgroundColor: colors.background }]} edges={['top', 'left', 'right', 'bottom']}>
      <View style={[styles.headerRow, { padding: spacing.md }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={[styles.backArrow, { color: colors.text }]}>←</Text>
        </Pressable>
      </View>

      <QueryState isLoading={pokemonQuery.isLoading} error={pokemonQuery.error} onRetry={() => pokemonQuery.refetch()}>
        {pokemonQuery.data ? (
          <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.huge }}>
            {(() => {
              const pokemon = pokemonQuery.data;
              const info = typeInfo(pokemon.primaryType);
              const evolutionFamily = [pokemon.evolvesFrom, pokemon, ...(pokemon.evolvesTo ?? [])].filter(
                (p): p is NonNullable<typeof p> => !!p,
              );
              const hasEvolutions = evolutionFamily.length > 1;

              return (
                <>
                  <View style={[styles.centered, { backgroundColor: info.color + '22', borderRadius: radius.lg, padding: spacing.lg }]}>
                    {pokemon.spriteUrl ? (
                      <Image source={{ uri: pokemon.spriteUrl }} style={styles.mainImage} resizeMode="contain" />
                    ) : (
                      <Text style={styles.mainIcon}>{info.icon}</Text>
                    )}
                  </View>

                  <View>
                    <Text style={[styles.capitalize, { ...type.display, fontFamily: fontFamily.display, color: colors.text }]}>
                      {pokemon.name}
                    </Text>
                    <Text style={{ ...type.body, color: colors.textSecondary }}>
                      {info.icon} {info.es}
                      {pokemon.secondaryType ? ` · ${typeInfo(pokemon.secondaryType).es}` : ''}
                    </Text>
                  </View>

                  {pokemon.description ? (
                    <View style={{ backgroundColor: colors.cardBg, borderRadius: radius.md, padding: spacing.md, ...elevation.sm }}>
                      <Text style={{ ...type.body, color: colors.text }}>{pokemon.description}</Text>
                    </View>
                  ) : null}

                  <View style={{ backgroundColor: colors.cardBg, borderRadius: radius.md, padding: spacing.md, ...elevation.sm }}>
                    {pokemon.region ? <InfoRow label="Región" value={pokemon.region} /> : null}
                    {pokemon.heightCm !== null ? (
                      <InfoRow label="Altura" value={`${(pokemon.heightCm / 100).toFixed(1)} m`} />
                    ) : null}
                    {pokemon.weightHg !== null ? (
                      <InfoRow label="Peso" value={`${(pokemon.weightHg / 10).toFixed(1)} kg`} />
                    ) : null}
                  </View>

                  <View style={{ gap: spacing.sm }}>
                    <Text style={{ ...type.h2, color: colors.text }}>Evoluciones</Text>
                    {hasEvolutions ? (
                      <View style={[styles.wrapRow, { gap: spacing.sm }]}>
                        {evolutionFamily.map((step) => (
                          <View
                            key={step.id}
                            style={[
                              styles.evolutionTile,
                              {
                                gap: spacing.xxs,
                                padding: spacing.sm,
                                backgroundColor: step.id === pokemon.id ? colors.primarySoft : colors.cardBg,
                                borderRadius: radius.md,
                              },
                            ]}
                          >
                            {step.spriteUrl ? (
                              <Image source={{ uri: step.spriteUrl }} style={styles.evolutionImage} resizeMode="contain" />
                            ) : null}
                            <Text numberOfLines={1} style={[styles.capitalize, { ...type.caption, color: colors.text }]}>
                              {step.name}
                            </Text>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <Text style={{ ...type.bodySm, color: colors.textSecondary }}>Este Pokémon no evoluciona.</Text>
                    )}
                  </View>
                </>
              );
            })()}
          </ScrollView>
        ) : null}
      </QueryState>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between' },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap' },
  centered: { alignItems: 'center' },
  bold: { fontWeight: '600' },
  capitalize: { textTransform: 'capitalize' },
  backArrow: { fontSize: 24 },
  mainImage: { width: 180, height: 180 },
  mainIcon: { fontSize: 80 },
  evolutionTile: { alignItems: 'center', width: 84 },
  evolutionImage: { width: 56, height: 56 },
});
