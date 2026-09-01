import { api } from './client';
import type { Trainer, TrainerRole, UpdateTrainerInput } from './types';

export function fetchTrainers(): Promise<Trainer[]> {
  return api.get<Trainer[]>('/trainers');
}

export function fetchTrainer(role: TrainerRole): Promise<Trainer> {
  return api.get<Trainer>(`/trainers/${role}`);
}

export function updateTrainer(role: TrainerRole, input: UpdateTrainerInput): Promise<Trainer> {
  return api.patch<Trainer>(`/trainers/${role}`, input);
}
