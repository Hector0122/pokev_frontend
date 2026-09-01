package com.pokev.widget

import com.reactnativeandroidwidget.RNWidgetProvider

/**
 * Widget de cartas favoritas en la pantalla de inicio — toda la lógica
 * (qué carta mostrar, cómo se ve) vive en JS, ver
 * src/services/favoritesWidget.ts. El nombre de esta clase ("FavoriteCard")
 * es el `widgetName` que usan requestWidgetUpdate/registerWidgetTaskHandler
 * del lado de JS — react-native-android-widget lo resuelve por reflection.
 */
class FavoriteCard : RNWidgetProvider()
