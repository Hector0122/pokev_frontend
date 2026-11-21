import { Alert, Linking } from 'react-native';
import { APP_VERSION } from '../appVersion';

// Mismo mecanismo que Vital/Vaulta: cada tag `v*` publica un APK como GitHub
// Release (ver .github/workflows/release.yml) y la app compara su versión con
// la última release. El repo es público, así que no hace falta token.
const LATEST_RELEASE = 'https://api.github.com/repos/Hector0122/pokev_frontend/releases/latest';

/** Avisa si hay un APK más nuevo publicado. Falla en silencio: sin red o sin releases no muestra nada. */
export async function checkForUpdate(): Promise<void> {
  if (!APP_VERSION) return;
  try {
    const res = await fetch(LATEST_RELEASE);
    if (!res.ok) return;
    const release = (await res.json()) as {
      tag_name?: string;
      assets?: { name: string; browser_download_url: string }[];
    };
    const apk = release.assets?.find((a) => a.name.endsWith('.apk'));
    if (!apk || !release.tag_name || release.tag_name === `v${APP_VERSION}`) return;
    Alert.alert('¡Nueva versión de PokeV!', `${release.tag_name} está lista para instalar.`, [
      { text: 'Después', style: 'cancel' },
      { text: 'Actualizar', onPress: () => Linking.openURL(apk.browser_download_url) },
    ]);
  } catch {
    // Sin red: se vuelve a intentar en el próximo inicio.
  }
}
