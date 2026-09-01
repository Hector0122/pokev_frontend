import { Platform } from 'react-native';

/**
 * Base URL de la API de `pokev_backend`. V0.1 ya la usa: el plan original de
 * este change era local-only (op-sqlite) y se cambió en implementación a
 * conectar directo con el backend ya desplegado en Railway — ver
 * openspec/changes/add-v01-first-album/design.md, sección "Pivot".
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
