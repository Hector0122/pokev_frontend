import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { typeInfo } from '../services/pokemonTypes';
import type { Card } from '../api/types';

interface Props {
  card: Card;
  onPress: () => void;
}

/**
 * Tarjeta de la grilla de "Mi colección" (§5) — imagen prominente, poco
 * texto, favorita marcada con ❤️ si alguien la marcó (§11).
 */
export default function CardTile({ card, onPress }: Props) {
  const { colors, spacing, radius, type, fontFamily, elevation } = useTheme();
  const artwork = card.imageUrl ?? card.pokemon.spriteUrl;
  const info = typeInfo(card.pokemon.primaryType);
  const isFavorite = card.favoritedBy.length > 0;

  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        backgroundColor: colors.cardBg,
        borderRadius: radius.md,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border,
        ...elevation.sm,
      }}
    >
      <View style={{ aspectRatio: 1, backgroundColor: info.color + '22', alignItems: 'center', justifyContent: 'center' }}>
        {artwork ? (
          <Image source={{ uri: artwork }} style={{ width: '80%', height: '80%' }} resizeMode="contain" />
        ) : (
          <Text style={{ fontSize: 40 }}>{info.icon}</Text>
        )}
        {isFavorite ? (
          <Text style={{ position: 'absolute', top: spacing.xxs, right: spacing.xxs, fontSize: 18 }}>❤️</Text>
        ) : null}
        {card.quantity > 1 ? (
          <View
            style={{
              position: 'absolute',
              bottom: spacing.xxs,
              right: spacing.xxs,
              backgroundColor: colors.overlay,
              borderRadius: radius.pill,
              paddingHorizontal: spacing.xs,
              paddingVertical: 2,
            }}
          >
            <Text style={{ ...type.caption, color: '#FFFFFF' }}>x{card.quantity}</Text>
          </View>
        ) : null}
      </View>
      <View style={{ padding: spacing.sm, gap: 2 }}>
        <Text numberOfLines={1} style={{ ...type.bodySm, fontWeight: '600', color: colors.text }}>
          {card.pokemon.name}
        </Text>
        <Text numberOfLines={1} style={{ ...type.caption, color: colors.textSecondary, fontFamily: fontFamily.mono }}>
          {card.setName} · #{card.cardNumber}
        </Text>
      </View>
    </Pressable>
  );
}
