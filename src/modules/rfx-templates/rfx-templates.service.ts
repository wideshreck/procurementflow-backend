import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRFxTemplateDto } from './dto/create-rfx-template.dto';
import { UpdateRFxTemplateDto } from './dto/update-rfx-template.dto';
import { CreateRFxDocumentDto } from './dto/create-rfx-document.dto';
import { RFxType, RFxStatus, Prisma } from '@prisma/client';
import { AIService } from './ai/ai.service';

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

    // Generate default template sections with fields
    const defaultSections = this.generateDefaultTemplateSections();

    // Process sections to ensure all fields have system names
    const processSection = (section: any) => {
      if (!section || !section.fields) return section;
      
      return {
        ...section,
        fields: section.fields.map((field: any) => ({
          ...field,
          name: field.name || this.generateSystemName(field.label),
        })),
      };
    };

    return this.prisma.rFxTemplate.create({
      data: {
        companyId,
        name: createDto.name,
        description: createDto.description,
        type: createDto.type,
        categoryId: createDto.categoryId,
        isDefault: createDto.isDefault || false,
        isActive: createDto.isActive ?? true,
        basicInfo: processSection(createDto.basicInfo || defaultSections.basicInfo) as any,
        introductionAndSummary: processSection(createDto.introductionAndSummary || defaultSections.introductionAndSummary) as any,
        scheduleAndProcedures: processSection(createDto.scheduleAndProcedures || defaultSections.scheduleAndProcedures) as any,
        technicalRequirements: processSection(createDto.technicalRequirements || defaultSections.technicalRequirements) as any,
        commercialTerms: processSection(createDto.commercialTerms || defaultSections.commercialTerms) as any,
        evaluationCriteria: processSection(createDto.evaluationCriteria || defaultSections.evaluationCriteria) as any,
        customSections: (createDto.customSections?.map(processSection) || []) as any,
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

  private generateDefaultTemplateSections() {
    return {
      basicInfo: {
        title: "Temel Bilgiler",
        fields: [
          { name: "documentTitle", label: "Doküman Başlığı", isRequired: true },
          { name: "documentType", label: "RFX Türü", isRequired: true },
          { name: "documentNumber", label: "Doküman Numarası", isRequired: true },
        ],
        isEditable: false,
      },
      introductionAndSummary: {
        title: "Giriş ve Proje Özeti",
        fields: [
          { name: "companyInfo", label: "Şirket Bilgileri", isRequired: true },
          { name: "projectPurpose", label: "Proje Genel Amacı", isRequired: true },
          { name: "projectContext", label: "Proje Bağlamı ve Hedefler", isRequired: true },
          { name: "confidentiality", label: "Gizlilik ve Sorumluluk Reddi", isRequired: false },
        ],
        isEditable: true,
      },
      scheduleAndProcedures: {
        title: "İhale Takvimi ve Prosedürleri",
        fields: [
          { name: "rfpPublishDate", label: "RFP Yayın Tarihi", isRequired: true },
          { name: "lastQuestionDate", label: "Son Soru Sorma Tarihi", isRequired: true },
          { name: "qaMeeting", label: "Soru-Cevap Toplantısı", isRequired: false, description: "İsteğe bağlı" },
          { name: "proposalDeadline", label: "Teklif Son Teslim Tarihi", isRequired: true },
          { name: "evaluationDate", label: "Değerlendirme ve Seçim Tarihi", isRequired: true },
          { name: "contractNegotiation", label: "Sözleşme Müzakereleri", isRequired: false },
          { name: "projectStartDate", label: "Proje Başlangıç Tarihi", isRequired: true },
          { name: "contactInfo", label: "İletişim Bilgileri", isRequired: true },
        ],
        isEditable: true,
      },
      technicalRequirements: {
        title: "Teknik ve Fonksiyonel Gereksinimler",
        fields: [
          { name: "technicalSpecs", label: "Teknik Özellikler", isRequired: true },
          { name: "functionalReqs", label: "Fonksiyonel Gereksinimler", isRequired: true },
          { name: "projectScope", label: "Proje Kapsamı", isRequired: true },
          { name: "expectedOutputs", label: "Beklenen Çıktılar", isRequired: true },
          { name: "integrationCompliance", label: "Entegrasyon ve Uyum", isRequired: false },
          { name: "supportMaintenance", label: "Destek ve Bakım", isRequired: false },
        ],
        isEditable: true,
      },
      commercialTerms: {
        title: "Ticari ve Mali Teklif",
        fields: [
          { name: "pricing", label: "Fiyatlandırma", isRequired: true },
          { name: "paymentPlan", label: "Ödeme Planı", isRequired: true },
          { name: "optionalCosts", label: "Opsiyonel Maliyetler", isRequired: false },
          { name: "contractTerms", label: "Sözleşme Şartları", isRequired: true },
        ],
        isEditable: true,
      },
      evaluationCriteria: {
        title: "Teklif Değerlendirme Kriterleri",
        fields: [
          { name: "priceCost", label: "Fiyat/Maliyet", isRequired: true },
          { name: "experienceRefs", label: "Deneyim ve Referanslar", isRequired: true },
          { name: "technicalApproach", label: "Teknik Yaklaşım", isRequired: true },
          { name: "projectTeam", label: "Proje Ekibi", isRequired: true },
          { name: "customerSupport", label: "Müşteri Desteği", isRequired: false },
        ],
        isEditable: true,
      },
    };
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
    // For now, return default template sections
    const defaultSections = this.generateDefaultTemplateSections();
    
    return this.createTemplate(companyId, userId, {
      name: `AI Generated ${data.type} Template`,
      description: `Automatically generated ${data.type} template`,
      type: data.type,
      isDefault: false,
      isActive: true,
      basicInfo: defaultSections.basicInfo,
      introductionAndSummary: defaultSections.introductionAndSummary,
      scheduleAndProcedures: defaultSections.scheduleAndProcedures,
      technicalRequirements: defaultSections.technicalRequirements,
      commercialTerms: defaultSections.commercialTerms,
      evaluationCriteria: defaultSections.evaluationCriteria,
      customSections: [],
      tags: ['ai-generated', data.type.toLowerCase()],
    });
  }

  // ==================== RFx Documents ====================

  async createRFxDocument(
    companyId: string,
    userId: string,
    createDto: CreateRFxDocumentDto,
  ) {
    let templateFields: any = null;

    // If template is specified, get its field definitions
    if (createDto.templateId) {
      const template = await this.findTemplateById(createDto.templateId, companyId);
      templateFields = {
        basicInfo: template.basicInfo,
        introductionAndSummary: template.introductionAndSummary,
        scheduleAndProcedures: template.scheduleAndProcedures,
        technicalRequirements: template.technicalRequirements,
        commercialTerms: template.commercialTerms,
        evaluationCriteria: template.evaluationCriteria,
        customSections: template.customSections,
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
          category: true,
        },
      });

      if (!procurementData) {
        throw new NotFoundException('Procurement request not found');
      }
    }

    // Generate document number
    const documentNumber = await this.generateDocumentNumber(companyId, createDto.type);

    // Create the document with filled data
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
        
        // Store filled template data
        basicInfoData: createDto.basicInfoData || {
          documentTitle: createDto.title,
          documentType: createDto.type,
          documentNumber: documentNumber,
        },
        introductionData: createDto.introductionData || {},
        scheduleData: createDto.scheduleData || {
          rfpPublishDate: new Date(),
          proposalDeadline: createDto.submissionDeadline,
          lastQuestionDate: createDto.questionDeadline,
        },
        technicalData: createDto.technicalData || procurementData?.technicalSpecifications || {},
        commercialData: createDto.commercialData || {},
        evaluationData: createDto.evaluationData || {},
        customSectionsData: createDto.customSectionsData || [],
        
        // Procurement data
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
        procurementRequest: {
          include: {
            category: true,
          },
        },
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
            category: true,
          },
        },
        invitedSuppliers: {
          include: {
            supplier: {
              include: {
                contacts: true,
                categories: {
                  include: {
                    category: true,
                  },
                },
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

  async getSuppliersByCategory(companyId: string, categoryId: string) {
    return this.prisma.supplier.findMany({
      where: {
        companyId,
        status: 'APPROVED' as any,
        categories: {
          some: {
            categoryId,
          },
        },
      },
      include: {
        categories: {
          include: {
            category: true,
          },
        },
        contacts: true,
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

  private generateSystemName(label: string): string {
    return label
      .toLowerCase()
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ş/g, 's')
      .replace(/ı/g, 'i')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c')
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }
}