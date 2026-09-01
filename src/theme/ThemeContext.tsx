import React, { createContext, useContext, useMemo } from 'react';
import {
  brands,
  createAppTheme,
  elevation,
  fontFamily,
  iconSize,
  motion,
  radius,
  spacing,
  type,
  type ThemeColors,
} from './tokens';

/**
 * V0.1 es solo tema claro a propósito — es una app para un niño de 6 años
 * usada de día en una tablet compartida; no hay toggle de modo oscuro en el
 * spec (§17, §19). Si eso cambia, `createAppTheme` ya devuelve `light`/`dark`.
 */
interface Theme {
  colors: ThemeColors;
  spacing: typeof spacing;
  radius: typeof radius;
  iconSize: typeof iconSize;
  elevation: typeof elevation;
  motion: typeof motion;
  type: typeof type;
  fontFamily: typeof fontFamily;
}

const theme: Theme = {
  colors: createAppTheme(brands.pokev).light,
  spacing,
  radius,
  iconSize,
  elevation,
  motion,
  type,
  fontFamily,
};

const ThemeContext = createContext<Theme>(theme);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const value = useMemo(() => theme, []);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
