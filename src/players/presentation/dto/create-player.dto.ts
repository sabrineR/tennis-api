import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsDefined,
  IsIn,
  IsInt,
  IsObject,
  IsString,
  IsUrl,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateCountryDto {
  @ApiProperty({ format: 'uri', example: 'https://tenisu.latelier.co/resources/Serbie.png', description: 'HTTP or HTTPS URL.' })
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  picture!: string;

  @ApiProperty({ example: 'SRB', pattern: '\\S', description: 'Country code; must contain a non-whitespace character.' })
  @IsString()
  @Matches(/\S/)
  code!: string;
}

export class CreatePlayerDataDto {
  @ApiProperty({ type: 'integer', minimum: 1, maximum: 2147483647, example: 2 })
  @IsInt()
  @Min(1)
  @Max(2147483647)
  rank!: number;

  @ApiProperty({ type: 'integer', minimum: 0, maximum: 2147483647, example: 2542 })
  @IsInt()
  @Min(0)
  @Max(2147483647)
  points!: number;

  @ApiProperty({ type: 'integer', minimum: 1, maximum: 2147483647, example: 80000, description: 'Weight in grams.' })
  @IsInt()
  @Min(1)
  @Max(2147483647)
  weight!: number;

  @ApiProperty({ type: 'integer', minimum: 1, maximum: 2147483647, example: 188, description: 'Height in centimetres.' })
  @IsInt()
  @Min(1)
  @Max(2147483647)
  height!: number;

  @ApiProperty({ type: 'integer', minimum: 1, maximum: 2147483647, example: 31, description: 'Age in years.' })
  @IsInt()
  @Min(1)
  @Max(2147483647)
  age!: number;

  @ApiProperty({ type: 'array', items: { type: 'integer', enum: [0, 1] }, example: [1, 1, 1, 1, 1], description: 'Match results: 1 = win, 0 = loss. An empty array is allowed.' })
  @IsArray()
  @IsIn([0, 1], { each: true })
  last!: (0 | 1)[];
}

export class CreatePlayerDto {
  @ApiProperty({ example: 'Novak', pattern: '\\S' })
  @IsString()
  @Matches(/\S/)
  firstname!: string;

  @ApiProperty({ example: 'Djokovic', pattern: '\\S' })
  @IsString()
  @Matches(/\S/)
  lastname!: string;

  @ApiProperty({ example: 'N.DJO', pattern: '\\S' })
  @IsString()
  @Matches(/\S/)
  shortname!: string;

  @ApiProperty({ enum: ['M', 'F'], example: 'M' })
  @IsIn(['M', 'F'])
  sex!: 'M' | 'F';

  @ApiProperty({ type: () => CreateCountryDto })
  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => CreateCountryDto)
  country!: CreateCountryDto;

  @ApiProperty({ format: 'uri', example: 'https://tenisu.latelier.co/resources/Djokovic.png', description: 'HTTP or HTTPS URL.' })
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  picture!: string;

  @ApiProperty({ type: () => CreatePlayerDataDto })
  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => CreatePlayerDataDto)
  data!: CreatePlayerDataDto;
}
