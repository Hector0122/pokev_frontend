/**
 * Set de iconos con estilo Pokémon (assets/icons/, 512×512 PNG) que reemplaza
 * a los emoji genéricos en los lugares donde representan un concepto propio
 * de la app (colección, favoritos, logros, pokédex, agregar carta...) — ver
 * conversación sobre "no leen como Pokémon" en MainTabs.tsx. Los que no
 * tienen un lugar claro en la UI quedan en assets/icons/sin_usar/ (no se
 * borran, por si se usan más adelante).
 */
export const APP_ICONS = {
  pikachu: require('../../assets/icons/pikachu.png'),
  pokebola: require('../../assets/icons/pokebola.png'),
  corazon: require('../../assets/icons/corazon.png'),
  corona: require('../../assets/icons/corona.png'),
  celular: require('../../assets/icons/celular.png'),
  gotcha: require('../../assets/icons/gotcha.png'),
  psyduck: require('../../assets/icons/psyduck.png'),
  entrenador: require('../../assets/icons/entrenador.png'),
} as const;

export type AppIconName = keyof typeof APP_ICONS;
