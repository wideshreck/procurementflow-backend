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
    const { name, description, locationId, parentId, managerId } = createDepartmentDto;

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

    if (managerId) {
      const manager = await this.prisma.user.findUnique({
        where: { id: managerId },
      });
      if (!manager) {
        throw new NotFoundException('Yönetici bulunamadı');
      }
    }

    const newDepartment = await this.prisma.department.create({
      data: {
        name,
        description,
        locationId,
        parentId,
        managerId,
        companyId: user.companyId,
        createdById: userId,
      },
      include: {
        location: true,
        manager: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            costCenters: true,
          },
        },
      },
    });
    
    return {
      ...newDepartment,
      children: [],
      employeeCount: 0,
      costCenterCount: newDepartment._count?.costCenters || 0,
    };
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
      include: {
        location: true,
        manager: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
        children: true,
        _count: {
          select: {
            costCenters: true,
          },
        },
      },
    });

    // Get employee counts for each department
    const departmentIds = allDepartments.map(d => d.id);
    const employeeCounts = await this.prisma.user.groupBy({
      by: ['department'],
      where: {
        department: { in: departmentIds },
      },
      _count: true,
    });

    const buildHierarchy = (departments, parentId = null) => {
      return departments
        .filter((department) => department.parentId === parentId)
        .map((department) => {
          const employeeCount = employeeCounts.find(
            ec => ec.department === department.id
          )?._count || 0;

          return {
            ...department,
            employeeCount,
            costCenterCount: department._count?.costCenters || 0,
            children: buildHierarchy(departments, department.id),
          };
        });
    };

    return buildHierarchy(allDepartments);
  }

  async findOne(id: string, userId: string): Promise<DepartmentResponseDto> {
    const department = await this.prisma.department.findUnique({
      where: { id },
      include: { 
        children: true,
        location: true,
        manager: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            costCenters: true,
          },
        },
      },
    });
    if (!department) {
      throw new NotFoundException('Departman bulunamadı');
    }

    // Get employee count
    const employeeCount = await this.prisma.user.count({
      where: { department: id },
    });

    return {
      ...department,
      children: department.children.map((c) => ({ ...c, children: [] })),
      employeeCount,
      costCenterCount: department._count?.costCenters || 0,
    };
  }

  async update(
    id: string,
    updateDepartmentDto: UpdateDepartmentDto,
    userId: string,
  ): Promise<DepartmentResponseDto> {
    const { name, description, parentId, managerId, locationId } = updateDepartmentDto;

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

    if (managerId) {
      const manager = await this.prisma.user.findUnique({
        where: { id: managerId },
      });
      if (!manager) {
        throw new NotFoundException('Yönetici bulunamadı');
      }
    }

    const updatedDepartment = await this.prisma.department.update({
      where: { id },
      data: {
        ...updateDepartmentDto,
        updatedById: userId,
      },
      include: {
        location: true,
        manager: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            costCenters: true,
          },
        },
      },
    });

    // Get employee count
    const employeeCount = await this.prisma.user.count({
      where: { department: id },
    });

    return {
      ...updatedDepartment,
      children: [],
      employeeCount,
      costCenterCount: updatedDepartment._count?.costCenters || 0,
    };
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
