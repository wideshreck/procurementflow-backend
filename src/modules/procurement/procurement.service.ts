import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProcurementRequestDto } from './dto/create-procurement-request.dto';
import type { User } from '@prisma/client';

@Injectable()
export class ProcurementService {
  constructor(private prisma: PrismaService) {}

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
      status,
      audit_trail,
    } = createProcurementRequestDto;

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
        // userId: user.id, // User relation will be added later
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
}
