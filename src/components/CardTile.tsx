import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
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
      style={[
        styles.tile,
        { backgroundColor: colors.cardBg, borderRadius: radius.md, borderColor: colors.border, ...elevation.sm },
      ]}
    >
      <View style={[styles.artworkWrap, { backgroundColor: info.color + '22' }]}>
        {artwork ? (
          <Image source={{ uri: artwork }} style={styles.artwork} resizeMode="contain" />
        ) : (
          <Text style={styles.artworkIcon}>{info.icon}</Text>
        )}
        {isFavorite ? (
          <Text style={[styles.favoriteBadge, { top: spacing.xxs, right: spacing.xxs }]}>❤️</Text>
        ) : null}
        {card.quantity > 1 ? (
          <View
            style={[
              styles.quantityBadge,
              {
                bottom: spacing.xxs,
                right: spacing.xxs,
                backgroundColor: colors.overlay,
                borderRadius: radius.pill,
                paddingHorizontal: spacing.xs,
              },
            ]}
          >
            <Text style={[styles.whiteText, { ...type.caption }]}>x{card.quantity}</Text>
          </View>
        ) : null}
      </View>
      <View style={[styles.footer, { padding: spacing.sm }]}>
        <Text numberOfLines={1} style={[styles.bold, { ...type.bodySm, color: colors.text }]}>
          {card.pokemon.name}
        </Text>
        <Text numberOfLines={1} style={{ ...type.caption, color: colors.textSecondary, fontFamily: fontFamily.mono }}>
          {card.setName} · #{card.cardNumber}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: { flex: 1, overflow: 'hidden', borderWidth: 1 },
  artworkWrap: { aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  artwork: { width: '80%', height: '80%' },
  artworkIcon: { fontSize: 40 },
  favoriteBadge: { position: 'absolute', fontSize: 18 },
  quantityBadge: { position: 'absolute', paddingVertical: 2 },
  whiteText: { color: '#FFFFFF' },
  bold: { fontWeight: '600' },
  footer: { gap: 2 },
});
