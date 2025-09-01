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
      
      // Check if user selected a product from catalog suggestions
      if (message && message.startsWith('PHASE_TWO_SELECTED:')) {
        try {
          const selectedData = JSON.parse(message.replace('PHASE_TWO_SELECTED:', '').trim());
          this.logger.log('User selected a catalog product, moving to Phase 4');
          
          // Set requirement_level to 'Zorunlu' for all technical specifications
          if (selectedData.technical_specifications && Array.isArray(selectedData.technical_specifications)) {
            selectedData.technical_specifications = selectedData.technical_specifications.map((spec: any) => ({
              ...spec,
              requirement_level: 'Zorunlu'
            }));
          }
          
          // Merge with existing conversation data
          const existingData = conversation.collectedData as any || {};
          const phase1Data = existingData.phase1 || existingData;
          
          const mergedData = {
            // Include all phase1 fields at root level for backward compatibility
            ...(phase1Data.item_title ? phase1Data : {}),
            selected_product: selectedData.selected_product,
            technical_specifications: selectedData.technical_specifications || [],
            // Phase 2'den gelen last_updated_price'ı unit_price olarak ata
            unit_price: selectedData.last_updated_price ? parseFloat(selectedData.last_updated_price) : null,
            currency: 'TRY',
            // Preserve phase structure
            phase1: phase1Data,
            phase2: {
              selected_product: selectedData.selected_product,
              technical_specifications: selectedData.technical_specifications || [],
              unit_price: selectedData.last_updated_price ? parseFloat(selectedData.last_updated_price) : null,
              currency: 'TRY',
              selected_catalog_item: selectedData
            }
          };
          
          // Update conversation with selected data
          await this.prisma.conversation.update({
            where: { id: conversation.id },
            data: {
              collectedData: mergedData,
            },
          });
          
          return {
            MODE: ChatbotMode.PHASE_TWO_SELECTED,
            COLLECTED_DATA: mergedData,
            SELECTED_CATALOG_ITEM: selectedData,
          } as ChatbotResponse;
        } catch (e) {
          this.logger.error('Error parsing PHASE_TWO_SELECTED message', e);
        }
      }
      
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
      return await this.parsePhase2Response(aiResponse, conversation.id);
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
  private async parsePhase2Response(
    aiResponse: any,
    _conversationId: string,
  ): Promise<ChatbotResponse> {
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
        // Extract technical specifications from suggestions if available
        const suggestions = aiResponse.SUGGESTIONS_FOR_CATALOG || [];
        const technicalSpecs: any[] = [];
        
        // Collect technical specifications from all suggestions
        for (const suggestion of suggestions) {
          if (suggestion.technical_specifications) {
            technicalSpecs.push(...suggestion.technical_specifications);
          }
        }
        
        // Store technical specifications in collected data for future phases
        if (technicalSpecs.length > 0 && _conversationId) {
          const conversation = await this.prisma.conversation.findUnique({
            where: { id: _conversationId },
          });
          
          if (conversation) {
            const currentData = (conversation.collectedData as any) || {};
            await this.prisma.conversation.update({
              where: { id: _conversationId },
              data: {
                collectedData: {
                  ...currentData,
                  technical_specifications_from_suggestions: technicalSpecs,
                },
              },
            });
          }
        }
        
        return {
          MODE: ChatbotMode.SUGGESTION_FOR_CATALOG,
          SUGGESTIONS_FOR_CATALOG: suggestions,
        } as ChatbotResponse;

      case 'PHASE_TWO_SELECTED':
        // When user selects a catalog item, go directly to Phase 4
        const selectedPhase2Data = aiResponse.COLLECTED_DATA || {};
        const selectedPhase2Item = aiResponse.SELECTED_CATALOG_ITEM || {};
        
        // If selected item has technical specifications, add them to collected data with requirement_level as 'Zorunlu'
        if (selectedPhase2Item.technical_specifications) {
          selectedPhase2Data.technical_specifications = selectedPhase2Item.technical_specifications.map((spec: any) => ({
            ...spec,
            requirement_level: 'Zorunlu'
          }));
        }
        
        return {
          MODE: ChatbotMode.PHASE_TWO_SELECTED,
          COLLECTED_DATA: selectedPhase2Data,
          SELECTED_CATALOG_ITEM: selectedPhase2Item,
        } as ChatbotResponse;
        
      case 'PHASE_TWO_CATALOG_MATCH':
        // When user selects a catalog item, ensure technical specifications are preserved
        const catalogMatchData = aiResponse.COLLECTED_DATA || {};
        const catalogMatchItem = aiResponse.SELECTED_CATALOG_ITEM || {};
        
        // If selected item has technical specifications, add them to collected data with requirement_level as 'Zorunlu'
        if (catalogMatchItem.technical_specifications) {
          catalogMatchData.technical_specifications = catalogMatchItem.technical_specifications.map((spec: any) => ({
            ...spec,
            requirement_level: 'Zorunlu'
          }));
        }
        
        return {
          MODE: ChatbotMode.PHASE_TWO_CATALOG_MATCH,
          COLLECTED_DATA: catalogMatchData,
          SELECTED_CATALOG_ITEM: catalogMatchItem,
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
