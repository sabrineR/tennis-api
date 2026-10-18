import type { CreatePlayerInput } from './create-player-input.ts';
import type { Player } from './player.entity.ts';

export interface PlayerRepository {
  findAllOrderedByRank(): Promise<Player[]>;
  findById(id: number): Promise<Player | null>;
  create(input: CreatePlayerInput): Promise<Player>;
}
