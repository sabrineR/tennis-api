import type { Player } from '../domain/player.entity.ts';
import type { PlayerResponseDto } from './dto/player-response.dto.ts';

export class PlayerResponseMapper {
  static toDTO(player: Player): PlayerResponseDto {
    return {
      id: player.id,
      firstname: player.firstname,
      lastname: player.lastname,
      shortname: player.shortname,
      sex: player.sex,
      country: {
        picture: player.country.picture,
        code: player.country.code,
      },
      picture: player.picture,
      data: {
        rank: player.data.rank,
        points: player.data.points,
        weight: player.data.weight,
        height: player.data.height,
        age: player.data.age,
        last: [...player.data.last],
      },
    };
  }
}
