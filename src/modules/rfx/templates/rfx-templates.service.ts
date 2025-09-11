import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateRFxTemplateDto } from './dto/create-rfx-template.dto';
import { UpdateRFxTemplateDto } from './dto/update-rfx-template.dto';
import { RFxType } from '@prisma/client';
import { RFxAIService } from '../ai/rfx-ai.service';
import { RFxBaseService } from '../common/base/rfx-base.service';
import { RFxSearchFilters, RFxOperationResult } from '../common/interfaces/rfx-base.interface';
import { RFxValidators } from '../common/validators/rfx.validators';
import { RFX_CONFIG, RFX_MESSAGES } from '../common/config/rfx.config';

@Injectable()
export class RFxTemplatesService extends RFxBaseService {
  constructor(
    prisma: PrismaService,
    private readonly aiService: RFxAIService,
  ) {
    super(prisma, 'RFx Template');
  }

  async createTemplate(
    companyId: string,
    userId: string,
    createDto: CreateRFxTemplateDto,
  ): Promise<RFxOperationResult> {
    return this.executeTransaction(async () => {
      // Validate uniqueness
      await this.validateUniqueness(
        this.prisma.rFxTemplate,
        'name',
        createDto.name,
        companyId,
      );

      // Handle default template setting
      if (createDto.isDefault) {
        await this.unsetOtherDefaults(companyId, createDto.type);
      }

      // Get default sections if not provided
      const sections = this.prepareSections(createDto);

      // Create the template
      const template = await this.prisma.rFxTemplate.create({
        data: {
          companyId,
          name: RFxValidators.validateStringLength(
            createDto.name,
            'Template name',
            1,
            RFX_CONFIG.LIMITS.MAX_TITLE_LENGTH,
          ),
          description: createDto.description
            ? RFxValidators.validateStringLength(
                createDto.description,
                'Description',
                0,
                RFX_CONFIG.LIMITS.MAX_DESCRIPTION_LENGTH,
              )
            : null,
          type: createDto.type,
          categoryId: createDto.categoryId,
          isDefault: createDto.isDefault || false,
          isActive: createDto.isActive ?? true,
          ...sections,
          tags: createDto.tags?.slice(0, RFX_CONFIG.LIMITS.MAX_TAGS) || [],
          createdById: userId,
          lastModifiedById: userId,
        },
        include: this.getTemplateInclude(),
      });

      this.logger.log(`Created template "${template.name}" for company ${companyId}`);
      return template;
    }, RFX_MESSAGES.ERROR.VALIDATION_FAILED);
  }

  async findAllTemplates(
    companyId: string,
    filters?: RFxSearchFilters,
  ) {
    const where = this.buildTemplateSearchWhere(filters || {}, companyId);
    const pagination = this.buildPagination(filters || {});
    const orderBy = this.buildTemplateOrderBy(filters || {});

    const [templates, total] = await Promise.all([
      this.prisma.rFxTemplate.findMany({
        where,
        ...pagination,
        orderBy,
        include: {
          _count: {
            select: {
              rfxDocuments: true,
            },
          },
          category: {
            select: {
              CategoryID: true,
              name: true,
            },
          },
        },
      }),
      this.prisma.rFxTemplate.count({ where }),
    ]);

    return {
      data: templates,
      total,
      page: filters?.page || 1,
      pageSize: filters?.limit || templates.length,
      totalPages: filters?.limit ? Math.ceil(total / filters.limit) : 1,
    };
  }

  async findTemplateById(id: string, companyId: string) {
    return this.findEntityById(
      this.prisma.rFxTemplate,
      id,
      companyId,
      this.getTemplateDetailInclude(),
    );
  }

  async updateTemplate(
    id: string,
    companyId: string,
    userId: string,
    updateDto: UpdateRFxTemplateDto,
  ): Promise<RFxOperationResult> {
    return this.executeTransaction(async () => {
      const template: any = await this.findTemplateById(id, companyId);

      // Check name uniqueness if name is being updated
      if (updateDto.name && updateDto.name !== template.name) {
        await this.validateUniqueness(
          this.prisma.rFxTemplate,
          'name',
          updateDto.name,
          companyId,
          id,
        );
      }

      // Handle default template setting
      if (updateDto.isDefault) {
        await this.unsetOtherDefaults(companyId, template.type, id);
      }

      // Update the template
      const updated = await this.prisma.rFxTemplate.update({
        where: { id },
        data: {
          ...updateDto,
          lastModifiedById: userId,
        } as any,
        include: this.getTemplateInclude(),
      });

      this.logger.log(`Updated template "${updated.name}"`);
      return updated;
    });
  }

  async deleteTemplate(
    id: string,
    companyId: string,
  ): Promise<RFxOperationResult> {
    return this.executeTransaction(async () => {
      const template: any = await this.findTemplateById(id, companyId);

      // Check if template is used in any documents
      const documentsCount = await this.prisma.rFxDocument.count({
        where: { templateId: id },
      });

      if (documentsCount > 0) {
        // Soft delete - just mark as inactive
        const softDeleted = await this.prisma.rFxTemplate.update({
          where: { id },
          data: { isActive: false },
        });

        this.logger.log(
          `Soft deleted template "${template.name}" (used in ${documentsCount} documents)`,
        );
        return softDeleted;
      }

      // Hard delete if not used
      await this.prisma.rFxTemplate.delete({
        where: { id },
      });

      this.logger.log(`Hard deleted template "${template.name}"`);
      return { success: true };
    });
  }

  async generateTemplateWithAI(
    companyId: string,
    userId: string,
    data: {
      type: RFxType;
      procurementRequestId?: string;
      categoryId?: string;
      requirements?: string;
    },
  ): Promise<RFxOperationResult> {
    return this.executeTransaction(async () => {
      try {
        // Check AI availability
        const isAvailable = await this.aiService.checkAvailability();
        if (!isAvailable) {
          throw new Error(RFX_MESSAGES.ERROR.AI_SERVICE_UNAVAILABLE);
        }

        // Get procurement request data if provided
        let procurementData: any = null;
        if (data.procurementRequestId) {
          procurementData = await this.prisma.procurementRequest.findUnique({
            where: { id: data.procurementRequestId },
            include: {
              category: true,
            },
          });
        }

        // Get category name
        let categoryName = 'General';
        if (data.categoryId) {
          const category = await this.prisma.category.findUnique({
            where: { CategoryID: data.categoryId },
          });
          if (category) {
            categoryName = category.name;
          }
        } else if (procurementData?.category) {
          categoryName = procurementData.category.name;
        }

        // Generate template using AI
        const aiTemplate = await this.aiService.generateTemplate({
          rfxType: data.type,
          category: categoryName,
          description: data.requirements || procurementData?.simpleDefinition || 'Generate a comprehensive RFx template',
          specificRequirements: procurementData ? [
            `Item: ${procurementData.itemTitle}`,
            `Quantity: ${procurementData.quantity} ${procurementData.uom}`,
            procurementData.justification,
          ].filter(Boolean) : [],
        });

        // Process AI-generated template
        const processedSections = this.processAIGeneratedSections(aiTemplate);

        // Create the template
        return this.createTemplate(companyId, userId, {
          name: `AI ${data.type} - ${categoryName} - ${new Date().toLocaleDateString('tr-TR')}`,
          description: `AI tarafından ${categoryName} kategorisi için oluşturulan ${data.type} şablonu`,
          type: data.type,
          categoryId: data.categoryId,
          isDefault: false,
          isActive: true,
          ...processedSections,
          tags: ['ai-generated', data.type.toLowerCase(), categoryName.toLowerCase()],
        } as any);
      } catch (error) {
        this.logger.error('Failed to generate template with AI:', error);
        
        // Fallback to default template if AI fails
        const defaultSections = this.generateDefaultTemplateSections();
        return this.createTemplate(companyId, userId, {
          name: `Varsayılan ${data.type} Şablonu`,
          description: `${data.type} için varsayılan şablon`,
          type: data.type,
          categoryId: data.categoryId,
          isDefault: false,
          isActive: true,
          ...defaultSections,
          tags: ['default', data.type.toLowerCase()],
        });
      }
    });
  }

  async duplicateTemplate(
    id: string,
    companyId: string,
    userId: string,
    newName: string,
  ): Promise<RFxOperationResult> {
    return this.executeTransaction(async () => {
      const original: any = await this.findTemplateById(id, companyId);

      // Validate new name
      await this.validateUniqueness(
        this.prisma.rFxTemplate,
        'name',
        newName,
        companyId,
      );

      // Create duplicate
      const duplicate = await this.prisma.rFxTemplate.create({
        data: {
          companyId,
          name: newName,
          description: original.description ? `${original.description} (Kopyalandı)` : null,
          type: original.type,
          categoryId: original.categoryId,
          isDefault: false,
          isActive: true,
          basicInfo: original.basicInfo,
          introductionAndSummary: original.introductionAndSummary,
          scheduleAndProcedures: original.scheduleAndProcedures,
          technicalRequirements: original.technicalRequirements,
          commercialTerms: original.commercialTerms,
          evaluationCriteria: original.evaluationCriteria,
          customSections: original.customSections,
          tags: [...(original.tags as string[] || []), 'duplicate'],
          createdById: userId,
          lastModifiedById: userId,
        },
        include: this.getTemplateInclude(),
      });

      this.logger.log(`Duplicated template "${original.name}" as "${newName}"`);
      return duplicate;
    });
  }

  async getTemplateStatistics(companyId: string) {
    const [
      totalTemplates,
      activeTemplates,
      usageByType,
      mostUsedTemplate,
    ] = await Promise.all([
      this.prisma.rFxTemplate.count({ where: { companyId } }),
      this.prisma.rFxTemplate.count({
        where: { companyId, isActive: true },
      }),
      this.getUsageByType(companyId),
      this.getMostUsedTemplate(companyId),
    ]);

    return {
      totalTemplates,
      activeTemplates,
      usageByType,
      mostUsedTemplate,
    };
  }

  // Private helper methods
  private prepareSections(createDto: CreateRFxTemplateDto) {
    const defaultSections = this.generateDefaultTemplateSections();
    
    return {
      basicInfo: this.processSection(
        createDto.basicInfo || defaultSections.basicInfo,
      ),
      introductionAndSummary: this.processSection(
        createDto.introductionAndSummary || defaultSections.introductionAndSummary,
      ),
      scheduleAndProcedures: this.processSection(
        createDto.scheduleAndProcedures || defaultSections.scheduleAndProcedures,
      ),
      technicalRequirements: this.processSection(
        createDto.technicalRequirements || defaultSections.technicalRequirements,
      ),
      commercialTerms: this.processSection(
        createDto.commercialTerms || defaultSections.commercialTerms,
      ),
      evaluationCriteria: this.processSection(
        createDto.evaluationCriteria || defaultSections.evaluationCriteria,
      ),
      customSections: (createDto.customSections?.map(this.processSection) || []) as any,
    };
  }

  private processSection(section: any): any {
    if (!section || !section.fields) return section;
    
    return {
      ...section,
      fields: section.fields.map((field: any) => ({
        ...field,
        name: field.name || this.generateSystemName(field.label),
      })),
    };
  }

  private processAIGeneratedSections(aiTemplate: any) {
    // Process and validate AI-generated sections
    const sections = {};
    
    const sectionKeys = [
      'basicInfo',
      'introductionAndSummary',
      'scheduleAndProcedures',
      'technicalRequirements',
      'commercialTerms',
      'evaluationCriteria',
    ];

    for (const key of sectionKeys) {
      if (aiTemplate[key]) {
        sections[key] = this.processSection(aiTemplate[key]);
      }
    }

    if (aiTemplate.customSections && Array.isArray(aiTemplate.customSections)) {
      sections['customSections'] = aiTemplate.customSections
        .slice(0, RFX_CONFIG.LIMITS.MAX_CUSTOM_SECTIONS)
        .map(this.processSection);
    }

    return sections;
  }

  private async unsetOtherDefaults(
    companyId: string,
    type: RFxType,
    excludeId?: string,
  ) {
    await this.prisma.rFxTemplate.updateMany({
      where: {
        companyId,
        type,
        isDefault: true,
        ...(excludeId && { id: { not: excludeId } }),
      },
      data: { isDefault: false },
    });
  }

  private buildTemplateSearchWhere(filters: RFxSearchFilters, companyId: string) {
    const where = this.buildSearchWhere(filters, companyId, {
      isActive: filters?.status === undefined ? undefined : filters.status === 'ACTIVE',
    });

    // Template-specific search fields
    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { tags: { has: filters.search } },
      ];
    }

    return where;
  }

  private buildTemplateOrderBy(filters: RFxSearchFilters) {
    if (!filters?.sortBy) {
      return [
        { isDefault: 'desc' },
        { createdAt: 'desc' },
      ];
    }

    return this.buildOrderBy(filters);
  }

  private async getUsageByType(companyId: string) {
    const types = Object.values(RFxType);
    const usage = {};

    for (const type of types) {
      const count = await this.prisma.rFxDocument.count({
        where: {
          companyId,
          type,
        },
      });
      usage[type] = count;
    }

    return usage;
  }

  private async getMostUsedTemplate(companyId: string) {
    const template = await this.prisma.rFxTemplate.findFirst({
      where: { companyId },
      orderBy: {
        rfxDocuments: {
          _count: 'desc',
        },
      },
      include: {
        _count: {
          select: {
            rfxDocuments: true,
          },
        },
      },
    });

    return template ? {
      id: template.id,
      name: template.name,
      usageCount: template._count.rfxDocuments,
    } : null;
  }

  private getTemplateInclude() {
    return {
      company: {
        select: {
          id: true,
          name: true,
        },
      },
      category: {
        select: {
          CategoryID: true,
          name: true,
        },
      },
      _count: {
        select: {
          rfxDocuments: true,
        },
      },
    };
  }

  private getTemplateDetailInclude() {
    return {
      ...this.getTemplateInclude(),
    };
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
          { name: "qaMeeting", label: "Soru-Cevap Toplantısı", isRequired: false },
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
}

