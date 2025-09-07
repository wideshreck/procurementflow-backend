import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateDepartmentDto,
  UpdateDepartmentDto,
  DepartmentResponseDto,
} from './dto/department.dto';
import { Department } from '@prisma/client';

@Injectable()
export class DepartmentsService {
  constructor(private prisma: PrismaService) {}

  async create(
    createDepartmentDto: CreateDepartmentDto,
    userId: string,
  ): Promise<DepartmentResponseDto> {
    const { name, locationId, parentId } = createDepartmentDto;

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Kullanıcı bulunamadı');
    }

    const existingDepartment = await this.prisma.department.findFirst({
      where: { name, locationId },
    });

    if (existingDepartment) {
      throw new ConflictException(
        'Bu lokasyonda aynı isimde bir departman zaten mevcut',
      );
    }

    if (parentId) {
      const parentDepartment = await this.prisma.department.findUnique({
        where: { id: parentId },
      });
      if (!parentDepartment) {
        throw new NotFoundException('Üst departman bulunamadı');
      }
    }

    const newDepartment = await this.prisma.department.create({
      data: {
        name,
        locationId,
        parentId,
        companyId: user.companyId,
        createdById: userId,
      },
    });
    return { ...newDepartment, children: [] };
  }

  async findAll(
    userId: string,
    params?: { searchTerm?: string; location?: string },
  ): Promise<DepartmentResponseDto[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Kullanıcı bulunamadı');
    }

    const where: any = { companyId: user.companyId };

    if (params?.searchTerm) {
      where.name = { contains: params.searchTerm, mode: 'insensitive' };
    }

    if (params?.location) {
      where.location = { name: params.location };
    }

    const allDepartments = await this.prisma.department.findMany({
      where,
      include: { children: true },
    });

    const buildHierarchy = (departments, parentId = null) => {
      return departments
        .filter((department) => department.parentId === parentId)
        .map((department) => ({
          ...department,
          children: buildHierarchy(departments, department.id),
        }));
    };

    return buildHierarchy(allDepartments);
  }

  async findOne(id: string, userId: string): Promise<DepartmentResponseDto> {
    const department = await this.prisma.department.findUnique({
      where: { id },
      include: { children: true },
    });
    if (!department) {
      throw new NotFoundException('Departman bulunamadı');
    }
    return {
      ...department,
      children: department.children.map((c) => ({ ...c, children: [] })),
    };
  }

  async update(
    id: string,
    updateDepartmentDto: UpdateDepartmentDto,
    userId: string,
  ): Promise<DepartmentResponseDto> {
    const { name, parentId } = updateDepartmentDto;

    const department = await this.prisma.department.findUnique({
      where: { id },
    });

    if (!department) {
      throw new NotFoundException('Departman bulunamadı');
    }

    if (name && name !== department.name) {
      const existingDepartment = await this.prisma.department.findFirst({
        where: {
          name,
          locationId: department.locationId,
          id: { not: id },
        },
      });
      if (existingDepartment) {
        throw new ConflictException(
          'Bu lokasyonda aynı isimde başka bir departman zaten mevcut',
        );
      }
    }

    if (parentId) {
      if (parentId === id) {
        throw new BadRequestException(
          'Bir departman kendi kendisinin üst departmanı olamaz',
        );
      }
      const parentDepartment = await this.prisma.department.findUnique({
        where: { id: parentId },
      });
      if (!parentDepartment) {
        throw new NotFoundException('Üst departman bulunamadı');
      }
    }

    const updatedDepartment = await this.prisma.department.update({
      where: { id },
      data: {
        ...updateDepartmentDto,
        updatedById: userId,
      },
    });
    return { ...updatedDepartment, children: [] };
  }

  async remove(id: string, userId: string): Promise<void> {
    const department = await this.prisma.department.findUnique({
      where: { id },
      include: { children: true, costCenters: true },
    });

    if (!department) {
      throw new NotFoundException('Departman bulunamadı');
    }

    if (department.children.length > 0) {
      throw new ConflictException(
        'Bu departmana bağlı alt departmanlar var. Önce alt departmanları silin.',
      );
    }

    if (department.costCenters.length > 0) {
      throw new ConflictException(
        'Bu departmana bağlı maliyet merkezleri var.',
      );
    }

    await this.prisma.department.delete({ where: { id } });
  }
}
