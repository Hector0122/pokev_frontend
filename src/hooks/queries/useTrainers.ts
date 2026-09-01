import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchTrainer, fetchTrainers, updateTrainer } from '../../api/trainers';
import type { TrainerRole, UpdateTrainerInput } from '../../api/types';
import { queryKeys } from './queryKeys';

export function useTrainers() {
  return useQuery({ queryKey: queryKeys.trainers, queryFn: fetchTrainers });
}

export function useTrainer(role: TrainerRole) {
  return useQuery({ queryKey: queryKeys.trainer(role), queryFn: () => fetchTrainer(role) });
}

export function useUpdateTrainer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ role, input }: { role: TrainerRole; input: UpdateTrainerInput }) =>
      updateTrainer(role, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.trainers });
    },
  });
}
