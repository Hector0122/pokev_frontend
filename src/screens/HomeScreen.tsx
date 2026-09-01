import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { useCardStats } from '../hooks/queries/useCards';
import AppIcon from '../components/AppIcon';
import AddCardFab from '../components/AddCardFab';
import type { MainTabNavigationProp } from '../navigation/types';

/**
 * Pantalla principal (§4) — "centro de bienvenida", no un dashboard: antes
 * repetía como grid de tiles los mismos 5 destinos que ya están en las tabs
 * de abajo (100% redundante). Ahora es Pikachu como mascota/saludo + el
 * próximo logro, pensado para una tablet compartida papá + niño de 6 años.
 * Buscador/Colección/Pokédex/Favoritos/Logros viven solo en la tab bar.
 */
export default function HomeScreen() {
  const { colors, spacing, radius, type, fontFamily } = useTheme();
  const navigation = useNavigation<MainTabNavigationProp<'Inicio'>>();
  const statsQuery = useCardStats();
  const stats = statsQuery.data;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'left', 'right']}>
      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.xxl }}
      >
        <View style={{ gap: spacing.xxs }}>
          <Text style={{ ...type.display, fontFamily: fontFamily.display, color: colors.text }}>
            ¡Hola, entrenador!
          </Text>
          <Text style={{ ...type.body, color: colors.textSecondary }}>¿Listos para atrapar más cartas hoy?</Text>
        </View>

        <View style={{ alignItems: 'center', justifyContent: 'center', height: 260 }}>
          <View
            style={{
              position: 'absolute',
              width: 260,
              height: 260,
              borderRadius: radius.pill,
              backgroundColor: colors.accentSoft,
            }}
          />
          <View
            style={{
              position: 'absolute',
              width: 190,
              height: 190,
              borderRadius: radius.pill,
              backgroundColor: colors.accentSoft,
            }}
          />
          <AppIcon name="pikachu" size={200} />
        </View>

        {stats?.nextMilestone ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.lg,
              backgroundColor: colors.primary,
              borderRadius: radius.xl,
              padding: spacing.lg,
            }}
          >
            <AppIcon name="corona" size={56} />
            <View style={{ gap: spacing.xxs, flexShrink: 1 }}>
              <Text style={{ ...type.label, color: 'rgba(255,255,255,0.8)' }}>PRÓXIMO LOGRO</Text>
              <Text style={{ ...type.h1, color: '#FFFFFF' }}>{stats.nextMilestone.title}</Text>
            </View>
          </View>
        ) : stats?.totalCards === 0 ? (
          // Primer arranque, sin cartas todavía — mismo tono positivo que el
          // resto de empty states (§3.1: nunca "0 de X"), invitando al FAB.
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.lg,
              backgroundColor: colors.accentSoft,
              borderRadius: radius.xl,
              padding: spacing.lg,
            }}
          >
            <AppIcon name="pokebola" size={56} />
            <Text style={{ ...type.h1, color: colors.text, flexShrink: 1 }}>
              Tocá la pokébola para agregar tu primera carta
            </Text>
          </View>
        ) : null}
      </ScrollView>
      <AddCardFab onPress={() => navigation.navigate('AddCard')} />
    </SafeAreaView>
  );
}
