import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ maxLength: 255, example: 'john.doe@example.com' })
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiProperty({ maxLength: 128, example: 'SecurePass123!' })
  @IsString()
  @MaxLength(128)
  password!: string;
}
