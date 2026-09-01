import { Platform } from 'react-native';

/**
 * Base URL de la API (solo se usará a partir de V0.7 — nube/sincronización;
 * V0.1 es local-only, ver CLAUDE.md).
 *
 * - Emulador Android: 10.0.2.2 apunta al localhost de la máquina host.
 * - Simulador iOS: localhost funciona directo.
 * - Dispositivo físico: reemplazá por la IP LAN de tu máquina (ej. 192.168.x.x)
 *   o por la URL pública del backend en Railway.
 */
const DEV_API_URL = Platform.select({
  android: 'http://10.0.2.2:3000',
  default: 'http://localhost:3000',
});

const PROD_API_URL = 'https://pokevbackend-production.up.railway.app';

export const API_BASE_URL = __DEV__ ? DEV_API_URL : PROD_API_URL;
