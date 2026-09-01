import type { QueryClient } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { fetchAchievements } from '../../api/achievements';
import type { AchievementStatus } from '../../api/types';
import { queryKeys } from './queryKeys';

/** Catálogo completo + estado de desbloqueo (§15) — evaluado 100% server-side, nunca reimplementado acá. */
export function useAchievements() {
  return useQuery({ queryKey: queryKeys.achievements, queryFn: fetchAchievements });
}

/**
 * Ejecuta `action` (una mutación que puede disparar desbloqueos en el
 * backend — agregar carta, marcar favorita) y devuelve qué logros pasaron a
 * `unlocked` durante esa acción, comparando el catálogo de antes y de
 * después. Ver design.md "Decisions" (achievements-logic-port) y tasks.md §3.
 */
export async function runWithAchievementUnlockDetection<T>(
  queryClient: QueryClient,
  action: () => Promise<T>,
): Promise<{ result: T; newlyUnlocked: AchievementStatus[] }> {
  const before =
    queryClient.getQueryData<AchievementStatus[]>(queryKeys.achievements) ??
    (await queryClient.fetchQuery<AchievementStatus[]>({
      queryKey: queryKeys.achievements,
      queryFn: fetchAchievements,
    }));

  const result = await action();

  const after = await queryClient.fetchQuery<AchievementStatus[]>({
    queryKey: queryKeys.achievements,
    queryFn: fetchAchievements,
  });
  queryClient.setQueryData(queryKeys.achievements, after);

  const wasUnlockedBefore = new Set(before.filter((a) => a.unlocked).map((a) => a.key));
  const newlyUnlocked = after.filter((a) => a.unlocked && !wasUnlockedBefore.has(a.key));

  return { result, newlyUnlocked };
}
