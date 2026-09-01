import type { NavigatorScreenParams } from '@react-navigation/native';

export type MainTabParamList = {
  Inicio: undefined;
  Coleccion: undefined;
  Buscador: undefined;
  Pokedex: undefined;
  Favoritos: undefined;
  Logros: undefined;
};

export type RootStackParamList = {
  Main: NavigatorScreenParams<MainTabParamList>;
  CardDetail: { cardId: string };
  PokemonDetail: { pokemonId: number };
};
