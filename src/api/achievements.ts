import { api } from './client';
import type { AchievementStatus } from './types';

/** Catálogo completo + estado de desbloqueo (§15) — evaluado 100% server-side. */
export function fetchAchievements(): Promise<AchievementStatus[]> {
  return api.get<AchievementStatus[]>('/achievements');
}
