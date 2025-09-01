import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEmailInput } from './dto/create-email.input';
import { UpdateEmailInput } from './dto/update-email.input';

@Injectable()
export class EmailsService {
  constructor(private readonly prisma: PrismaService) {}

  create(createEmailInput: CreateEmailInput) {
    return this.prisma.email.create({
      data: createEmailInput,
    });
  }

  findAll(supplierId: string) {
    return this.prisma.email.findMany({
      where: { supplierId },
    });
  }

  findOne(id: string) {
    return this.prisma.email.findUnique({
      where: { id },
    });
  }

  update(id: string, updateEmailInput: UpdateEmailInput) {
    return this.prisma.email.update({
      where: { id },
      data: updateEmailInput,
    });
  }

  remove(id: string) {
    return this.prisma.email.delete({
      where: { id },
    });
  }
}
