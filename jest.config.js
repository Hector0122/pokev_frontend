// Varias libs de RN (navegación, gesture-handler, etc.) se publican como ESM
// y necesitan pasar por Babel en tests; por default el preset solo transforma
// react-native/@react-native.
const modulesToTransform = [
  '(jest-)?react-native',
  '@react-native(-community)?',
  '@react-navigation',
  'react-native-gesture-handler',
  'react-native-screens',
  'react-native-safe-area-context',
  'react-native-reanimated',
  'react-native-worklets',
  'react-native-vector-icons',
  '@react-native-async-storage',
  'react-native-document-scanner-plugin',
  'react-native-android-widget',
].join('|');

module.exports = {
  preset: '@react-native/jest-preset',
  transformIgnorePatterns: [`node_modules/(?!(${modulesToTransform})/)`],
  setupFiles: ['react-native-gesture-handler/jestSetup', './jest.setup.js'],
};
