import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRFxTemplateDto } from './dto/create-rfx-template.dto';
import { UpdateRFxTemplateDto } from './dto/update-rfx-template.dto';
import { CreateRFxDocumentDto } from './dto/create-rfx-document.dto';
import { RFxType, RFxStatus, Prisma } from '@prisma/client';
import { AIService } from '../ai/ai.service';

@Injectable()
export class RFxTemplatesService {
  constructor(
    private prisma: PrismaService,
    private aiService: AIService,
  ) {}

  // ==================== RFx Templates ====================

  async createTemplate(
    companyId: string,
    userId: string,
    createDto: CreateRFxTemplateDto,
  ) {
    // Check if template with same name exists
    const existingTemplate = await this.prisma.rFxTemplate.findFirst({
      where: {
        companyId,
        name: createDto.name,
        isActive: true,
      },
    });

    if (existingTemplate) {
      throw new BadRequestException(`Template with name "${createDto.name}" already exists`);
    }

    // If marking as default, unset other defaults
    if (createDto.isDefault) {
      await this.prisma.rFxTemplate.updateMany({
        where: {
          companyId,
          type: createDto.type,
          isDefault: true,
        },
        data: { isDefault: false },
      });
    }

    return this.prisma.rFxTemplate.create({
      data: {
        companyId,
        name: createDto.name,
        description: createDto.description,
        type: createDto.type,
        isDefault: createDto.isDefault || false,
        isActive: createDto.isActive ?? true,
        introductionSection: createDto.introductionSection as any || null,
        scopeSection: createDto.scopeSection as any || null,
        qualityStandards: createDto.qualityStandards as any || null,
        paymentTerms: createDto.paymentTerms as any || null,
        evaluationCriteria: createDto.evaluationCriteria as any || null,
        termsAndConditions: createDto.termsAndConditions as any || null,
        submissionGuidelines: createDto.submissionGuidelines as any || null,
        additionalSections: createDto.additionalSections as any || [],
        tags: createDto.tags || [],
        createdById: userId,
        lastModifiedById: userId,
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async findAllTemplates(
    companyId: string,
    filters?: {
      type?: RFxType;
      isActive?: boolean;
      search?: string;
    },
  ) {
    const where: Prisma.RFxTemplateWhereInput = {
      companyId,
      ...(filters?.type && { type: filters.type }),
      ...(filters?.isActive !== undefined && { isActive: filters.isActive }),
      ...(filters?.search && {
        OR: [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
          { tags: { has: filters.search } },
        ],
      }),
    };

    return this.prisma.rFxTemplate.findMany({
      where,
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' },
      ],
      include: {
        _count: {
          select: {
            rfxDocuments: true,
          },
        },
      },
    });
  }

  async findTemplateById(id: string, companyId: string) {
    const template = await this.prisma.rFxTemplate.findFirst({
      where: {
        id,
        companyId,
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            rfxDocuments: true,
          },
        },
      },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    return template;
  }

  async updateTemplate(
    id: string,
    companyId: string,
    userId: string,
    updateDto: UpdateRFxTemplateDto,
  ) {
    const template = await this.findTemplateById(id, companyId);

    // If marking as default, unset other defaults
    if (updateDto.isDefault) {
      await this.prisma.rFxTemplate.updateMany({
        where: {
          companyId,
          type: template.type,
          isDefault: true,
          id: { not: id },
        },
        data: { isDefault: false },
      });
    }

    // If version is being updated, create a new version
    if (updateDto.version && updateDto.version > template.version) {
      // Archive current version
      await this.prisma.rFxTemplate.update({
        where: { id },
        data: { isActive: false },
      });

      // Create new version
      const { company, _count, ...templateData } = template;
      return this.prisma.rFxTemplate.create({
        data: {
          ...templateData,
          ...updateDto,
          id: undefined,
          version: updateDto.version,
          createdById: userId,
          lastModifiedById: userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any,
      });
    }

    return this.prisma.rFxTemplate.update({
      where: { id },
      data: {
        ...updateDto,
        lastModifiedById: userId,
      } as any,
    });
  }

  async deleteTemplate(id: string, companyId: string) {
    const template = await this.findTemplateById(id, companyId);

    // Check if template is used in any documents
    const documentsCount = await this.prisma.rFxDocument.count({
      where: { templateId: id },
    });

    if (documentsCount > 0) {
      // Soft delete - just mark as inactive
      return this.prisma.rFxTemplate.update({
        where: { id },
        data: { isActive: false },
      });
    }

    // Hard delete if not used
    return this.prisma.rFxTemplate.delete({
      where: { id },
    });
  }

  // ==================== AI Template Generation ====================

  async generateTemplate(
    companyId: string,
    userId: string,
    data: {
      type: RFxType;
      procurementRequestId?: string;
      categoryId?: string;
      requirements?: string;
    },
  ) {
    let context = {
      company: null as any,
      procurementRequest: null as any,
      category: null as any,
      requirements: data.requirements || '',
    };

    // Get company info
    context.company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: {
        name: true,
        description: true,
      },
    });

    // Get procurement request if provided
    if (data.procurementRequestId) {
      context.procurementRequest = await this.prisma.procurementRequest.findUnique({
        where: { id: data.procurementRequestId },
        include: {
          category: true,
          technicalSpecifications: true,
          deliveryDetails: true,
        },
      });
    }

    // Get category if provided
    if (data.categoryId) {
      context.category = await this.prisma.category.findUnique({
        where: { CategoryID: data.categoryId },
      });
    }

    // Generate template using AI
    const generatedContent = await this.aiService.generateRFxTemplate(data.type, context);

    // Create the template
    return this.createTemplate(companyId, userId, {
      name: generatedContent.name || `AI Generated ${data.type} Template`,
      description: generatedContent.description || `Automatically generated ${data.type} template`,
      type: data.type,
      isDefault: false,
      isActive: true,
      introductionSection: generatedContent.introductionSection,
      scopeSection: generatedContent.scopeSection,
      qualityStandards: generatedContent.qualityStandards,
      paymentTerms: generatedContent.paymentTerms,
      evaluationCriteria: generatedContent.evaluationCriteria,
      termsAndConditions: generatedContent.termsAndConditions,
      submissionGuidelines: generatedContent.submissionGuidelines,
      additionalSections: generatedContent.additionalSections || [],
      tags: generatedContent.tags || ['ai-generated', data.type.toLowerCase()],
    });
  }

  // ==================== RFx Documents ====================

  async createRFxDocument(
    companyId: string,
    userId: string,
    createDto: CreateRFxDocumentDto,
  ) {
    let templateData = {} as any;

    // If template is specified, use it as base
    if (createDto.templateId) {
      const template = await this.findTemplateById(createDto.templateId, companyId);
      templateData = {
        introductionSection: template.introductionSection,
        scopeSection: template.scopeSection,
        qualityStandards: template.qualityStandards,
        paymentTerms: template.paymentTerms,
        evaluationCriteria: template.evaluationCriteria,
        termsAndConditions: template.termsAndConditions,
        submissionGuidelines: template.submissionGuidelines,
        additionalSections: template.additionalSections,
      };
    }

    // If procurement request is specified, get its data
    let procurementData: any = null;
    if (createDto.procurementRequestId) {
      procurementData = await this.prisma.procurementRequest.findUnique({
        where: { id: createDto.procurementRequestId },
        include: {
          technicalSpecifications: true,
          deliveryDetails: true,
        },
      });

      if (!procurementData) {
        throw new NotFoundException('Procurement request not found');
      }
    }

    // Generate document number
    const documentNumber = await this.generateDocumentNumber(companyId, createDto.type);

    // Create the document
    const rfxDocument = await this.prisma.rFxDocument.create({
      data: {
        companyId,
        templateId: createDto.templateId,
        procurementRequestId: createDto.procurementRequestId,
        documentNumber,
        title: createDto.title,
        type: createDto.type,
        status: RFxStatus.DRAFT,
        submissionDeadline: new Date(createDto.submissionDeadline),
        questionDeadline: createDto.questionDeadline ? new Date(createDto.questionDeadline) : null,
        introductionSection: createDto.introductionSection || templateData.introductionSection,
        scopeSection: createDto.scopeSection || templateData.scopeSection,
        qualityStandards: createDto.qualityStandards || templateData.qualityStandards,
        paymentTerms: createDto.paymentTerms || templateData.paymentTerms,
        evaluationCriteria: createDto.evaluationCriteria || templateData.evaluationCriteria,
        termsAndConditions: createDto.termsAndConditions || templateData.termsAndConditions,
        submissionGuidelines: createDto.submissionGuidelines || templateData.submissionGuidelines,
        additionalSections: createDto.additionalSections || templateData.additionalSections || [],
        collectedData: procurementData ? {
          itemTitle: procurementData.itemTitle,
          quantity: procurementData.quantity,
          uom: procurementData.uom,
          simpleDefinition: procurementData.simpleDefinition,
          justification: procurementData.justification,
          technicalSpecs: procurementData.technicalSpecifications,
          deliveryDetails: procurementData.deliveryDetails,
        } : createDto.collectedData,
        technicalSpecs: createDto.technicalSpecs || procurementData?.technicalSpecifications,
        quantity: createDto.quantity || procurementData?.quantity,
        estimatedBudget: createDto.estimatedBudget ? new Prisma.Decimal(createDto.estimatedBudget) : null,
        currency: createDto.currency || procurementData?.currency || 'TRY',
        tags: createDto.tags || [],
        createdById: userId,
        auditLog: [{
          action: 'CREATED',
          userId,
          timestamp: new Date(),
          details: 'RFx document created',
        }],
      },
      include: {
        template: true,
        procurementRequest: true,
        invitedSuppliers: {
          include: {
            supplier: true,
          },
        },
      },
    });

    // Send invitations to suppliers if specified
    if (createDto.invitedSupplierIds && createDto.invitedSupplierIds.length > 0) {
      await this.inviteSuppliersToRFx(rfxDocument.id, createDto.invitedSupplierIds);
    }

    return rfxDocument;
  }

  async findAllRFxDocuments(
    companyId: string,
    filters?: {
      type?: RFxType;
      status?: RFxStatus;
      search?: string;
    },
  ) {
    const where: Prisma.RFxDocumentWhereInput = {
      companyId,
      ...(filters?.type && { type: filters.type }),
      ...(filters?.status && { status: filters.status }),
      ...(filters?.search && {
        OR: [
          { title: { contains: filters.search, mode: 'insensitive' } },
          { documentNumber: { contains: filters.search, mode: 'insensitive' } },
          { tags: { has: filters.search } },
        ],
      }),
    };

    return this.prisma.rFxDocument.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        template: {
          select: {
            id: true,
            name: true,
          },
        },
        procurementRequest: {
          select: {
            id: true,
            itemTitle: true,
          },
        },
        _count: {
          select: {
            invitedSuppliers: true,
            receivedBids: true,
          },
        },
      },
    });
  }

  async findRFxDocumentById(id: string, companyId: string) {
    const document = await this.prisma.rFxDocument.findFirst({
      where: {
        id,
        companyId,
      },
      include: {
        template: true,
        procurementRequest: {
          include: {
            technicalSpecifications: true,
            deliveryDetails: true,
          },
        },
        invitedSuppliers: {
          include: {
            supplier: {
              include: {
                contacts: true,
              },
            },
          },
        },
        receivedBids: {
          include: {
            supplier: true,
            evaluations: true,
          },
        },
        attachments: true,
      },
    });

    if (!document) {
      throw new NotFoundException('RFx document not found');
    }

    return document;
  }

  async publishRFxDocument(id: string, companyId: string, userId: string) {
    const document = await this.findRFxDocumentById(id, companyId);

    if (document.status !== RFxStatus.DRAFT) {
      throw new BadRequestException('Only draft documents can be published');
    }

    // Update status and publish date
    return this.prisma.rFxDocument.update({
      where: { id },
      data: {
        status: RFxStatus.ACTIVE,
        publishDate: new Date(),
        auditLog: {
          push: {
            action: 'PUBLISHED',
            userId,
            timestamp: new Date(),
            details: 'RFx document published',
          },
        },
      },
      include: {
        invitedSuppliers: {
          include: {
            supplier: true,
          },
        },
      },
    });
  }

  async inviteSuppliersToRFx(rfxDocumentId: string, supplierIds: string[]) {
    const invitations = supplierIds.map(supplierId => ({
      rfxDocumentId,
      supplierId,
      invitedAt: new Date(),
      status: 'PENDING',
    }));

    await this.prisma.rFxInvitation.createMany({
      data: invitations,
      skipDuplicates: true,
    });

    // TODO: Send email notifications to suppliers
    // This would integrate with your notification service

    return this.prisma.rFxInvitation.findMany({
      where: {
        rfxDocumentId,
        supplierId: { in: supplierIds },
      },
      include: {
        supplier: true,
      },
    });
  }

  // ==================== Helper Methods ====================

  private async generateDocumentNumber(companyId: string, type: RFxType): Promise<string> {
    const year = new Date().getFullYear();
    const typePrefix = type === RFxType.RFQ ? 'RFQ' : type === RFxType.RFP ? 'RFP' : 'RFI';
    
    // Get the last document number for this type and year
    const lastDocument = await this.prisma.rFxDocument.findFirst({
      where: {
        companyId,
        type,
        documentNumber: {
          startsWith: `${typePrefix}-${year}`,
        },
      },
      orderBy: {
        documentNumber: 'desc',
      },
    });

    let nextNumber = 1;
    if (lastDocument) {
      const match = lastDocument.documentNumber.match(/(\d+)$/);
      if (match) {
        nextNumber = parseInt(match[1]) + 1;
      }
    }

    return `${typePrefix}-${year}-${nextNumber.toString().padStart(5, '0')}`;
  }
}