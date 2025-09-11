import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { Env } from '../../../../config/environment';
import {
  AIProvider,
  AIFieldSuggestion,
  AIContentGeneration,
  GenerateContentRequest,
  SuggestFieldsRequest,
  ImproveContentRequest,
  GenerateTemplateRequest,
} from './ai-provider.interface';

@Injectable()
export class OpenAIProvider implements AIProvider {
  private readonly logger = new Logger(OpenAIProvider.name);
  private openai: OpenAI;
  private model: string;

  constructor(private configService: ConfigService<Env>) {
    const apiKey = this.configService.get('OPENAI_API_KEY');
    this.model = this.configService.get('OPENAI_MODEL') || 'gpt-4o';
    
    this.openai = new OpenAI({
      apiKey,
    });
  }

  async generateContent(request: GenerateContentRequest): Promise<AIContentGeneration> {
    try {
      const prompt = this.buildContentPrompt(request);
      
      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'Sen bir satın alma uzmanısın. RFx dokümanları için profesyonel ve detaylı içerik üretiyorsun. Türkçe yanıt ver.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      });

      const content = completion.choices[0]?.message?.content || '';
      
      return {
        content,
        confidence: 0.9,
        suggestions: this.generateSuggestions(request.fieldLabel),
      };
    } catch (error: any) {
      this.logger.error('OpenAI content generation error:', error.message || error);
      
      // Return fallback content instead of throwing
      return {
        content: this.getFallbackContent(request.fieldLabel, request.rfxType),
        confidence: 0.5,
        suggestions: ['AI servisi geçici olarak kullanılamıyor. Manuel içerik giriniz.'],
      };
    }
  }

  async suggestFields(request: SuggestFieldsRequest): Promise<AIFieldSuggestion[]> {
    try {
      const prompt = this.buildFieldSuggestionsPrompt(request);
      
      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'Sen bir satın alma uzmanısın. RFx dokümanları için en uygun alanları öneriyorsun. JSON formatında yanıt ver.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.6,
        max_tokens: 800,
        response_format: { type: 'json_object' },
      });

      const response = completion.choices[0]?.message?.content || '{}';
      const parsed = JSON.parse(response);
      
      return parsed.suggestions || [];
    } catch (error: any) {
      this.logger.error('OpenAI field suggestions error:', error.message || error);
      return this.getDefaultFieldSuggestions(request.sectionTitle);
    }
  }

  async improveContent(request: ImproveContentRequest): Promise<AIContentGeneration> {
    try {
      const prompt = this.buildImproveContentPrompt(request);
      
      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'Sen bir satın alma ve yazım uzmanısın. Verilen içeriği daha profesyonel ve etkili hale getiriyorsun. Türkçe yanıt ver.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.5,
        max_tokens: 600,
      });

      const content = completion.choices[0]?.message?.content || request.currentContent;
      
      return {
        content,
        confidence: 0.85,
        suggestions: [
          'Daha spesifik teknik detaylar ekleyin',
          'Teslimat koşullarını netleştirin',
          'Kalite kriterlerini belirtin',
        ],
      };
    } catch (error: any) {
      this.logger.error('OpenAI content improvement error:', error.message || error);
      return {
        content: request.currentContent,
        confidence: 0,
        suggestions: ['İçerik iyileştirme servisi geçici olarak kullanılamıyor'],
      };
    }
  }

  async generateTemplate(request: GenerateTemplateRequest): Promise<any> {
    try {
      const prompt = this.buildTemplatePrompt(request);
      
      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'Sen bir satın alma uzmanısın. Kapsamlı RFx şablonları oluşturuyorsun. JSON formatında yanıt ver.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      });

      const response = completion.choices[0]?.message?.content || '{}';
      return JSON.parse(response);
    } catch (error: any) {
      this.logger.error('OpenAI template generation error:', error.message || error);
      return this.getDefaultTemplate(request);
    }
  }

  async checkAvailability(): Promise<boolean> {
    try {
      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'user',
            content: 'Test',
          },
        ],
        max_tokens: 5,
      });
      
      return !!completion.choices[0]?.message?.content;
    } catch (error: any) {
      this.logger.error('OpenAI availability check failed:', error.message || error);
      return false;
    }
  }

  private buildContentPrompt(request: GenerateContentRequest): string {
    return `
      Bir ${request.rfxType} dokümanı için "${request.fieldLabel}" alanına uygun içerik oluştur.
      Kategori: ${request.category}
      ${request.fieldDescription ? `Alan Açıklaması: ${request.fieldDescription}` : ''}
      ${request.companyContext ? `Şirket Bağlamı: ${request.companyContext}` : ''}
      
      Lütfen profesyonel, detaylı ve Türkçe bir içerik oluştur.
    `;
  }

  private buildFieldSuggestionsPrompt(request: SuggestFieldsRequest): string {
    return `
      "${request.sectionTitle}" bölümü için ek alan önerileri oluştur.
      RFx Türü: ${request.rfxType}
      Kategori: ${request.category}
      Mevcut Alanlar: ${request.existingFields.join(', ')}
      
      JSON formatında şu yapıda 3-5 öneri ver:
      {
        "suggestions": [
          {
            "label": "Alan Adı",
            "description": "Alan açıklaması",
            "isRequired": true/false,
            "reasoning": "Bu alanın neden önerildiği"
          }
        ]
      }
    `;
  }

  private buildImproveContentPrompt(request: ImproveContentRequest): string {
    return `
      Aşağıdaki içeriği "${request.fieldLabel}" alanı için iyileştir:
      
      Mevcut İçerik:
      ${request.currentContent}
      
      RFx Türü: ${request.rfxType}
      ${request.improvements ? `İyileştirme Önerileri: ${request.improvements.join(', ')}` : ''}
      
      Daha profesyonel, açık ve kapsamlı bir versiyon oluştur.
    `;
  }

  private buildTemplatePrompt(request: GenerateTemplateRequest): string {
    return `
      Bir ${request.rfxType} şablonu oluştur.
      Kategori: ${request.category}
      Açıklama: ${request.description}
      ${request.specificRequirements ? `Özel Gereksinimler: ${request.specificRequirements.join(', ')}` : ''}
      
      JSON formatında kapsamlı bir şablon döndür. Her bölüm için başlık ve alanlar içersin.
      Türkçe alan adları ve açıklamaları kullan.
    `;
  }

  private getFallbackContent(fieldLabel: string, rfxType: string): string {
    const templates: Record<string, string> = {
      'Şirket Bilgileri': `[Şirket adınızı], [sektör] sektöründe faaliyet gösteren, [çalışan sayısı] çalışanı ile hizmet veren bir kuruluştur. Bu ${rfxType} talebi ile [proje amacı] hedeflenmektedir.`,
      'Proje Bağlamı ve Hedefler': `Bu ${rfxType} talebinin amacı [iş ihtiyacı] ihtiyacını karşılamaktır. Proje sonucunda [beklenen çıktılar] elde edilmesi beklenmektedir.`,
      'Teknik Özellikler': `Talep edilen ürün/hizmet aşağıdaki özellikleri sağlamalıdır:\n- [Teknik özellik 1]\n- [Teknik özellik 2]\n- [Performans kriteri]`,
      'Fiyatlandırma': `Teklif fiyatınız aşağıdaki kalemleri içermelidir:\n- Birim fiyat\n- Toplam maliyet\n- Ek hizmet ücretleri (varsa)`,
      'Teslimat Süresi': `Ürün/hizmet teslimat süresi [X] gün/hafta/ay olarak planlanmaktadır. Teslimat lokasyonu: [Adres]`,
    };

    return templates[fieldLabel] || `[${fieldLabel} için içerik giriniz]`;
  }

  private getDefaultTemplate(request: GenerateTemplateRequest): any {
    return {
      name: `${request.rfxType} Template - ${request.category}`,
      description: request.description,
      sections: [
        {
          title: 'Genel Bilgiler',
          order: 1,
          fields: [
            { label: 'Proje Başlığı', isRequired: true },
            { label: 'Proje Açıklaması', isRequired: true },
            { label: 'Teklif Son Tarihi', isRequired: true }
          ]
        },
        {
          title: 'Teknik Gereksinimler',
          order: 2,
          fields: [
            { label: 'Teknik Özellikler', isRequired: true },
            { label: 'Performans Kriterleri', isRequired: false },
            { label: 'Kalite Standartları', isRequired: false }
          ]
        },
        {
          title: 'Ticari Koşullar',
          order: 3,
          fields: [
            { label: 'Fiyatlandırma', isRequired: true },
            { label: 'Ödeme Koşulları', isRequired: true },
            { label: 'Garanti Süresi', isRequired: false }
          ]
        }
      ]
    };
  }

  private generateSuggestions(fieldLabel: string): string[] {
    const suggestions: Record<string, string[]> = {
      'Teknik Özellikler': [
        'Minimum performans kriterleri belirtin',
        'Uyumluluk standartlarını ekleyin',
        'Test ve doğrulama yöntemlerini açıklayın',
      ],
      'Teslimat Koşulları': [
        'Teslimat lokasyonlarını netleştirin',
        'Paketleme gereksinimlerini belirtin',
        'Kısmi teslimat opsiyonlarını değerlendirin',
      ],
      'Fiyatlandırma': [
        'Birim fiyatları detaylandırın',
        'İndirim koşullarını açıklayın',
        'Ödeme vadelerini belirtin',
      ],
    };

    return suggestions[fieldLabel] || [
      'Daha fazla detay ekleyin',
      'Spesifik gereksinimler belirtin',
      'Ölçülebilir kriterler tanımlayın',
    ];
  }

  private getDefaultFieldSuggestions(sectionTitle: string): AIFieldSuggestion[] {
    const suggestions: Record<string, AIFieldSuggestion[]> = {
      'Teknik ve Fonksiyonel Gereksinimler': [
        {
          label: 'Performans Kriterleri',
          description: 'Sistemin sağlaması gereken minimum performans değerleri',
          isRequired: true,
          reasoning: 'Objektif değerlendirme için gerekli',
        },
        {
          label: 'Entegrasyon Gereksinimleri',
          description: 'Mevcut sistemlerle entegrasyon detayları',
          isRequired: false,
          reasoning: 'Sistem uyumluluğu için önemli',
        },
      ],
      'Ticari ve Mali Teklif': [
        {
          label: 'Garanti Koşulları',
          description: 'Ürün/hizmet garanti süresi ve kapsamı',
          isRequired: true,
          reasoning: 'Satın alma güvencesi için gerekli',
        },
        {
          label: 'Ödeme Vadeleri',
          description: 'Ödeme planı ve vade detayları',
          isRequired: true,
          reasoning: 'Finansal planlama için kritik',
        },
      ],
    };

    return suggestions[sectionTitle] || [
      {
        label: 'Ek Gereksinimler',
        description: 'Bu bölüm için özel gereksinimler',
        isRequired: false,
        reasoning: 'Kapsamlı bilgi toplama için',
      },
    ];
  }
}