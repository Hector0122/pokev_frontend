module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module:react-native-dotenv',
      // Solo la API key vive acá (afuera de git, a diferencia de
      // src/config.ts) — ver ApiKeyGuard en pokev_backend. allowUndefined
      // deja que builds sin .env (CI, checkout fresco) no truene, la app
      // igual falla amigablemente en el fetch si falta.
      { moduleName: '@env', path: '.env', safe: false, allowUndefined: true },
    ],
    'react-native-reanimated/plugin', // debe ir último en la lista
  ],
};
