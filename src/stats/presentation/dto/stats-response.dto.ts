import { ApiProperty } from '@nestjs/swagger';

export class BestCountryResponseDto {
  @ApiProperty({
    example: 'SRB',
    description: 'Alphabetically first country code when win ratios are tied.',
  })
  code!: string;

  @ApiProperty({
    type: 'number',
    minimum: 0,
    maximum: 1,
    example: 1,
    description:
      'Total wins / total matches for this country, rounded to four decimal places.',
  })
  winRatio!: number;
}

export class StatsResponseDto {
  @ApiProperty({
    type: () => BestCountryResponseDto,
    nullable: true,
    description:
      'Country with the highest win ratio. Countries without matches are ignored; null when none have matches.',
  })
  bestCountry!: BestCountryResponseDto | null;

  @ApiProperty({
    type: 'number',
    nullable: true,
    example: 23.36,
    description:
      'Mean individual BMI in kg/m², rounded to two decimal places. Null when no players exist.',
  })
  averageBmi!: number | null;

  @ApiProperty({
    type: 'number',
    nullable: true,
    example: 185,
    description:
      'Median height in centimetres; average of the two middle values for an even count. Null when no players exist.',
  })
  medianHeightCm!: number | null;
}
