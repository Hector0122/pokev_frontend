import React from 'react';
import PlaceholderScreen from '../components/PlaceholderScreen';

// Favoritas (§11) y Cartas especiales (§12) — independientes del valor
// económico: favorita de papá, de mi hijo, de los dos, primera carta, etc.
export default function FavoritesScreen() {
  return (
    <PlaceholderScreen
      icon="❤️"
      title="Favoritas"
      description="Las cartas más queridas de papá, de mi hijo y de los dos."
    />
  );
}
