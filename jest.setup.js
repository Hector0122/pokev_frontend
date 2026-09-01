/* eslint-env jest */
// react-native-reanimated 4.x + react-native-worklets (usados por el Button
// compartido de arcd_kit) necesitan un runtime JSI real que no existe en
// Jest — ni la variante ".native" ni el mock oficial de la librería
// (react-native-reanimated/mock) funcionan en esta combinación de
// versiones (reanimated 4.6 / worklets 0.12): ambas rutas terminan
// intentando crear un "shareable value" nativo y revientan. Se mockea acá
// directamente con lo mínimo que usa Button.tsx (Animated.createAnimatedComponent,
// useSharedValue, useAnimatedStyle, withSpring) — sin esto, cualquier árbol
// de componentes que renderice Button falla en test.
jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: {
      createAnimatedComponent: (Component) => Component,
      View,
    },
    useSharedValue: (initial) => ({ value: initial }),
    useAnimatedStyle: (factory) => factory(),
    withSpring: (toValue) => toValue,
    withTiming: (toValue) => toValue,
    Easing: { bezier: () => (t) => t, linear: (t) => t },
  };
});
