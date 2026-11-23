import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MainTabs from './MainTabs';
import CardDetailScreen from '../screens/CardDetailScreen';
import PokemonDetailScreen from '../screens/PokemonDetailScreen';
import AddCardScreen from '../screens/AddCardScreen';
import EditCardScreen from '../screens/EditCardScreen';
import FavoritesScreen from '../screens/FavoritesScreen';
import CardRevealScreen from '../screens/CardRevealScreen';
import ValueGameScreen from '../screens/ValueGameScreen';
import WhoGameScreen from '../screens/WhoGameScreen';
import BattleScreen from '../screens/BattleScreen';
import SetsScreen from '../screens/SetsScreen';
import SetDetailScreen from '../screens/SetDetailScreen';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Main (tabs) + Carta/Pokémon en detalle y el flujo de agregar/editar
 * carta, todos empujados encima y alcanzables desde cualquier tab (§4, §6,
 * §8, §9). Cada pantalla acá construye su propio header (fila con flecha de
 * volver) en vez del header nativo — headerShown queda en false en toda la
 * navegación.
 */
export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen name="CardDetail" component={CardDetailScreen} />
        <Stack.Screen name="PokemonDetail" component={PokemonDetailScreen} />
        <Stack.Screen name="Special" component={FavoritesScreen} />
        <Stack.Screen name="AddCard" component={AddCardScreen} options={{ presentation: 'modal' }} />
        <Stack.Screen name="EditCard" component={EditCardScreen} options={{ presentation: 'modal' }} />
        <Stack.Screen
          name="CardReveal"
          component={CardRevealScreen}
          options={{ presentation: 'transparentModal', animation: 'fade' }}
        />
        <Stack.Screen name="GameValue" component={ValueGameScreen} />
        <Stack.Screen name="GameWho" component={WhoGameScreen} />
        <Stack.Screen name="GameBattle" component={BattleScreen} />
        <Stack.Screen name="Sets" component={SetsScreen} />
        <Stack.Screen name="SetDetail" component={SetDetailScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
