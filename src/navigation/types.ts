import type { CompositeNavigationProp, NavigatorScreenParams } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

// Pokédex/Favoritos/Logros dejaron de ser tabs propias — redundantes con
// Colección (ver conversación): el Pokémon (evoluciones, etc.) se ve
// tocando una carta en Colección → CardDetail → PokemonDetail, y favoritas
// se ve con el ❤️ en la miniatura de cada carta. Pokedex/AchievementsScreen
// siguen en src/screens/ por si se reactivan, pero ya no están en la
// navegación. FavoritesScreen (Favoritas §11 + Cartas especiales §12) sí
// volvió — como pantalla del stack, no como tab, alcanzable desde un botón
// en el header de Colección (ver `Special` abajo).
export type MainTabParamList = {
  Inicio: undefined;
  Coleccion: undefined;
  Buscador: undefined;
};

export type RootStackParamList = {
  Main: NavigatorScreenParams<MainTabParamList>;
  CardDetail: { cardId: string };
  PokemonDetail: { pokemonId: number };
  /** Favoritas (§11) + Cartas especiales (§12) — `FavoritesScreen`, ver nota arriba. */
  Special: undefined;
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
