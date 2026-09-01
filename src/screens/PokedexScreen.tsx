import React, { useMemo } from 'react';
import { Image, Pressable, SectionList, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
import { useDiscoveredPokemon } from '../hooks/queries/usePokemon';
import { typeInfo } from '../services/pokemonTypes';
import EmptyState from '../components/EmptyState';
import AppIcon from '../components/AppIcon';
import QueryState from '../components/QueryState';
import type { RootStackParamList } from '../navigation/types';
import type { Pokemon } from '../api/types';

/**
 * "Nuestros Pokémon" (§10) — ya no es una tab (ver nota en navigation/types.ts),
 * se queda sin usar por ahora.
 */
export default function PokedexScreen() {
  const { colors, spacing, radius, type, fontFamily } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const pokemonQuery = useDiscoveredPokemon();

  const sections = useMemo(() => {
    const byType = new Map<string, Pokemon[]>();
    for (const pokemon of pokemonQuery.data ?? []) {
      const list = byType.get(pokemon.primaryType) ?? [];
      list.push(pokemon);
      byType.set(pokemon.primaryType, list);
    }
    return Array.from(byType.entries())
      .map(([primaryType, data]) => ({ title: primaryType, data }))
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [pokemonQuery.data]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'left', 'right']}>
      <View style={{ padding: spacing.lg, paddingBottom: spacing.sm }}>
        <Text style={{ ...type.display, fontFamily: fontFamily.display, color: colors.text }}>Nuestros Pokémon</Text>
      </View>

      <QueryState isLoading={pokemonQuery.isLoading} error={pokemonQuery.error} onRetry={() => pokemonQuery.refetch()}>
        {sections.length > 0 ? (
          <SectionList
            sections={sections}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.huge, gap: spacing.sm }}
            renderSectionHeader={({ section }) => {
              const info = typeInfo(section.title);
              return (
                <Text style={{ ...type.h2, color: colors.text, marginTop: spacing.md, marginBottom: spacing.xs }}>
                  {info.icon} {info.es}
                </Text>
              );
            }}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => navigation.navigate('PokemonDetail', { pokemonId: item.id })}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.md,
                  backgroundColor: colors.cardBg,
                  borderRadius: radius.md,
                  padding: spacing.sm,
                  marginBottom: spacing.xs,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                {item.spriteUrl ? (
                  <Image source={{ uri: item.spriteUrl }} style={{ width: 48, height: 48 }} resizeMode="contain" />
                ) : (
                  <Text style={{ fontSize: 32 }}>{typeInfo(item.primaryType).icon}</Text>
                )}
                <Text style={{ ...type.body, color: colors.text, textTransform: 'capitalize' }}>{item.name}</Text>
              </Pressable>
            )}
          />
        ) : (
          <EmptyState
            icon={<AppIcon name="celular" size={72} />}
            title="Todavía no descubrimos ningún Pokémon"
            description="Agregá tu primera carta y empezamos el descubrimiento."
            ctaLabel="Agregar carta"
            ctaIcon={<AppIcon name="pokebola" size={20} />}
            onPressCta={() => navigation.navigate('AddCard')}
          />
        )}
      </QueryState>
    </SafeAreaView>
  );
}
