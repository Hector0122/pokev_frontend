import { Vibration } from 'react-native';

/** Vibración corta para toques/volteos, y un patrón de "¡ganaste!" para aciertos y celebraciones. */
export function buzz(kind: 'tap' | 'win' = 'tap') {
  Vibration.vibrate(kind === 'win' ? [0, 60, 80, 140] : 35);
}
