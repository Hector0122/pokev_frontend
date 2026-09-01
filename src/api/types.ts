/** Tipos de dominio — espejan lo que `pokev_backend` devuelve (Prisma models serializados a JSON). */

export type TrainerRole = 'DAD' | 'KID';

export interface Trainer {
  id: string;
  role: TrainerRole;
  name: string;
  avatarUrl: string | null;
  favoritePokemonId: number | null;
  favoritePokemon: Pokemon | null;
  createdAt: string;
}

export interface Pokemon {
  id: number;
  name: string;
  primaryType: string;
  secondaryType: string | null;
  region: string | null;
  heightCm: number | null;
  weightHg: number | null;
  spriteUrl: string | null;
  description: string | null;
  evolvesFromId: number | null;
  createdAt: string;
  // Solo presentes en GET /pokemon/:id (findOneIfDiscovered incluye las relaciones).
  evolvesFrom?: Pokemon | null;
  evolvesTo?: Pokemon[];
}

export interface CardAttack {
  name: string;
  damage?: string;
  description?: string;
}

export interface CardFavorite {
  cardId: string;
  trainerId: string;
  trainer: Trainer;
}

export interface Card {
  id: string;
  pokemonId: number;
  setName: string;
  cardNumber: string;
  rarity: string | null;
  cardType: string | null;
  hp: number | null;
  attacks: CardAttack[] | null;
  year: number | null;
  language: string | null;
  variant: string | null;
  imageUrl: string | null;
  quantity: number;
  /** Prisma Decimal serializado como string por JSON — parsear con Number() al mostrar. */
  estimatedValueUsd: string | null;
  acquiredAt: string | null;
  acquiredWithId: string | null;
  memory: string | null;
  isFirstCard: boolean;
  createdAt: string;
  updatedAt: string;
  pokemon: Pokemon;
  favoritedBy: CardFavorite[];
  // Solo presente en GET /cards/:id.
  acquiredWith?: Trainer | null;
}

export interface CardStats {
  totalCards: number;
  discoveredPokemonCount: number;
  favoriteCardCount: number;
  nextMilestone: { key: string; title: string; threshold?: number } | null;
}

export type AchievementCategory = 'collector' | 'explorer' | 'family';

export interface AchievementStatus {
  key: string;
  category: AchievementCategory;
  title: string;
  icon: string | null;
  threshold: number | null;
  unlocked: boolean;
  unlockedAt: string | null;
  unlockedByRole: TrainerRole | null;
}

export interface PokemonRef {
  id: number;
  name: string;
  primaryType: string;
  secondaryType?: string | null;
  spriteUrl?: string | null;
}

export interface CreateCardInput {
  pokemon: PokemonRef;
  setName: string;
  cardNumber: string;
  rarity?: string | null;
  cardType?: string | null;
  hp?: number | null;
  attacks?: CardAttack[];
  year?: number | null;
  language?: string | null;
  variant?: string | null;
  imageUrl?: string | null;
  quantity?: number;
  estimatedValueUsd?: number | null;
  acquiredAt?: string | null;
  acquiredWithId?: string | null;
  memory?: string | null;
  favoriteTrainerRoles?: TrainerRole[];
}

export type UpdateCardInput = Partial<Omit<CreateCardInput, 'pokemon' | 'favoriteTrainerRoles'>>;

export interface EvolutionStepInput {
  id: number;
  name: string;
  spriteUrl?: string;
  evolvesFromId?: number;
}

export interface EnrichPokemonInput {
  name: string;
  primaryType: string;
  secondaryType?: string | null;
  region?: string | null;
  heightCm?: number | null;
  weightHg?: number | null;
  spriteUrl?: string | null;
  description?: string | null;
  evolvesFromId?: number | null;
  evolutionChain?: EvolutionStepInput[];
}

export interface UpdateTrainerInput {
  name?: string;
  avatarUrl?: string;
  favoritePokemonId?: number;
}
