import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../../shared/presentation/dto/error-response.dto.ts';
import { CreatePlayerUseCase } from '../application/create-player/create-player.use-case.ts';
import { GetPlayerUseCase } from '../application/get-player/get-player.use-case.ts';
import { ListPlayersUseCase } from '../application/list-players/list-players.use-case.ts';
import type { CreatePlayerInput } from '../domain/create-player-input.ts';
import { CreatePlayerDto } from './dto/create-player.dto.ts';
import { PlayerResponseDto, PlayersResponseDto } from './dto/player-response.dto.ts';
import { PlayerResponseMapper } from './player-response.mapper.ts';

@Controller('players')
@ApiTags('Players')
@ApiExtraModels(ErrorResponseDto)
@ApiInternalServerErrorResponse({
  description: 'Unexpected technical error. No SQL or connection details are exposed.',
  schema: {
    allOf: [{ $ref: getSchemaPath(ErrorResponseDto) }],
    example: { statusCode: 500, code: 'INTERNAL_SERVER_ERROR', message: 'Internal server error' },
  },
})
export class PlayersController {
  constructor(
    private readonly listPlayers: ListPlayersUseCase,
    private readonly getPlayer: GetPlayerUseCase,
    private readonly createPlayer: CreatePlayerUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List players', description: 'Returns players ordered by rank ASC, then id ASC. GET /api/players/ is an equivalent trailing-slash variant.' })
  @ApiOkResponse({ type: PlayersResponseDto })
  async findAll(): Promise<{ players: PlayerResponseDto[] }> {
    const players = await this.listPlayers.execute();
    return { players: players.map((player) => PlayerResponseMapper.toDTO(player)) };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a player by ID' })
  @ApiParam({ name: 'id', required: true, schema: { type: 'integer', minimum: 1, maximum: Number.MAX_SAFE_INTEGER }, example: 17, description: 'Positive integer ID, written using digits only.' })
  @ApiOkResponse({ type: PlayerResponseDto })
  @ApiBadRequestResponse({
    schema: {
      allOf: [{ $ref: getSchemaPath(ErrorResponseDto) }],
      example: { statusCode: 400, code: 'HTTP_ERROR', message: 'Player ID must be a positive integer' },
    },
  })
  @ApiNotFoundResponse({
    schema: {
      allOf: [{ $ref: getSchemaPath(ErrorResponseDto) }],
      example: { statusCode: 404, code: 'PLAYER_NOT_FOUND', message: 'Player with ID 999 not found' },
    },
  })
  async findById(@Param('id') value: string): Promise<PlayerResponseDto> {
    const id = Number(value);
    if (!/^\d+$/.test(value) || !Number.isSafeInteger(id) || id <= 0) {
      throw new BadRequestException('Player ID must be a positive integer');
    }
    return PlayerResponseMapper.toDTO(await this.getPlayer.execute(id));
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a player', description: 'Try it out performs a real insertion in the connected database. Do not send an id: PostgreSQL generates it. All fields are required. Unknown properties, including nested properties, are rejected. Numeric strings are not accepted.' })
  @ApiBody({ type: CreatePlayerDto })
  @ApiCreatedResponse({ type: PlayerResponseDto, description: 'Player created, including its generated ID.' })
  @ApiBadRequestResponse({ type: ErrorResponseDto, description: 'Missing or invalid fields, or unknown properties.' })
  async create(@Body() dto: CreatePlayerDto): Promise<PlayerResponseDto> {
    const input: CreatePlayerInput = {
      firstname: dto.firstname,
      lastname: dto.lastname,
      shortname: dto.shortname,
      sex: dto.sex,
      country: { picture: dto.country.picture, code: dto.country.code },
      picture: dto.picture,
      data: {
        rank: dto.data.rank,
        points: dto.data.points,
        weight: dto.data.weight,
        height: dto.data.height,
        age: dto.data.age,
        last: [...dto.data.last],
      },
    };
    return PlayerResponseMapper.toDTO(await this.createPlayer.execute(input));
  }
}
