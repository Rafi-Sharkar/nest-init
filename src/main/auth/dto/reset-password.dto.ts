import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length, MaxLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ maxLength: 255, example: 'john.doe@example.com' })
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiProperty({ minLength: 8, maxLength: 128, example: 'NewSecurePass123!' })
  @IsString()
  @Length(8, 128)
  newPassword!: string;

  @ApiProperty({ maxLength: 200, example: 'abc123def456ghi789' })
  @IsString()
  @MaxLength(200)
  resetToken!: string;
}
