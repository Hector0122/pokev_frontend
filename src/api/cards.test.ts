import { createCard, deleteCard, setCardFavorite } from './cards';
import { API_BASE_URL } from '../config';

function mockJsonResponse(body: unknown, status = 200) {
  (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
    ok: status < 400,
    status,
    text: async () => JSON.stringify(body),
  } as Response);
}

describe('cards api', () => {
  beforeEach(() => {
    globalThis.fetch = jest.fn();
  });

  it('createCard hace POST /cards con el body serializado', async () => {
    mockJsonResponse({ id: 'abc' });
    await createCard({
      pokemon: { id: 25, name: 'pikachu', primaryType: 'Eléctrico' },
      setName: 'Base Set',
      cardNumber: '58',
    });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/cards`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          pokemon: { id: 25, name: 'pikachu', primaryType: 'Eléctrico' },
          setName: 'Base Set',
          cardNumber: '58',
        }),
      }),
    );
  });

  it('setCardFavorite hace PUT cuando se marca y DELETE cuando se desmarca', async () => {
    mockJsonResponse({ id: 'abc' });
    await setCardFavorite('abc', 'KID', true);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/cards/abc/favorite/KID`,
      expect.objectContaining({ method: 'PUT' }),
    );

    mockJsonResponse({ id: 'abc' });
    await setCardFavorite('abc', 'KID', false);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/cards/abc/favorite/KID`,
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('deleteCard hace DELETE /cards/:id', async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, status: 204 } as Response);
    await deleteCard('abc');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/cards/abc`,
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});
