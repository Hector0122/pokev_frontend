import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import PlaceholderScreen from '../components/PlaceholderScreen';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'CardDetail'>;

// Información de cada carta (§8): datos básicos + info de colección
// (favorita de quién, cuándo la conseguimos, recuerdo asociado).
export default function CardDetailScreen({ route }: Props) {
  return (
    <PlaceholderScreen
      icon="🃏"
      title="Detalle de la carta"
      description={`Carta ${route.params.cardId} — acá va toda su info y su recuerdo.`}
    />
  );
}
