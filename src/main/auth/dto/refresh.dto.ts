import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({ maxLength: 2000, example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  @IsString()
  @MaxLength(2000)
  refreshToken!: string;
}
