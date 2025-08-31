import { Injectable, Logger } from '@nestjs/common';
import { Conversation } from '@prisma/client';
import { GeminiService } from '../../common/gemini/gemini.service';
import { ChatbotResponse, ChatbotMode } from '../../dto/chatbot.dto';
import { PrismaService } from '../../../../prisma/prisma.service';
import { PHASE3_SYSTEM_PROMPT } from '../prompts/phase3.prompt';
@Injectable()
export class Phase3Service {
  private readonly logger = new Logger(Phase3Service.name);

  constructor(
    private readonly geminiService: GeminiService,
    private readonly prisma: PrismaService,
  ) {}

  async process(
    conversation: Conversation,
    message: string,
  ): Promise<ChatbotResponse> {
    try {
      this.logger.log(`Processing Phase 3 for conversation ${conversation.id}`);
      
      // If this is the initial Phase 3 entry (message will be the collected data from phase 2)
      if (message) {
        try {
          const phase2Data = JSON.parse(message);
          this.logger.log('Starting Phase 3 with specification generation based on Phase 2 data.');
          return this.generateInitialSpecifications(conversation, phase2Data);
        } catch (e) {
          // Not a JSON object, so it's a regular user message
        }
      }

      // Check if this is a manual technical specifications submission
      if (message.startsWith('Teknik Özellikler:') || 
          message.startsWith('Teknik Özellikler Onaylandı:') || 
          message.startsWith('Teknik Şartname Onaylandı:') ||
          message.startsWith('PHASE_THREE_FINAL_APPROVAL:')) {
        return this.processManualTechnicalSpecs(conversation, message);
      }

      // Check if user wants to define specs manually
      if (message.toLowerCase().includes('kendim belirlemek istiyorum') || 
          message.toLowerCase().includes('kendim belirtmek istiyorum') ||
          message.toLowerCase().includes('manuel olarak belirlemek')) {
        return this.generateSuggestedSpecsForApproval(conversation);
      }

      const history = await this.getHistory(conversation.id);
      const contextMessage = `Collected Data for Specs: ${JSON.stringify(
        conversation.collectedData,
      )}\n\nUser Message: ${message}`;

      const aiResponse = await this.geminiService.generateResponse({
        systemPrompt: PHASE3_SYSTEM_PROMPT(),
        history,
        message: contextMessage,
        webSearch: true,
      });

      // Parse and validate the AI response
      return this.parsePhase3Response(aiResponse, conversation.id);
    } catch (error) {
      this.logger.error(`Error in Phase 3 processing: ${error.message}`);
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
   * Generate initial specifications when entering Phase 3
   */
  private async generateInitialSpecifications(
    conversation: Conversation,
    phase2Data: any,
  ): Promise<ChatbotResponse> {
    const collectedData = conversation.collectedData as any;
    const phase1Data = collectedData?.phase1 || {};
    
    const contextMessage = `Phase 2 is complete. Here is all collected data:\n
Phase 1 Data:\n${JSON.stringify(
      phase1Data,
      null,
      2
    )}\n\nPhase 2 Data:\n${JSON.stringify(
      phase2Data,
      null,
      2
    )}\n\nPlease generate detailed technical specifications for the RFQ.`;

    const aiResponse = await this.geminiService.generateResponse({
      systemPrompt: PHASE3_SYSTEM_PROMPT(),
      history: [],
      message: contextMessage,
      webSearch: true,
    });

    return this.parsePhase3Response(aiResponse, conversation.id);
  }

  /**
   * Process manual technical specifications submitted by user
   */
  private processManualTechnicalSpecs(
    conversation: Conversation,
    message: string,
  ): ChatbotResponse {
    this.logger.log('Processing manual technical specifications');
    
    const collectedData = conversation.collectedData as any;
    const phase1Data = collectedData?.phase1 || {};
    
    // Parse technical specifications from the message
    const technicalSpecs = this.parseManualTechnicalSpecsFromMessage(message);
    
    // Create the final COLLECTED_DATA with all phase information
    const finalCollectedData = {
      ...phase1Data,
      technical_specifications: technicalSpecs,
    };

    return {
      MODE: ChatbotMode.PHASE_THREE_DONE,
      COLLECTED_DATA: finalCollectedData,
    } as ChatbotResponse;
  }

  /**
   * Generate suggested specs for user approval when they want to define manually
   */
  private async generateSuggestedSpecsForApproval(
    conversation: Conversation,
  ): Promise<ChatbotResponse> {
    this.logger.log('Generating suggested specs for user approval');
    
    const collectedData = conversation.collectedData as any;
    const phase1Data = collectedData?.phase1 || {};
    
    // Create a detailed prompt for generating comprehensive technical specifications
    const contextMessage = `Kullanıcı önceden önerilen profilleri beğenmedi ve kendisi manuel olarak belirlemek istiyor. 
    MUTLAKA aşağıdaki veriler doğrultusunda detaylı ve kapsamlı bir teknik şartname oluştur:
    
    Toplanan Veriler:
    ${JSON.stringify(phase1Data, null, 2)}
    
    ÖNEMLI: 
    - Bu şartname kullanıcının onayına sunulacak ve düzenlenebilir olacak
    - MUTLAKA PHASE_THREE_DONE formatında döndür
    - technical_specifications dizisi BOŞ OLMAMALI, en az 5-8 teknik özellik içermeli
    - Her teknik özellik için spec_key, spec_value ve requirement_level zorunlu
    - requirement_level "Zorunlu" veya "Tercih Edilen" olmalı
    
    ÖRNEK ÇIKTI YAPISI KESINLIKLE ŞÖYLE OLMALI:
    {
      "MODE": "PHASE_THREE_DONE",
      "COLLECTED_DATA": {
        ...phase1Data,
        "technical_specifications": [
          { "spec_key": "İşlemci", "spec_value": "detaylı işlemci özellikleri", "requirement_level": "Zorunlu" },
          { "spec_key": "RAM", "spec_value": "detaylı ram özellikleri", "requirement_level": "Zorunlu" },
          ...daha fazla özellik
        ]
      }
    }`;

    const aiResponse = await this.geminiService.generateResponse({
      systemPrompt: PHASE3_SYSTEM_PROMPT(),
      history: [],
      message: contextMessage,
      webSearch: true,
    });

    // Parse the AI response but override the mode to show approval form
    const parsedResponse = this.parsePhase3Response(aiResponse, conversation.id);
    
    // If AI generated PHASE_THREE_DONE, validate and return as APPROVAL mode for frontend
    if (parsedResponse.MODE === ChatbotMode.PHASE_THREE_DONE) {
      // Ensure technical_specifications exists and is not empty
      const collectedData = parsedResponse.COLLECTED_DATA || {};
      if (!collectedData.technical_specifications || collectedData.technical_specifications.length === 0) {
        this.logger.warn('AI did not generate technical specifications, creating fallback');
        // Create basic technical specifications as fallback
        collectedData.technical_specifications = this.createFallbackTechnicalSpecs(phase1Data);
      }
      
      return {
        MODE: ChatbotMode.PHASE_THREE_APPROVAL, // Return approval mode to show form
        COLLECTED_DATA: collectedData,
      } as ChatbotResponse;
    }
    
    // If AI didn't generate PHASE_THREE_DONE, create a manual fallback
    this.logger.warn('AI did not generate PHASE_THREE_DONE mode, creating manual fallback');
    return {
      MODE: ChatbotMode.PHASE_THREE_APPROVAL, // Return approval mode to show form
      COLLECTED_DATA: {
        ...phase1Data,
        technical_specifications: this.createFallbackTechnicalSpecs(phase1Data),
      },
    } as ChatbotResponse;
  }

  /**
   * Create fallback technical specifications when AI fails to generate them
   */
  private createFallbackTechnicalSpecs(phase1Data: any) {
    const categoryId = phase1Data.category_id || '';
    const itemTitle = phase1Data.item_title?.toLowerCase() || '';
    
    // IT/Computer related specifications (cat-3 is IT category)
    if (categoryId.startsWith('cat-3') || 
        itemTitle.includes('bilgisayar') || 
        itemTitle.includes('laptop') || 
        itemTitle.includes('dizüstü')) {
      return [
        { spec_key: "İşlemci", spec_value: "Minimum Intel Core i5 veya AMD Ryzen 5 işlemci", requirement_level: "Zorunlu" as const },
        { spec_key: "RAM (Bellek)", spec_value: "Minimum 8 GB DDR4 RAM", requirement_level: "Zorunlu" as const },
        { spec_key: "Depolama", spec_value: "Minimum 256 GB SSD", requirement_level: "Zorunlu" as const },
        { spec_key: "Ekran", spec_value: "Minimum 14 inç ekran", requirement_level: "Zorunlu" as const },
        { spec_key: "İşletim Sistemi", spec_value: "Windows 11 veya macOS", requirement_level: "Zorunlu" as const },
        { spec_key: "Garanti", spec_value: "Minimum 2 yıl garanti", requirement_level: "Tercih Edilen" as const },
      ];
    }
    
    // Office equipment specifications (cat-4 might be office equipment)
    if (categoryId.startsWith('cat-4') || 
        itemTitle.includes('ofis') || 
        itemTitle.includes('mobilya')) {
      return [
        { spec_key: "Malzeme", spec_value: "Yüksek kalite malzeme", requirement_level: "Zorunlu" as const },
        { spec_key: "Boyut", spec_value: "Standart ofis boyutları", requirement_level: "Zorunlu" as const },
        { spec_key: "Renk", spec_value: "Ofis ortamına uygun renk", requirement_level: "Tercih Edilen" as const },
        { spec_key: "Garanti", spec_value: "Minimum 1 yıl garanti", requirement_level: "Zorunlu" as const },
        { spec_key: "Montaj", spec_value: "Kolay montaj", requirement_level: "Tercih Edilen" as const },
      ];
    }
    
    // Generic specifications for other categories
    return [
      { spec_key: "Kalite", spec_value: "Yüksek kalite standartları", requirement_level: "Zorunlu" as const },
      { spec_key: "Marka", spec_value: "Tanınmış marka tercihi", requirement_level: "Tercih Edilen" as const },
      { spec_key: "Garanti", spec_value: "Minimum 1 yıl garanti", requirement_level: "Zorunlu" as const },
      { spec_key: "Sertifika", spec_value: "İlgili sertifikasyonlar", requirement_level: "Tercih Edilen" as const },
      { spec_key: "Teslimat", spec_value: "Hızlı teslimat", requirement_level: "Tercih Edilen" as const },
    ];
  }

  /**
   * Parse technical specifications from formatted message
   */
   private parseManualTechnicalSpecsFromMessage(message: string) {
    const lines = message.split('\n').slice(1); // Remove header (Teknik Özellikler, Teknik Şartname Onaylandı, PHASE_THREE_FINAL_APPROVAL, etc.)
    const technicalSpecs: Array<{
      spec_key: string;
      spec_value: string;
      requirement_level: string;
      notes?: string;
    }> = [];
    
    for (const line of lines) {
      if (line.trim()) {
        // Parse format: "spec_key: spec_value (requirement_level) - notes"
        const match = line.match(/^(.+?):\s*(.+?)\s*\(([^)]+)\)(?:\s*-\s*(.+))?$/);
        if (match) {
          const [, specKey, specValue, requirementLevel, notes] = match;
          technicalSpecs.push({
            spec_key: specKey.trim(),
            spec_value: specValue.trim(),
            requirement_level: requirementLevel.trim(),
            notes: notes?.trim() || undefined,
          });
        }
      }
    }
    
    return technicalSpecs;
  }

  /**
   * Parse and validate Phase 3 AI response
   */
  private parsePhase3Response(
    aiResponse: any,
    _conversationId: string,
  ): ChatbotResponse {
    if (typeof aiResponse !== 'object' || !aiResponse.MODE) {
      this.logger.warn(`Invalid AI response format: ${JSON.stringify(aiResponse)}`);
      throw new Error('Invalid response structure from AI.');
    }

    switch (aiResponse.MODE) {
      case 'PHASE_THREE_DONE':
        return {
          MODE: ChatbotMode.PHASE_THREE_DONE,
          COLLECTED_DATA: aiResponse.COLLECTED_DATA || {},
        } as ChatbotResponse;

      case 'SUGGESTION_FOR_PREDEFINED_PROFILES':
        return {
          MODE: ChatbotMode.SUGGESTION_FOR_PREDEFINED_PROFILES,
          SUGGESTIONS_FOR_PREDEFINED_PROFILES:
            aiResponse.SUGGESTIONS_FOR_PREDEFINED_PROFILES || [],
        } as ChatbotResponse;

      case 'SUGGESTION':
        return {
          MODE: ChatbotMode.SUGGESTION,
          SUGGESTIONS: aiResponse.SUGGESTIONS || [],
        } as ChatbotResponse;
      


      default:
        this.logger.warn(`Unhandled AI response mode: ${aiResponse.MODE}`);
        throw new Error(`Unhandled AI mode: ${aiResponse.MODE}`);
    }
  }
}
