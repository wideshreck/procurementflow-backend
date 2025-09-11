import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { RFxAuditLog, RFxOperationResult, RFxSearchFilters } from '../interfaces/rfx-base.interface';

@Injectable()
export abstract class RFxBaseService {
  protected readonly logger: Logger;

  constructor(
    protected readonly prisma: PrismaService,
    protected readonly entityName: string,
  ) {
    this.logger = new Logger(this.constructor.name);
  }

  protected async findEntityById<T>(
    model: any,
    id: string,
    companyId: string,
    include?: any,
  ): Promise<T> {
    const entity = await model.findFirst({
      where: { id, companyId },
      include,
    });

    if (!entity) {
      throw new NotFoundException(`${this.entityName} not found`);
    }

    return entity;
  }

  protected async validateUniqueness(
    model: any,
    field: string,
    value: string,
    companyId: string,
    excludeId?: string,
  ): Promise<void> {
    const existing = await model.findFirst({
      where: {
        companyId,
        [field]: value,
        ...(excludeId && { id: { not: excludeId } }),
      },
    });

    if (existing) {
      throw new BadRequestException(
        `${this.entityName} with ${field} "${value}" already exists`,
      );
    }
  }

  protected buildSearchWhere(
    filters: RFxSearchFilters,
    companyId: string,
    additionalFields?: Record<string, any>,
  ): any {
    const where: any = {
      companyId,
      ...additionalFields,
    };

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.categoryId) {
      where.categoryId = filters.categoryId;
    }

    if (filters.tags && filters.tags.length > 0) {
      where.tags = { hasSome: filters.tags };
    }

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }

    return where;
  }

  protected buildPagination(filters: RFxSearchFilters): {
    skip?: number;
    take?: number;
  } {
    if (!filters.page || !filters.limit) {
      return {};
    }

    return {
      skip: (filters.page - 1) * filters.limit,
      take: filters.limit,
    };
  }

  protected buildOrderBy(filters: RFxSearchFilters): any {
    if (!filters.sortBy) {
      return { createdAt: 'desc' };
    }

    return {
      [filters.sortBy]: filters.sortOrder || 'asc',
    };
  }

  protected addAuditLog(
    existingLog: any[],
    action: string,
    userId: string,
    details?: string,
    metadata?: Record<string, any>,
  ): RFxAuditLog[] {
    const newLog: RFxAuditLog = {
      action,
      userId,
      timestamp: new Date(),
      details,
      metadata,
    };

    return [...(existingLog || []), newLog];
  }

  protected async executeTransaction<T>(
    operation: () => Promise<T>,
    errorMessage: string = 'Operation failed',
  ): Promise<RFxOperationResult<T>> {
    try {
      const result = await operation();
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      this.logger.error(`${errorMessage}:`, error);
      return {
        success: false,
        error: error.message || errorMessage,
      };
    }
  }

  protected generateSystemName(label: string): string {
    return label
      .toLowerCase()
      .replace(/[ğĞ]/g, 'g')
      .replace(/[üÜ]/g, 'u')
      .replace(/[şŞ]/g, 's')
      .replace(/[ıİ]/g, 'i')
      .replace(/[öÖ]/g, 'o')
      .replace(/[çÇ]/g, 'c')
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }

  protected validateRequiredFields(
    data: Record<string, any>,
    requiredFields: string[],
  ): void {
    const missingFields = requiredFields.filter(field => !data[field]);
    
    if (missingFields.length > 0) {
      throw new BadRequestException(
        `Missing required fields: ${missingFields.join(', ')}`,
      );
    }
  }

  protected sanitizeInput<T>(input: T): T {
    if (typeof input === 'string') {
      return input.trim() as T;
    }
    
    if (Array.isArray(input)) {
      return input.map(item => this.sanitizeInput(item)) as T;
    }
    
    if (input && typeof input === 'object') {
      const sanitized = {};
      for (const [key, value] of Object.entries(input)) {
        sanitized[key] = this.sanitizeInput(value);
      }
      return sanitized as T;
    }
    
    return input;
  }
}