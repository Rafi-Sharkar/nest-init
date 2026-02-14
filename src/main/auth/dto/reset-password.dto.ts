import { IsEmail, IsString, Length, MaxLength } from 'class-validator';

export class ResetPasswordDto {
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @IsString()
  @Length(8, 128)
  newPassword!: string;

  @IsString()
  @MaxLength(200)
  resetToken!: string;
}
