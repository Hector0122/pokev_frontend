/**
 * Cliente HTTP delgado contra `pokev_backend` (ver src/config.ts). Ninguna
 * pantalla llama `fetch` directo — todo pasa por acá y por los hooks de
 * `src/hooks/queries/` que lo envuelven en TanStack Query.
 *
 * Mensajes de error siempre en español, siempre amigables (nunca un stack
 * trace ni el JSON crudo del backend) — ver local-collection-storage spec,
 * "Writes require network connectivity and fail clearly".
 */
import { API_BASE_URL, APP_API_KEY } from '../config';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface BackendErrorBody {
  message?: string | string[];
  error?: string;
}

function friendlyMessageFromBody(body: BackendErrorBody, status: number): string {
  const raw = Array.isArray(body.message) ? body.message.join(' ') : body.message;
  if (raw) return raw;
  if (status === 404) return 'No encontramos lo que buscábamos.';
  if (status >= 500) return 'Algo salió mal en el servidor. Probá de nuevo en un ratito.';
  return 'Algo salió mal. Probá de nuevo.';
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        'x-app-key': APP_API_KEY,
        ...init?.headers,
      },
    });
  } catch {
    // fetch rechaza (TypeError) cuando no hay red o el host es inalcanzable.
    throw new ApiError('Sin conexión. Probá de nuevo cuando tengas wifi o datos.');
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  const body = text ? (JSON.parse(text) as unknown) : undefined;

  if (!response.ok) {
    throw new ApiError(
      friendlyMessageFromBody((body as BackendErrorBody) ?? {}, response.status),
      response.status,
    );
  }

  return body as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: 'POST', body: data !== undefined ? JSON.stringify(data) : undefined }),
  patch: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: 'PATCH', body: data !== undefined ? JSON.stringify(data) : undefined }),
  put: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: 'PUT', body: data !== undefined ? JSON.stringify(data) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
