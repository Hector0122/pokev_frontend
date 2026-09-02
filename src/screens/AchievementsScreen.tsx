import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useAchievements } from '../hooks/queries/useAchievements';
import EmptyState from '../components/EmptyState';
import AppIcon from '../components/AppIcon';
import QueryState from '../components/QueryState';
import type { AchievementCategory, AchievementStatus } from '../api/types';

const CATEGORY_LABELS: Record<AchievementCategory, { title: string; icon: string }> = {
  collector: { title: 'Coleccionista', icon: '🃏' },
  explorer: { title: 'Explorador', icon: '🔎' },
  family: { title: 'Nuestra colección', icon: '❤️' },
};

function AchievementBadge({ achievement }: { achievement: AchievementStatus }) {
  const { colors, spacing, radius, type } = useTheme();
  return (
    <View
      style={[
        styles.badge,
        achievement.unlocked ? styles.unlocked : styles.locked,
        {
          gap: spacing.xxs,
          padding: spacing.sm,
          borderRadius: radius.md,
          backgroundColor: achievement.unlocked ? colors.accentSoft : colors.surfaceAlt,
        },
      ]}
    >
      <Text style={styles.badgeIcon}>{achievement.icon ?? '🏆'}</Text>
      <Text numberOfLines={2} style={[styles.textCenter, { ...type.caption, color: colors.text }]}>
        {achievement.title}
      </Text>
    </View>
  );
}

/** Logros (§15) — hitos que se celebran, nunca lo que falta (§3.1). */
export default function AchievementsScreen() {
  const { colors, spacing, type, fontFamily } = useTheme();
  const achievementsQuery = useAchievements();

  const grouped = useMemo(() => {
    const all = achievementsQuery.data ?? [];
    const byCategory = new Map<AchievementCategory, AchievementStatus[]>();
    for (const achievement of all) {
      const list = byCategory.get(achievement.category) ?? [];
      list.push(achievement);
      byCategory.set(achievement.category, list);
    }
    return byCategory;
  }, [achievementsQuery.data]);

  const totalUnlocked = (achievementsQuery.data ?? []).filter((a) => a.unlocked).length;

  return (
    <SafeAreaView style={[styles.flex1, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <View style={{ padding: spacing.lg, paddingBottom: spacing.sm }}>
        <Text style={{ ...type.display, fontFamily: fontFamily.display, color: colors.text }}>Logros</Text>
      </View>

      <QueryState isLoading={achievementsQuery.isLoading} error={achievementsQuery.error} onRetry={() => achievementsQuery.refetch()}>
        {totalUnlocked > 0 || (achievementsQuery.data?.length ?? 0) > 0 ? (
          <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.xl, paddingBottom: spacing.huge }}>
            {(Object.keys(CATEGORY_LABELS) as AchievementCategory[]).map((category) => {
              const items = grouped.get(category) ?? [];
              if (items.length === 0) return null;
              const unlocked = items.filter((a) => a.unlocked);
              const locked = items.filter((a) => !a.unlocked);
              const label = CATEGORY_LABELS[category];

              return (
                <View key={category} style={{ gap: spacing.sm }}>
                  <Text style={{ ...type.h1, color: colors.text }}>
                    {label.icon} {label.title}
                  </Text>
                  {unlocked.length > 0 ? (
                    <View style={[styles.wrapRow, { gap: spacing.sm }]}>
                      {unlocked.map((a) => (
                        <AchievementBadge key={a.key} achievement={a} />
                      ))}
                    </View>
                  ) : (
                    <Text style={{ ...type.bodySm, color: colors.textSecondary }}>
                      Todavía no desbloqueamos ninguno acá — ¡pronto!
                    </Text>
                  )}
                  {locked.length > 0 ? (
                    <>
                      <Text style={{ ...type.label, color: colors.textTertiary, marginTop: spacing.xs }}>
                        PRÓXIMAS METAS
                      </Text>
                      <View style={[styles.wrapRow, { gap: spacing.sm }]}>
                        {locked.map((a) => (
                          <AchievementBadge key={a.key} achievement={a} />
                        ))}
                      </View>
                    </>
                  ) : null}
                </View>
              );
            })}
          </ScrollView>
        ) : (
          <EmptyState
            icon={<AppIcon name="corona" size={72} />}
            title="Los logros ya vienen en camino"
            description="Agregá tu primera carta para empezar."
          />
        )}
      </QueryState>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap' },
  textCenter: { textAlign: 'center' },
  badge: { width: 100, alignItems: 'center' },
  badgeIcon: { fontSize: 36 },
  unlocked: { opacity: 1 },
  locked: { opacity: 0.55 },
});
