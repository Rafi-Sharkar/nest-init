import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class LogoutDto {
  @ApiProperty({ maxLength: 2000, example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  @IsString()
  @MaxLength(2000)
  refreshToken!: string;

  @ApiPropertyOptional({ maxLength: 2000, example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  accessToken?: string;
}
