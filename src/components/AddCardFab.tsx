import React, { useState } from 'react';
import { Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';
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

      // La foto NO se sube a R2 acá — antes sí (en paralelo con el
      // reconocimiento) para que la URL ya estuviera lista en el formulario,
      // pero eso subía CUALQUIER foto tomada aunque el trainer nunca llegara
      // a guardar la carta (canceló, era una prueba, etc.), dejando fotos
      // huérfanas en el bucket para siempre. Ahora solo se manda al
      // reconocimiento (Groq); la subida real pasa a AddCardScreen, recién
      // al tocar "Guardar carta" — ver handleSave ahí.
      const recognized = await recognizeCard(photo.base64, photo.mimeType).catch(() => null);

      navigation.navigate('AddCard', {
        prefillPokemonName: recognized?.pokemonName ?? undefined,
        prefillSetName: recognized?.setName ?? undefined,
        prefillCardNumber: recognized?.cardNumber ?? undefined,
        prefillImageUrl: `data:${photo.mimeType};base64,${photo.base64}`,
      });
    } catch {
      // Cámara falló (permiso, sin cámara, etc.) — igual dejamos entrar al flujo manual de siempre.
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
      style={[styles.fab, elevation.lg, animatedStyle, style]}
    >
      {scanning ? <LoadingSpinner size={40} /> : <AppIcon name="pokebola" size={56} />}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  fab: {
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
});
