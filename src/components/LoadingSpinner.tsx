import React, { useEffect } from 'react';
import { Image } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { APP_ICONS } from '../theme/appIcons';

const AnimatedImage = Animated.createAnimatedComponent(Image);

interface Props {
  size?: number;
}

/** Reemplaza a `ActivityIndicator` en toda la app — las tres pokébolas girando en vez del spinner nativo genérico. */
export default function LoadingSpinner({ size = 40 }: Props) {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(withTiming(360, { duration: 1200, easing: Easing.linear }), -1);
  }, [rotation]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <AnimatedImage
      source={APP_ICONS.cargando}
      style={[{ width: size, height: size }, animatedStyle]}
      resizeMode="contain"
    />
  );
}
