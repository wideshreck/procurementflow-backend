import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCustomRoleDto } from './dto/create-custom-role.dto';
import { UpdateCustomRoleDto } from './dto/update-custom-role.dto';

@Injectable()
export class CustomRolesService {
  constructor(private prisma: PrismaService) {}

  async create(createCustomRoleDto: CreateCustomRoleDto) {
    return this.prisma.customRole.create({
      data: createCustomRoleDto,
    });
  }

  async findAll(companyId: string) {
    return this.prisma.customRole.findMany({
      where: { companyId },
    });
  }

  async findOne(id: string) {
    return this.prisma.customRole.findUnique({
      where: { id },
    });
  }

  async update(id: string, updateCustomRoleDto: UpdateCustomRoleDto) {
    return this.prisma.customRole.update({
      where: { id },
      data: updateCustomRoleDto,
    });
  }

  async remove(id: string) {
    return this.prisma.customRole.delete({
      where: { id },
    });
  }
}
