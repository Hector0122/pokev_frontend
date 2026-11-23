import React from 'react';
import { StyleSheet, View } from 'react-native';
import { getHoloKind, HOLO_PRESETS, Sparkle } from './ImageViewerModal';

// Pocos destellos fijos: en la grilla hay muchas cartas a la vez y cada uno es un loop animado.
const SPOTS = [
  { left: 18, top: 22, delay: 0, duration: 900 },
  { left: 72, top: 38, delay: 400, duration: 1100 },
  { left: 40, top: 70, delay: 800, duration: 1000 },
  { left: 80, top: 80, delay: 200, duration: 1200 },
];

/** Si la carta tiene brillo de verdad: rainbow para las más raras, fullart, clásica o reverse. */
export function shineKind(rarity?: string | null, holo?: boolean, reverse?: boolean) {
  return getHoloKind(rarity, holo, reverse);
}

/**
 * Brillo holo estático + destellos para miniaturas de cartas raras — la
 * versión liviana del de ImageViewerModal (sin tilt ni capas desplazables).
 */
export default function RareShine({
  rarity,
  holo,
  reverse,
}: {
  rarity?: string | null;
  holo?: boolean;
  reverse?: boolean;
}) {
  const kind = shineKind(rarity, holo, reverse);
  if (kind === 'none') return null;
  const preset = HOLO_PRESETS[kind];
  const [main] = preset.layers;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            experimental_backgroundImage: [main.gradient],
            mixBlendMode: main.blendMode,
            filter: main.filter,
            opacity: preset.maxOpacity,
          },
        ]}
      />
      {SPOTS.map((spot, i) => (
        <Sparkle key={i} {...spot} color={preset.colors[i % preset.colors.length]} />
      ))}
    </View>
  );
}
