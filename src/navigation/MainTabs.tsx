import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTheme } from '../theme/ThemeContext';
import HomeScreen from '../screens/HomeScreen';
import CollectionScreen from '../screens/CollectionScreen';
import SearchScreen from '../screens/SearchScreen';
import AppIcon from '../components/AppIcon';
import type { AppIconName } from '../theme/appIcons';
import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

// Emoji en vez de react-native-vector-icons: los iconos vectoriales genéricos
// ("cards", "trophy") no leían como Pokémon y dependen de una fuente .ttf
// linkeada nativamente — si no está bien linkeada en el dispositivo, Android
// puede mostrar un glyph de reemplazo random de otra fuente. El emoji no
// depende de ningún asset, funciona siempre.
//
// Coleccion sí tiene un asset propio con estilo Pokémon (`AppIcon`,
// assets/icons/) porque su emoji no leía como Pokémon para un niño de 6
// años (🃏 = carta de baraja/joker, no una carta Pokémon). Buscador se
// queda en emoji — no hay un icono temático razonable para "buscar" en el
// set que se agregó.
const TAB_ICONS: Partial<Record<keyof MainTabParamList, string>> = {
  Inicio: '🏠',
  Buscador: '🔎',
};

const TAB_APP_ICONS: Partial<Record<keyof MainTabParamList, AppIconName>> = {
  Coleccion: 'pikachu',
};

/**
 * Accesos principales (§4) como bottom tabs — pensado para una tablet
 * compartida entre papá y un niño de 6 años: iconos grandes, poco texto
 * (§17). Solo Inicio/Colección/Buscador: Pokédex/Favoritos/Logros se
 * sacaron por redundantes con Colección (ver navigation/types.ts).
 */
export default function MainTabs() {
  const { colors, type, fontFamily } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarLabelStyle: { ...type.caption, fontFamily: fontFamily.mono },
        tabBarIcon: ({ focused }) => {
          const appIcon = TAB_APP_ICONS[route.name];
          return appIcon ? (
            <AppIcon name={appIcon} size={28} style={{ opacity: focused ? 1 : 0.5 }} />
          ) : (
            <Text style={{ fontSize: 26, opacity: focused ? 1 : 0.5 }}>{TAB_ICONS[route.name]}</Text>
          );
        },
      })}
    >
      <Tab.Screen name="Inicio" component={HomeScreen} />
      <Tab.Screen name="Coleccion" component={CollectionScreen} options={{ title: 'Colección' }} />
      <Tab.Screen name="Buscador" component={SearchScreen} />
    </Tab.Navigator>
  );
}
