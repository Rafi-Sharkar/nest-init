import { IsOptional, IsString, MaxLength } from 'class-validator';

export class LogoutDto {
  @IsString()
  @MaxLength(2000)
  refreshToken!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  accessToken?: string;
}
