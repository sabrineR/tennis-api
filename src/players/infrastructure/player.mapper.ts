import type { CreationAttributes } from 'sequelize';
import type { CreatePlayerInput } from '../domain/create-player-input.ts';
import { Player } from '../domain/player.entity.ts';
import type { PlayerModel } from './player.model.ts';

export class PlayerMapper {
  static toDomain(model: PlayerModel): Player {
    return new Player(
      model.id,
      model.firstname,
      model.lastname,
      model.shortname,
      model.sex,
      { code: model.countryCode, picture: model.countryPicture },
      model.picture,
      {
        rank: model.rank,
        points: model.points,
        weight: model.weight,
        height: model.height,
        age: model.age,
        last: [...model.last],
      },
    );
  }

  static toPersistence(
    input: CreatePlayerInput,
  ): Omit<CreationAttributes<PlayerModel>, 'id'> {
    return {
      firstname: input.firstname,
      lastname: input.lastname,
      shortname: input.shortname,
      sex: input.sex,
      countryCode: input.country.code,
      countryPicture: input.country.picture,
      picture: input.picture,
      rank: input.data.rank,
      points: input.data.points,
      weight: input.data.weight,
      height: input.data.height,
      age: input.data.age,
      last: [...input.data.last],
    };
  }
}
