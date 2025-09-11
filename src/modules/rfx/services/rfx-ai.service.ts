import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources/chat';

export interface AIFieldSuggestion {
  label: string;
  description: string;
  isRequired: boolean;
  reasoning?: string;
}

export interface AIContentGeneration {
  content: string;
  confidence: number;
  suggestions?: string[];
}

@Injectable()
export class RFxAIService {
  private readonly logger = new Logger(RFxAIService.name);
  private openai: OpenAI | null;
  private readonly model = 'gpt-4-turbo-preview';

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    
    if (!apiKey) {
      this.logger.warn('OpenAI API key not configured. AI features will be limited.');
      // Fallback to mock AI service for development
      this.openai = null;
    } else {
      this.openai = new OpenAI({
        apiKey: apiKey,
      });
    }
  }

  /**
   * Generate content for RFX template fields
   */
  async generateFieldContent(
    fieldLabel: string,
    fieldDescription: string,
    context: {
      rfxType: 'RFQ' | 'RFP' | 'RFI';
      category: string;
      companyContext?: string;
    }
  ): Promise<AIContentGeneration> {
    try {
      if (!this.openai) {
        return this.getMockContent(fieldLabel, context.rfxType);
      }

      const systemPrompt = this.getSystemPrompt('content_generation');
      const userPrompt = `
        Generate professional content for an RFX (${context.rfxType}) template field:
        
        Field: ${fieldLabel}
        Description: ${fieldDescription || 'Not provided'}
        Category: ${context.category}
        ${context.companyContext ? `Company Context: ${context.companyContext}` : ''}
        
        Requirements:
        1. Content should be professional, clear, and comprehensive
        2. It should be adaptable but specific enough to be useful
        3. Include relevant details based on the field type
        4. For ${context.rfxType} type specifically
        5. Response should be in Turkish
        
        Provide the content in a format ready to be used in the document.
      `;

      const messages: ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ];

      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages,
        temperature: 0.7,
        max_tokens: 500,
      });

      const content = completion.choices[0]?.message?.content || '';
      
      return {
        content: content.trim(),
        confidence: 0.85,
        suggestions: this.extractSuggestions(content),
      };
    } catch (error) {
      this.logger.error(`Error generating field content: ${error.message}`);
      return this.getMockContent(fieldLabel, context.rfxType);
    }
  }

  /**
   * Suggest additional fields for RFX template sections
   */
  async suggestFields(
    sectionTitle: string,
    existingFields: string[],
    context: {
      rfxType: 'RFQ' | 'RFP' | 'RFI';
      category: string;
      industry?: string;
    }
  ): Promise<AIFieldSuggestion[]> {
    try {
      if (!this.openai) {
        return this.getMockFieldSuggestions(sectionTitle, context.rfxType);
      }

      const systemPrompt = this.getSystemPrompt('field_suggestion');
      const userPrompt = `
        Suggest additional fields for an RFX template section.
        
        Section: ${sectionTitle}
        RFX Type: ${context.rfxType}
        Category: ${context.category}
        ${context.industry ? `Industry: ${context.industry}` : ''}
        
        Existing fields:
        ${existingFields.map(f => `- ${f}`).join('\n')}
        
        Requirements:
        1. Suggest 3-5 NEW fields that would be valuable for this section
        2. Fields should be relevant to ${context.rfxType} type
        3. Avoid duplicating existing fields
        4. Each field should have a clear purpose
        5. Consider industry best practices
        6. Response should be in Turkish
        
        For each field provide:
        - Label (clear, concise name)
        - Description (explanation of what information is needed)
        - Whether it should be required or optional
        - Brief reasoning why this field is valuable
        
        Format as JSON array.
      `;

      const messages: ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ];

      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages,
        temperature: 0.8,
        max_tokens: 800,
        response_format: { type: 'json_object' },
      });

      const response = completion.choices[0]?.message?.content || '{}';
      const parsed = JSON.parse(response);
      
      return parsed.suggestions || this.getMockFieldSuggestions(sectionTitle, context.rfxType);
    } catch (error) {
      this.logger.error(`Error suggesting fields: ${error.message}`);
      return this.getMockFieldSuggestions(sectionTitle, context.rfxType);
    }
  }

  /**
   * Analyze and improve existing RFX content
   */
  async improveContent(
    currentContent: string,
    fieldLabel: string,
    context: {
      rfxType: 'RFQ' | 'RFP' | 'RFI';
      improvements?: string[];
    }
  ): Promise<AIContentGeneration> {
    try {
      if (!this.openai) {
        return {
          content: currentContent,
          confidence: 0.5,
          suggestions: ['AI service not configured'],
        };
      }

      const systemPrompt = this.getSystemPrompt('content_improvement');
      const userPrompt = `
        Improve the following RFX content:
        
        Field: ${fieldLabel}
        Current Content: ${currentContent}
        RFX Type: ${context.rfxType}
        
        Improvement areas to focus on:
        ${context.improvements ? context.improvements.map(i => `- ${i}`).join('\n') : '- Clarity\n- Completeness\n- Professional tone'}
        
        Requirements:
        1. Maintain the original intent
        2. Make it more professional and comprehensive
        3. Ensure clarity and remove ambiguity
        4. Add relevant details if missing
        5. Keep response in Turkish
        
        Provide the improved version.
      `;

      const messages: ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ];

      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages,
        temperature: 0.6,
        max_tokens: 600,
      });

      const improvedContent = completion.choices[0]?.message?.content || currentContent;
      
      return {
        content: improvedContent.trim(),
        confidence: 0.9,
        suggestions: ['İçerik iyileştirildi ve profesyonelleştirildi'],
      };
    } catch (error) {
      this.logger.error(`Error improving content: ${error.message}`);
      return {
        content: currentContent,
        confidence: 0.5,
        suggestions: ['İyileştirme sırasında hata oluştu'],
      };
    }
  }

  /**
   * Generate complete RFX template based on requirements
   */
  async generateTemplate(
    requirements: {
      rfxType: 'RFQ' | 'RFP' | 'RFI';
      category: string;
      description: string;
      specificRequirements?: string[];
    }
  ): Promise<any> {
    try {
      if (!this.openai) {
        return this.getMockTemplate(requirements.rfxType);
      }

      const systemPrompt = this.getSystemPrompt('template_generation');
      const userPrompt = `
        Create a comprehensive RFX template structure.
        
        Type: ${requirements.rfxType}
        Category: ${requirements.category}
        Description: ${requirements.description}
        ${requirements.specificRequirements ? `Specific Requirements:\n${requirements.specificRequirements.map(r => `- ${r}`).join('\n')}` : ''}
        
        Generate a complete template with:
        1. Relevant sections for this type of RFX
        2. Appropriate fields for each section
        3. Clear descriptions for each field
        4. Indication of required vs optional fields
        5. All content in Turkish
        
        Format as a structured JSON with sections and fields.
      `;

      const messages: ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ];

      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages,
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      });

      const response = completion.choices[0]?.message?.content || '{}';
      return JSON.parse(response);
    } catch (error) {
      this.logger.error(`Error generating template: ${error.message}`);
      return this.getMockTemplate(requirements.rfxType);
    }
  }

  private getSystemPrompt(type: string): string {
    const prompts = {
      content_generation: `You are an expert procurement specialist with deep knowledge of RFX (RFQ, RFP, RFI) documents. 
        Your role is to generate professional, clear, and comprehensive content for RFX templates in Turkish. 
        You understand industry best practices and can create content that is both specific and adaptable.`,
      
      field_suggestion: `You are an expert procurement consultant specializing in RFX template design. 
        Your role is to suggest valuable fields that enhance the completeness and effectiveness of RFX documents. 
        You understand different industries and can recommend fields based on best practices. Always respond in JSON format with Turkish content.`,
      
      content_improvement: `You are a professional editor specializing in procurement documents. 
        Your role is to improve and refine RFX content, making it clearer, more professional, and more comprehensive 
        while maintaining the original intent. Focus on clarity, completeness, and professional tone.`,
      
      template_generation: `You are a senior procurement strategist who designs RFX templates for various industries. 
        Create comprehensive, well-structured templates that follow industry best practices. 
        Always provide responses in valid JSON format with Turkish content.`,
    };

    return prompts[type] || prompts.content_generation;
  }

  private extractSuggestions(content: string): string[] {
    // Extract potential improvement suggestions from the content
    const suggestions: string[] = [];
    
    if (content.length < 100) {
      suggestions.push('İçerik daha detaylı hale getirilebilir');
    }
    
    if (!content.includes('tarih') && !content.includes('süre')) {
      suggestions.push('Zaman çerçevesi eklenebilir');
    }
    
    if (!content.includes('kriter') && !content.includes('gereksinim')) {
      suggestions.push('Spesifik kriterler belirtilebilir');
    }
    
    return suggestions;
  }

  private getMockContent(fieldLabel: string, rfxType: string): AIContentGeneration {
    const fieldLabelLower = fieldLabel.toLowerCase();
    
    // Alan adına göre özelleştirilmiş içerik üretimi
    if (fieldLabelLower.includes('tarih') || fieldLabelLower.includes('süre') || fieldLabelLower.includes('zaman')) {
      const today = new Date();
      const deadline = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 gün sonra
      return {
        content: deadline.toLocaleDateString('tr-TR'),
        confidence: 0.9,
        suggestions: ['Teslim süresi proje gereksinimlerine göre ayarlanabilir'],
      };
    }
    
    if (fieldLabelLower.includes('araç') || fieldLabelLower.includes('filo')) {
      return {
        content: `Araç filosu gereksinimleri:
- Araç tipi: Hafif ticari/Binek
- Minimum araç sayısı: 10 adet
- Yakıt tipi: Dizel/Benzin/Elektrikli
- Maksimum yaş: 3 yıl
- Minimum güvenlik donanımı: ABS, ESP, Airbag
- Sigorta: Tam kasko zorunlu
- Bakım: Periyodik bakım hizmeti dahil`,
        confidence: 0.85,
        suggestions: ['Araç özellikleri ihtiyacınıza göre özelleştirilebilir'],
      };
    }
    
    if (fieldLabelLower.includes('bütçe') || fieldLabelLower.includes('maliyet') || fieldLabelLower.includes('fiyat')) {
      return {
        content: `Bütçe ve maliyet detayları:
- Toplam bütçe aralığı belirtilecektir
- Fiyatlandırma KDV hariç olarak verilmelidir
- Ödeme koşulları: %30 avans, %70 teslimatta
- Para birimi: TRY
- Geçerlilik süresi: 30 gün`,
        confidence: 0.8,
        suggestions: ['Bütçe detayları proje büyüklüğüne göre ayarlanmalıdır'],
      };
    }
    
    if (fieldLabelLower.includes('teslim') || fieldLabelLower.includes('teslimat')) {
      return {
        content: `Teslimat koşulları:
- Teslimat yeri: Firma merkez adresi
- Teslimat süresi: Sipariş tarihinden itibaren 30 gün
- Kısmi teslimat: Kabul edilmez
- Teslimat şekli: DAP (Delivered at Place)
- Teslim saatleri: 09:00-17:00 arası`,
        confidence: 0.85,
        suggestions: ['Teslimat koşulları lojistik gereksinimlerinize göre düzenlenebilir'],
      };
    }
    
    if (fieldLabelLower.includes('garanti') || fieldLabelLower.includes('güvence')) {
      return {
        content: `Garanti koşulları:
- Minimum garanti süresi: 24 ay
- Garanti kapsamı: Parça, işçilik ve servis dahil
- Yerinde servis: 48 saat içinde müdahale
- Yedek parça temini: 10 yıl garantili
- Garanti başlangıcı: Teslim tarihinden itibaren`,
        confidence: 0.85,
        suggestions: ['Garanti süreleri sektör standardına göre ayarlanabilir'],
      };
    }
    
    if (fieldLabelLower.includes('kalite') || fieldLabelLower.includes('standart')) {
      return {
        content: `Kalite ve standart gereksinimleri:
- ISO 9001:2015 Kalite Yönetim Sistemi sertifikası
- CE uygunluk belgesi (ilgili ürünler için)
- TSE belgesi
- Ürün test raporları
- Kalite kontrol prosedürleri`,
        confidence: 0.8,
        suggestions: ['Sektörünüze özel kalite standartları eklenebilir'],
      };
    }

    // Genel içerik
    const generalContents = {
      'Şirket Bilgileri': `Firmamız, ${rfxType === 'RFQ' ? 'fiyat teklifi' : rfxType === 'RFP' ? 'proje teklifi' : 'bilgi'} talebinde bulunmaktadır. Detaylı şirket bilgilerimiz ve proje gereksinimleri bu dokümanda sunulmaktadır.`,
      
      'Proje Bağlamı': `Bu ${rfxType} talebi, kurumumuzun operasyonel verimliliğini artırmak ve mevcut süreçleri iyileştirmek amacıyla hazırlanmıştır.`,
      
      'Teknik Özellikler': `Talep edilen ürün/hizmet, kurumumuzun teknik altyapısı ve mevcut sistemleri ile uyumlu olmalıdır. Detaylı teknik gereksinimler ilgili bölümlerde belirtilmiştir.`,
      
      default: `Bu alan için uygun içerik üretiliyor. Lütfen spesifik gereksinimleri belirtiniz.`,
    };
    
    // Alan adına en yakın eşleşmeyi bul
    const matchedKey = Object.keys(generalContents).find(key => 
      fieldLabel.includes(key) || key.includes(fieldLabel)
    );

    return {
      content: matchedKey ? generalContents[matchedKey] : generalContents.default,
      confidence: 0.75,
      suggestions: ['İçerik proje detaylarına göre özelleştirilebilir'],
    };
  }

  private getMockFieldSuggestions(sectionTitle: string, rfxType: string): AIFieldSuggestion[] {
    const suggestions = {
      'Teknik ve Fonksiyonel Gereksinimler': [
        {
          label: 'Performans Kriterleri',
          description: 'Sistemin sağlaması gereken minimum performans değerleri, yanıt süreleri ve kapasite gereksinimleri',
          isRequired: true,
          reasoning: 'Objektif değerlendirme için ölçülebilir performans kriterleri kritik öneme sahiptir',
        },
        {
          label: 'Güvenlik Gereksinimleri',
          description: 'Veri güvenliği, erişim kontrolü, şifreleme ve uyumluluk standartları',
          isRequired: true,
          reasoning: 'Modern sistemlerde güvenlik gereksinimleri vazgeçilmezdir',
        },
        {
          label: 'Eğitim ve Dokümantasyon',
          description: 'Kullanıcı eğitimleri, teknik dokümantasyon ve kullanım kılavuzları',
          isRequired: false,
          reasoning: 'Başarılı implementasyon için eğitim ve dokümantasyon önemlidir',
        },
      ],
      'Ticari ve Mali Teklif': [
        {
          label: 'Lisanslama Modeli',
          description: 'Yazılım veya hizmet lisanslama yapısı, kullanıcı sayısı bazlı fiyatlandırma',
          isRequired: true,
          reasoning: 'Toplam sahip olma maliyetini anlamak için lisanslama detayları gereklidir',
        },
        {
          label: 'Ek Maliyet Kalemleri',
          description: 'Kurulum, entegrasyon, özelleştirme ve destek için ek maliyetler',
          isRequired: false,
          reasoning: 'Gizli maliyetleri önlemek için tüm maliyet kalemleri açık olmalıdır',
        },
        {
          label: 'Referans Fiyat Listesi',
          description: 'Benzer projeler için uygulanan fiyatlar ve referans müşteriler',
          isRequired: false,
          reasoning: 'Fiyat kıyaslaması ve pazarlık için referans bilgiler faydalıdır',
        },
      ],
      default: [
        {
          label: 'Kalite Güvence Süreci',
          description: 'Proje kalitesini sağlamak için uygulanacak süreç ve metodolojiler',
          isRequired: false,
          reasoning: 'Kalite standartlarının sağlanması için süreç tanımları önemlidir',
        },
        {
          label: 'Risk Yönetim Planı',
          description: 'Potansiyel riskler ve azaltma stratejileri',
          isRequired: false,
          reasoning: 'Proaktif risk yönetimi proje başarısını artırır',
        },
      ],
    };

    return suggestions[sectionTitle] || suggestions.default;
  }

  private getMockTemplate(rfxType: string): any {
    return {
      name: `${rfxType} Şablonu`,
      description: `Standart ${rfxType} şablonu`,
      sections: [
        {
          title: 'Temel Bilgiler',
          fields: [
            { label: 'Doküman Başlığı', description: '', isRequired: true },
            { label: 'Proje Adı', description: '', isRequired: true },
          ],
        },
        {
          title: 'Teknik Gereksinimler',
          fields: [
            { label: 'Teknik Özellikler', description: 'Detaylı teknik gereksinimler', isRequired: true },
            { label: 'Performans Kriterleri', description: 'Beklenen performans değerleri', isRequired: false },
          ],
        },
      ],
    };
  }
}