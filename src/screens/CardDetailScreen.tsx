import React, { useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../theme/ThemeContext';
import { typeInfo } from '../services/pokemonTypes';
import { useCard, useDeleteCard, useSetCardFavorite } from '../hooks/queries/useCards';
import { useTrainers } from '../hooks/queries/useTrainers';
import { runWithAchievementUnlockDetection } from '../hooks/queries/useAchievements';
import QueryState from '../components/QueryState';
import Button from '../components/Button';
import CelebrationModal from '../components/CelebrationModal';
import ImageViewerModal from '../components/ImageViewerModal';
import type { RootStackParamList } from '../navigation/types';
import type { AchievementStatus } from '../api/types';

type Props = NativeStackScreenProps<RootStackParamList, 'CardDetail'>;

function InfoRow({ label, value }: { label: string; value: string }) {
  const { colors, spacing, type } = useTheme();
  return (
    <View style={[styles.rowBetween, { paddingVertical: spacing.xxs }]}>
      <Text style={{ ...type.bodySm, color: colors.textSecondary }}>{label}</Text>
      <Text style={[styles.bold, { ...type.bodySm, color: colors.text }]}>{value}</Text>
    </View>
  );
}

/** Información de cada carta (§8): datos básicos + info de colección. */
export default function CardDetailScreen({ route, navigation }: Props) {
  const { cardId } = route.params;
  const { colors, spacing, radius, type, fontFamily, elevation } = useTheme();
  const queryClient = useQueryClient();

  const cardQuery = useCard(cardId);
  const trainersQuery = useTrainers();
  const deleteCard = useDeleteCard();
  const setFavorite = useSetCardFavorite();

  const [celebration, setCelebration] = useState<{ icon: string; title: string } | null>(null);
  const [viewerVisible, setViewerVisible] = useState(false);

  function confirmDelete() {
    Alert.alert('Eliminar carta', '¿Seguro que querés eliminar esta carta de la colección?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await deleteCard.mutateAsync(cardId);
          navigation.goBack();
        },
      },
    ]);
  }

  async function handleToggleFavorite(role: 'DAD' | 'KID', currentlyFavorite: boolean) {
    const { newlyUnlocked } = await runWithAchievementUnlockDetection(queryClient, () =>
      setFavorite.mutateAsync({ id: cardId, role, isFavorite: !currentlyFavorite }),
    );
    const first = newlyUnlocked[0] as AchievementStatus | undefined;
    if (first) setCelebration({ icon: first.icon ?? '🏆', title: first.title });
  }

  return (
    <SafeAreaView style={[styles.flex1, { backgroundColor: colors.background }]} edges={['top', 'left', 'right', 'bottom']}>
      <View style={[styles.headerRow, { padding: spacing.md, gap: spacing.sm }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={[styles.backArrow, { color: colors.text }]}>←</Text>
        </Pressable>
        <View style={styles.flex1} />
        <Pressable onPress={() => navigation.navigate('EditCard', { cardId })} hitSlop={12}>
          <Text style={styles.icon22}>✏️</Text>
        </Pressable>
        <Pressable onPress={confirmDelete} hitSlop={12} style={{ marginLeft: spacing.md }}>
          <Text style={styles.icon22}>🗑️</Text>
        </Pressable>
      </View>

      <QueryState isLoading={cardQuery.isLoading} error={cardQuery.error} onRetry={() => cardQuery.refetch()}>
        {cardQuery.data ? (
          <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.huge }}>
            {(() => {
              const card = cardQuery.data;
              const info = typeInfo(card.pokemon.primaryType);
              const artwork = card.imageUrl ?? card.pokemon.spriteUrl;
              const favoriteRoles = new Set(card.favoritedBy.map((f) => f.trainer.role));

              return (
                <>
                  <Pressable
                    // La navegación a la especie ya está duplicada en el
                    // enlace "Ver Pokémon →" de abajo — este tap abre la
                    // foto en grande en su lugar (antes no había forma de
                    // verla más grande que 180×180, ni con la foto real
                    // escaneada de la carta).
                    onPress={() => (artwork ? setViewerVisible(true) : undefined)}
                    style={[
                      styles.centered,
                      { backgroundColor: info.color + '22', borderRadius: radius.lg, padding: spacing.lg },
                    ]}
                  >
                    {artwork ? (
                      <Image source={{ uri: artwork }} style={styles.artwork} resizeMode="contain" />
                    ) : (
                      <Text style={styles.artworkIcon}>{info.icon}</Text>
                    )}
                  </Pressable>

                  <Pressable onPress={() => navigation.navigate('PokemonDetail', { pokemonId: card.pokemon.id })}>
                    <Text style={[styles.capitalize, { ...type.display, fontFamily: fontFamily.display, color: colors.text }]}>
                      {card.pokemon.name}
                    </Text>
                    <Text style={{ ...type.body, color: colors.textSecondary }}>
                      {info.icon} {info.es}
                      {card.pokemon.secondaryType ? ` · ${typeInfo(card.pokemon.secondaryType).es}` : ''}
                    </Text>
                    <Text style={[styles.bold, { ...type.bodySm, color: colors.primary, marginTop: spacing.xxs }]}>
                      Ver Pokémon →
                    </Text>
                  </Pressable>

                  <View style={[styles.row, { gap: spacing.sm }]}>
                    {(['DAD', 'KID'] as const).map((role) => {
                      const trainer = (trainersQuery.data ?? []).find((t) => t.role === role);
                      const isFavorite = favoriteRoles.has(role);
                      return (
                        <Pressable
                          key={role}
                          onPress={() => handleToggleFavorite(role, isFavorite)}
                          style={[
                            styles.favoriteButton,
                            {
                              gap: spacing.xxs,
                              paddingVertical: spacing.sm,
                              borderRadius: radius.sm,
                              backgroundColor: isFavorite ? colors.accentSoft : colors.surfaceAlt,
                              borderColor: isFavorite ? colors.accent : colors.border,
                            },
                          ]}
                        >
                          <Text style={styles.icon18}>{isFavorite ? '❤️' : '🤍'}</Text>
                          <Text style={[styles.bold, { ...type.bodySm, color: colors.text }]}>
                            {trainer?.name ?? role}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  <View style={{ backgroundColor: colors.cardBg, borderRadius: radius.md, padding: spacing.md, ...elevation.sm }}>
                    <Text style={{ ...type.h2, color: colors.text, marginBottom: spacing.xs }}>Información básica</Text>
                    <InfoRow label="Expansión" value={card.setName} />
                    <InfoRow label="Número" value={card.cardNumber} />
                    {card.rarity ? <InfoRow label="Rareza" value={card.rarity} /> : null}
                    {card.cardType ? <InfoRow label="Tipo de carta" value={card.cardType} /> : null}
                    {card.hp !== null ? <InfoRow label="HP" value={String(card.hp)} /> : null}
                    {card.year !== null ? <InfoRow label="Año" value={String(card.year)} /> : null}
                    {card.language ? <InfoRow label="Idioma" value={card.language} /> : null}
                    {card.variant ? <InfoRow label="Variante" value={card.variant} /> : null}
                  </View>

                  {card.attacks && card.attacks.length > 0 ? (
                    <View
                      style={{
                        backgroundColor: colors.cardBg,
                        borderRadius: radius.md,
                        padding: spacing.md,
                        gap: spacing.xs,
                        ...elevation.sm,
                      }}
                    >
                      <Text style={{ ...type.h2, color: colors.text }}>Ataques</Text>
                      {card.attacks.map((attack, index) => (
                        <View key={index} style={styles.rowBetween}>
                          <Text style={{ ...type.bodySm, color: colors.text }}>{attack.name}</Text>
                          {attack.damage ? (
                            <Text style={{ ...type.bodySm, color: colors.textSecondary, fontFamily: fontFamily.mono }}>
                              {attack.damage}
                            </Text>
                          ) : null}
                        </View>
                      ))}
                    </View>
                  ) : null}

                  <View style={{ backgroundColor: colors.cardBg, borderRadius: radius.md, padding: spacing.md, ...elevation.sm }}>
                    <Text style={{ ...type.h2, color: colors.text, marginBottom: spacing.xs }}>Información de colección</Text>
                    <InfoRow label="Cantidad" value={String(card.quantity)} />
                    {card.acquiredAt ? (
                      <InfoRow label="Conseguida" value={new Date(card.acquiredAt).toLocaleDateString('es')} />
                    ) : null}
                    {card.acquiredWith ? <InfoRow label="Conseguida con" value={card.acquiredWith.name} /> : null}
                    {card.estimatedValueUsd ? (
                      <InfoRow label="Valor aproximado" value={`$${Number(card.estimatedValueUsd).toFixed(2)} USD`} />
                    ) : null}
                  </View>

                  <View
                    style={{
                      backgroundColor: colors.cardBg,
                      borderRadius: radius.md,
                      padding: spacing.md,
                      gap: spacing.xxs,
                      ...elevation.sm,
                    }}
                  >
                    <Text style={{ ...type.h2, color: colors.text }}>📝 Recuerdo</Text>
                    <Text
                      style={[
                        card.memory ? styles.normalStyle : styles.italicStyle,
                        { ...type.body, color: card.memory ? colors.text : colors.textMuted },
                      ]}
                    >
                      {card.memory || 'Todavía no guardamos un recuerdo para esta carta.'}
                    </Text>
                  </View>

                  <Button title="Editar carta" onPress={() => navigation.navigate('EditCard', { cardId })} variant="ghost" />
                </>
              );
            })()}
          </ScrollView>
        ) : null}
      </QueryState>

      <ImageViewerModal
        visible={viewerVisible}
        imageUri={cardQuery.data ? cardQuery.data.imageUrl ?? cardQuery.data.pokemon.spriteUrl : null}
        onClose={() => setViewerVisible(false)}
      />

      <CelebrationModal
        visible={!!celebration}
        icon={celebration?.icon ?? '🏆'}
        title={celebration?.title ?? ''}
        onDismiss={() => setCelebration(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  row: { flexDirection: 'row' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between' },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  centered: { alignItems: 'center' },
  bold: { fontWeight: '600' },
  capitalize: { textTransform: 'capitalize' },
  backArrow: { fontSize: 24 },
  icon22: { fontSize: 22 },
  icon18: { fontSize: 18 },
  artwork: { width: 180, height: 180 },
  artworkIcon: { fontSize: 80 },
  favoriteButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  normalStyle: { fontStyle: 'normal' },
  italicStyle: { fontStyle: 'italic' },
});
