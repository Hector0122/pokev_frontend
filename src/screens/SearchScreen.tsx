import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  Modal,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
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
import ImageViewerModal from '../components/ImageViewerModal';
import LoadingSpinner from '../components/LoadingSpinner';
import Button from '../components/Button';
import TextField from '../components/TextField';
import type { MainTabNavigationProp } from '../navigation/types';

interface SetGroup {
  setId: string;
  setName: string;
  cards: TcgCardSummary[];
}

/** Parte un array en filas de `size` — así la grilla de cartas se puede virtualizar con SectionList. */
function chunk<T>(items: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) rows.push(items.slice(i, i + size));
  return rows;
}

const CARD_TILE_WIDTH = 104;

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
  const { width: windowWidth } = useWindowDimensions();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<TcgCardSummary[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [setsMap, setSetsMap] = useState<Map<string, TcgSet>>(new Map());

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<TcgCardDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [viewerVisible, setViewerVisible] = useState(false);

  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);
  const [setPickerOpen, setSetPickerOpen] = useState(false);
  const [setPickerQuery, setSetPickerQuery] = useState('');

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
    if (trimmed.length < 2 && !selectedSetId) {
      setResults([]);
      setSearchError(null);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      setSearchError(null);
      try {
        const found = await searchCards({
          name: trimmed.length >= 2 ? trimmed : undefined,
          setId: selectedSetId ?? undefined,
        });
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
  }, [query, selectedSetId]);

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

  // Cuántas tiles entran por fila según el ancho real de pantalla — así la
  // grilla se puede virtualizar con SectionList (renderiza filas, no cartas
  // sueltas) sin perder el layout responsive que tenía el flexWrap anterior.
  const numColumns = useMemo(() => {
    const usableWidth = windowWidth - spacing.lg * 2;
    const columns = Math.floor((usableWidth + spacing.sm) / (CARD_TILE_WIDTH + spacing.sm));
    return Math.max(columns, 2);
  }, [windowWidth, spacing.lg, spacing.sm]);

  const sections = useMemo(
    () => groups.map((group) => ({ key: group.setId, title: group.setName, data: chunk(group.cards, numColumns) })),
    [groups, numColumns],
  );

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

  const setsList = useMemo(
    () => Array.from(setsMap.values()).sort((a, b) => a.name.localeCompare(b.name)),
    [setsMap],
  );
  const filteredSetsList = useMemo(() => {
    const normalizedQuery = normalizeForSearch(setPickerQuery.trim());
    if (!normalizedQuery) return setsList;
    return setsList.filter((set) => normalizeForSearch(set.name).includes(normalizedQuery));
  }, [setsList, setPickerQuery]);
  const selectedSetName = selectedSetId ? setsMap.get(selectedSetId)?.name ?? selectedSetId : 'Todas las expansiones';
  const hasSearch = query.trim().length >= 2 || !!selectedSetId;

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
    <SafeAreaView style={[styles.flex1, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <View style={{ padding: spacing.lg, paddingBottom: spacing.sm, gap: spacing.md }}>
        <Text style={{ ...type.display, fontFamily: fontFamily.display, color: colors.text }}>Buscador</Text>
        <TextField
          label="¿Qué Pokémon buscamos?"
          value={query}
          onChangeText={setQuery}
          placeholder="Ej. Pikachu"
          autoFocus
        />
        <Pressable
          onPress={() => {
            setSetPickerQuery('');
            setSetPickerOpen(true);
          }}
          style={[
            styles.setPickerTrigger,
            {
              borderRadius: radius.sm,
              backgroundColor: colors.inputBg,
              borderColor: colors.border,
              paddingHorizontal: spacing.sm,
            },
          ]}
        >
          <Text style={{ ...type.body, color: colors.text }}>{selectedSetName}</Text>
        </Pressable>
      </View>

      {isSearching ? (
        <View style={[styles.centered, { marginTop: spacing.md }]}>
          <LoadingSpinner size={32} />
        </View>
      ) : null}
      {searchError ? (
        <Text style={{ ...type.bodySm, color: colors.danger, paddingHorizontal: spacing.lg }}>{searchError}</Text>
      ) : null}

      {!isSearching && hasSearch && results.length === 0 && !searchError ? (
        <View style={[styles.emptyState, { padding: spacing.xxl, gap: spacing.sm }]}>
          <AppIcon name="psyduck" size={72} />
          <Text style={[styles.textCenter, { ...type.h1, color: colors.text }]}>
            {query.trim().length >= 2
              ? `No encontramos cartas de "${query.trim()}"`
              : `No encontramos cartas de ${selectedSetName}`}
          </Text>
        </View>
      ) : (
        <SectionList
          style={styles.flex1}
          sections={sections}
          keyExtractor={(row, index) => row[0]?.id ?? `row-${index}`}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={[
            styles.scrollContent,
            sections.length === 0 ? styles.justifyCenter : styles.justifyStart,
            { padding: spacing.lg, paddingBottom: spacing.huge },
          ]}
          renderSectionHeader={({ section }) => (
            <Text style={{ ...type.h2, color: colors.text, marginBottom: spacing.sm }}>{section.title}</Text>
          )}
          renderItem={({ item: row }) => (
            <View style={[styles.setRow, { gap: spacing.sm, marginBottom: spacing.sm }]}>
              {row.map((card) => (
                <SearchCardTile key={card.id} card={card} owned={isOwned(card)} onPress={() => openCard(card)} />
              ))}
            </View>
          )}
          ListFooterComponent={<View style={{ height: spacing.lg }} />}
          ListEmptyComponent={
            <View style={[styles.centered, { gap: spacing.sm }]}>
              <AppIcon name="ditto" size={96} />
              <Text style={[styles.textCenter, { ...type.body, color: colors.textSecondary }]}>
                Escribí el nombre de un Pokémon o elegí una expansión para ver sus cartas.
              </Text>
            </View>
          }
        />
      )}

      <Modal visible={!!selectedId} transparent animationType="fade" onRequestClose={closeDetail}>
        <Pressable
          onPress={closeDetail}
          style={[styles.emptyState, { backgroundColor: colors.overlay, padding: spacing.xl }]}
        >
          <Pressable
            onPress={() => {}}
            style={[
              styles.modalCard,
              {
                backgroundColor: colors.surface,
                borderRadius: radius.xl,
                padding: spacing.xl,
                gap: spacing.sm,
              },
            ]}
          >
            {detailLoading ? <LoadingSpinner size={40} /> : null}
            {detailError ? <Text style={{ ...type.bodySm, color: colors.danger }}>{detailError}</Text> : null}
            {selectedDetail ? (
              <>
                {selectedDetail.image ? (
                  <Pressable onPress={() => setViewerVisible(true)}>
                    <Image
                      source={{ uri: cardImageUrl(selectedDetail.image, 'high', 'png') }}
                      style={styles.detailImage}
                      resizeMode="contain"
                    />
                  </Pressable>
                ) : null}
                <Text style={[styles.textCenter, { ...type.h1, color: colors.text }]}>{selectedDetail.name}</Text>
                <Text style={[styles.textCenter, { ...type.bodySm, color: colors.textSecondary }]}>
                  {selectedDetail.set.name} · #{selectedDetail.localId}
                  {selectedDetail.rarity ? ` · ${selectedDetail.rarity}` : ''}
                </Text>
                {isOwned(selectedDetail) ? (
                  <Text style={[styles.bold, { ...type.bodySm, color: colors.primary }]}>✓ Ya la tenemos</Text>
                ) : (
                  <Button
                    title="Agregar esta carta"
                    icon={<AppIcon name="pokebola" size={20} />}
                    onPress={goAddThisCard}
                    style={[styles.stretchTop, { marginTop: spacing.xs }]}
                  />
                )}
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>

      <ImageViewerModal
        visible={viewerVisible}
        imageUri={selectedDetail?.image ? cardImageUrl(selectedDetail.image, 'high', 'png') : null}
        onClose={() => setViewerVisible(false)}
      />

      <Modal
        visible={setPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setSetPickerOpen(false)}
      >
        <Pressable
          onPress={() => setSetPickerOpen(false)}
          style={[styles.emptyState, { backgroundColor: colors.overlay, padding: spacing.xl }]}
        >
          <Pressable
            onPress={() => {}}
            style={[
              styles.setPickerModal,
              { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg },
            ]}
          >
            <Text style={{ ...type.h1, color: colors.text, marginBottom: spacing.sm }}>Expansión</Text>
            <TextField
              label="Buscar expansión"
              value={setPickerQuery}
              onChangeText={setSetPickerQuery}
              placeholder="Ej. Heroes Ascendentes"
              autoFocus
              style={{ marginBottom: spacing.sm }}
            />
            <FlatList
              data={filteredSetsList}
              keyExtractor={(set) => set.id}
              ListHeaderComponent={
                setPickerQuery.trim() ? null : (
                  <SetPickerRow
                    name="Todas las expansiones"
                    selected={!selectedSetId}
                    onPress={() => {
                      setSelectedSetId(null);
                      setSetPickerOpen(false);
                    }}
                  />
                )
              }
              renderItem={({ item }) => (
                <SetPickerRow
                  name={item.name}
                  logo={item.logo}
                  selected={selectedSetId === item.id}
                  onPress={() => {
                    setSelectedSetId(item.id);
                    setSetPickerOpen(false);
                  }}
                />
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function SearchCardTile({ card, owned, onPress }: { card: TcgCardSummary; owned: boolean; onPress: () => void }) {
  const { colors, spacing, radius, type } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.cardTile,
        {
          borderRadius: radius.md,
          backgroundColor: colors.cardBg,
          borderColor: colors.border,
          padding: spacing.xs,
          gap: spacing.xxs,
        },
      ]}
    >
      <View style={styles.relative}>
        {card.image ? (
          <Image
            source={{ uri: cardImageUrl(card.image, 'low', 'webp') }}
            style={[styles.cardImage, { borderRadius: radius.sm }]}
            resizeMode="contain"
          />
        ) : (
          <View
            style={[
              styles.cardImage,
              styles.centerBoth,
              { borderRadius: radius.sm, backgroundColor: colors.surfaceAlt },
            ]}
          >
            <AppIcon name="pokebola" size={40} />
          </View>
        )}
        {owned ? (
          <View
            style={[
              styles.ownedBadge,
              styles.centerBoth,
              {
                top: spacing.xxs,
                right: spacing.xxs,
                borderRadius: radius.pill,
                backgroundColor: colors.primary,
              },
            ]}
          >
            <Text style={styles.ownedBadgeCheck}>✓</Text>
          </View>
        ) : null}
      </View>
      <Text numberOfLines={1} style={[styles.bold, { ...type.caption, color: colors.text }]}>
        {card.name}
      </Text>
      <Text style={{ ...type.caption, color: colors.textSecondary }}>#{card.localId}</Text>
    </Pressable>
  );
}

function SetPickerRow({
  name,
  logo,
  selected,
  onPress,
}: {
  name: string;
  logo?: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors, spacing, radius, type } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.setPickerRow,
        {
          gap: spacing.sm,
          paddingVertical: spacing.sm,
          borderRadius: radius.sm,
          backgroundColor: selected ? colors.surfaceAlt : 'transparent',
          paddingHorizontal: spacing.sm,
        },
      ]}
    >
      {logo ? (
        <Image source={{ uri: `${logo}.png` }} style={styles.setPickerLogo} resizeMode="contain" />
      ) : (
        <View style={styles.setPickerLogo} />
      )}
      <Text style={{ ...type.body, color: colors.text, flexShrink: 1 }}>{name}</Text>
      {selected ? <Text style={{ color: colors.primary }}>✓</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  centered: { alignItems: 'center' },
  centerBoth: { alignItems: 'center', justifyContent: 'center' },
  textCenter: { textAlign: 'center' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { flexGrow: 1 },
  justifyCenter: { justifyContent: 'center' },
  justifyStart: { justifyContent: 'flex-start' },
  setRow: { flexDirection: 'row' },
  cardTile: { width: CARD_TILE_WIDTH, borderWidth: 1 },
  relative: { position: 'relative' },
  cardImage: { width: '100%', height: 130 },
  ownedBadge: { position: 'absolute', width: 24, height: 24 },
  ownedBadgeCheck: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  bold: { fontWeight: '600' },
  modalCard: { alignItems: 'center', maxWidth: 360, width: '100%' },
  detailImage: { width: 220, height: 300 },
  stretchTop: { alignSelf: 'stretch' },
  setPickerTrigger: { borderWidth: 1, paddingVertical: 10 },
  setPickerModal: { maxWidth: 420, width: '100%', maxHeight: '70%' },
  setPickerRow: { flexDirection: 'row', alignItems: 'center' },
  setPickerLogo: { width: 32, height: 22 },
});
