/**
 * Escaneo de cartas por foto (V0.6 adelantado, ver openspec change
 * add-scan-card-recognition) — la cámara + el modelo de visión solo intentan
 * leer qué dice la carta; el match real sigue siendo la búsqueda de TCGdex
 * que ya usa el Buscador (§7), con confirmación visual del trainer antes de
 * agregar. Nunca se auto-agrega nada sin que alguien lo confirme.
 */
import { launchCamera } from 'react-native-image-picker';
import { api } from '../api/client';

export interface RecognizedCard {
  pokemonName: string | null;
  setName: string | null;
  cardNumber: string | null;
}

/** Abre la cámara y devuelve la foto en base64 — null si el trainer canceló. */
export async function captureCardPhoto(): Promise<{ base64: string; mimeType: string } | null> {
  const result = await launchCamera({
    mediaType: 'photo',
    includeBase64: true,
    quality: 0.7,
    maxWidth: 1600,
    maxHeight: 1600,
    saveToPhotos: false,
  });

  if (result.didCancel) return null;
  if (result.errorCode) {
    const messages: Record<string, string> = {
      camera_unavailable: 'No encontramos una cámara en este dispositivo.',
      permission: 'Necesitamos permiso de cámara para escanear una carta.',
      others: 'No pudimos abrir la cámara. Probá de nuevo.',
    };
    throw new Error(messages[result.errorCode] ?? messages.others);
  }

  const asset = result.assets?.[0];
  if (!asset?.base64) {
    throw new Error('No pudimos usar esa foto. Probá de nuevo.');
  }

  return { base64: asset.base64, mimeType: asset.type ?? 'image/jpeg' };
}

export async function recognizeCard(base64: string, mimeType: string): Promise<RecognizedCard> {
  return api.post<RecognizedCard>('/scan/card', { imageBase64: base64, mimeType });
}
