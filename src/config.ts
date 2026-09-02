/**
 * Base URL de la API de `pokev_backend`. V0.1 ya la usa: el plan original de
 * este change era local-only (op-sqlite) y se cambió en implementación a
 * conectar directo con el backend ya desplegado en Railway — ver
 * openspec/changes/archive/2026-09-01-add-v01-first-album/design.md, sección "Pivot".
 *
 * Siempre apunta a Railway, incluso en dev: no hay un backend local corriendo
 * como parte del flujo normal de trabajo (el `.env` de este repo ya apunta ahí
 * también), y el celular físico usado para probar no puede resolver la IP
 * especial del emulador (`10.0.2.2`) que se usaba antes acá — encontrado en
 * add-v03-buscador-and-simplify-ux al verificar en dispositivo real.
 *
 * Si en algún momento SÍ corrés `pokev_backend` local para probar cambios de
 * backend sin tocar producción, reemplazá esto por la IP LAN de tu máquina
 * (ej. `http://192.168.x.x:3000`) mientras la uses, y devolvelo después.
 */
import { APP_API_KEY as ENV_APP_API_KEY } from '@env';

export const API_BASE_URL = 'https://pokevbackend-production.up.railway.app';

/**
 * Key compartida que el backend exige en cada request (header `x-app-key`,
 * ver `ApiKeyGuard` en pokev_backend) — a diferencia de `API_BASE_URL`
 * arriba, esta SÍ tiene que quedar fuera de git: viene de `.env` (que está
 * en `.gitignore`) vía `react-native-dotenv`, no hardcodeada acá.
 *
 * Nota: `export { X } from '@env'` (re-export directo) NO lo reescribe el
 * plugin de react-native-dotenv, solo `import { X } from '@env'` — por eso
 * el import + re-export en dos pasos en vez de uno solo.
 */
export const APP_API_KEY = ENV_APP_API_KEY;
