import { IsString, IsNotEmpty, IsOptional, IsUUID, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Data Transfer Object for incoming chat messages.
 * Supports unified chat across all procurement phases.
 */
export class ChatDto {
  @ApiProperty({
    description: 'The message content sent by the user.',
    example: 'I need to buy 15 new laptops for the accounting department.',
  })
  @IsString()
  @IsOptional()
  message?: string;

  @ApiPropertyOptional({
    description: 'Optional conversation ID to continue an existing conversation.',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsOptional()
  @IsUUID()
  conversationId?: string;

  @ApiPropertyOptional({
    description: 'Set to true to cancel the current conversation.',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  cancel?: boolean;
}
