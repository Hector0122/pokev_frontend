import React, { useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../theme/ThemeContext';
import { useTrainers } from '../hooks/queries/useTrainers';
import { useDiscoveredPokemon, useEnrichPokemon } from '../hooks/queries/usePokemon';
import { useCreateCard } from '../hooks/queries/useCards';
import { runWithAchievementUnlockDetection } from '../hooks/queries/useAchievements';
import Button from '../components/Button';
import AppIcon from '../components/AppIcon';
import TextField from '../components/TextField';
import CardFieldsForm, { EMPTY_CARD_FORM_VALUES, type CardFormValues } from '../components/CardFieldsForm';
import CelebrationModal from '../components/CelebrationModal';
import {
  fetchPokemonDetails,
  officialArtworkUrl,
  searchPokemonSpecies,
  type PokemonDetails,
  type PokemonSpeciesListItem,
} from '../services/pokeapi';
import type { RootStackParamList } from '../navigation/types';
import type { AchievementStatus, CreateCardInput } from '../api/types';

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'AddCard'> };

interface SelectedPokemon {
  id: number;
  name: string;
  details: PokemonDetails | null;
  detailsFailed: boolean;
}

interface Celebration {
  icon: string | React.ReactNode;
  title: string;
  subtitle?: string;
}

/** Flujo de "Agregar carta" (§6): elegir Pokémon → completar datos → cantidad → favorita → guardar. */
export default function AddCardScreen({ navigation }: Props) {
  const { colors, spacing, type } = useTheme();
  const queryClient = useQueryClient();
  const trainersQuery = useTrainers();
  const discoveredQuery = useDiscoveredPokemon();
  const enrichPokemon = useEnrichPokemon();
  const createCard = useCreateCard();

  const [selected, setSelected] = useState<SelectedPokemon | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<PokemonSpeciesListItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const [values, setValues] = useState<CardFormValues>(EMPTY_CARD_FORM_VALUES);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [celebrations, setCelebrations] = useState<Celebration[]>([]);

  function updateValues(patch: Partial<CardFormValues>) {
    setValues((prev) => ({ ...prev, ...patch }));
  }

  async function handleSearch(text: string) {
    setSearchTerm(text);
    if (text.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    setSearchError(null);
    try {
      const results = await searchPokemonSpecies(text);
      setSearchResults(results);
    } catch {
      setSearchError('No pudimos buscar Pokémon. Revisá tu conexión.');
    } finally {
      setIsSearching(false);
    }
  }

  async function handlePickPokemon(item: PokemonSpeciesListItem) {
    setSelected({ id: item.id, name: item.name, details: null, detailsFailed: false });
    setLoadingDetails(true);
    try {
      const details = await fetchPokemonDetails(item.id);
      setSelected({ id: item.id, name: details.name, details, detailsFailed: false });
      // Best-effort: persistir en el backend apenas la tenemos (§2.2). Si
      // falla (offline), la carta igual se puede guardar con lo mínimo.
      enrichPokemon.mutate({
        id: details.id,
        input: {
          name: details.name,
          primaryType: details.primaryType,
          secondaryType: details.secondaryType,
          region: details.region,
          heightCm: details.heightCm,
          weightHg: details.weightHg,
          spriteUrl: details.spriteUrl,
          description: details.description,
          evolvesFromId: details.evolvesFromId ?? undefined,
          evolutionChain: details.evolutionChain.map((step) => ({
            id: step.id,
            name: step.name,
            spriteUrl: step.spriteUrl ?? undefined,
          })),
        },
      });
    } catch {
      setSelected({ id: item.id, name: item.name, details: null, detailsFailed: true });
    } finally {
      setLoadingDetails(false);
    }
  }

  async function handleSave() {
    if (!selected || !values.setName.trim() || !values.cardNumber.trim() || saving) return;
    setSaving(true);
    setSaveError(null);

    const wasAlreadyDiscovered = (discoveredQuery.data ?? []).some((p) => p.id === selected.id);

    const input: CreateCardInput = {
      pokemon: {
        id: selected.id,
        name: selected.name,
        primaryType: selected.details?.primaryType ?? 'desconocido',
        secondaryType: selected.details?.secondaryType ?? undefined,
        spriteUrl: selected.details?.spriteUrl ?? officialArtworkUrl(selected.id),
      },
      setName: values.setName.trim(),
      cardNumber: values.cardNumber.trim(),
      rarity: values.rarity.trim() || undefined,
      cardType: values.cardType.trim() || undefined,
      hp: values.hp ? Number(values.hp) : undefined,
      attacks: values.attacks.filter((a) => a.name.trim()),
      year: values.year ? Number(values.year) : undefined,
      language: values.language.trim() || undefined,
      variant: values.variant.trim() || undefined,
      imageUrl: values.imageUrl.trim() || undefined,
      quantity: Number(values.quantity) || 1,
      estimatedValueUsd: values.estimatedValueUsd ? Number(values.estimatedValueUsd) : undefined,
      acquiredAt: values.acquiredAt || new Date().toISOString(),
      acquiredWithId: values.acquiredWithId ?? undefined,
      memory: values.memory.trim() || undefined,
      favoriteTrainerRoles: values.favoriteTrainerRoles,
    };

    try {
      const { newlyUnlocked } = await runWithAchievementUnlockDetection(queryClient, () =>
        createCard.mutateAsync(input),
      );

      const queue: Celebration[] = [];
      if (!wasAlreadyDiscovered) {
        queue.push({
          icon: <AppIcon name="gotcha" size={64} />,
          title: '¡Nuevo Pokémon descubierto!',
          subtitle: `¡Agregaron su primera carta de ${selected.name}!`,
        });
      }
      queue.push(...newlyUnlocked.map((a: AchievementStatus) => ({ icon: a.icon ?? '🏆', title: a.title })));

      if (queue.length > 0) {
        setCelebrations(queue);
      } else {
        navigation.goBack();
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Algo salió mal. Probá de nuevo.');
    } finally {
      setSaving(false);
    }
  }

  function dismissCelebration() {
    setCelebrations((prev) => {
      const next = prev.slice(1);
      if (next.length === 0) navigation.goBack();
      return next;
    });
  }

  const canSave = !!selected && values.setName.trim().length > 0 && values.cardNumber.trim().length > 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'left', 'right', 'bottom']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.md, gap: spacing.sm }}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={{ fontSize: 24, color: colors.text }}>←</Text>
        </Pressable>
        <AppIcon name="pokebola" size={24} />
        <Text style={{ ...type.h1, color: colors.text }}>Agregar carta</Text>
      </View>

      {!selected ? (
        <View style={{ flex: 1, padding: spacing.lg, gap: spacing.md }}>
          <TextField
            label="¿Qué Pokémon es?"
            required
            value={searchTerm}
            onChangeText={handleSearch}
            placeholder="Ej. Pikachu"
            autoFocus
          />
          {isSearching ? <ActivityIndicator color={colors.primary} /> : null}
          {searchError ? <Text style={{ ...type.bodySm, color: colors.danger }}>{searchError}</Text> : null}
          <FlatList
            data={searchResults}
            keyExtractor={(item) => String(item.id)}
            numColumns={3}
            columnWrapperStyle={{ gap: spacing.sm }}
            contentContainerStyle={{ gap: spacing.sm }}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => handlePickPokemon(item)}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  gap: spacing.xxs,
                  padding: spacing.sm,
                  backgroundColor: colors.cardBg,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Image
                  source={{ uri: officialArtworkUrl(item.id) }}
                  style={{ width: 64, height: 64 }}
                  resizeMode="contain"
                />
                <Text numberOfLines={1} style={{ ...type.caption, color: colors.text, textTransform: 'capitalize' }}>
                  {item.name}
                </Text>
              </Pressable>
            )}
          />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.huge }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <Image
              source={{ uri: selected.details?.spriteUrl ?? officialArtworkUrl(selected.id) }}
              style={{ width: 72, height: 72 }}
              resizeMode="contain"
            />
            <View style={{ flex: 1 }}>
              <Text style={{ ...type.h1, color: colors.text, textTransform: 'capitalize' }}>{selected.name}</Text>
              {loadingDetails ? (
                <Text style={{ ...type.caption, color: colors.textSecondary }}>Buscando su info…</Text>
              ) : selected.detailsFailed ? (
                <Text style={{ ...type.caption, color: colors.textSecondary }}>
                  Sin conexión — se completa más tarde
                </Text>
              ) : null}
            </View>
            <Pressable onPress={() => setSelected(null)}>
              <Text style={{ ...type.bodySm, color: colors.primary, fontWeight: '600' }}>Cambiar</Text>
            </Pressable>
          </View>

          <CardFieldsForm values={values} onChange={updateValues} trainers={trainersQuery.data ?? []} showFavorites />

          {saveError ? <Text style={{ ...type.bodySm, color: colors.danger }}>{saveError}</Text> : null}

          <Button
            title={saving ? 'Guardando…' : 'Guardar carta'}
            onPress={handleSave}
            disabled={!canSave || saving}
            loading={saving}
          />
        </ScrollView>
      )}

      <CelebrationModal
        visible={celebrations.length > 0}
        icon={celebrations[0]?.icon ?? '🎉'}
        title={celebrations[0]?.title ?? ''}
        subtitle={celebrations[0]?.subtitle}
        onDismiss={dismissCelebration}
      />
    </SafeAreaView>
  );
}
