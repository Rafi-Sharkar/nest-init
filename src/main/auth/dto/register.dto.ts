import {
  IsEmail,
  IsOptional,
  IsPhoneNumber,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  fullName?: string;

  @IsString()
  @MaxLength(50)
  username!: string;

  @IsEmail()
  @MaxLength(255)
  email!: string;

  @IsOptional()
  @IsPhoneNumber(undefined)
  phone?: string;

  @IsString()
  @Length(8, 128)
  password!: string;
}
