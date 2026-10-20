import { ApiProperty } from '@nestjs/swagger';

export class ErrorResponseDto {
  @ApiProperty({ type: 'integer', example: 400 })
  statusCode!: number;

  @ApiProperty({ example: 'HTTP_ERROR', description: 'HTTP_ERROR, PLAYER_NOT_FOUND, or INTERNAL_SERVER_ERROR.' })
  code!: string;

  @ApiProperty({
    description: 'Validation can return multiple messages. Technical details are never returned.',
    oneOf: [
      { type: 'string' },
      { type: 'array', items: { type: 'string' } },
    ],
    example: ['firstname must be a string'],
  })
  message!: string | string[];
}
