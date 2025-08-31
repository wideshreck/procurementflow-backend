import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class Phase1ChatDto {
  @ApiProperty({
    description: 'The unique identifier for the conversation. If not provided, an active one will be used or a new one will be created.',
    example: 'test-conversation-01',
    required: false,
  })
  @IsString()
  @IsOptional()
  conversationId?: string;

  @ApiProperty({
    description: "The user's message input.",
    example: 'Boya almamız gerekiyor',
  })
  @IsString()
  userInput: string;

}
