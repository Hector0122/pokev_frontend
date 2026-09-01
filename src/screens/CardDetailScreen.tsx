import React, { useState } from 'react';
import { Alert, Image, Pressable, ScrollView, Text, View } from 'react-native';
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
import type { RootStackParamList } from '../navigation/types';
import type { AchievementStatus } from '../api/types';

type Props = NativeStackScreenProps<RootStackParamList, 'CardDetail'>;

function InfoRow({ label, value }: { label: string; value: string }) {
  const { colors, spacing, type } = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xxs }}>
      <Text style={{ ...type.bodySm, color: colors.textSecondary }}>{label}</Text>
      <Text style={{ ...type.bodySm, color: colors.text, fontWeight: '600' }}>{value}</Text>
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
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'left', 'right', 'bottom']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.md, gap: spacing.sm }}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={{ fontSize: 24, color: colors.text }}>←</Text>
        </Pressable>
        <View style={{ flex: 1 }} />
        <Pressable onPress={() => navigation.navigate('EditCard', { cardId })} hitSlop={12}>
          <Text style={{ fontSize: 22 }}>✏️</Text>
        </Pressable>
        <Pressable onPress={confirmDelete} hitSlop={12} style={{ marginLeft: spacing.md }}>
          <Text style={{ fontSize: 22 }}>🗑️</Text>
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
                    onPress={() => navigation.navigate('PokemonDetail', { pokemonId: card.pokemon.id })}
                    style={{
                      backgroundColor: info.color + '22',
                      borderRadius: radius.lg,
                      alignItems: 'center',
                      padding: spacing.lg,
                    }}
                  >
                    {artwork ? (
                      <Image source={{ uri: artwork }} style={{ width: 180, height: 180 }} resizeMode="contain" />
                    ) : (
                      <Text style={{ fontSize: 80 }}>{info.icon}</Text>
                    )}
                  </Pressable>

                  <Pressable onPress={() => navigation.navigate('PokemonDetail', { pokemonId: card.pokemon.id })}>
                    <Text style={{ ...type.display, fontFamily: fontFamily.display, color: colors.text, textTransform: 'capitalize' }}>
                      {card.pokemon.name}
                    </Text>
                    <Text style={{ ...type.body, color: colors.textSecondary }}>
                      {info.icon} {info.es}
                      {card.pokemon.secondaryType ? ` · ${typeInfo(card.pokemon.secondaryType).es}` : ''}
                    </Text>
                    <Text style={{ ...type.bodySm, color: colors.primary, fontWeight: '600', marginTop: spacing.xxs }}>
                      Ver Pokémon →
                    </Text>
                  </Pressable>

                  <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                    {(['DAD', 'KID'] as const).map((role) => {
                      const trainer = (trainersQuery.data ?? []).find((t) => t.role === role);
                      const isFavorite = favoriteRoles.has(role);
                      return (
                        <Pressable
                          key={role}
                          onPress={() => handleToggleFavorite(role, isFavorite)}
                          style={{
                            flex: 1,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: spacing.xxs,
                            paddingVertical: spacing.sm,
                            borderRadius: radius.sm,
                            backgroundColor: isFavorite ? colors.accentSoft : colors.surfaceAlt,
                            borderWidth: 1,
                            borderColor: isFavorite ? colors.accent : colors.border,
                          }}
                        >
                          <Text style={{ fontSize: 18 }}>{isFavorite ? '❤️' : '🤍'}</Text>
                          <Text style={{ ...type.bodySm, color: colors.text, fontWeight: '600' }}>
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
                    <View style={{ backgroundColor: colors.cardBg, borderRadius: radius.md, padding: spacing.md, gap: spacing.xs, ...elevation.sm }}>
                      <Text style={{ ...type.h2, color: colors.text }}>Ataques</Text>
                      {card.attacks.map((attack, index) => (
                        <View key={index} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
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

                  <View style={{ backgroundColor: colors.cardBg, borderRadius: radius.md, padding: spacing.md, gap: spacing.xxs, ...elevation.sm }}>
                    <Text style={{ ...type.h2, color: colors.text }}>📝 Recuerdo</Text>
                    <Text style={{ ...type.body, color: card.memory ? colors.text : colors.textMuted, fontStyle: card.memory ? 'normal' : 'italic' }}>
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

      <CelebrationModal
        visible={!!celebration}
        icon={celebration?.icon ?? '🏆'}
        title={celebration?.title ?? ''}
        onDismiss={() => setCelebration(null)}
      />
    </SafeAreaView>
  );
}
