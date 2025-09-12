import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, Supplier } from '@prisma/client';

@Injectable()
export class SuppliersService {
  constructor(private prisma: PrismaService) {}

  async create(data: Prisma.SupplierUncheckedCreateInput, userId: string): Promise<Supplier> {
    const { contacts, documents, notes, customFields, categories, productsAndServices, purchaseOrders, ...supplierData } = data;
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }

    return this.prisma.supplier.create({
      data: {
        ...supplierData,
        companyId: user.companyId,
        contacts: { create: contacts as any },
        documents: { create: documents as any },
        notes: { create: notes as any },
        customFields: { create: customFields as any },
        categories: { create: categories as any },
        productsAndServices: { create: productsAndServices as any },
        purchaseOrders: { create: purchaseOrders as any },
      },
    });
  }

  async findAll(params: {
    search?: string;
    status?: string;
    supplierType?: string;
    category?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: string;
    companyId?: string;
  }): Promise<{ suppliers: Supplier[]; total: number; page: number; limit: number; totalPages: number }> {
    const { search, status, supplierType, category, page = 1, limit = 10, sortBy = 'companyName', sortOrder = 'asc', companyId } = params;

    // Build where clause
    const where: Prisma.SupplierWhereInput = {
      ...(companyId && { companyId }),
      ...(status && { status: status as any }),
      ...(supplierType && { supplierType: supplierType as any }),
      ...(search && {
        OR: [
          { companyName: { contains: search, mode: 'insensitive' } },
          { brandName: { contains: search, mode: 'insensitive' } },
          { taxNumber: { contains: search, mode: 'insensitive' } },
          { contacts: { some: { fullName: { contains: search, mode: 'insensitive' } } } },
        ],
      }),
      ...(category && {
        categories: { some: { category: { name: { contains: category, mode: 'insensitive' } } } },
      }),
    };

    // Build orderBy clause
    const orderBy: Prisma.SupplierOrderByWithRelationInput = {
      [sortBy]: sortOrder === 'desc' ? 'desc' : 'asc',
    };

    const skip = (page - 1) * limit;

    const [suppliers, total] = await Promise.all([
      this.prisma.supplier.findMany({
        skip,
        take: limit,
        where,
        orderBy,
        include: {
          contacts: true,
          documents: true,
          notes: true,
          customFields: true,
          categories: { include: { category: true } },
          productsAndServices: true,
          purchaseOrders: { 
            include: { items: true },
            orderBy: { orderDate: 'desc' },
            take: 5 // Only latest 5 orders for performance
          },
        },
      }),
      this.prisma.supplier.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      suppliers,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async findOne(where: Prisma.SupplierWhereUniqueInput): Promise<Supplier | null> {
    return this.prisma.supplier.findUnique({
      where,
      include: {
        contacts: true,
        documents: true,
        notes: true,
        customFields: true,
        categories: { include: { category: true } },
        productsAndServices: true,
        purchaseOrders: { include: { items: true } },
      },
    });
  }

  async update(params: {
    where: Prisma.SupplierWhereUniqueInput;
    data: Prisma.SupplierUpdateInput;
    userId: string; // Add userId parameter
  }): Promise<Supplier> {
    const { where, data, userId } = params;
    const { contacts, documents, notes, customFields, categories, productsAndServices, purchaseOrders, ...supplierData } = data;

    return this.prisma.supplier.update({
      where: {
        id: where.id
      },
      data: {
        ...supplierData,
        contacts: contacts && {
          deleteMany: {},
          create: (contacts as any[]).map(c => ({
            fullName: c.fullName,
            email: c.email,
            phone: c.phone,
            title: c.title,
            role: c.role,
          })),
        },
        documents: documents && {
          deleteMany: {},
          create: (documents as any[]).map(d => ({
            title: d.title,
            documentType: d.documentType,
            fileUrl: d.fileUrl,
            uploadedAt: d.uploadedAt,
            validUntil: d.validUntil,
            uploadedBy: {
              connect: { id: userId }
            }
          })),
        },
        notes: notes && {
          deleteMany: {},
          create: (notes as any[]).map(note => ({
            title: note.title,
            participants: note.participants,
            notes: note.notes,
            meetingDate: note.meetingDate,
            createdBy: {
              connect: { id: userId } // Use the current user's ID
            }
          })),
        },
        customFields: customFields && {
          deleteMany: {},
          create: (customFields as any[]).map(field => ({
            fieldName: field.fieldName,
            fieldValue: field.fieldValue
          })),
        },
        categories: categories && {
          deleteMany: {},
          create: categories as any,
        },
        productsAndServices: productsAndServices && {
          deleteMany: {},
          create: productsAndServices as any,
        },
        purchaseOrders: purchaseOrders && {
          deleteMany: {},
          create: purchaseOrders as any,
        },
      },
    });
  }

  async remove(where: Prisma.SupplierWhereUniqueInput): Promise<Supplier> {
    return this.prisma.supplier.delete({ where });
  }

  async bulkDelete(ids: string[], companyId?: string): Promise<{ count: number }> {
    const whereClause: Prisma.SupplierWhereInput = {
      id: { in: ids },
      ...(companyId && { companyId }),
    };

    return this.prisma.supplier.deleteMany({
      where: whereClause,
    });
  }

  async export(params: {
    search?: string;
    status?: string;
    supplierType?: string;
    category?: string;
    companyId?: string;
  }): Promise<Supplier[]> {
    const { search, status, supplierType, category, companyId } = params;

    // Build where clause (same as findAll)
    const where: Prisma.SupplierWhereInput = {
      ...(companyId && { companyId }),
      ...(status && { status: status as any }),
      ...(supplierType && { supplierType: supplierType as any }),
      ...(search && {
        OR: [
          { companyName: { contains: search, mode: 'insensitive' } },
          { brandName: { contains: search, mode: 'insensitive' } },
          { taxNumber: { contains: search, mode: 'insensitive' } },
          { contacts: { some: { fullName: { contains: search, mode: 'insensitive' } } } },
        ],
      }),
      ...(category && {
        categories: { some: { category: { name: { contains: category, mode: 'insensitive' } } } },
      }),
    };

    return this.prisma.supplier.findMany({
      where,
      orderBy: { companyName: 'asc' },
      include: {
        contacts: true,
        categories: { include: { category: true } },
        purchaseOrders: { 
          include: { items: true },
          orderBy: { orderDate: 'desc' }
        },
      },
    });
  }
}
