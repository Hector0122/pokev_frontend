import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import PlaceholderScreen from '../components/PlaceholderScreen';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'PokemonDetail'>;

// Información del Pokémon (§9), escrita simple para un niño de 6 años:
// tipo, evoluciones, región, altura, peso, descripción sencilla.
export default function PokemonDetailScreen({ route }: Props) {
  return (
    <PlaceholderScreen
      icon="⚡"
      title="Detalle del Pokémon"
      description={`Pokémon #${route.params.pokemonId} — su info contada fácil.`}
    />
  );
}
