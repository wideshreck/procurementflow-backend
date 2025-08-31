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
      const conversationId = await this.orchestratorService.cancelConversation(user.id);
      return {
        conversationId,
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

  @Post('chat/test')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Public test endpoint for procurement chat (development only)' })
  @ApiResponse({ status: 200, description: 'Message processed successfully' })
  async testChat(
    @Body() chatDto: ChatDto,
  ): Promise<ChatbotResponse> {
    const testUserId = 'test-user-demo';

    if (chatDto.cancel) {
      const conversationId = await this.orchestratorService.cancelConversation(testUserId);
      return {
        conversationId,
        response: 'Conversation cancelled successfully.',
        MODE: ChatbotMode.CONVERSATION_CANCELLED,
      };
    }

    // Use a test user ID for demonstration
    return this.orchestratorService.processMessage(
      testUserId,
      chatDto.message || '',
      chatDto.conversationId,
    );
  }

  @Get('test-flow')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Test procurement flow integration' })
  async testFlow(): Promise<any> {
    // Test with a mock user ID
    const testUserId = 'test-user-' + Date.now();
    
    // Simulate Phase 1
    const phase1Response = await this.orchestratorService.processMessage(
      testUserId,
      'I need 10 laptops for accounting department'
    );
    
    return {
      message: 'Procurement flow test completed',
      testUserId,
      response: phase1Response,
      phases: {
        phase1: 'Product Identification',
        phase2: 'Catalog Matching (auto-starts after Phase 1)',
        phase3: 'Specification Generation (auto-starts after Phase 2)'
      }
    };
  }

  @Get('requests')
  findAll() {
    return this.procurementService.findAll();
  }

  @Post('request')
  create(@Body() createProcurementRequestDto: CreateProcurementRequestDto) {
    return this.procurementService.create(createProcurementRequestDto);
  }
}
