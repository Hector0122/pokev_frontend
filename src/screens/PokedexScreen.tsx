import React from 'react';
import PlaceholderScreen from '../components/PlaceholderScreen';

// "Nuestros Pokémon" (§10) — solo los descubiertos vía la colección, nunca
// la Pokédex nacional completa ni un contador "37/151".
export default function PokedexScreen() {
  return (
    <PlaceholderScreen
      icon="📖"
      title="Nuestros Pokémon"
      description="Los Pokémon que fuimos descubriendo con nuestras cartas."
    />
  );
}
