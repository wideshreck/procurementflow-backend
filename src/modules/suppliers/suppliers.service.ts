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

    const existingSupplier = await this.prisma.supplier.findUnique({
      where: { id },
      include: { authorizedPersons: true },
    });

    if (!existingSupplier) {
      throw new NotFoundException(`Supplier with ID ${id} not found`);
    }

    const existingPersonIds = existingSupplier.authorizedPersons.map((p) => p.id);
    const incomingPersonIds = authorizedPersons?.map((p) => p.id).filter(Boolean) || [];

    const personIdsToDelete = existingPersonIds.filter((personId) => !incomingPersonIds.includes(personId));

    return this.prisma.supplier.update({
      where: { id },
      data: {
        ...supplierData,
        taxInfo: taxInfo as any,
        authorizedPersons: {
          deleteMany: {
            id: { in: personIdsToDelete },
          },
          upsert: authorizedPersons?.map((person) => ({
            where: { id: person.id || '' },
            update: { name: person.name, email: person.email, phone: person.phone },
            create: { name: person.name, email: person.email, phone: person.phone },
          })),
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
