import React from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
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
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xxs }}>
      <Text style={{ ...type.bodySm, color: colors.textSecondary }}>{label}</Text>
      <Text style={{ ...type.bodySm, color: colors.text, fontWeight: '600' }}>{value}</Text>
    </View>
  );
}

/** Información del Pokémon (§9), escrita simple para un niño de 6 años. */
export default function PokemonDetailScreen({ route, navigation }: Props) {
  const { pokemonId } = route.params;
  const { colors, spacing, radius, type, fontFamily, elevation } = useTheme();
  const pokemonQuery = usePokemonDetail(pokemonId);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'left', 'right', 'bottom']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.md }}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={{ fontSize: 24, color: colors.text }}>←</Text>
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
                  <View
                    style={{
                      backgroundColor: info.color + '22',
                      borderRadius: radius.lg,
                      alignItems: 'center',
                      padding: spacing.lg,
                    }}
                  >
                    {pokemon.spriteUrl ? (
                      <Image source={{ uri: pokemon.spriteUrl }} style={{ width: 180, height: 180 }} resizeMode="contain" />
                    ) : (
                      <Text style={{ fontSize: 80 }}>{info.icon}</Text>
                    )}
                  </View>

                  <View>
                    <Text style={{ ...type.display, fontFamily: fontFamily.display, color: colors.text, textTransform: 'capitalize' }}>
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
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                        {evolutionFamily.map((step) => (
                          <View
                            key={step.id}
                            style={{
                              alignItems: 'center',
                              gap: spacing.xxs,
                              padding: spacing.sm,
                              backgroundColor: step.id === pokemon.id ? colors.primarySoft : colors.cardBg,
                              borderRadius: radius.md,
                              width: 84,
                            }}
                          >
                            {step.spriteUrl ? (
                              <Image source={{ uri: step.spriteUrl }} style={{ width: 56, height: 56 }} resizeMode="contain" />
                            ) : null}
                            <Text numberOfLines={1} style={{ ...type.caption, color: colors.text, textTransform: 'capitalize' }}>
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
