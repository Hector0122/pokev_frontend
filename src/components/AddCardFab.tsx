import React, { useState } from 'react';
import { Pressable, StyleProp, ViewStyle } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useTheme } from '../theme/ThemeContext';
import { motion } from '../theme/tokens';
import AppIcon from './AppIcon';
import LoadingSpinner from './LoadingSpinner';
import { captureCardPhoto, recognizeCard } from '../services/scan';
import type { RootStackParamList } from '../navigation/types';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface Props {
  style?: StyleProp<ViewStyle>;
}

/**
 * Botón flotante de "agregar carta" — abre la cámara directo (pedido
 * explícito: "un niño nunca agregará las cartas escribiendo en el
 * formulario" — antes había que ir al Buscador a propósito para escanear).
 * Si la foto se reconoce, se entra a "Agregar carta" con el Pokémon ya
 * elegido y el formulario precargado (§ segundo paso, no el primero). Si la
 * cámara falla o el reconocimiento no anda, igual abre el flujo manual de
 * siempre — nunca deja al trainer sin poder agregar la carta.
 */
export default function AddCardFab({ style }: Props) {
  const { elevation } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const scale = useSharedValue(1);
  const [scanning, setScanning] = useState(false);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  async function handlePress() {
    if (scanning) return;
    setScanning(true);
    try {
      const photo = await captureCardPhoto();
      if (!photo) return; // canceló la cámara — no navegamos a ningún lado
      const recognized = await recognizeCard(photo.base64, photo.mimeType);
      navigation.navigate('AddCard', {
        prefillPokemonName: recognized.pokemonName ?? undefined,
        prefillSetName: recognized.setName ?? undefined,
        prefillCardNumber: recognized.cardNumber ?? undefined,
        // La foto que sacamos, no una genérica del Pokémon — "no me muestra
        // la carta" (se guarda tal cual, el backend ya acepta data:image además de URLs http).
        prefillImageUrl: `data:${photo.mimeType};base64,${photo.base64}`,
      });
    } catch {
      // Cámara/reconocimiento falló — igual dejamos entrar al flujo manual de siempre.
      navigation.navigate('AddCard', undefined);
    } finally {
      setScanning(false);
    }
  }

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={() => {
        scale.value = withSpring(0.92, motion.spring.press);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, motion.spring.press);
      }}
      accessibilityRole="button"
      accessibilityLabel="Agregar carta"
      style={[
        {
          position: 'absolute',
          right: 20,
          bottom: 20,
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: '#FFFFFF',
          alignItems: 'center',
          justifyContent: 'center',
        },
        elevation.lg,
        animatedStyle,
        style,
      ]}
    >
      {scanning ? <LoadingSpinner size={40} /> : <AppIcon name="pokebola" size={56} />}
    </AnimatedPressable>
  );
}
