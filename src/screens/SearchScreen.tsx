import React from 'react';
import PlaceholderScreen from '../components/PlaceholderScreen';

// Buscador de cartas (§7) — exploración y consulta, nunca "te faltan N
// cartas". V0.3 en el roadmap del spec; se conecta a un catálogo completo
// de cartas más adelante.
export default function SearchScreen() {
  return (
    <PlaceholderScreen
      icon="🔎"
      title="Buscador de cartas"
      description="Buscá un Pokémon y mirá todas sus cartas — las tengamos o no."
    />
  );
}
