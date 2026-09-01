import React from 'react';
import PlaceholderScreen from '../components/PlaceholderScreen';

// "Mi colección" (§5) — exclusivamente cartas que realmente poseen. La
// grilla de cartas + el botón "➕ Agregar carta" (§6) se construyen en la
// siguiente change de OpenSpec, conectados a la BD local (op-sqlite).
export default function CollectionScreen() {
  return (
    <PlaceholderScreen
      icon="🃏"
      title="Mi colección"
      description="Acá van a aparecer las cartas que ya tenemos, como un álbum."
    />
  );
}
