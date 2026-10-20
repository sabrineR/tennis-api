import type { CreatePlayerInput } from '../domain/create-player-input.ts';
import type { Player } from '../domain/player.entity.ts';
import type { PlayerRepository } from '../domain/player.repository.ts';
import { PlayerMapper } from './player.mapper.ts';
import type { PlayerModel } from './player.model.ts';

export class SequelizePlayerRepository implements PlayerRepository {
  constructor(private readonly model: typeof PlayerModel) {}

  async findAllOrderedByRank(): Promise<Player[]> {
    try {
      const rows = await this.model.findAll({
        order: [
          ['rank', 'ASC'],
          ['id', 'ASC'],
        ],
      });
      return rows.map((row) => PlayerMapper.toDomain(row));
    } catch (error) {
      throw new Error('Unable to retrieve players', { cause: error });
    }
  }

  async findById(id: number): Promise<Player | null> {
    try {
      const row = await this.model.findByPk(id);
      return row === null ? null : PlayerMapper.toDomain(row);
    } catch (error) {
      throw new Error('Unable to retrieve player', { cause: error });
    }
  }

  async create(input: CreatePlayerInput): Promise<Player> {
    try {
      const row = await this.model.create(PlayerMapper.toPersistence(input));
      return PlayerMapper.toDomain(row);
    } catch (error) {
      throw new Error('Unable to create player', { cause: error });
    }
  }
}
