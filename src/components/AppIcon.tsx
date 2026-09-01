import React from 'react';
import { Image, StyleProp, ImageStyle } from 'react-native';
import { APP_ICONS, type AppIconName } from '../theme/appIcons';

interface Props {
  name: AppIconName;
  size: number;
  style?: StyleProp<ImageStyle>;
}

/** Icono local con estilo Pokémon — ver src/theme/appIcons.ts. */
export default function AppIcon({ name, size, style }: Props) {
  return (
    <Image source={APP_ICONS[name]} style={[{ width: size, height: size }, style]} resizeMode="contain" />
  );
}
