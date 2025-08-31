import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateContractInput } from './dto/create-contract.input';
import { UpdateContractInput } from './dto/update-contract.input';

@Injectable()
export class ContractsService {
  constructor(private readonly prisma: PrismaService) {}

  create(createContractInput: CreateContractInput) {
    return this.prisma.contract.create({
      data: {
        ...createContractInput,
        startDate: new Date(createContractInput.startDate),
        endDate: new Date(createContractInput.endDate),
      },
    });
  }

  findAll(supplierId: string) {
    return this.prisma.contract.findMany({
      where: { supplierId },
    });
  }

  findOne(id: string) {
    return this.prisma.contract.findUnique({
      where: { id },
    });
  }

  update(id: string, updateContractInput: UpdateContractInput) {
    return this.prisma.contract.update({
      where: { id },
      data: updateContractInput,
    });
  }

  remove(id: string) {
    return this.prisma.contract.delete({
      where: { id },
    });
  }
}
