import { Injectable, Logger } from '@nestjs/common';
import { Conversation } from '@prisma/client';
import { GeminiService } from '../../common/gemini/gemini.service';
import { ChatbotResponse, ChatbotMode } from '../../dto/chatbot.dto';
import { PrismaService } from '../../../../prisma/prisma.service';
import { PHASE2_SYSTEM_PROMPT } from '../prompts/phase2.prompt';

@Injectable()
export class Phase2Service {
  private readonly logger = new Logger(Phase2Service.name);

  constructor(
    private readonly geminiService: GeminiService,
    private readonly prisma: PrismaService,
  ) {}

  async process(
    conversation: Conversation,
    message: string,
  ): Promise<ChatbotResponse> {
    try {
      this.logger.log(`Processing Phase 2 for conversation ${conversation.id}`);
      
      // If this is the initial Phase 2 entry (message will be the collected data from phase 1)
      if (message) {
        try {
          const phase1Data = JSON.parse(message);
          this.logger.log('Starting Phase 2 with initial product suggestions based on Phase 1 data.');
          return this.generateInitialSuggestions(conversation, phase1Data);
        } catch (e) {
          // Not a JSON object, so it's a regular user message
        }
      }

      const history = await this.getHistory(conversation.id);
      const contextMessage = `Phase 1 Data: ${JSON.stringify(
        conversation.collectedData,
      )}\n\nUser Message: ${message}`;

      const aiResponse = await this.geminiService.generateResponse({
        systemPrompt: PHASE2_SYSTEM_PROMPT,
        history,
        message: contextMessage,
        webSearch: true,
      });

      // Parse and validate the AI response
      return this.parsePhase2Response(aiResponse, conversation.id);
    } catch (error) {
      this.logger.error(`Error in Phase 2 processing: ${error.message}`);
      throw error;
    }
  }

  private async getHistory(conversationId: string) {
    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: 50,
    });

    return messages.map((msg) => ({
      role: (msg.role.toLowerCase() === 'user' ? 'user' : 'model') as
        | 'user'
        | 'model',
      parts: [{ text: msg.content }],
    }));
  }

  /**
   * Generate initial product suggestions when entering Phase 2
   */
  private async generateInitialSuggestions(
    conversation: Conversation,
    phase1Data: any,
  ): Promise<ChatbotResponse> {
    const contextMessage = `Phase 1 is complete. Here is the collected data:\n${JSON.stringify(
      phase1Data,
      null,
      2
    )}\n\nPlease provide initial product suggestions based on this information.`;

    const aiResponse = await this.geminiService.generateResponse({
      systemPrompt: PHASE2_SYSTEM_PROMPT,
      history: [],
      message: contextMessage,
      webSearch: true,
    });

    return this.parsePhase2Response(aiResponse, conversation.id);
  }

  /**
   * Parse and validate Phase 2 AI response
   */
  private parsePhase2Response(
    aiResponse: any,
    _conversationId: string,
  ): ChatbotResponse {
    if (typeof aiResponse !== 'object' || !aiResponse.MODE) {
      this.logger.warn(`Invalid AI response format: ${JSON.stringify(aiResponse)}`);
      // Fallback to a generic error message or re-prompt logic if necessary
      throw new Error('Invalid response structure from AI.');
    }

    switch (aiResponse.MODE) {
      case 'PHASE_TWO_DONE':
        return {
          MODE: ChatbotMode.PHASE_TWO_DONE,
          COLLECTED_DATA: aiResponse.COLLECTED_DATA || {},
        } as ChatbotResponse;

      case 'SUGGESTION_FOR_CATALOG':
        return {
          MODE: ChatbotMode.SUGGESTION_FOR_CATALOG,
          SUGGESTIONS_FOR_CATALOG: aiResponse.SUGGESTIONS_FOR_CATALOG || [],
        } as ChatbotResponse;

      case 'PHASE_TWO_CATALOG_MATCH':
        return {
          MODE: ChatbotMode.PHASE_TWO_CATALOG_MATCH,
          COLLECTED_DATA: aiResponse.COLLECTED_DATA || {},
          SELECTED_CATALOG_ITEM: aiResponse.SELECTED_CATALOG_ITEM || {},
        } as ChatbotResponse;

      case 'SUGGESTION':
        return {
          MODE: ChatbotMode.SUGGESTION,
          SUGGESTIONS: aiResponse.SUGGESTIONS || [],
        } as ChatbotResponse;

      // Added to prevent crashes if the AI asks for info unexpectedly.
      case 'ASKING_FOR_INFO':
        this.logger.warn(
          `AI is asking for info in Phase 2, which is unexpected. Returning as SUGGESTION.`,
        );
        return {
          MODE: ChatbotMode.ASKING_FOR_INFO,
          QUESTIONS: aiResponse.QUESTIONS || [],
        } as ChatbotResponse;

      default:
        this.logger.warn(`Unhandled AI response mode: ${aiResponse.MODE}`);
        throw new Error(`Unhandled AI mode: ${aiResponse.MODE}`);
    }
  }
}
