import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
import { useCard, useCardPrice, useCardTcg } from '../hooks/queries/useCards';
import { cardArtwork, cardTitle } from '../services/cardDisplay';
import { formatPrice } from '../services/tcgdex';
import { buzz } from '../services/haptics';
import FlipCard from '../components/FlipCard';
import Confetti from '../components/Confetti';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'CardReveal'>;

const FLIP_AFTER_MS = 600;
const CLOSE_AFTER_MS = 5500;

/**
 * "¡Abrir carta!" — la carta recién guardada aparece boca abajo, se voltea
 * con confeti y revela cuánto vale. Se cierra sola (no suma clics al
 * guardar); tocar en cualquier lado la cierra antes.
 */
export default function CardRevealScreen({ route, navigation }: Props) {
  const { cardId, headline } = route.params;
  const { spacing, type, fontFamily } = useTheme();
  const card = useCard(cardId).data;
  const price = useCardPrice(card).data;
  const tcg = useCardTcg(card).data;
  const [flipped, setFlipped] = useState(false);

  const close = () => navigation.navigate('Main', { screen: 'Inicio' });

  useEffect(() => {
    const flip = setTimeout(() => {
      setFlipped(true);
      buzz('win');
    }, FLIP_AFTER_MS);
    const done = setTimeout(close, CLOSE_AFTER_MS);
    return () => {
      clearTimeout(flip);
      clearTimeout(done);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Pressable onPress={close} style={[styles.backdrop, { padding: spacing.xl, gap: spacing.lg }]}>
      <Text style={[styles.white, styles.center, { ...type.h1, fontFamily: fontFamily.display }]}>{headline}</Text>
      <FlipCard
        imageUri={card ? cardArtwork(card) : null}
        flipped={flipped && !!card}
        width={220}
        rarity={tcg?.rarity ?? card?.rarity}
      />
      <View style={[styles.center, flipped ? null : styles.hidden, { gap: spacing.xxs }]}>
        {card ? (
          <Text style={[styles.white, styles.center, styles.capitalize, { ...type.h2 }]}>{cardTitle(card)}</Text>
        ) : null}
        <Text style={[styles.gold, styles.center, { ...type.h1, fontFamily: fontFamily.display }]}>
          {price ? `💰 ${formatPrice(price)}` : ' '}
        </Text>
      </View>
      <Text style={[styles.dim, { ...type.caption }]}>Tocá para seguir</Text>
      {flipped ? <Confetti /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(10,10,30,0.92)' },
  white: { color: '#FFFFFF' },
  gold: { color: '#FFD54F' },
  dim: { color: 'rgba(255,255,255,0.6)' },
  center: { textAlign: 'center', alignItems: 'center' },
  capitalize: { textTransform: 'capitalize' },
  hidden: { opacity: 0 },
});
