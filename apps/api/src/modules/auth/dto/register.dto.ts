import { IsEmail, IsEnum, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class RegisterDto {
  @ApiProperty({ example: 'Budi Santoso' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  full_name: string;

  @ApiProperty({ example: 'budi@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Password123' })
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password harus mengandung huruf besar, huruf kecil, dan angka',
  })
  password: string;

  @ApiProperty({ example: 'Password123' })
  @IsString()
  password_confirm: string;

  @ApiProperty({ enum: ['END_USER', 'ORGANIZER'] })
  @IsEnum(['END_USER', 'ORGANIZER'])
  role: 'END_USER' | 'ORGANIZER';
}
