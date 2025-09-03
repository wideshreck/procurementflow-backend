import { Body, Controller, Post, UseGuards, HttpCode, HttpStatus, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { User } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { OrchestratorService } from './common/services/orchestrator.service';
import { ProcurementService } from './procurement.service';
import { CreateProcurementRequestDto } from './dto/create-procurement-request.dto';
import { ChatDto } from './dto/chat.dto';
import { ChatbotResponse, ChatbotMode } from './dto/chatbot.dto';

@ApiTags('procurement')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('procurement')
export class ProcurementController {
  constructor(
    private readonly orchestratorService: OrchestratorService,
    private readonly procurementService: ProcurementService,
  ) {}

  @Post('chat')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unified chat endpoint for all procurement phases' })
  @ApiResponse({ status: 200, description: 'Message processed successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async chat(
    @Body() chatDto: ChatDto,
    @CurrentUser() user: User,
  ): Promise<ChatbotResponse> {
    if (chatDto.cancel) {
      await this.orchestratorService.cancelConversation(user.id);
      return {
        conversationId: undefined, // Signal frontend to clear conversation ID
        response: 'Conversation cancelled successfully.',
        MODE: ChatbotMode.CONVERSATION_CANCELLED,
      };
    }

    if (!chatDto.message) {
      // This case should ideally be handled by validation, but as a safeguard:
      throw new Error('Message is required when not cancelling.');
    }

    return this.orchestratorService.processMessage(
      user.id,
      chatDto.message,
      chatDto.conversationId,
    );
  }


  @Get('requests')
  findAll() {
    return this.procurementService.findAll();
  }

  @Post('request')
  @ApiOperation({ summary: 'Create a new procurement request' })
  @ApiResponse({ status: 201, description: 'Procurement request created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  create(@Body() createProcurementRequestDto: CreateProcurementRequestDto, @CurrentUser() user: User) {
    return this.procurementService.create(createProcurementRequestDto, user);
  }

  @Post('estimate-price')
  @ApiOperation({ summary: 'Estimate price using AI based on technical specifications' })
  @ApiResponse({ status: 200, description: 'Price estimated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  async estimatePrice(
    @Body() data: {
      technical_specifications: any[];
      item_title: string;
      quantity: number;
      currency: string;
    },
    @CurrentUser() user: User,
  ): Promise<{ estimatedPrice: number; currency: string }> {
    return this.procurementService.estimatePrice(data);
  }
}
