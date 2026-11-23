import { battleWinner, buildWhoRound, pickValuePair, shuffle } from './games';
import { strongestAttack } from './tcgdex';
import { ownedMatcher } from './cardDisplay';
import { ownedCountBySet } from '../screens/SetsScreen';
import type { Card } from '../api/types';

// Generador determinista para que los tests no dependan del azar.
function seeded(seed = 1) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

describe('shuffle', () => {
  it('mantiene los mismos elementos', () => {
    expect(shuffle([1, 2, 3, 4, 5], seeded()).sort()).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('pickValuePair', () => {
  it('nunca elige dos cartas con el mismo precio', () => {
    const pair = pickValuePair([{ amount: 1 }, { amount: 1 }, { amount: 5 }], seeded());
    expect(pair).not.toBeNull();
    expect(pair![0].amount).not.toBe(pair![1].amount);
  });

  it('null si todas valen lo mismo o hay menos de 2', () => {
    expect(pickValuePair([{ amount: 2 }, { amount: 2 }])).toBeNull();
    expect(pickValuePair([{ amount: 2 }])).toBeNull();
  });
});

describe('buildWhoRound', () => {
  const mons = [{ id: 1 }, { id: 4 }, { id: 7 }, { id: 25 }];

  it('3 opciones distintas que incluyen la respuesta', () => {
    const round = buildWhoRound(mons, seeded())!;
    expect(round.options).toHaveLength(3);
    expect(new Set(round.options.map((o) => o.id)).size).toBe(3);
    expect(round.options).toContainEqual(round.answer);
  });

  it('no repite la respuesta anterior', () => {
    for (let s = 1; s < 20; s++) {
      expect(buildWhoRound(mons, seeded(s), 25)!.answer.id).not.toBe(25);
    }
  });

  it('null con menos de 3 Pokémon', () => {
    expect(buildWhoRound(mons.slice(0, 2))).toBeNull();
  });
});

describe('battleWinner', () => {
  it('gana el ataque más fuerte, desempata el HP', () => {
    expect(battleWinner({ damage: 120, hp: 60 }, { damage: 30, hp: 300 })).toBe('a');
    expect(battleWinner({ damage: 50, hp: 60 }, { damage: 50, hp: 90 })).toBe('b');
    expect(battleWinner({ damage: 50, hp: 90 }, { damage: 50, hp: 90 })).toBe('tie');
  });
});

describe('strongestAttack', () => {
  it('entiende daño numérico y con modificador', () => {
    expect(
      strongestAttack([
        { name: 'Placaje', damage: 30 },
        { name: 'Rayo', damage: '120+' },
        { name: 'Gruñido' },
      ]),
    ).toEqual({ name: 'Rayo', damage: 120 });
    expect(strongestAttack(undefined)).toBeNull();
  });
});

describe('ownedMatcher', () => {
  const cards = [
    { tcgdexId: 'sv01-005', pokemon: null, name: 'Investigación de Profesores', cardNumber: '189' },
    { tcgdexId: null, pokemon: { name: 'Pikachu' }, name: null, cardNumber: '25' },
  ] as unknown as Card[];
  const isOwned = ownedMatcher(cards);

  it('reconoce por tcgdexId y por nombre + número', () => {
    expect(isOwned({ id: 'sv01-005', name: 'Otra', localId: '005' })).toBe(true);
    expect(isOwned({ id: 'xy-25', name: 'pikachu', localId: '25' })).toBe(true);
    expect(isOwned({ id: 'xy-26', name: 'Pikachu', localId: '26' })).toBe(false);
  });
});

describe('ownedCountBySet', () => {
  it('cuenta por tcgdexId y por nombre de expansión', () => {
    const sets = [{ id: 'sv01', name: 'Escarlata y Púrpura' }];
    const counts = ownedCountBySet(
      [
        { tcgdexId: 'sv01-005', setName: 'x' },
        { tcgdexId: null, setName: 'escarlata y púrpura' },
        { tcgdexId: null, setName: 'Inventada' },
      ],
      sets,
    );
    expect(counts.get('sv01')).toBe(2);
    expect(counts.size).toBe(1);
  });
});
