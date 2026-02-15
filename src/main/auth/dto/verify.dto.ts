import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length, MaxLength } from 'class-validator';

export class VerifyOtpDto {
  @ApiProperty({ maxLength: 255, example: 'john.doe@example.com' })
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiProperty({ minLength: 6, maxLength: 6, example: '123456' })
  @IsString()
  @Length(6, 6)
  otp!: string;
}
