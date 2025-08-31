import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateSupplierInput } from './dto/create-supplier.input';
import { UpdateSupplierInput } from './dto/update-supplier.input';

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createSupplierInput: CreateSupplierInput, companyId: string) {
    const { authorizedPersons, taxInfo, ...supplierData } = createSupplierInput;

    return this.prisma.supplier.create({
      data: {
        ...supplierData,
        taxInfo: taxInfo as any,
        companyId,
        authorizedPersons: {
          create: authorizedPersons,
        },
      },
      include: {
        authorizedPersons: true,
      },
    });
  }

  findAll(companyId: string) {
    return this.prisma.supplier.findMany({
      where: { companyId },
      include: {
        authorizedPersons: true,
        documents: true,
      },
    });
  }

  async findOne(id: string) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id },
      include: {
        authorizedPersons: true,
        documents: true,
      },
    });
    if (!supplier) {
      throw new NotFoundException(`Supplier with ID ${id} not found`);
    }
    return supplier;
  }

  async update(id: string, updateSupplierInput: UpdateSupplierInput) {
    const { authorizedPersons, taxInfo, ...supplierData } = updateSupplierInput;

    return this.prisma.supplier.update({
      where: { id },
      data: {
        ...supplierData,
        taxInfo: taxInfo as any,
        authorizedPersons: {
          deleteMany: {}, // Clear existing persons
          create: authorizedPersons, // Create new ones
        },
      },
      include: {
        authorizedPersons: true,
      },
    });
  }

  remove(id: string) {
    return this.prisma.supplier.delete({
      where: { id },
    });
  }

  async addDocument(supplierId: string, fileName: string, filePath: string, fileType: string) {
    return this.prisma.supplierDocument.create({
      data: {
        supplierId,
        fileName,
        filePath,
        fileType,
      },
    });
  }

  async updatePhoto(supplierId: string, imageUrl: string) {
    return this.prisma.supplier.update({
      where: { id: supplierId },
      data: { imageUrl },
    });
  }
}
