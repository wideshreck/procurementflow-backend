import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProcurementRequestDto } from './dto/create-procurement-request.dto';

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

  async create(createProcurementRequestDto: CreateProcurementRequestDto) {
    const {
      item_title,
      category,
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

    const categoryRecord = await this.prisma.category.findUnique({
      where: { CategoryID: category },
    });

    if (!categoryRecord) {
      throw new Error(`Category with ID "${category}" not found.`);
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
            dueDate: new Date(delivery_details.due_date),
            urgency: delivery_details.urgency,
            additionalNotes: delivery_details.additional_notes,
          },
        },
      },
    });
  }
}
