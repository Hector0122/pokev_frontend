/**
 * Tipado del módulo `@env` que resuelve `react-native-dotenv` (ver
 * babel.config.js) a partir de `.env` en tiempo de build/test.
 */
declare module '@env' {
  export const APP_API_KEY: string;
}
