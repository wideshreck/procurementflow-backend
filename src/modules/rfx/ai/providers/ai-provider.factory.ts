import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Env } from '../../../../config/environment';
import { AIProvider } from './ai-provider.interface';
import { OpenAIProvider } from './openai.provider';
import { GeminiProvider } from './gemini.provider';

@Injectable()
export class AIProviderFactory {
  private readonly logger = new Logger(AIProviderFactory.name);
  private provider: AIProvider;

  constructor(private configService: ConfigService<Env>) {
    this.initializeProvider();
  }

  private initializeProvider(): void {
    const providerType = this.configService.get('AI_PROVIDER') || 'gemini';
    
    this.logger.log(`Initializing AI provider: ${providerType}`);

    try {
      switch (providerType) {
        case 'openai':
          this.provider = new OpenAIProvider(this.configService);
          break;
        case 'gemini':
          this.provider = new GeminiProvider(this.configService);
          break;
        default:
          this.logger.warn(`Unknown AI provider: ${providerType}, defaulting to Gemini`);
          this.provider = new GeminiProvider(this.configService);
      }

      this.logger.log(`AI provider initialized: ${providerType}`);
    } catch (error) {
      this.logger.error(`Failed to initialize AI provider ${providerType}:`, error);
      // Fallback to a null provider that returns fallback content
      this.provider = this.createFallbackProvider();
    }
  }

  getProvider(): AIProvider {
    return this.provider;
  }

  getCurrentProviderName(): string {
    return this.configService.get('AI_PROVIDER') || 'gemini';
  }

  private createFallbackProvider(): AIProvider {
    return {
      async generateContent(request) {
        return {
          content: this.getFallbackContent(request.fieldLabel, request.rfxType),
          confidence: 0.5,
          suggestions: ['AI servisi geçici olarak kullanılamıyor. Manuel içerik giriniz.'],
        };
      },
      async suggestFields(request) {
        return this.getDefaultFieldSuggestions(request.sectionTitle);
      },
      async improveContent(request) {
        return {
          content: request.currentContent,
          confidence: 0,
          suggestions: ['İçerik iyileştirme servisi geçici olarak kullanılamıyor'],
        };
      },
      async generateTemplate(request) {
        return this.getDefaultTemplate(request);
      },
      async checkAvailability() {
        return false;
      },
    };
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

  private getDefaultTemplate(request: any) {
    return {
      name: `Varsayılan ${request.rfxType} Şablonu`,
      description: `${request.rfxType} için varsayılan şablon`,
      sections: [
        {
          title: 'Temel Bilgiler',
          fields: [
            { label: 'Doküman Başlığı', isRequired: true },
            { label: 'RFX Türü', isRequired: true },
            { label: 'Doküman Numarası', isRequired: true },
          ],
        },
      ],
    };
  }
}