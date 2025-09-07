import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  IsBoolean,
} from 'class-validator';

export class UpdateUserDto {
  @ApiProperty({
    example: 'testuser@example.com',
    description: 'User email address',
    required: false,
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({
    example: 'Test User',
    description: 'User full name',
    required: false,
  })
  @IsString()
  @IsOptional()
  fullName?: string;

  @ApiProperty({
    example: '123-456-7890',
    description: 'User phone number',
    required: false,
  })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({
    example: 'IT Department',
    description: 'User department',
    required: false,
  })
  @IsString()
  @IsOptional()
  department?: string;

  @ApiProperty({
    example: true,
    description: 'Set user as active or inactive',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({
    example: 'cuid_of_a_custom_role',
    description: 'ID of the custom role to assign',
    required: false,
  })
  @IsString()
  @IsOptional()
  customRoleId?: string;
}
