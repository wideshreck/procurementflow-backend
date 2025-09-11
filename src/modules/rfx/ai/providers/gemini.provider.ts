import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
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
export class GeminiProvider implements AIProvider {
  private readonly logger = new Logger(GeminiProvider.name);
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;

  constructor(private configService: ConfigService<Env>) {
    const apiKey = this.configService.get('GEMINI_API_KEY');
    
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    } else {
      this.logger.warn('GEMINI_API_KEY is not configured');
    }
  }

  async generateContent(request: GenerateContentRequest): Promise<AIContentGeneration> {
    try {
      if (!this.model) {
        throw new Error('Gemini model not initialized');
      }
      const prompt = this.buildContentPrompt(request);
      
      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const content = await response.text();
      
      return {
        content,
        confidence: 0.88,
        suggestions: this.generateSuggestions(request.fieldLabel),
      };
    } catch (error: any) {
      this.logger.error('Gemini content generation error:', error.message || error);
      return {
        content: this.getFallbackContent(request.fieldLabel, request.rfxType),
        confidence: 0.85,
        suggestions: this.generateSuggestions(request.fieldLabel),
      };
    }
  }

  async suggestFields(request: SuggestFieldsRequest): Promise<AIFieldSuggestion[]> {
    try {
      if (!this.model) {
        throw new Error('Gemini model not initialized');
      }
      const prompt = this.buildFieldSuggestionsPrompt(request);
      
      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const text = await response.text();
      
      try {
        const cleanedText = text.replace(/```json\n?|\n?```/g, '').trim();
        const parsed = JSON.parse(cleanedText);
        return parsed.suggestions || [];
      } catch (parseError) {
        this.logger.warn('Failed to parse Gemini response as JSON, using defaults');
        return this.getDefaultFieldSuggestions(request.sectionTitle);
      }
    } catch (error: any) {
      this.logger.error('Gemini field suggestions error:', error.message || error);
      return this.getDefaultFieldSuggestions(request.sectionTitle);
    }
  }

  async improveContent(request: ImproveContentRequest): Promise<AIContentGeneration> {
    try {
      if (!this.model) {
        throw new Error('Gemini model not initialized');
      }
      const prompt = this.buildImproveContentPrompt(request);
      
      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const content = await response.text();
      
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
      this.logger.error('Gemini content improvement error:', error.message || error);
      return {
        content: request.currentContent,
        confidence: 0,
        suggestions: ['İçerik iyileştirme servisi geçici olarak kullanılamıyor'],
      };
    }
  }

  async generateTemplate(request: GenerateTemplateRequest): Promise<any> {
    try {
      if (!this.model) {
        throw new Error('Gemini model not initialized');
      }
      const prompt = this.buildTemplatePrompt(request);
      
      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const text = await response.text();
      
      try {
        const cleanedText = text.replace(/```json\n?|\n?```/g, '').trim();
        return JSON.parse(cleanedText);
      } catch (parseError) {
        this.logger.warn('Failed to parse Gemini template response as JSON');
        return this.getDefaultTemplate(request);
      }
    } catch (error: any) {
      this.logger.error('Gemini template generation error:', error.message || error);
      return this.getDefaultTemplate(request);
    }
  }

  async checkAvailability(): Promise<boolean> {
    try {
      if (!this.model) {
        this.logger.warn('Gemini model not initialized - API key missing');
        return false;
      }
      const result = await this.model.generateContent('Test');
      const response = result.response;
      const text = await response.text();
      return !!text;
    } catch (error: any) {
      this.logger.error('Gemini availability check failed:', error.message || error);
      return false;
    }
  }

  private buildContentPrompt(request: GenerateContentRequest): string {
    return `
      Sen bir satın alma uzmanısın. RFx dokümanları için profesyonel ve detaylı içerik üretiyorsun.
      
      Bir ${request.rfxType} dokümanı için "${request.fieldLabel}" alanına uygun içerik oluştur.
      Kategori: ${request.category}
      ${request.fieldDescription ? `Alan Açıklaması: ${request.fieldDescription}` : ''}
      ${request.companyContext ? `Şirket Bağlamı: ${request.companyContext}` : ''}
      
      Lütfen profesyonel, detaylı ve Türkçe bir içerik oluştur. Sadece içeriği döndür, başka açıklama ekleme.
    `;
  }

  private buildFieldSuggestionsPrompt(request: SuggestFieldsRequest): string {
    return `
      Sen bir satın alma uzmanısın. RFx dokümanları için en uygun alanları öneriyorsun.
      
      "${request.sectionTitle}" bölümü için ek alan önerileri oluştur.
      RFx Türü: ${request.rfxType}
      Kategori: ${request.category}
      Mevcut Alanlar: ${request.existingFields.join(', ')}
      
      Sadece JSON formatında yanıt ver, başka açıklama ekleme. Format:
      {
        "suggestions": [
          {
            "label": "Alan Adı",
            "description": "Alan açıklaması",
            "isRequired": true,
            "reasoning": "Bu alanın neden önerildiği"
          }
        ]
      }
      
      3-5 öneri ver. Türkçe kullan.
    `;
  }

  private buildImproveContentPrompt(request: ImproveContentRequest): string {
    return `
      Sen bir satın alma ve yazım uzmanısın. Verilen içeriği daha profesyonel ve etkili hale getiriyorsun.
      
      Aşağıdaki içeriği "${request.fieldLabel}" alanı için iyileştir:
      
      Mevcut İçerik:
      ${request.currentContent}
      
      RFx Türü: ${request.rfxType}
      ${request.improvements ? `İyileştirme Önerileri: ${request.improvements.join(', ')}` : ''}
      
      Daha profesyonel, açık ve kapsamlı bir versiyon oluştur. Türkçe kullan. Sadece iyileştirilmiş içeriği döndür.
    `;
  }

  private buildTemplatePrompt(request: GenerateTemplateRequest): string {
    return `
      Sen bir satın alma uzmanısın. Kapsamlı RFx şablonları oluşturuyorsun.
      
      Bir ${request.rfxType} şablonu oluştur.
      Kategori: ${request.category}
      Açıklama: ${request.description}
      ${request.specificRequirements ? `Özel Gereksinimler: ${request.specificRequirements.join(', ')}` : ''}
      
      Sadece JSON formatında yanıt ver. Şablon şu yapıda olmalı:
      {
        "name": "Şablon Adı",
        "description": "Şablon Açıklaması",
        "sections": [
          {
            "title": "Bölüm Başlığı",
            "fields": [
              {
                "label": "Alan Adı",
                "description": "Alan açıklaması",
                "isRequired": true/false,
                "defaultValue": "Varsayılan değer (opsiyonel)"
              }
            ]
          }
        ]
      }
      
      En az 5 bölüm içersin. Türkçe kullan.
    `;
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

  private getDefaultTemplate(request: GenerateTemplateRequest): any {
    return {
      name: `${request.rfxType} Şablonu - ${request.category}`,
      description: request.description,
      sections: [
        {
          title: 'Temel Bilgiler',
          fields: [
            { label: 'Doküman Başlığı', isRequired: true },
            { label: 'RFX Türü', isRequired: true },
            { label: 'Doküman Numarası', isRequired: true },
          ],
        },
        {
          title: 'Giriş ve Proje Özeti',
          fields: [
            { label: 'Şirket Bilgileri', isRequired: true },
            { label: 'Proje Genel Amacı', isRequired: true },
            { label: 'Proje Bağlamı ve Hedefler', isRequired: true },
          ],
        },
        {
          title: 'Teknik Gereksinimler',
          fields: [
            { label: 'Teknik Özellikler', isRequired: true },
            { label: 'Fonksiyonel Gereksinimler', isRequired: true },
            { label: 'Performans Kriterleri', isRequired: true },
          ],
        },
        {
          title: 'Ticari Şartlar',
          fields: [
            { label: 'Fiyatlandırma', isRequired: true },
            { label: 'Ödeme Koşulları', isRequired: true },
            { label: 'Garanti Şartları', isRequired: false },
          ],
        },
        {
          title: 'Değerlendirme Kriterleri',
          fields: [
            { label: 'Fiyat/Maliyet', isRequired: true },
            { label: 'Teknik Yeterlilik', isRequired: true },
            { label: 'Deneyim ve Referanslar', isRequired: true },
          ],
        },
      ],
    };
  }
}