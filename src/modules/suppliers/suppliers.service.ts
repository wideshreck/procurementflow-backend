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
    skip?: number;
    take?: number;
    cursor?: Prisma.SupplierWhereUniqueInput;
    where?: Prisma.SupplierWhereInput;
    orderBy?: Prisma.SupplierOrderByWithRelationInput;
  }): Promise<Supplier[]> {
    const { skip, take, cursor, where, orderBy } = params;

    return this.prisma.supplier.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
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

  async getUserById(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        companyId: true,
        company: true
      }
    });
  }
}
