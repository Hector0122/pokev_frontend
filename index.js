/**
 * @format
 */

import { AppRegistry } from 'react-native';
import { registerWidgetTaskHandler } from 'react-native-android-widget';
import App from './App';
import { name as appName } from './app.json';
import { favoriteCardWidgetTaskHandler } from './src/services/favoritesWidget';

AppRegistry.registerComponent(appName, () => App);

// Corre en un contexto headless (sin árbol de React montado) cuando Android
// agrega/actualiza/hace click en el widget — incluso con la app cerrada. Ver
// src/services/favoritesWidget.ts.
registerWidgetTaskHandler(favoriteCardWidgetTaskHandler);
