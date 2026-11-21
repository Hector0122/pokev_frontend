import { accentVariants, pickPrice, tcgdexIdCandidates } from './tcgdex';
import { albumValue, cardOfTheDay } from '../screens/HomeScreen';
import type { Card } from '../api/types';

describe('accentVariants', () => {
  it('genera una tilde por vocal', () => {
    expect(accentVariants('energia')).toContain('energía');
    expect(accentVariants('investigacion')).toContain('investigación');
  });

  it('no inventa variantes si ya trae tildes', () => {
    expect(accentVariants('Energía')).toEqual([]);
  });
});

describe('pickPrice', () => {
  it('prefiere el precio de mercado normal de TCGplayer', () => {
    expect(
      pickPrice({
        tcgplayer: { unit: 'USD', normal: { marketPrice: 0.26 }, 'reverse-holofoil': { marketPrice: 0.4 } },
        cardmarket: { unit: 'EUR', trend: 0.14 },
      }),
    ).toEqual({ amount: 0.26, currency: 'USD' });
  });

  it('usa el holo si no hay normal', () => {
    expect(pickPrice({ tcgplayer: { unit: 'USD', holofoil: { marketPrice: 12.5 } } })).toEqual({
      amount: 12.5,
      currency: 'USD',
    });
  });

  it('cae a Cardmarket en EUR y devuelve null sin datos', () => {
    expect(pickPrice({ cardmarket: { unit: 'EUR', trend: 0, avg: 0.8 } })).toEqual({ amount: 0.8, currency: 'EUR' });
    expect(pickPrice(undefined)).toBeNull();
  });
});

describe('tcgdexIdCandidates', () => {
  const sets = [{ id: 'sv01', name: 'Escarlata y Púrpura' }];

  it('usa el tcgdexId guardado si existe', () => {
    expect(tcgdexIdCandidates({ tcgdexId: 'cel25-5', setName: 'x', cardNumber: '5' }, sets)).toEqual(['cel25-5']);
  });

  it('deriva el id del nombre de expansión, con y sin ceros', () => {
    expect(tcgdexIdCandidates({ setName: 'escarlata y púrpura ', cardNumber: '5' }, sets)).toEqual([
      'sv01-5',
      'sv01-005',
    ]);
  });

  it('no adivina si la expansión no existe', () => {
    expect(tcgdexIdCandidates({ setName: 'Inventada', cardNumber: '5' }, sets)).toEqual([]);
  });
});

describe('home', () => {
  const card = (id: string, quantity = 1) => ({ id, quantity } as Card);

  it('suma USD × cantidad y elige la más valiosa', () => {
    const cards = [card('a', 2), card('b'), card('c'), card('d')];
    const { totalUsd, top } = albumValue(cards, [
      { amount: 1.5, currency: 'USD' },
      { amount: 10, currency: 'USD' },
      { amount: 50, currency: 'EUR' },
      null,
    ]);
    expect(totalUsd).toBe(13);
    expect(top?.card.id).toBe('b');
  });

  it('carta del día estable durante el día', () => {
    const cards = ['a', 'b', 'c'];
    expect(cardOfTheDay(cards, new Date('2026-11-21T08:00:00Z'))).toBe(
      cardOfTheDay(cards, new Date('2026-11-21T20:00:00Z')),
    );
    expect(cardOfTheDay([])).toBeNull();
  });
});
