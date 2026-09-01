import { api, ApiError } from './client';

function mockFetchOnce(response: Partial<Response> & { json?: () => Promise<unknown> }) {
  (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
    ok: response.ok ?? true,
    status: response.status ?? 200,
    text: response.text ?? (async () => JSON.stringify(await response.json?.())),
  } as Response);
}

describe('api client', () => {
  beforeEach(() => {
    globalThis.fetch = jest.fn();
  });

  it('devuelve el JSON parseado en una respuesta exitosa', async () => {
    mockFetchOnce({ ok: true, status: 200, json: async () => ({ hello: 'world' }) });
    const result = await api.get<{ hello: string }>('/ping');
    expect(result).toEqual({ hello: 'world' });
  });

  it('no intenta parsear body en un 204', async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, status: 204 } as Response);
    const result = await api.delete('/cards/1');
    expect(result).toBeUndefined();
  });

  it('usa el mensaje del backend cuando la respuesta no es ok', async () => {
    mockFetchOnce({
      ok: false,
      status: 400,
      json: async () => ({ message: 'El set es obligatorio', error: 'BadRequestException' }),
    });
    await expect(api.post('/cards', {})).rejects.toThrow('El set es obligatorio');
  });

  it('junta mensajes de validación en array en un solo texto', async () => {
    mockFetchOnce({
      ok: false,
      status: 400,
      json: async () => ({ message: ['El set es obligatorio', 'El número es obligatorio'] }),
    });
    await expect(api.post('/cards', {})).rejects.toThrow(
      'El set es obligatorio El número es obligatorio',
    );
  });

  it('muestra un mensaje amigable en español cuando no hay conexión', async () => {
    (globalThis.fetch as jest.Mock).mockRejectedValue(new TypeError('Network request failed'));
    await expect(api.get('/cards')).rejects.toThrow(ApiError);
    await expect(api.get('/cards')).rejects.toThrow(/Sin conexión/);
  });
});
