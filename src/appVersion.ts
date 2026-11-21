/**
 * Versión de la app instalada. El workflow de release
 * (.github/workflows/release.yml) reescribe este archivo con la versión del
 * tag (`v1.2.0` -> '1.2.0') antes de compilar el APK. En desarrollo queda en
 * null y no se buscan actualizaciones.
 */
export const APP_VERSION: string | null = null;
