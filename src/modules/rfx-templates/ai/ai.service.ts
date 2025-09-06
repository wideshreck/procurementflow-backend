import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';

@Injectable()
export class AIService {
  private gemini: GoogleGenerativeAI;
  private openai: OpenAI | null = null;
  private provider: 'gemini' | 'openai';

  constructor(private configService: ConfigService) {
    this.provider = (this.configService.get<string>('AI_PROVIDER') || 'gemini') as 'gemini' | 'openai';

    if (this.provider === 'gemini') {
      const apiKey = this.configService.get<string>('GEMINI_API_KEY');
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not configured');
      }
      this.gemini = new GoogleGenerativeAI(apiKey);
    } else {
      const apiKey = this.configService.get<string>('OPENAI_API_KEY');
      if (!apiKey) {
        throw new Error('OPENAI_API_KEY is not configured');
      }
      this.openai = new OpenAI({ apiKey });
    }
  }

  async generateRFxTemplate(type: 'RFQ' | 'RFP' | 'RFI', context: any) {
    const prompt = this.buildRFxTemplatePrompt(type, context);

    if (this.provider === 'gemini') {
      return this.generateWithGemini(prompt);
    } else {
      return this.generateWithOpenAI(prompt);
    }
  }

  private buildRFxTemplatePrompt(type: 'RFQ' | 'RFP' | 'RFI', context: any): string {
    const typeDescriptions = {
      RFQ: 'Request for Quotation - focusing on price comparison for well-defined products/services',
      RFP: 'Request for Proposal - comprehensive evaluation including technical solution, methodology, and price',
      RFI: 'Request for Information - gathering information about capabilities and solutions',
    };

    return `
Generate a professional ${typeDescriptions[type]} template for the following context:

Company: ${context.company?.name || 'Company'}
Company Description: ${context.company?.description || 'N/A'}

${context.procurementRequest ? `
Procurement Request Details:
- Item: ${context.procurementRequest.itemTitle}
- Quantity: ${context.procurementRequest.quantity} ${context.procurementRequest.uom}
- Description: ${context.procurementRequest.simpleDefinition}
- Justification: ${context.procurementRequest.justification}
- Category: ${context.procurementRequest.category?.name || 'N/A'}
- Technical Specifications: ${JSON.stringify(context.procurementRequest.technicalSpecifications)}
- Delivery Requirements: ${JSON.stringify(context.procurementRequest.deliveryDetails)}
` : ''}

${context.category ? `
Category: ${context.category.name}
Category Description: ${context.category.description || 'N/A'}
` : ''}

Additional Requirements: ${context.requirements || 'None specified'}

Please generate a comprehensive RFx template with the following sections in JSON format:

{
  "name": "Template name",
  "description": "Brief description",
  "introductionSection": {
    "title": "Introduction",
    "content": "Company introduction and project overview",
    "bulletPoints": ["key point 1", "key point 2"]
  },
  "scopeSection": {
    "title": "Scope of Work",
    "content": "Detailed requirements and deliverables",
    "bulletPoints": ["requirement 1", "requirement 2"],
    "metadata": {
      "estimatedDuration": "timeframe",
      "location": "delivery location"
    }
  },
  "qualityStandards": [
    {
      "name": "Standard name",
      "description": "Standard description",
      "certificationRequired": "certification if any",
      "isMandatory": true/false
    }
  ],
  "paymentTerms": [
    {
      "name": "Payment term",
      "description": "Payment description",
      "percentage": 30,
      "milestone": "Upon delivery"
    }
  ],
  "evaluationCriteria": [
    {
      "criteria": "Technical Capability",
      "description": "Evaluation of technical skills",
      "weight": 40,
      "scoringMethod": "1-10 scale"
    },
    {
      "criteria": "Price",
      "description": "Cost competitiveness",
      "weight": 30,
      "scoringMethod": "Lowest price gets highest score"
    },
    {
      "criteria": "Delivery Time",
      "description": "Speed of delivery",
      "weight": 20,
      "scoringMethod": "Days to delivery"
    },
    {
      "criteria": "Quality & Compliance",
      "description": "Quality standards and compliance",
      "weight": 10,
      "scoringMethod": "Pass/Fail based on certifications"
    }
  ],
  "termsAndConditions": {
    "title": "Terms and Conditions",
    "content": "Legal terms and conditions",
    "bulletPoints": ["Confidentiality", "Liability", "Warranty"]
  },
  "submissionGuidelines": {
    "title": "Submission Guidelines",
    "content": "How to submit your response",
    "bulletPoints": ["Format requirements", "Deadline", "Contact information"]
  },
  "additionalSections": [
    {
      "title": "Additional Requirements",
      "content": "Any other specific requirements"
    }
  ],
  "tags": ["tag1", "tag2", "tag3"]
}

Ensure the template is:
1. Professional and comprehensive
2. Tailored to the ${type} format
3. Includes all necessary legal and commercial terms
4. Clear evaluation criteria with proper weightage (totaling 100%)
5. Specific to the context provided
6. In Turkish business context where applicable

Generate the template now:`;
  }

  private async generateWithGemini(prompt: string) {
    try {
      const model = this.gemini.getGenerativeModel({ model: 'gemini-2.5-pro' });
      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();
      
      // Extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      throw new Error('Could not parse AI response');
    } catch (error) {
      console.error('Gemini generation error:', error);
      return this.getDefaultTemplate();
    }
  }

  private async generateWithOpenAI(prompt: string) {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }

    try {
      const completion = await this.openai.chat.completions.create({
        model: this.configService.get<string>('OPENAI_MODEL') || 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert procurement specialist generating professional RFx templates. Always respond with valid JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      });

      const content = completion.choices[0]?.message?.content;
      if (content) {
        return JSON.parse(content);
      }
      
      throw new Error('No content in OpenAI response');
    } catch (error) {
      console.error('OpenAI generation error:', error);
      return this.getDefaultTemplate();
    }
  }

  private getDefaultTemplate() {
    return {
      name: 'Standart RFx Şablonu',
      description: 'Otomatik oluşturulan standart şablon',
      introductionSection: {
        title: 'Giriş',
        content: 'Firmamız, tedarik süreçlerini optimize etmek ve en uygun çözümleri bulmak amacıyla bu teklif talebini oluşturmuştur.',
        bulletPoints: [
          'Şeffaf ve adil değerlendirme süreci',
          'Rekabetçi fiyatlandırma beklentisi',
          'Kaliteli hizmet ve ürün temini',
        ],
      },
      scopeSection: {
        title: 'Kapsam',
        content: 'Bu teklif talebi, belirtilen ürün ve hizmetlerin temini için gerekli tüm detayları içermektedir.',
        bulletPoints: [
          'Ürün/hizmet spesifikasyonları',
          'Teslimat gereksinimleri',
          'Kalite standartları',
        ],
      },
      qualityStandards: [
        {
          name: 'ISO 9001',
          description: 'Kalite yönetim sistemi sertifikası',
          certificationRequired: 'ISO 9001:2015',
          isMandatory: false,
        },
        {
          name: 'Ürün Kalitesi',
          description: 'Ürünler belirtilen spesifikasyonlara uygun olmalıdır',
          isMandatory: true,
        },
      ],
      paymentTerms: [
        {
          name: 'Avans Ödemesi',
          description: 'Sipariş onayı sonrası',
          percentage: 30,
          milestone: 'Sipariş onayı',
        },
        {
          name: 'Teslimat Ödemesi',
          description: 'Ürün teslimi sonrası',
          percentage: 70,
          milestone: 'Teslimat sonrası',
        },
      ],
      evaluationCriteria: [
        {
          criteria: 'Fiyat',
          description: 'Toplam maliyet değerlendirmesi',
          weight: 40,
          scoringMethod: 'En düşük fiyat en yüksek puan',
        },
        {
          criteria: 'Kalite',
          description: 'Ürün/hizmet kalitesi',
          weight: 30,
          scoringMethod: '1-10 puan skalası',
        },
        {
          criteria: 'Teslimat Süresi',
          description: 'Teslimat hızı ve güvenilirliği',
          weight: 20,
          scoringMethod: 'Gün bazında değerlendirme',
        },
        {
          criteria: 'Referanslar',
          description: 'Geçmiş proje deneyimleri',
          weight: 10,
          scoringMethod: 'Referans sayısı ve kalitesi',
        },
      ],
      termsAndConditions: {
        title: 'Şartlar ve Koşullar',
        content: 'Bu teklif talebi için geçerli şartlar ve koşullar aşağıda belirtilmiştir.',
        bulletPoints: [
          'Gizlilik sözleşmesi gereklidir',
          'Teklif geçerlilik süresi minimum 30 gün',
          'Türk Ticaret Kanunu hükümleri geçerlidir',
        ],
      },
      submissionGuidelines: {
        title: 'Teklif Sunma Kılavuzu',
        content: 'Tekliflerinizi belirtilen formatta ve süre içinde sunmanız gerekmektedir.',
        bulletPoints: [
          'PDF formatında teklif dosyası',
          'Detaylı fiyat listesi',
          'Şirket yeterlilik belgeleri',
          'Son teslim tarihi ve saatine dikkat',
        ],
      },
      additionalSections: [],
      tags: ['standart', 'rfx', 'teklif'],
    };
  }

  // Additional AI methods for other features

  async analyzeProcurementRequest(request: any): Promise<any> {
    const prompt = `
Analyze the following procurement request and provide insights:

Item: ${request.itemTitle}
Quantity: ${request.quantity} ${request.uom}
Description: ${request.simpleDefinition}
Justification: ${request.justification}
Technical Specs: ${JSON.stringify(request.technicalSpecs)}

Please provide:
1. Risk assessment
2. Suggested suppliers categories
3. Budget estimation
4. Timeline recommendation
5. Key evaluation criteria

Format the response as JSON.
`;

    if (this.provider === 'gemini') {
      return this.generateWithGemini(prompt);
    } else {
      return this.generateWithOpenAI(prompt);
    }
  }

  async evaluateBid(bid: any, criteria: any): Promise<any> {
    const prompt = `
Evaluate the following supplier bid against the given criteria:

Bid Details:
${JSON.stringify(bid)}

Evaluation Criteria:
${JSON.stringify(criteria)}

Provide a detailed evaluation with scores and recommendations in JSON format.
`;

    if (this.provider === 'gemini') {
      return this.generateWithGemini(prompt);
    } else {
      return this.generateWithOpenAI(prompt);
    }
  }
}