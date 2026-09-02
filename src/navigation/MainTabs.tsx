import React from 'react';
import { StyleSheet, Text } from 'react-native';
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
 * Fuera del componente de MainTabs a propósito — un componente definido
 * adentro de otro (como era `tabBarIcon: ({focused}) => {...}` antes) hace
 * que React lo vea como un tipo nuevo en cada render y destruya/remonte todo
 * el subárbol (`react/no-unstable-nested-components`).
 */
function TabIcon({ routeName, focused }: { routeName: keyof MainTabParamList; focused: boolean }) {
  const appIcon = TAB_APP_ICONS[routeName];
  return appIcon ? (
    <AppIcon name={appIcon} size={28} style={focused ? styles.active : styles.inactive} />
  ) : (
    <Text style={[styles.tabEmoji, focused ? styles.active : styles.inactive]}>{TAB_ICONS[routeName]}</Text>
  );
}

// Uno por ruta, también a nivel de módulo — un `tabBarIcon: ({focused}) =>
// <TabIcon .../>` seguía disparando la misma regla aunque `TabIcon` en sí ya
// estuviera afuera: para React Navigation, esa arrow function ES el
// componente, y seguía "definida durante el render" al vivir adentro de
// `screenOptions`.
const TabIconInicio = ({ focused }: { focused: boolean }) => <TabIcon routeName="Inicio" focused={focused} />;
const TabIconColeccion = ({ focused }: { focused: boolean }) => <TabIcon routeName="Coleccion" focused={focused} />;
const TabIconBuscador = ({ focused }: { focused: boolean }) => <TabIcon routeName="Buscador" focused={focused} />;

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
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarLabelStyle: { ...type.caption, fontFamily: fontFamily.mono },
      }}
    >
      <Tab.Screen name="Inicio" component={HomeScreen} options={{ tabBarIcon: TabIconInicio }} />
      <Tab.Screen
        name="Coleccion"
        component={CollectionScreen}
        options={{ title: 'Colección', tabBarIcon: TabIconColeccion }}
      />
      <Tab.Screen name="Buscador" component={SearchScreen} options={{ tabBarIcon: TabIconBuscador }} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabEmoji: { fontSize: 26 },
  active: { opacity: 1 },
  inactive: { opacity: 0.5 },
});
