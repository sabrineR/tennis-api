import { Controller, Get } from '@nestjs/common';
import { ApiExtraModels, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiTags, getSchemaPath } from '@nestjs/swagger';
import { ErrorResponseDto } from '../../shared/presentation/dto/error-response.dto.ts';
import { GetStatsUseCase } from '../application/get-stats/get-stats.use-case.ts';
import { StatsResponseDto } from './dto/stats-response.dto.ts';

@Controller('stats')
@ApiTags('Statistics')
@ApiExtraModels(ErrorResponseDto)
export class StatsController {
  constructor(private readonly getStats: GetStatsUseCase) {}

  @Get()
  @ApiOperation({ summary: 'Get player statistics', description: 'Aggregates wins and matches by country, calculates mean individual BMI and median height. All three values are null when no players exist. Only bestCountry is null when no matches exist.' })
  @ApiOkResponse({ type: StatsResponseDto })
  @ApiInternalServerErrorResponse({
    schema: {
      allOf: [{ $ref: getSchemaPath(ErrorResponseDto) }],
      example: { statusCode: 500, code: 'INTERNAL_SERVER_ERROR', message: 'Internal server error' },
    },
  })
  async findStatistics(): Promise<StatsResponseDto> {
    const statistics = await this.getStats.execute();
    return {
      bestCountry: statistics.bestCountry === null ? null : {
        code: statistics.bestCountry.code,
        winRatio: Number(statistics.bestCountry.winRatio.toFixed(4)),
      },
      averageBmi: statistics.averageBmi === null ? null : Number(statistics.averageBmi.toFixed(2)),
      medianHeightCm: statistics.medianHeightCm,
    };
  }
}
