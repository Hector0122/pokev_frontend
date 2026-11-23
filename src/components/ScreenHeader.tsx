import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';

/** Fila de "← Título  [algo a la derecha]" — el mismo header a mano que usan el resto de pantallas del stack. */
export default function ScreenHeader({ title, right }: { title: string; right?: React.ReactNode }) {
  const { colors, spacing, type } = useTheme();
  const navigation = useNavigation();
  return (
    <View style={[styles.row, { padding: spacing.md, gap: spacing.sm }]}>
      <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
        <Text style={[styles.back, { color: colors.text }]}>←</Text>
      </Pressable>
      <Text numberOfLines={1} style={[styles.flex1, { ...type.h1, color: colors.text }]}>
        {title}
      </Text>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  back: { fontSize: 24 },
  flex1: { flex: 1 },
});
