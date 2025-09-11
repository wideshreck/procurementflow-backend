import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { AIProviderFactory } from './providers/ai-provider.factory';
import { AIProvider } from './providers/ai-provider.interface';

export type {
  AIFieldSuggestion,
  AIContentGeneration,
  GenerateContentRequest,
  SuggestFieldsRequest,
  ImproveContentRequest,
  GenerateTemplateRequest,
} from './providers/ai-provider.interface';

@Injectable()
export class RFxAIService implements OnModuleInit {
  private readonly logger = new Logger(RFxAIService.name);
  private aiProvider: AIProvider;

  constructor(private readonly providerFactory: AIProviderFactory) {}

  async onModuleInit() {
    try {
      this.aiProvider = this.providerFactory.getProvider();
      const providerName = this.providerFactory.getCurrentProviderName();
      this.logger.log(`RFxAIService initialized with ${providerName} provider`);
      
      const isAvailable = await this.checkAvailability();
      if (isAvailable) {
        this.logger.log(`${providerName} provider is available and ready`);
      } else {
        this.logger.warn(`${providerName} provider availability check failed - service will return fallback content`);
      }
    } catch (error) {
      this.logger.error('Failed to initialize RFxAIService:', error);
      // Service will still work with fallback content
    }
  }

  async generateFieldContent(
    fieldLabel: string,
    fieldDescription: string,
    context: {
      rfxType: 'RFQ' | 'RFP' | 'RFI';
      category: string;
      companyContext?: string;
    }
  ) {
    try {
      if (!this.aiProvider) {
        return this.getFallbackContent(fieldLabel, context.rfxType);
      }
      return await this.aiProvider.generateContent({
        fieldLabel,
        fieldDescription,
        rfxType: context.rfxType,
        category: context.category,
        companyContext: context.companyContext,
      });
    } catch (error) {
      this.logger.error('Failed to generate field content:', error);
      return this.getFallbackContent(fieldLabel, context.rfxType);
    }
  }

  async suggestFields(
    sectionTitle: string,
    existingFields: string[],
    context: {
      rfxType: 'RFQ' | 'RFP' | 'RFI';
      category: string;
      industry?: string;
    }
  ) {
    try {
      if (!this.aiProvider) {
        return this.getDefaultFieldSuggestions(sectionTitle);
      }
      return await this.aiProvider.suggestFields({
        sectionTitle,
        existingFields,
        rfxType: context.rfxType,
        category: context.category,
        industry: context.industry,
      });
    } catch (error) {
      this.logger.error('Failed to suggest fields:', error);
      return this.getDefaultFieldSuggestions(sectionTitle);
    }
  }

  async improveContent(
    currentContent: string,
    fieldLabel: string,
    context: {
      rfxType: 'RFQ' | 'RFP' | 'RFI';
      improvements?: string[];
    }
  ) {
    try {
      if (!this.aiProvider) {
        return {
          content: currentContent,
          confidence: 0,
          suggestions: ['İçerik iyileştirme servisi geçici olarak kullanılamıyor'],
        };
      }
      return await this.aiProvider.improveContent({
        currentContent,
        fieldLabel,
        rfxType: context.rfxType,
        improvements: context.improvements,
      });
    } catch (error) {
      this.logger.error('Failed to improve content:', error);
      return {
        content: currentContent,
        confidence: 0,
        suggestions: ['İçerik iyileştirme servisi geçici olarak kullanılamıyor'],
      };
    }
  }

  async generateTemplate(requirements: {
    rfxType: 'RFQ' | 'RFP' | 'RFI';
    category: string;
    description: string;
    specificRequirements?: string[];
  }) {
    try {
      if (!this.aiProvider) {
        return this.getDefaultTemplate(requirements);
      }
      return await this.aiProvider.generateTemplate(requirements);
    } catch (error) {
      this.logger.error('Failed to generate template:', error);
      return this.getDefaultTemplate(requirements);
    }
  }

  async checkAvailability(): Promise<boolean> {
    try {
      if (!this.aiProvider) {
        return false;
      }
      return await this.aiProvider.checkAvailability();
    } catch (error) {
      this.logger.error('AI provider availability check failed:', error);
      return false;
    }
  }

  getCurrentProviderName(): string {
    return this.providerFactory.getCurrentProviderName();
  }

  private getFallbackContent(fieldLabel: string, rfxType: string) {
    const templates: Record<string, string> = {
      'Şirket Bilgileri': `[Şirket adınızı], [sektör] sektöründe faaliyet gösteren, [çalışan sayısı] çalışanı ile hizmet veren bir kuruluştur. Bu ${rfxType} talebi ile [proje amacı] hedeflenmektedir.`,
      'Proje Bağlamı ve Hedefler': `Bu ${rfxType} talebinin amacı [iş ihtiyacı] ihtiyacını karşılamaktır. Proje sonucunda [beklenen çıktılar] elde edilmesi beklenmektedir.`,
      'Teknik Özellikler': `Talep edilen ürün/hizmet aşağıdaki özellikleri sağlamalıdır:\n- [Teknik özellik 1]\n- [Teknik özellik 2]\n- [Performans kriteri]`,
      'Fiyatlandırma': `Teklif fiyatınız aşağıdaki kalemleri içermelidir:\n- Birim fiyat\n- Toplam maliyet\n- Ek hizmet ücretleri (varsa)`,
      'Teslimat Süresi': `Ürün/hizmet teslimat süresi [X] gün/hafta/ay olarak planlanmaktadır. Teslimat lokasyonu: [Adres]`,
    };
    
    return {
      content: templates[fieldLabel] || `[${fieldLabel} için içerik giriniz]`,
      confidence: 0.5,
      suggestions: ['AI servisi geçici olarak kullanılamıyor. Manuel içerik giriniz.'],
    };
  }

  private getDefaultFieldSuggestions(sectionTitle: string) {
    return [
      {
        label: 'Ek Gereksinimler',
        description: 'Bu bölüm için özel gereksinimler',
        isRequired: false,
        reasoning: 'Kapsamlı bilgi toplama için',
      },
    ];
  }

  private getDefaultTemplate(requirements: any) {
    return {
      name: `Varsayılan ${requirements.rfxType} Şablonu`,
      description: `${requirements.rfxType} için varsayılan şablon - ${requirements.category}`,
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
          title: 'Proje Özeti',
          fields: [
            { label: 'Proje Tanımı', isRequired: true },
            { label: 'Hedef ve Amaç', isRequired: true },
            { label: 'Beklenen Çıktılar', isRequired: false },
          ],
        },
        {
          title: 'Teknik Gereksinimler',
          fields: [
            { label: 'Teknik Özellikler', isRequired: true },
            { label: 'Performans Kriterleri', isRequired: false },
            { label: 'Kalite Standartları', isRequired: false },
          ],
        },
        {
          title: 'Ticari Şartlar',
          fields: [
            { label: 'Fiyatlandırma', isRequired: true },
            { label: 'Ödeme Koşulları', isRequired: true },
            { label: 'Teslimat Koşulları', isRequired: true },
          ],
        },
      ],
    };
  }
}