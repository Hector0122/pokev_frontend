import { api } from './client';
import type { EnrichPokemonInput, Pokemon } from './types';

/** Solo Pokémon descubiertos por la colección (§10) — nunca la Pokédex completa. */
export function fetchDiscoveredPokemon(): Promise<Pokemon[]> {
  return api.get<Pokemon[]>('/pokemon');
}

export function fetchPokemon(id: number): Promise<Pokemon> {
  return api.get<Pokemon>(`/pokemon/${id}`);
}

/** Completa un Pokémon con datos de PokeAPI — ver pokemon-sprites spec y design.md "Decisions". */
export function enrichPokemon(id: number, input: EnrichPokemonInput): Promise<Pokemon> {
  return api.patch<Pokemon>(`/pokemon/${id}`, input);
}
