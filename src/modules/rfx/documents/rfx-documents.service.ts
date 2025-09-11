import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateRFxDocumentDto } from './dto/create-rfx-document.dto';
import { UpdateRFxDocumentDto } from './dto/update-rfx-document.dto';
import { RFxType, RFxStatus, Prisma } from '@prisma/client';
import { RFxBaseService } from '../common/base/rfx-base.service';
import { RFxSearchFilters, RFxOperationResult } from '../common/interfaces/rfx-base.interface';
import { RFxValidators } from '../common/validators/rfx.validators';
import { RFX_CONFIG, RFX_MESSAGES } from '../common/config/rfx.config';

@Injectable()
export class RFxDocumentsService extends RFxBaseService {
  constructor(prisma: PrismaService) {
    super(prisma, 'RFx Document');
  }

  async createRFxDocument(
    companyId: string,
    userId: string,
    createDto: CreateRFxDocumentDto,
  ): Promise<RFxOperationResult> {
    return this.executeTransaction(async () => {
      // Validate input
      this.validateRequiredFields(createDto, ['title', 'type', 'submissionDeadline']);
      RFxValidators.validateDeadlines(
        new Date(createDto.submissionDeadline),
        createDto.questionDeadline ? new Date(createDto.questionDeadline) : undefined,
      );
      
      if (createDto.estimatedBudget) {
        createDto.estimatedBudget = RFxValidators.validateBudget(createDto.estimatedBudget);
      }

      // Process template if provided
      const templateData = await this.processTemplate(
        createDto.templateId,
        companyId,
      );

      // Process procurement request if provided
      const procurementData = await this.processProcurementRequest(
        createDto.procurementRequestId,
      );

      // Generate document number
      const documentNumber = await this.generateDocumentNumber(
        companyId,
        createDto.type,
      );

      // Create the document with all related data
      const rfxDocument = await this.prisma.rFxDocument.create({
        data: {
          companyId,
          templateId: createDto.templateId,
          procurementRequestId: createDto.procurementRequestId,
          documentNumber,
          title: RFxValidators.validateStringLength(
            createDto.title,
            'Title',
            1,
            RFX_CONFIG.LIMITS.MAX_TITLE_LENGTH,
          ),
          type: createDto.type,
          status: RFxStatus.DRAFT,
          submissionDeadline: new Date(createDto.submissionDeadline),
          questionDeadline: createDto.questionDeadline
            ? new Date(createDto.questionDeadline)
            : null,
          
          // Merge template and custom data
          basicInfoData: this.mergeData(
            templateData?.basicInfo,
            createDto.basicInfoData,
            {
              documentTitle: createDto.title,
              documentType: createDto.type,
              documentNumber: documentNumber,
            },
          ),
          introductionData: this.mergeData(
            templateData?.introductionAndSummary,
            createDto.introductionData,
          ),
          scheduleData: this.mergeData(
            templateData?.scheduleAndProcedures,
            createDto.scheduleData,
            {
              rfpPublishDate: new Date(),
              proposalDeadline: createDto.submissionDeadline,
              lastQuestionDate: createDto.questionDeadline,
            },
          ),
          technicalData: this.mergeData(
            templateData?.technicalRequirements,
            createDto.technicalData,
            procurementData?.technicalSpecifications,
          ),
          commercialData: this.mergeData(
            templateData?.commercialTerms,
            createDto.commercialData,
          ),
          evaluationData: this.mergeData(
            templateData?.evaluationCriteria,
            createDto.evaluationData,
          ),
          customSectionsData: (createDto.customSectionsData || templateData?.customSections || []) as any,
          
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
          estimatedBudget: createDto.estimatedBudget
            ? new Prisma.Decimal(createDto.estimatedBudget)
            : null,
          currency: RFxValidators.validateCurrency(
            createDto.currency || procurementData?.currency || RFX_CONFIG.DEFAULTS.CURRENCY,
          ),
          tags: createDto.tags?.slice(0, RFX_CONFIG.LIMITS.MAX_TAGS) || [],
          
          createdById: userId,
          auditLog: [{
            action: 'CREATED',
            userId,
            timestamp: new Date(),
            details: RFX_MESSAGES.SUCCESS.CREATED,
          }],
        },
        include: this.getDefaultInclude(),
      });

      // Invite suppliers if provided
      if (createDto.invitedSupplierIds && createDto.invitedSupplierIds.length > 0) {
        await this.inviteSuppliers(
          rfxDocument.id,
          createDto.invitedSupplierIds,
        );
      }

      this.logger.log(`Created RFx document ${documentNumber} for company ${companyId}`);
      return rfxDocument;
    }, RFX_MESSAGES.ERROR.VALIDATION_FAILED);
  }

  async findAllRFxDocuments(
    companyId: string,
    filters?: RFxSearchFilters,
  ) {
    const where = this.buildSearchWhere(filters || {}, companyId);
    const pagination = this.buildPagination(filters || {});
    const orderBy = this.buildOrderBy(filters || {});

    const [documents, total] = await Promise.all([
      this.prisma.rFxDocument.findMany({
        where,
        ...pagination,
        orderBy,
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
              category: true,
            },
          },
          _count: {
            select: {
              invitedSuppliers: true,
              receivedBids: true,
              attachments: true,
            },
          },
        },
      }),
      this.prisma.rFxDocument.count({ where }),
    ]);

    return {
      data: documents,
      total,
      page: filters?.page || 1,
      pageSize: filters?.limit || documents.length,
      totalPages: filters?.limit ? Math.ceil(total / filters.limit) : 1,
    };
  }

  async findRFxDocumentById(id: string, companyId: string) {
    return this.findEntityById(
      this.prisma.rFxDocument,
      id,
      companyId,
      this.getDetailedInclude(),
    );
  }

  async updateRFxDocument(
    id: string,
    companyId: string,
    userId: string,
    updateDto: UpdateRFxDocumentDto,
  ): Promise<RFxOperationResult> {
    return this.executeTransaction(async () => {
      const document: any = await this.findRFxDocumentById(id, companyId);

      // Validate status transition if status is being updated
      if (updateDto.status) {
        this.validateStatusTransition(document.status, updateDto.status);
      }

      // Validate deadlines if being updated
      if (updateDto.submissionDeadline || updateDto.questionDeadline) {
        RFxValidators.validateDeadlines(
          updateDto.submissionDeadline || document.submissionDeadline,
          updateDto.questionDeadline || document.questionDeadline,
        );
      }

      // Update the document
      const updated = await this.prisma.rFxDocument.update({
        where: { id },
        data: {
          ...updateDto,
          submissionDeadline: updateDto.submissionDeadline
            ? new Date(updateDto.submissionDeadline)
            : undefined,
          questionDeadline: updateDto.questionDeadline
            ? new Date(updateDto.questionDeadline)
            : undefined,
          estimatedBudget: updateDto.estimatedBudget
            ? new Prisma.Decimal(updateDto.estimatedBudget)
            : undefined,
          auditLog: this.addAuditLog(
            document.auditLog as any[],
            'UPDATED',
            userId,
            RFX_MESSAGES.SUCCESS.UPDATED,
          ) as any,
        },
        include: this.getDefaultInclude(),
      });

      // Invite additional suppliers if provided
      if (updateDto.additionalSupplierIds && updateDto.additionalSupplierIds.length > 0) {
        await this.inviteSuppliers(id, updateDto.additionalSupplierIds);
      }

      return updated;
    });
  }

  async publishRFxDocument(
    id: string,
    companyId: string,
    userId: string,
  ): Promise<RFxOperationResult> {
    return this.executeTransaction(async () => {
      const document: any = await this.findRFxDocumentById(id, companyId);

      this.validateStatusTransition(document.status, RFxStatus.ACTIVE);

      const published = await this.prisma.rFxDocument.update({
        where: { id },
        data: {
          status: RFxStatus.ACTIVE,
          publishDate: new Date(),
          auditLog: this.addAuditLog(
            document.auditLog as any[],
            'PUBLISHED',
            userId,
            RFX_MESSAGES.SUCCESS.PUBLISHED,
          ) as any,
        },
        include: this.getDetailedInclude(),
      });

      // Send notifications to invited suppliers
      await this.sendPublishNotifications(published);

      this.logger.log(`Published RFx document ${document.documentNumber}`);
      return published;
    });
  }

  async deleteRFxDocument(
    id: string,
    companyId: string,
    userId: string,
  ): Promise<RFxOperationResult> {
    return this.executeTransaction(async () => {
      const document: any = await this.findRFxDocumentById(id, companyId);

      // Only allow deletion of draft documents
      if (document.status !== RFxStatus.DRAFT) {
        throw new BadRequestException(
          'Only draft documents can be deleted. Consider cancelling instead.',
        );
      }

      await this.prisma.rFxDocument.delete({
        where: { id },
      });

      this.logger.log(`Deleted RFx document ${document.documentNumber}`);
      return { success: true };
    });
  }

  async inviteSuppliers(
    rfxDocumentId: string,
    supplierIds: string[],
  ) {
    // Validate supplier limit
    if (supplierIds.length > RFX_CONFIG.LIMITS.MAX_INVITED_SUPPLIERS) {
      throw new BadRequestException(
        `Cannot invite more than ${RFX_CONFIG.LIMITS.MAX_INVITED_SUPPLIERS} suppliers`,
      );
    }

    // Check for existing invitations
    const existing = await this.prisma.rFxInvitation.findMany({
      where: {
        rfxDocumentId,
        supplierId: { in: supplierIds },
      },
      select: { supplierId: true },
    });

    const existingIds = new Set(existing.map(e => e.supplierId));
    const newSupplierIds = supplierIds.filter(id => !existingIds.has(id));

    if (newSupplierIds.length === 0) {
      return [];
    }

    // Create new invitations
    const invitations = newSupplierIds.map(supplierId => ({
      rfxDocumentId,
      supplierId,
      invitedAt: new Date(),
      status: 'PENDING',
    }));

    await this.prisma.rFxInvitation.createMany({
      data: invitations,
    });

    return this.prisma.rFxInvitation.findMany({
      where: {
        rfxDocumentId,
        supplierId: { in: newSupplierIds },
      },
      include: {
        supplier: {
          include: {
            contacts: true,
          },
        },
      },
    });
  }

  async getSuppliersByCategory(companyId: string, categoryId: string) {
    return this.prisma.supplier.findMany({
      where: {
        companyId,
        status: 'ACTIVE',
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

  async getDocumentStatistics(companyId: string) {
    const [
      totalDocuments,
      activeDocuments,
      totalBids,
      avgResponseRate,
    ] = await Promise.all([
      this.prisma.rFxDocument.count({ where: { companyId } }),
      this.prisma.rFxDocument.count({
        where: { companyId, status: RFxStatus.ACTIVE },
      }),
      this.prisma.supplierBid.count({
        where: {
          rfxDocument: { companyId },
        },
      }),
      this.calculateAverageResponseRate(companyId),
    ]);

    return {
      totalDocuments,
      activeDocuments,
      totalBids,
      avgResponseRate,
    };
  }

  // Private helper methods
  private async processTemplate(templateId?: string, companyId?: string) {
    if (!templateId || !companyId) return null;

    const template = await this.prisma.rFxTemplate.findFirst({
      where: { id: templateId, companyId },
    });

    if (!template) {
      throw new NotFoundException(RFX_MESSAGES.ERROR.TEMPLATE_NOT_FOUND);
    }

    return template;
  }

  private async processProcurementRequest(procurementRequestId?: string) {
    if (!procurementRequestId) return null;

    const request = await this.prisma.procurementRequest.findUnique({
      where: { id: procurementRequestId },
      include: {
        technicalSpecifications: true,
        deliveryDetails: true,
        category: true,
      },
    });

    if (!request) {
      throw new NotFoundException('Procurement request not found');
    }

    return request;
  }

  private mergeData(...sources: any[]): any {
    return sources.reduce((merged, source) => {
      if (!source) return merged;
      return { ...merged, ...source };
    }, {});
  }

  private validateStatusTransition(currentStatus: RFxStatus, newStatus: RFxStatus) {
    const allowedTransitions = RFX_CONFIG.STATUS_TRANSITIONS[currentStatus];
    
    if (!allowedTransitions || !allowedTransitions.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${currentStatus} to ${newStatus}`,
      );
    }
  }

  private async generateDocumentNumber(
    companyId: string,
    type: RFxType,
  ): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = RFX_CONFIG.DOCUMENT_NUMBER.PREFIX[type];
    
    const lastDocument = await this.prisma.rFxDocument.findFirst({
      where: {
        companyId,
        type,
        documentNumber: {
          startsWith: `${prefix}-${year}`,
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

    const paddedNumber = nextNumber
      .toString()
      .padStart(RFX_CONFIG.DOCUMENT_NUMBER.NUMBER_PADDING, '0');
    
    return `${prefix}-${year}-${paddedNumber}`;
  }

  private async calculateAverageResponseRate(companyId: string): Promise<number> {
    const documents = await this.prisma.rFxDocument.findMany({
      where: {
        companyId,
        status: { in: [RFxStatus.CLOSED] },
      },
      include: {
        _count: {
          select: {
            invitedSuppliers: true,
            receivedBids: true,
          },
        },
      },
    });

    if (documents.length === 0) return 0;

    const totalInvited = documents.reduce(
      (sum, doc) => sum + doc._count.invitedSuppliers,
      0,
    );
    const totalResponded = documents.reduce(
      (sum, doc) => sum + doc._count.receivedBids,
      0,
    );

    return totalInvited > 0 ? (totalResponded / totalInvited) * 100 : 0;
  }

  private async sendPublishNotifications(document: any) {
    // TODO: Implement notification service integration
    this.logger.log(
      `Sending notifications for document ${document.documentNumber} to ${document.invitedSuppliers.length} suppliers`,
    );
  }

  private getDefaultInclude() {
    return {
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
    };
  }

  private getDetailedInclude() {
    return {
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
    };
  }
}