import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProcurementRequestDto } from './dto/create-procurement-request.dto';
import type { User } from '@prisma/client';
import { GeminiService } from './common/gemini/gemini.service';

@Injectable()
export class ProcurementService {
  constructor(
    private prisma: PrismaService,
    private geminiService: GeminiService,
  ) {}

  async findAll() {
    return this.prisma.procurementRequest.findMany({
      include: {
        category: true,
        deliveryDetails: true,
        technicalSpecifications: true,
      },
    });
  }

  private parseDateFromDDMMYYYY(dateStr: string): Date {
    // Handle empty or invalid date
    if (!dateStr || dateStr === '') {
      // Return current date + 30 days as default
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      return futureDate;
    }
    
    // Handle DD-MM-YYYY format
    if (dateStr.match(/^\d{2}-\d{2}-\d{4}$/)) {
      const [day, month, year] = dateStr.split('-');
      const parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      
      // Check if the date is valid
      if (isNaN(parsedDate.getTime())) {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 30);
        return futureDate;
      }
      
      return parsedDate;
    }
    
    // Try standard Date parsing
    const standardDate = new Date(dateStr);
    if (isNaN(standardDate.getTime())) {
      // If still invalid, return default future date
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      return futureDate;
    }
    
    return standardDate;
  }

  async create(createProcurementRequestDto: CreateProcurementRequestDto, user: User) {
    const {
      item_title,
      category_id,
      quantity,
      uom,
      simple_definition,
      procurement_type,
      justification,
      currency,
      unitPrice,
      totalPrice,
      technical_specifications,
      delivery_details,
    } = createProcurementRequestDto;

    // Set default status and create audit trail automatically
    const status = 'DRAFT';
    const now = new Date().toISOString();
    const audit_trail = {
      created_by: user.id,
      created_at: now,
      last_modified_by: user.id,
      last_modified_at: now,
      phase_completion_times: {
        phase1_completed_at: now,
        phase2_completed_at: now,
        phase3_completed_at: now,
        phase4_completed_at: now,
      },
      requester_info: {
        user_id: user.id,
        user_name: user.name || 'Unknown User',
        user_email: user.email,
        department: user.department || 'General',
      }
    };

    // Check if category exists, if not create a default one or skip the validation
    let categoryRecord: any = null;
    
    // Skip category lookup if category_id is not provided
    if (category_id) {
      categoryRecord = await this.prisma.category.findUnique({
        where: { CategoryID: category_id },
      });
    }

    if (!categoryRecord && category_id) {
      // Try to find by name as fallback
      categoryRecord = await this.prisma.category.findFirst({
        where: { name: category_id },
      });
    }
    
    // If still no category found, create or use a default one
    if (!categoryRecord) {
      const categoryIdToUse = category_id || 'DEFAULT-CAT';
      console.warn(`Category "${categoryIdToUse}" not found, creating/using default category`);
      
      // Find or create a default company first
      let defaultCompany = await this.prisma.company.findFirst();
      if (!defaultCompany) {
        defaultCompany = await this.prisma.company.create({
          data: {
            name: 'Default Company',
            description: 'Default company for procurement requests',
          },
        });
      }
      
      // Try to find existing default category
      categoryRecord = await this.prisma.category.findUnique({
        where: { CategoryID: categoryIdToUse },
      });
      
      if (!categoryRecord) {
        categoryRecord = await this.prisma.category.create({
          data: {
            CategoryID: categoryIdToUse,
            categoryCode: `CODE_${categoryIdToUse}`,
            name: categoryIdToUse,
            level: 1,
            icon: 'Package',
            companyId: defaultCompany.id,
          },
        });
      }
    }

    return this.prisma.procurementRequest.create({
      data: {
        itemTitle: item_title,
        categoryId: categoryRecord.CategoryID,
        quantity,
        uom,
        simpleDefinition: simple_definition,
        procurementType: procurement_type,
        justification,
        currency,
        unitPrice,
        totalPrice,
        status,
        userId: user.id,
        auditTrail: audit_trail as any,
        technicalSpecifications: {
          create: technical_specifications.map(spec => ({
            specKey: spec.spec_key,
            specValue: spec.spec_value,
            requirementLevel: spec.requirement_level,
            notes: spec.notes,
          })),
        },
        deliveryDetails: {
          create: {
            deliveryLocation: delivery_details.delivery_location,
            dueDate: this.parseDateFromDDMMYYYY(delivery_details.due_date),
            urgency: delivery_details.urgency,
            additionalNotes: delivery_details.additional_notes,
          },
        },
      },
    });
  }

  async estimatePrice(data: {
    technical_specifications: any[];
    item_title: string;
    quantity: number;
    currency: string;
  }): Promise<{ estimatedPrice: number; currency: string }> {
    // Create a prompt for price estimation
    const specsText = data.technical_specifications
      .map(spec => `${spec.spec_key}: ${spec.spec_value}`)
      .join(', ');
    
    const prompt = `
You are an expert procurement pricing AI. Based on the following technical specifications, estimate the unit price and determine the most appropriate currency for this item.

Item: ${data.item_title}
Quantity: ${data.quantity}
Technical Specifications: ${specsText}

Consider:
1. Current market prices and typical procurement costs for enterprise purchases
2. The origin/brand of the product (if international brands like Apple, Dell, HP suggest USD/EUR)
3. Local products or services should use TRY
4. High-tech equipment is often priced in USD or EUR

Respond with a JSON object containing:
- price: numeric value only (no currency symbols)
- currency: one of TRY, USD, or EUR

Example responses:
{"price": 35000, "currency": "TRY"}
{"price": 1500, "currency": "USD"}
{"price": 2000, "currency": "EUR"}

Response:`;

    try {
      const response = await this.geminiService.generateResponse({
        systemPrompt: prompt,
        history: [],
        message: 'Estimate the price',
      });
      
      // Parse the AI response
      let parsedResponse: { price?: number; currency?: string } = {};
      let estimatedPrice = 0;
      let estimatedCurrency = data.currency; // Default to requested currency
      
      try {
        // Try to parse as JSON first
        const responseText = typeof response === 'string' ? response : JSON.stringify(response);
        
        // Extract JSON from response (AI might include extra text)
        const jsonMatch = responseText.match(/\{[^}]*\}/);
        if (jsonMatch) {
          parsedResponse = JSON.parse(jsonMatch[0]);
          estimatedPrice = parsedResponse.price || 0;
          estimatedCurrency = parsedResponse.currency || data.currency;
        } else {
          // Fallback: extract number from response
          const priceMatch = responseText.match(/\d+\.?\d*/);
          estimatedPrice = priceMatch ? parseFloat(priceMatch[0]) : 0;
        }
      } catch (e) {
        // Fallback: extract number from response
        const responseText = typeof response === 'string' ? response : JSON.stringify(response);
        const priceMatch = responseText.match(/\d+\.?\d*/);
        estimatedPrice = priceMatch ? parseFloat(priceMatch[0]) : 0;
      }
      
      // Validate currency
      const validCurrencies = ['TRY', 'USD', 'EUR'];
      if (!validCurrencies.includes(estimatedCurrency)) {
        estimatedCurrency = 'TRY'; // Default to TRY if invalid
      }
      
      // Apply reasonable bounds based on currency
      let minPrice = 100;
      let maxPrice = 1000000;
      
      if (estimatedCurrency === 'TRY') {
        minPrice = 1000;
        maxPrice = 5000000;
      } else if (estimatedCurrency === 'USD' || estimatedCurrency === 'EUR') {
        minPrice = 50;
        maxPrice = 100000;
      }
      
      // Ensure the price is within reasonable bounds
      const finalPrice = Math.max(minPrice, Math.min(maxPrice, estimatedPrice || minPrice));
      
      return { 
        estimatedPrice: finalPrice,
        currency: estimatedCurrency
      };
    } catch (error) {
      console.error('Error estimating price:', error);
      // Return a default price based on currency
      const defaultPrices = {
        TRY: 25000,
        USD: 1000,
        EUR: 900,
      };
      return { 
        estimatedPrice: defaultPrices[data.currency] || 1000,
        currency: data.currency || 'TRY'
      };
    }
  }
}
