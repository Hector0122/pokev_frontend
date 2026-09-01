import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { enrichPokemon, fetchDiscoveredPokemon, fetchPokemon } from '../../api/pokemon';
import type { EnrichPokemonInput } from '../../api/types';
import { queryKeys } from './queryKeys';

/** "Nuestros Pokémon" (§10) — solo descubiertos, nunca la Pokédex completa. */
export function useDiscoveredPokemon() {
  return useQuery({ queryKey: queryKeys.discoveredPokemon, queryFn: fetchDiscoveredPokemon });
}

export function usePokemonDetail(id: number | undefined) {
  return useQuery({
    queryKey: queryKeys.pokemon(id ?? -1),
    queryFn: () => fetchPokemon(id as number),
    enabled: id !== undefined,
  });
}

/** Completa un Pokémon con datos de PokeAPI (§2 pokemon-sprites) — se llama al elegirlo en el picker. */
export function useEnrichPokemon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: EnrichPokemonInput }) => enrichPokemon(id, input),
    onSuccess: (pokemon) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pokemon(pokemon.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.discoveredPokemon });
    },
  });
}
