import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { useCards } from '../hooks/queries/useCards';
import { normalizeForSearch } from '../services/pokeapi';
import {
  cardImageUrl,
  fetchCardDetail,
  getSetsMap,
  searchCards,
  setIdFromCardId,
  type TcgCardDetail,
  type TcgCardSummary,
  type TcgSet,
} from '../services/tcgdex';
import AppIcon from '../components/AppIcon';
import LoadingSpinner from '../components/LoadingSpinner';
import Button from '../components/Button';
import TextField from '../components/TextField';
import type { MainTabNavigationProp } from '../navigation/types';

interface SetGroup {
  setId: string;
  setName: string;
  cards: TcgCardSummary[];
}

/**
 * Buscador de cartas (§7) — buscar un Pokémon y ver TODAS las cartas
 * disponibles de ese Pokémon, las tengamos o no ("esto permite descubrir
 * cartas nuevas sin convertirlas en objetivos obligatorios"). Catálogo vía
 * TCGdex (ver services/tcgdex.ts) — PokeAPI da datos de especie, no cartas.
 */
export default function SearchScreen() {
  const { colors, spacing, radius, type, fontFamily } = useTheme();
  const navigation = useNavigation<MainTabNavigationProp<'Buscador'>>();
  const ownedCardsQuery = useCards();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<TcgCardSummary[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [setsMap, setSetsMap] = useState<Map<string, TcgSet>>(new Map());

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<TcgCardDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    getSetsMap()
      .then(setSetsMap)
      .catch(() => {
        // Sin el mapa de sets igual mostramos resultados, solo sin agrupar por nombre de expansión.
      });
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setSearchError(null);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      setSearchError(null);
      try {
        const found = await searchCards(trimmed);
        setResults(found);
      } catch {
        setSearchError('No pudimos buscar cartas. Revisá tu conexión.');
      } finally {
        setIsSearching(false);
      }
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const groups = useMemo<SetGroup[]>(() => {
    const bySet = new Map<string, TcgCardSummary[]>();
    for (const card of results) {
      const setId = setIdFromCardId(card.id);
      const list = bySet.get(setId) ?? [];
      list.push(card);
      bySet.set(setId, list);
    }
    return Array.from(bySet.entries()).map(([setId, cards]) => ({
      setId,
      setName: setsMap.get(setId)?.name ?? setId,
      cards,
    }));
  }, [results, setsMap]);

  // Heurística "ya la tenés": mismo Pokémon + mismo número de carta. La
  // expansión no entra en el match porque `setName` en la colección es
  // texto libre que carga el usuario (CardFieldsForm), no un id de TCGdex.
  const ownedKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const card of ownedCardsQuery.data ?? []) {
      keys.add(`${normalizeForSearch(card.pokemon.name)}__${card.cardNumber.trim()}`);
    }
    return keys;
  }, [ownedCardsQuery.data]);

  function isOwned(card: TcgCardSummary) {
    return ownedKeys.has(`${normalizeForSearch(card.name)}__${card.localId.trim()}`);
  }

  async function openCard(card: TcgCardSummary) {
    setSelectedId(card.id);
    setSelectedDetail(null);
    setDetailError(null);
    setDetailLoading(true);
    try {
      const detail = await fetchCardDetail(card.id);
      setSelectedDetail(detail);
    } catch {
      setDetailError('No pudimos cargar esta carta. Probá de nuevo.');
    } finally {
      setDetailLoading(false);
    }
  }

  function closeDetail() {
    setSelectedId(null);
    setSelectedDetail(null);
    setDetailError(null);
  }

  function goAddThisCard() {
    if (!selectedDetail) return;
    navigation.navigate('AddCard', {
      // El nombre de la carta puede traer sufijos TCG ("Pikachu Vuelo V",
      // "Pikachu ex") que no matchean con el nombre de la especie en
      // PokeAPI — usamos lo que el usuario efectivamente tipeó para buscar.
      prefillPokemonName: query.trim(),
      prefillSetName: selectedDetail.set.name,
      prefillCardNumber: selectedDetail.localId,
      prefillImageUrl: selectedDetail.image ? cardImageUrl(selectedDetail.image, 'high', 'png') : undefined,
    });
    closeDetail();
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'left', 'right']}>
      <View style={{ padding: spacing.lg, paddingBottom: spacing.sm, gap: spacing.md }}>
        <Text style={{ ...type.display, fontFamily: fontFamily.display, color: colors.text }}>Buscador</Text>
        <TextField
          label="¿Qué Pokémon buscamos?"
          value={query}
          onChangeText={setQuery}
          placeholder="Ej. Pikachu"
          autoFocus
        />
      </View>

      {isSearching ? (
        <View style={{ alignItems: 'center', marginTop: spacing.md }}>
          <LoadingSpinner size={32} />
        </View>
      ) : null}
      {searchError ? (
        <Text style={{ ...type.bodySm, color: colors.danger, paddingHorizontal: spacing.lg }}>{searchError}</Text>
      ) : null}

      {!isSearching && query.trim().length >= 2 && results.length === 0 && !searchError ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl, gap: spacing.sm }}>
          <AppIcon name="psyduck" size={72} />
          <Text style={{ ...type.h1, color: colors.text, textAlign: 'center' }}>
            No encontramos cartas de "{query.trim()}"
          </Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: groups.length === 0 ? 'center' : 'flex-start',
            padding: spacing.lg,
            gap: spacing.lg,
            paddingBottom: spacing.huge,
          }}
        >
          {groups.map((group) => (
            <View key={group.setId} style={{ gap: spacing.sm }}>
              <Text style={{ ...type.h2, color: colors.text }}>{group.setName}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                {group.cards.map((card) => {
                  const owned = isOwned(card);
                  return (
                    <Pressable
                      key={card.id}
                      onPress={() => openCard(card)}
                      style={{
                        width: 104,
                        borderRadius: radius.md,
                        backgroundColor: colors.cardBg,
                        borderWidth: 1,
                        borderColor: colors.border,
                        padding: spacing.xs,
                        gap: spacing.xxs,
                      }}
                    >
                      <View style={{ position: 'relative' }}>
                        {card.image ? (
                          <Image
                            source={{ uri: cardImageUrl(card.image, 'low', 'webp') }}
                            style={{ width: '100%', height: 130, borderRadius: radius.sm }}
                            resizeMode="contain"
                          />
                        ) : (
                          <View
                            style={{
                              width: '100%',
                              height: 130,
                              borderRadius: radius.sm,
                              backgroundColor: colors.surfaceAlt,
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <AppIcon name="pokebola" size={40} />
                          </View>
                        )}
                        {owned ? (
                          <View
                            style={{
                              position: 'absolute',
                              top: spacing.xxs,
                              right: spacing.xxs,
                              width: 24,
                              height: 24,
                              borderRadius: radius.pill,
                              backgroundColor: colors.primary,
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700' }}>✓</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text numberOfLines={1} style={{ ...type.caption, color: colors.text, fontWeight: '600' }}>
                        {card.name}
                      </Text>
                      <Text style={{ ...type.caption, color: colors.textSecondary }}>#{card.localId}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}

          {query.trim().length < 2 ? (
            <View style={{ alignItems: 'center', gap: spacing.sm }}>
              <AppIcon name="ditto" size={96} />
              <Text style={{ ...type.body, color: colors.textSecondary, textAlign: 'center' }}>
                Escribí el nombre de un Pokémon para ver todas sus cartas.
              </Text>
            </View>
          ) : null}
        </ScrollView>
      )}

      <Modal visible={!!selectedId} transparent animationType="fade" onRequestClose={closeDetail}>
        <Pressable
          onPress={closeDetail}
          style={{ flex: 1, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center', padding: spacing.xl }}
        >
          <Pressable
            onPress={() => {}}
            style={{
              backgroundColor: colors.surface,
              borderRadius: radius.xl,
              padding: spacing.xl,
              gap: spacing.sm,
              alignItems: 'center',
              maxWidth: 360,
              width: '100%',
            }}
          >
            {detailLoading ? <LoadingSpinner size={40} /> : null}
            {detailError ? <Text style={{ ...type.bodySm, color: colors.danger }}>{detailError}</Text> : null}
            {selectedDetail ? (
              <>
                {selectedDetail.image ? (
                  <Image
                    source={{ uri: cardImageUrl(selectedDetail.image, 'high', 'png') }}
                    style={{ width: 220, height: 300 }}
                    resizeMode="contain"
                  />
                ) : null}
                <Text style={{ ...type.h1, color: colors.text, textAlign: 'center' }}>{selectedDetail.name}</Text>
                <Text style={{ ...type.bodySm, color: colors.textSecondary, textAlign: 'center' }}>
                  {selectedDetail.set.name} · #{selectedDetail.localId}
                  {selectedDetail.rarity ? ` · ${selectedDetail.rarity}` : ''}
                </Text>
                {isOwned(selectedDetail) ? (
                  <Text style={{ ...type.bodySm, color: colors.primary, fontWeight: '600' }}>✓ Ya la tenemos</Text>
                ) : (
                  <Button title="Agregar esta carta" icon={<AppIcon name="pokebola" size={20} />} onPress={goAddThisCard} style={{ marginTop: spacing.xs, alignSelf: 'stretch' }} />
                )}
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
