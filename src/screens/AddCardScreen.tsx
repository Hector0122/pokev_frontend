import React, { useEffect, useState } from 'react';
import { FlatList, Image, Platform, Pressable, ScrollView, StyleSheet, Text, ToastAndroid, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../theme/ThemeContext';
import { useTrainers } from '../hooks/queries/useTrainers';
import { useDiscoveredPokemon, useEnrichPokemon } from '../hooks/queries/usePokemon';
import { useCreateCard } from '../hooks/queries/useCards';
import { runWithAchievementUnlockDetection } from '../hooks/queries/useAchievements';
import Button from '../components/Button';
import AppIcon from '../components/AppIcon';
import LoadingSpinner from '../components/LoadingSpinner';
import TextField from '../components/TextField';
import CardFieldsForm, { EMPTY_CARD_FORM_VALUES, type CardFormValues } from '../components/CardFieldsForm';
import {
  fetchPokemonDetails,
  normalizeForSearch,
  officialArtworkUrl,
  searchPokemonSpecies,
  type PokemonDetails,
  type PokemonSpeciesListItem,
} from '../services/pokeapi';
import { uploadCardImage } from '../services/scan';
import type { RootStackParamList } from '../navigation/types';
import type { AchievementStatus, CreateCardInput } from '../api/types';

type Props = NativeStackScreenProps<RootStackParamList, 'AddCard'>;

interface SelectedPokemon {
  id: number;
  name: string;
  details: PokemonDetails | null;
  detailsFailed: boolean;
}

/**
 * Si `imageUrl` es un `data:` local (foto recién escaneada, todavía sin
 * subir — ver AddCardFab, que ya NO sube a R2 apenas se toma la foto para no
 * dejar fotos huérfanas de escaneos que nunca se guardan), la sube a R2 acá,
 * recién cuando el trainer de verdad confirma "Guardar carta". Si ya es una
 * URL real (http/R2, por ejemplo de una carta encontrada en el Buscador) no
 * hace nada. Si la subida falla (sin red, servidor sin R2 configurado),
 * devuelve el `data:` tal cual — el backend lo sigue aceptando como
 * respaldo, nunca se pierde la foto por esto.
 */
async function resolveImageUrlForSave(imageUrl: string): Promise<string> {
  const match = imageUrl.match(/^data:([^;]+);base64,(.+)$/s);
  if (!match) return imageUrl;
  const [, mimeType, base64] = match;
  try {
    return await uploadCardImage(base64, mimeType);
  } catch {
    return imageUrl;
  }
}

/** Flujo de "Agregar carta" (§6): elegir Pokémon → completar datos → cantidad → favorita → guardar. */
export default function AddCardScreen({ navigation, route }: Props) {
  const { colors, spacing, type } = useTheme();
  const queryClient = useQueryClient();
  const trainersQuery = useTrainers();
  const discoveredQuery = useDiscoveredPokemon();
  const enrichPokemon = useEnrichPokemon();
  const createCard = useCreateCard();

  const prefill = route.params;

  const [selected, setSelected] = useState<SelectedPokemon | null>(null);
  const [searchTerm, setSearchTerm] = useState(prefill?.prefillPokemonName ?? '');
  const [searchResults, setSearchResults] = useState<PokemonSpeciesListItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const [values, setValues] = useState<CardFormValues>(() => ({
    ...EMPTY_CARD_FORM_VALUES,
    setName: prefill?.prefillSetName ?? EMPTY_CARD_FORM_VALUES.setName,
    cardNumber: prefill?.prefillCardNumber ?? EMPTY_CARD_FORM_VALUES.cardNumber,
    imageUrl: prefill?.prefillImageUrl ?? EMPTY_CARD_FORM_VALUES.imageUrl,
  }));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Viniendo del Buscador o de escanear una foto (pokébola en Home/Colección,
  // ver AddCardFab) ya sabemos el nombre. Si matchea exacto con una especie
  // real, la elegimos sola — "un niño nunca va a agregar cartas escribiendo
  // en el formulario": la búsqueda manual es el respaldo, no el paso 1.
  useEffect(() => {
    const name = prefill?.prefillPokemonName;
    if (!name) return;
    setSearchTerm(name);
    setIsSearching(true);
    setSearchError(null);
    searchPokemonSpecies(name)
      .then((results) => {
        setSearchResults(results);
        const normalized = normalizeForSearch(name);
        const exact = results.find((r) => normalizeForSearch(r.name) === normalized);
        if (exact) handlePickPokemon(exact);
      })
      .catch(() => setSearchError('No pudimos buscar Pokémon. Revisá tu conexión.'))
      .finally(() => setIsSearching(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

    const trimmedImageUrl = values.imageUrl.trim();
    const imageUrl = trimmedImageUrl ? await resolveImageUrlForSave(trimmedImageUrl) : undefined;

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
      imageUrl,
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

      // Toast en vez de un modal a tocar (pedido explícito: "no quiero tener
      // que dar tantos clics al momento de guardar") — un solo mensaje, el
      // más relevante, y directo a Home sin esperar ningún tap.
      const message = !wasAlreadyDiscovered
        ? `¡Nuevo Pokémon descubierto! Agregaron su primera carta de ${selected.name}.`
        : (newlyUnlocked[0] as AchievementStatus | undefined)?.title
          ? `¡Logro desbloqueado! ${(newlyUnlocked[0] as AchievementStatus).title}`
          : '¡Carta agregada!';
      if (Platform.OS === 'android') {
        ToastAndroid.show(message, ToastAndroid.LONG);
      }
      navigation.navigate('Main', { screen: 'Inicio' });
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Algo salió mal. Probá de nuevo.');
    } finally {
      setSaving(false);
    }
  }

  const canSave = !!selected && values.setName.trim().length > 0 && values.cardNumber.trim().length > 0;

  return (
    <SafeAreaView style={[styles.flex1, { backgroundColor: colors.background }]} edges={['top', 'left', 'right', 'bottom']}>
      <View style={[styles.headerRow, { padding: spacing.md, gap: spacing.sm }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={[styles.backArrow, { color: colors.text }]}>←</Text>
        </Pressable>
        <AppIcon name="pokebola" size={24} />
        <Text style={{ ...type.h1, color: colors.text }}>Agregar carta</Text>
      </View>

      {!selected ? (
        <View style={[styles.flex1, { padding: spacing.lg, gap: spacing.md }]}>
          <TextField
            label="¿Qué Pokémon es?"
            required
            value={searchTerm}
            onChangeText={handleSearch}
            placeholder="Ej. Pikachu"
            autoFocus
          />
          {isSearching ? <LoadingSpinner size={32} /> : null}
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
                style={[
                  styles.speciesTile,
                  { gap: spacing.xxs, padding: spacing.sm, backgroundColor: colors.cardBg, borderColor: colors.border },
                ]}
              >
                <Image
                  source={{ uri: officialArtworkUrl(item.id) }}
                  style={styles.speciesImage}
                  resizeMode="contain"
                />
                <Text numberOfLines={1} style={[styles.capitalize, { ...type.caption, color: colors.text }]}>
                  {item.name}
                </Text>
              </Pressable>
            )}
          />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.huge }}>
          <View style={[styles.headerRow, { gap: spacing.md }]}>
            <Image
              source={{ uri: selected.details?.spriteUrl ?? officialArtworkUrl(selected.id) }}
              style={styles.selectedImage}
              resizeMode="contain"
            />
            <View style={styles.flex1}>
              <Text style={[styles.capitalize, { ...type.h1, color: colors.text }]}>{selected.name}</Text>
              {loadingDetails ? (
                <Text style={{ ...type.caption, color: colors.textSecondary }}>Buscando su info…</Text>
              ) : selected.detailsFailed ? (
                <Text style={{ ...type.caption, color: colors.textSecondary }}>
                  Sin conexión — se completa más tarde
                </Text>
              ) : null}
            </View>
            <Pressable onPress={() => setSelected(null)}>
              <Text style={[styles.bold, { ...type.bodySm, color: colors.primary }]}>Cambiar</Text>
            </Pressable>
          </View>

          {values.imageUrl ? (
            // La foto real (recortada) que se va a guardar — para que el
            // trainer pueda notar antes de guardar si el escaneo agarró otra
            // cosa que no era la carta, en vez de enterarse recién en
            // Colección (ver design.md de add-scan-and-favorites-widget).
            <Image source={{ uri: values.imageUrl }} style={styles.previewImage} resizeMode="cover" />
          ) : null}

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  backArrow: { fontSize: 24 },
  capitalize: { textTransform: 'capitalize' },
  bold: { fontWeight: '600' },
  speciesTile: { flex: 1, alignItems: 'center', borderRadius: 14, borderWidth: 1 },
  speciesImage: { width: 64, height: 64 },
  selectedImage: { width: 72, height: 72 },
  previewImage: { width: 140, height: 196, alignSelf: 'center', borderRadius: 8 },
});
