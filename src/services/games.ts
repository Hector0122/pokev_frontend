/** Lógica pura de los minijuegos — separada de las pantallas para poder testearla. */

export function shuffle<T>(items: T[], rand = Math.random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** "¿Cuál vale más?": dos cartas con precios distintos (si son iguales no hay respuesta correcta). */
export function pickValuePair<T extends { amount: number }>(items: T[], rand = Math.random): [T, T] | null {
  const shuffled = shuffle(items, rand);
  for (let i = 0; i < shuffled.length; i++) {
    for (let j = i + 1; j < shuffled.length; j++) {
      if (shuffled[i].amount !== shuffled[j].amount) return [shuffled[i], shuffled[j]];
    }
  }
  return null;
}

/** "¿Quién es ese Pokémon?": la respuesta + 3 opciones mezcladas. Null si no hay 3 Pokémon distintos. */
export function buildWhoRound<T extends { id: number }>(
  pokemon: T[],
  rand = Math.random,
  previousId?: number,
): { answer: T; options: T[] } | null {
  if (pokemon.length < 3) return null;
  const pool = shuffle(pokemon, rand);
  // Evita repetir el mismo Pokémon dos rondas seguidas.
  const answer = pool.find((p) => p.id !== previousId) ?? pool[0];
  const others = pool.filter((p) => p.id !== answer.id).slice(0, 2);
  return { answer, options: shuffle([answer, ...others], rand) };
}

export interface Fighter {
  damage: number;
  hp: number;
}

/** Batalla: gana el ataque más fuerte; si empatan, el que tiene más HP. */
export function battleWinner(a: Fighter, b: Fighter): 'a' | 'b' | 'tie' {
  if (a.damage !== b.damage) return a.damage > b.damage ? 'a' : 'b';
  if (a.hp !== b.hp) return a.hp > b.hp ? 'a' : 'b';
  return 'tie';
}
