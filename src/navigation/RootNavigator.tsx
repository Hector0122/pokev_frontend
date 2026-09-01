import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MainTabs from './MainTabs';
import CardDetailScreen from '../screens/CardDetailScreen';
import PokemonDetailScreen from '../screens/PokemonDetailScreen';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Main (tabs) + Carta/Pokémon en detalle empujados encima, alcanzables
 * desde cualquier tab (§4, §8, §9).
 */
export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen
          name="CardDetail"
          component={CardDetailScreen}
          options={{ headerShown: true, title: '' }}
        />
        <Stack.Screen
          name="PokemonDetail"
          component={PokemonDetailScreen}
          options={{ headerShown: true, title: '' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
