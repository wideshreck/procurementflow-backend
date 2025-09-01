import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { GeminiService } from '../../common/gemini/gemini.service';
import { PHASE4_SYSTEM_PROMPT } from '../prompts/phase4.prompt';
import { 
  Phase4DataDto, 
  Phase4CollectedDataDto, 
  DeliveryDetailsDto,
  UrgencyLevel 
} from '../dto/phase4.dto';
import { 
  ChatbotMode, 
  ChatbotResponse,
  PhaseFourDoneResponseDto,
  AskingForInfoResponseDto,
  AskingForDeliveryDetailsResponseDto
} from '../../dto/chatbot.dto';

@Injectable()
export class Phase4Service {
  private readonly logger = new Logger(Phase4Service.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly geminiService: GeminiService,
  ) {}

  async processPhase4(
    conversationId: string,
    userMessage: string,
  ): Promise<ChatbotResponse> {
    try {
      this.logger.log(`Processing Phase 4 for conversation: ${conversationId}`);

      // Conversation history al
      const conversation = await this.prismaService.conversation.findUnique({
        where: { id: conversationId },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (!conversation) {
        throw new Error('Conversation not found');
      }

      // Önceki fazlardan toplanan verileri al
      const existingData = conversation.collectedData as Record<string, any> || {};
      
      // Conversation history oluştur
      const messageHistory = conversation.messages
        .slice(-6) // Son 6 mesaj
        .map(msg => `${msg.role === 'USER' ? 'User' : 'Assistant'}: ${msg.content}`)
        .join('\n');

      // Context message hazırla
      const contextMessage = `
MEVCUT VERİLER:
${JSON.stringify(existingData, null, 2)}

SON MESAJLAR:
${messageHistory}

KULLANICI MESAJI: "${userMessage}"

GÖREV: Teslimat lokasyonu, teslim tarihi ve aciliyet bilgilerini topla. Eksik bilgileri sor.
`;

      // Gemini AI'a sor (websearch kapalı)
      const response = await this.geminiService.generateResponse({
        systemPrompt: PHASE4_SYSTEM_PROMPT,
        message: contextMessage,
        history: [],
        webSearch: false,
      });

      this.logger.log(`AI Response: ${JSON.stringify(response)}`);

      // AI response'unu parse et
      const aiData = this.parseAIResponse(JSON.stringify(response));
      
      // Collected data'yı temizle ve formatla
      const rawCollectedData = aiData.COLLECTED_DATA || {};
      
      // User message'dan delivery details extract et (fallback)
      if (!rawCollectedData.delivery_details && userMessage.includes('delivery_location_q1')) {
        rawCollectedData.delivery_details = this.extractDeliveryDetailsFromMessage(userMessage);
      }
      
      const collectedData = this.sanitizeCollectedData(rawCollectedData);
      
      // Phase 4 verileri tamamlandı mı kontrol et
      const isPhase4Complete = this.isPhase4Complete(collectedData);

      if (isPhase4Complete) {
        // Phase 4 tamamlandı - PHASE_FOUR_DONE
        this.logger.log('Phase 4 completed - moving to PHASE_FOUR_DONE');
        
        // Tüm verileri birleştir - existingData içindeki tüm fazların verilerini koru
        const finalData = {
          ...existingData,
          ...collectedData,
        };
        
        this.logger.log(`Final data being returned: ${JSON.stringify(finalData).substring(0, 300)}...`);
        
        // Eğer unit_price önceki fazlardan geldiyse, delivery_details'e kopyala
        if (finalData.unit_price && finalData.delivery_details) {
          finalData.delivery_details.unit_price = finalData.unit_price;
          finalData.delivery_details.currency = finalData.currency || 'TRY';
        }
        
        // Total price'ı hesapla
        if (finalData.delivery_details && finalData.delivery_details.unit_price && finalData.quantity) {
          finalData.delivery_details.total_price = finalData.delivery_details.unit_price * parseFloat(finalData.quantity);
        }

        await this.prismaService.conversation.update({
          where: { id: conversationId },
          data: {
            collectedData: finalData,
          },
        });

        return {
          MODE: ChatbotMode.PHASE_FOUR_DONE,
          COLLECTED_DATA: finalData,
        } as PhaseFourDoneResponseDto;
      } else {
        // Daha fazla bilgi gerekiyor
        this.logger.log('Phase 4 continuing - need more info');
        
        // Partial verileri kaydet
        const updatedData = {
          ...existingData,
          ...collectedData,
        };

        await this.prismaService.conversation.update({
          where: { id: conversationId },
          data: {
            collectedData: updatedData,
          },
        });

        // ASKING_FOR_DELIVERY_DETAILS mode'unu kontrol et
        if (aiData.MODE === 'ASKING_FOR_DELIVERY_DETAILS') {
          return {
            MODE: ChatbotMode.ASKING_FOR_DELIVERY_DETAILS,
            QUESTIONS: aiData.QUESTIONS || [],
          } as AskingForDeliveryDetailsResponseDto;
        }

        return {
          MODE: ChatbotMode.ASKING_FOR_INFO,
          QUESTIONS: aiData.QUESTIONS || [],
        } as AskingForInfoResponseDto;
      }
    } catch (error) {
      this.logger.error(`Error processing Phase 4: ${error.message}`);
      throw error;
    }
  }

  /**
   * AI response'unu parse eder
   */
  private parseAIResponse(response: string): any {
    try {
      // JSON içeriğini bul
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) || 
                       response.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const jsonStr = jsonMatch[1] || jsonMatch[0];
        const parsed = JSON.parse(jsonStr);
        
        // AI response'ındaki questions'ları frontend formatına çevir
        if (parsed.QUESTIONS) {
          this.logger.debug(`Converting ${parsed.QUESTIONS.length} questions to frontend format`);
          parsed.QUESTIONS = parsed.QUESTIONS.map((question: any) => {
            // Urgency sorusu için fallback options ekleme
            if (question.question_id === 'urgency_q3' && 
                question.question_type === 'SINGLE_CHOICE' && 
                (!question.options || !Array.isArray(question.options))) {
              this.logger.warn(`Urgency question missing options, adding default options`);
              question.options = ['DÜŞÜK', 'ORTA', 'YÜKSEK', 'ACİL'];
            }
            
            // options array'ini answer_options'a çevir (frontend compatibility)
            if (question.options && Array.isArray(question.options)) {
              this.logger.debug(`Converting options for question ${question.question_id}: ${JSON.stringify(question.options)}`);
              question.answer_options = question.options.map((option: string) => ({
                option: option,
                justification: undefined
              }));
              delete question.options; // options field'ını kaldır
              this.logger.debug(`Converted to answer_options: ${JSON.stringify(question.answer_options)}`);
            }
            return question;
          });
        }
        
        return parsed;
      }
      
      throw new Error('No JSON found in AI response');
    } catch (error) {
      this.logger.error(`Error parsing AI response: ${error.message}`);
      return {
        QUESTIONS: [{
          question_id: 'fallback_delivery_q1',
          question_type: 'TEXT',
          question_text: 'Teslimat departmanı nedir?',
        }],
        COLLECTED_DATA: {},
      };
    }
  }

  /**
   * Phase 4'ün tamamlanıp tamamlanmadığını kontrol eder
   */
  private isPhase4Complete(data: any): boolean {
    // delivery_details objesi var mı ve gerekli alanları dolu mu kontrol et
    if (!data.delivery_details) {
      return false;
    }
    
    const deliveryDetails = data.delivery_details;
    const required = ['delivery_location', 'due_date', 'urgency'];
    
    // Eğer unit_price önceki fazlardan gelmediyse, Phase 4'te sorulmalı
    const hasUnitPrice = data.unit_price || deliveryDetails.unit_price;
    if (!hasUnitPrice) {
      required.push('unit_price');
      required.push('currency');
    }
    
    return required.every(field => 
      deliveryDetails[field] !== undefined && 
      deliveryDetails[field] !== null && 
      deliveryDetails[field].toString().trim() !== ''
    );
  }

  /**
   * Date string'ini DD-MM-YYYY formatında tutar (minimal conversion)
   */
  private convertToDateFormat(dateStr: string): string {
    try {
      // Whitespace'leri temizle
      const cleanDate = dateStr.trim();
      
      // DD-MM-YYYY formatı zaten ise direkt döndür
      if (cleanDate.match(/^\d{1,2}-\d{1,2}-\d{4}$/)) {
        const parts = cleanDate.split('-');
        const day = parts[0].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        const year = parts[2];
        return `${day}-${month}-${year}`;
      }
      
      // DD/MM/YYYY formatından dönüştür
      if (cleanDate.includes('/')) {
        const parts = cleanDate.split('/');
        if (parts.length === 3) {
          const day = parts[0].padStart(2, '0');
          const month = parts[1].padStart(2, '0');
          const year = parts[2];
          return `${day}-${month}-${year}`;
        }
      }
      
      // Eğer başka format gelirse direkt döndür (AI'dan DD-MM-YYYY bekliyoruz)
      return cleanDate;
    } catch {
      // Fallback: bugünden 1 ay sonra DD-MM-YYYY formatında
      const future = new Date();
      future.setMonth(future.getMonth() + 1);
      const day = future.getDate().toString().padStart(2, '0');
      const month = (future.getMonth() + 1).toString().padStart(2, '0');
      const year = future.getFullYear();
      return `${day}-${month}-${year}`;
    }
  }

  /**
   * Urgency string'ini enum'a map eder
   */
  private mapUrgency(urgencyStr: string): UrgencyLevel {
    const str = urgencyStr.toUpperCase();
    if (str.includes('ACİL') || str.includes('URGENT')) return UrgencyLevel.URGENT;
    if (str.includes('YÜKSEK') || str.includes('HIGH')) return UrgencyLevel.HIGH;
    if (str.includes('ORTA') || str.includes('MEDIUM')) return UrgencyLevel.MEDIUM;
    return UrgencyLevel.LOW;
  }

  /**
   * AI response'ındaki verileri temizler ve formatlar
   */
  private sanitizeCollectedData(rawData: any): any {
    if (!rawData) return {};

    // delivery_details varsa formatla
    if (rawData.delivery_details) {
      const deliveryDetails = rawData.delivery_details;
      
      // Tarih formatını düzelt
      if (deliveryDetails.due_date) {
        deliveryDetails.due_date = this.convertToDateFormat(deliveryDetails.due_date);
      }
      
      // Urgency'yi formatla
      if (deliveryDetails.urgency) {
        deliveryDetails.urgency = this.mapUrgency(deliveryDetails.urgency);
      }
      
      // Unit price'i number'a çevir
      if (deliveryDetails.unit_price) {
        deliveryDetails.unit_price = parseFloat(deliveryDetails.unit_price);
      }
      
      // Total price'i hesapla (quantity varsa)
      if (deliveryDetails.unit_price && rawData.quantity) {
        deliveryDetails.total_price = deliveryDetails.unit_price * parseFloat(rawData.quantity);
      }
    }

    return rawData;
  }

  /**
   * User message'dan delivery details extract eder (fallback)
   */
  private extractDeliveryDetailsFromMessage(message: string): any {
    try {
      const details: any = {};
      
      // delivery_location_q1 extract
      const locationMatch = message.match(/delivery_location_q1:\s*([^,]+)/);
      if (locationMatch) {
        details.delivery_location = locationMatch[1].trim();
      }
      
      // due_date_q2 extract
      const dateMatch = message.match(/due_date_q2:\s*([^,]+)/);
      if (dateMatch) {
        details.due_date = this.convertToDateFormat(dateMatch[1].trim());
      }
      
      // urgency_q3 extract
      const urgencyMatch = message.match(/urgency_q3:\s*([^,]+)/);
      if (urgencyMatch) {
        details.urgency = this.mapUrgency(urgencyMatch[1].trim());
      }
      
      // unit_price_q4 extract
      const priceMatch = message.match(/unit_price_q4:\s*([\d.]+)/);
      if (priceMatch) {
        details.unit_price = parseFloat(priceMatch[1]);
      }
      
      // currency_q5 extract
      const currencyMatch = message.match(/currency_q5:\s*([^,]+)/);
      if (currencyMatch) {
        details.currency = currencyMatch[1].trim();
      }
      
      return details;
    } catch (error) {
      this.logger.error(`Error extracting delivery details: ${error.message}`);
      return {};
    }
  }
}
