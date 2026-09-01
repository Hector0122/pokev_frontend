import type { CompositeNavigationProp, NavigatorScreenParams } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

// Pokédex/Favoritos/Logros dejaron de ser tabs propias — redundantes con
// Colección (ver conversación): el Pokémon (evoluciones, etc.) se ve
// tocando una carta en Colección → CardDetail → PokemonDetail, y favoritas
// se ve con el ❤️ en la miniatura de cada carta. Las pantallas siguen en
// src/screens/ (Pokedex/Favorites/AchievementsScreen.tsx) por si se
// reactivan, pero ya no están en la navegación.
export type MainTabParamList = {
  Inicio: undefined;
  Coleccion: undefined;
  Buscador: undefined;
};

export type RootStackParamList = {
  Main: NavigatorScreenParams<MainTabParamList>;
  CardDetail: { cardId: string };
  PokemonDetail: { pokemonId: number };
  /**
   * Params opcionales: llegar desde el Buscador (§7, "agregar esta carta")
   * precarga el paso de datos con lo que ya sabemos del catálogo TCGdex, en
   * vez de que el usuario lo tipee de nuevo.
   */
  AddCard:
    | {
        prefillPokemonName?: string;
        prefillSetName?: string;
        prefillCardNumber?: string;
        prefillImageUrl?: string;
      }
    | undefined;
  EditCard: { cardId: string };
};

/**
 * Navegación desde una pantalla-tab hacia rutas del stack raíz (CardDetail,
 * PokemonDetail, AddCard, EditCard) — todas alcanzables desde cualquier tab
 * (§4, §8, §9).
 */
export type MainTabNavigationProp<T extends keyof MainTabParamList> = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, T>,
  NativeStackNavigationProp<RootStackParamList>
>;
