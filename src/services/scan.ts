/**
 * Escaneo de cartas por foto (V0.6 adelantado, ver openspec change
 * add-scan-card-recognition) — la cámara + el modelo de visión solo intentan
 * leer qué dice la carta; el match real sigue siendo la búsqueda de TCGdex
 * que ya usa el Buscador (§7), con confirmación visual del trainer antes de
 * agregar. Nunca se auto-agrega nada sin que alguien lo confirme.
 */
import DocumentScanner, { ResponseType } from 'react-native-document-scanner-plugin';
import { api } from '../api/client';

export interface RecognizedCard {
  pokemonName: string | null;
  setName: string | null;
  cardNumber: string | null;
}

/**
 * Abre la cámara con recorte automático (detecta los bordes de la carta en
 * vivo y los ajusta solo) — el trainer puede arrastrar las 4 esquinas antes
 * de confirmar si el recorte automático no quedó bien ("no me sirve el
 * margen negro" — ver design.md de add-scan-and-favorites-widget). Usa el
 * escáner de documentos de Google Play Services por debajo; no requiere
 * declarar el permiso CAMERA (delega igual que antes con la cámara del
 * sistema — ver el comentario en AndroidManifest.xml).
 *
 * Devuelve null si el trainer canceló.
 */
export async function captureCardPhoto(): Promise<{ base64: string; mimeType: string } | null> {
  const { scannedImages, status } = await DocumentScanner.scanDocument({
    responseType: ResponseType.Base64,
    maxNumDocuments: 1,
    // El plugin no expone control de resolución, solo calidad JPEG — a
    // resolución de cámara completa esto da ~2.3MB por foto. Antes de tener
    // R2 (ver uploadCardImage) esto se guardaba inline en la DB y 90 era
    // demasiado; ahora que la foto se sube a un storage real, no hay motivo
    // para sacrificar calidad — importa más poder leer la carta con zoom.
    croppedImageQuality: 90,
  });

  if (status === 'cancel' || !scannedImages?.length) return null;

  // El encoder nativo (Base64.DEFAULT) mete saltos de línea cada 76
  // caracteres — hay que sacarlos antes de armar un data:image URI o mandar
  // esto a la API, si no algunos parsers lo rechazan.
  const base64 = scannedImages[0].replace(/[\r\n]/g, '');
  if (!base64) throw new Error('No pudimos usar esa foto. Probá de nuevo.');

  return { base64, mimeType: 'image/jpeg' };
}

export async function recognizeCard(base64: string, mimeType: string): Promise<RecognizedCard> {
  return api.post<RecognizedCard>('/scan/card', { imageBase64: base64, mimeType });
}

/**
 * Sube la foto recortada a Cloudflare R2 (V0.7 — ver UploadsService en el
 * backend) y devuelve la URL pública corta, en vez de guardar el base64
 * completo inline en la carta. Puede tirar (servidor sin R2 configurado,
 * sin red, etc.) — quien llama decide el respaldo, nunca se asume que esto
 * siempre funciona.
 */
export async function uploadCardImage(base64: string, mimeType: string): Promise<string> {
  const { url } = await api.post<{ url: string }>('/uploads/card-image', {
    imageBase64: base64,
    mimeType,
  });
  return url;
}
