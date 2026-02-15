import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, MaxLength } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({ maxLength: 255, example: 'john.doe@example.com' })
  @IsEmail()
  @MaxLength(255)
  email!: string;
}
