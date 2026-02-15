import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';

export class RegisterDto {
  @ApiPropertyOptional({ maxLength: 100, example: 'John Doe' })
  @IsString()
  @IsOptional()
  fullName?: string;

  @ApiProperty({ maxLength: 50, example: 'johndoe' })
  @IsString()
  @IsString()
  username: string;

  @ApiProperty({ maxLength: 255, example: 'john.doe@example.com' })
  @IsEmail()
  @IsString()  
  email: string;

  @ApiPropertyOptional({ example: '+1234567890' })
  @IsOptional()
  phone?: string;

  @ApiProperty({ minLength: 8, maxLength: 128, example: 'SecurePass123!' })
  @IsNotEmpty()
  @IsString()
  password: string;
}
