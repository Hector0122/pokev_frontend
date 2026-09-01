import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../theme/ThemeContext';
import HomeScreen from '../screens/HomeScreen';
import CollectionScreen from '../screens/CollectionScreen';
import SearchScreen from '../screens/SearchScreen';
import PokedexScreen from '../screens/PokedexScreen';
import FavoritesScreen from '../screens/FavoritesScreen';
import AchievementsScreen from '../screens/AchievementsScreen';
import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_ICONS: Record<keyof MainTabParamList, string> = {
  Inicio: 'home-variant',
  Coleccion: 'cards',
  Buscador: 'magnify',
  Pokedex: 'book-open-page-variant',
  Favoritos: 'heart',
  Logros: 'trophy',
};

/**
 * Accesos principales (§4) como bottom tabs — pensado para una tablet
 * compartida entre papá y un niño de 6 años: iconos grandes, poco texto
 * (§17). `iconSize.lg` en vez de `md` porque son el punto de toque
 * principal de toda la app.
 */
export default function MainTabs() {
  const { colors, iconSize, type, fontFamily } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarLabelStyle: { ...type.caption, fontFamily: fontFamily.mono },
        tabBarIcon: ({ color }) => (
          <Icon name={TAB_ICONS[route.name]} size={iconSize.lg} color={color} />
        ),
      })}
    >
      <Tab.Screen name="Inicio" component={HomeScreen} />
      <Tab.Screen name="Coleccion" component={CollectionScreen} options={{ title: 'Colección' }} />
      <Tab.Screen name="Buscador" component={SearchScreen} />
      <Tab.Screen name="Pokedex" component={PokedexScreen} options={{ title: 'Pokédex' }} />
      <Tab.Screen name="Favoritos" component={FavoritesScreen} />
      <Tab.Screen name="Logros" component={AchievementsScreen} />
    </Tab.Navigator>
  );
}
