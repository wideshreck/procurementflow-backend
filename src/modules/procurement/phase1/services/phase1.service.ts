import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { GeminiService } from '../../common/gemini/gemini.service';
import { Phase1DataDto, Phase1ResponseDto } from '../dto/phase1.dto';
import { PHASE1_SYSTEM_PROMPT } from '../prompts/phase1.prompt';
import { Conversation } from '@prisma/client';

@Injectable()
export class Phase1Service {
  constructor(
    private prisma: PrismaService,
    private geminiService: GeminiService
  ) {}

  private async getConversation(conversationId: string): Promise<Conversation | null> {
    return this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });
  }

  /**
   * Process Phase 1 - Product/Service Identification
   * Called by OrchestratorService with an existing conversation
   */
  async processPhase1(
    _userId: string,
    userInput: string,
    conversationId: string,
  ): Promise<Phase1ResponseDto> {
    const conversation = await this.getConversation(conversationId);
    
    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`);
    }
    await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'USER',
        content: userInput,
      },
    });
    const history = await this.prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'asc' },
    });
    const currentData = conversation ? conversation.collectedData : {};

    // Database'den gerçek kategori ve cost center verilerini çek
    const categories = await this.prisma.category.findMany({
      where: { isActive: true },
      select: {
        CategoryID: true,
        categoryCode: true,
        name: true,
        description: true,
      }
    });

    const costCenters = await this.prisma.costCenter.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        budget: true,
        spentBudget: true,
        remainingBudget: true,
        department: {
          select: {
            name: true
          }
        }
      }
    });

    // Format data for AI prompt
    const categoriesString = JSON.stringify(categories.map(cat => ({
      category_id: cat.CategoryID,
      category_code: cat.categoryCode,
      category_name: cat.name,
      description: cat.description
    })), null, 2);

    const costCentersString = JSON.stringify(costCenters.map(cc => ({
      cost_center_id: cc.id,
      cost_center_name: cc.name,
      department: cc.department?.name,
      description: cc.description,
      cost_center_budget: cc.budget,
      cost_center_spent_budget: cc.spentBudget,
      cost_center_remaining_budget: cc.remainingBudget
    })), null, 2);

    // Conversation analysis
    const hasRequestJustificationQuestion = history.some(msg => 
      msg.role === 'ASSISTANT' && msg.content.includes('Bu talebin nedeni nedir')
    );
    
    const userAnsweredJustification = hasRequestJustificationQuestion && 
      history.slice(-2).some(msg => msg.role === 'USER');

    const recentMessages = history.slice(-6).map(msg => 
      `${msg.role}: ${msg.content}`
    ).join('\n');

    const contextMessage = `
Mevcut Veri: ${JSON.stringify(currentData)}
Kullanıcı Girdisi: "${userInput}"

DURUM ANALİZİ:
- Daha önce request_justification sorusu soruldu mu: ${hasRequestJustificationQuestion}
- Kullanıcı request_justification cevabı verdi mi: ${userAnsweredJustification}

Son Konuşma:
${recentMessages}

KRITIK KURAL: 
${userAnsweredJustification ? 
  `Kullanıcı talebin nedenini verdi. Artık diğer bilgileri topla (quantity, item details vb.). request_justification olarak kullanıcının son cevabını kullan.` :
  hasRequestJustificationQuestion ? 
    `Kullanıcı henüz request_justification sorusuna cevap vermedi. Bekle veya soruyu tekrarla.` :
    `İlk olarak request_justification için "Bu talebin nedeni nedir?" sorusunu sor.`
}

Kullanılabilir Kategoriler:
${categoriesString}

Kullanılabilir Maliyet Merkezleri:
${costCentersString}
`;

    // AI ile analiz et
    const aiResponse = await this.geminiService.generateResponse({
      systemPrompt: PHASE1_SYSTEM_PROMPT(),
      history: history
        .filter(msg => msg.role === 'USER' || msg.role === 'ASSISTANT')
        .map((msg) => ({
          role: msg.role === 'USER' ? 'user' : 'model',
          parts: [{ text: msg.content }],
        })),
      message: contextMessage
    });

    // AI yanıtını parse et
    const parsedData = this.parseAIResponse(aiResponse);
    // console.log('Phase1Service - AI Response:', JSON.stringify(parsedData, null, 2));
    // console.log('Phase1Service - User Input:', userInput);
    
    if (parsedData && parsedData.MODE === 'PHASE_ONE_DONE') {
      // AI tüm verileri belirledi, fazı tamamla
      const response = await this.completePhase1(conversation.id, parsedData.COLLECTED_DATA);
      await this.prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: 'ASSISTANT',
          content: JSON.stringify(response),
          contentJson: response as any,
        },
      });
      return response;
    } else if (parsedData && parsedData.MODE === 'ASKING_FOR_INFO') {
      // AI soru sormak istiyor, soruları döndür
      const response: Phase1ResponseDto = {
        conversationId: conversation.id,
        MODE: 'ASKING_FOR_INFO',
        QUESTIONS: parsedData.QUESTIONS
      };
      await this.prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: 'ASSISTANT',
          content: JSON.stringify(response),
          contentJson: response as any,
        },
      });
      return response;
    } else {
      // AI yanıtı geçersiz, hata döndür
      throw new Error('AI yanıtı geçersiz format');
    }
  }


  /**
   * AI yanıtını parse et
   */
  private parseAIResponse(aiResponse: any): any {
    try {
      // Eğer zaten obje ise direkt döndür
      if (typeof aiResponse === 'object') {
        return aiResponse;
      }
      
      // String ise JSON formatını bul ve parse et
      if (typeof aiResponse === 'string') {
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      }
      return null;
    } catch (error) {
      console.error('AI response parsing error:', error);
      return null;
    }
  }














  /**
   * Complete Phase 1 and return collected data
   * The actual phase transition is handled by OrchestratorService
   */
  private async completePhase1(conversationId: string, data: Phase1DataDto): Promise<Phase1ResponseDto> {
    return {
      conversationId,
      MODE: 'PHASE_ONE_DONE',
      COLLECTED_DATA: data,
    };
  }

}
