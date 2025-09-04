// wideshreck/procurementflow-backend/wideshreck-procurementflow-backend-0768a308fbe752315e97846a20fb1d9836a033ec/src/modules/departments/departments.service.ts

import { Injectable, NotFoundException, ConflictException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDepartmentDto, UpdateDepartmentDto, DepartmentResponseDto } from './dto/department.dto';

@Injectable()
export class DepartmentsService {
  constructor(private prisma: PrismaService) {}

  async create(createDepartmentDto: CreateDepartmentDto, userId: string): Promise<DepartmentResponseDto> {
    // Kullanıcının şirket bilgisini al
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true },
    });

    if (!user) {
      throw new NotFoundException('Kullanıcı bulunamadı');
    }

    // Yöneticinin aynı şirkette olduğunu kontrol et
    const manager = await this.prisma.user.findFirst({
      where: {
        id: createDepartmentDto.managerId,
        companyId: user.companyId,
      },
    });

    if (!manager) {
      throw new NotFoundException('Yönetici bulunamadı veya farklı bir şirkete ait');
    }

    // Lokasyonun aynı şirkete ait olduğunu kontrol et
    const location = await this.prisma.location.findFirst({
      where: {
        id: createDepartmentDto.locationId,
        companyId: user.companyId,
      },
    });

    if (!location) {
      throw new NotFoundException('Lokasyon bulunamadı veya farklı bir şirkete ait');
    }

    // Eğer üst departman belirtilmişse, aynı şirkete ait olduğunu kontrol et
    // Boş string gelirse null olarak kabul et
    if (createDepartmentDto.parentId) {
      const parentDepartment = await this.prisma.department.findFirst({
        where: {
          id: createDepartmentDto.parentId,
          companyId: user.companyId,
        },
      });

      if (!parentDepartment) {
        throw new NotFoundException('Üst departman bulunamadı veya farklı bir şirkete ait');
      }
    } else if (createDepartmentDto.parentId === '') {
      createDepartmentDto.parentId = null;
    }

    // Aynı isimde departman var mı kontrol et
    const existingDepartment = await this.prisma.department.findFirst({
      where: {
        name: createDepartmentDto.name,
        companyId: user.companyId,
        locationId: createDepartmentDto.locationId,
      },
    });

    if (existingDepartment) {
      throw new ConflictException('Bu lokasyonda aynı isimde bir departman zaten mevcut');
    }

    const department = await this.prisma.department.create({
      data: {
        ...createDepartmentDto,
        companyId: user.companyId,
      },
      include: {
        manager: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        location: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return department;
  }

  async findAll(userId: string): Promise<DepartmentResponseDto[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true },
    });

    if (!user) {
      throw new NotFoundException('Kullanıcı bulunamadı');
    }

    // Tüm departmanları al
    const departments = await this.prisma.department.findMany({
      where: { companyId: user.companyId },
      include: {
        manager: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        location: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
        children: {
          select: {
            id: true,
            name: true,
          },
        },
        costCenters: {
          select: {
            id: true,
            name: true,
            budget: true,
            remainingBudget: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Hiyerarşik yapıyı oluştur
    const departmentMap = new Map<string, DepartmentResponseDto>();
    const rootDepartments: DepartmentResponseDto[] = [];

    departments.forEach(dept => {
        const costCenters = dept.costCenters.map(cc => ({
            ...cc,
            budget: Number(cc.budget),
            remainingBudget: Number(cc.remainingBudget),
        }));
      departmentMap.set(dept.id, { ...dept, children: [], costCenters });
    });

    departments.forEach(dept => {
      if (dept.parentId) {
        const parent = departmentMap.get(dept.parentId);
        if (parent && parent.children) {
          parent.children.push(departmentMap.get(dept.id)!);
        }
      } else {
        rootDepartments.push(departmentMap.get(dept.id)!);
      }
    });

    return rootDepartments;
  }

  async findOne(id: string, userId: string): Promise<DepartmentResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true },
    });

    if (!user) {
      throw new NotFoundException('Kullanıcı bulunamadı');
    }

    const department = await this.prisma.department.findFirst({
      where: {
        id,
        companyId: user.companyId,
      },
      include: {
        manager: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        location: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
        // HATA DÜZELTMESİ: 'children' ilişkisi için de gerekli alanları dahil ediyoruz.
        children: {
          include: {
            manager: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
            location: {
              select: {
                id: true,
                name: true,
                address: true,
              },
            },
          },
        },
        costCenters: {
          select: {
            id: true,
            name: true,
            budget: true,
            remainingBudget: true,
            spentBudget: true,
          },
        },
      },
    });

    if (!department) {
      throw new NotFoundException('Departman bulunamadı');
    }

    const costCenters = department.costCenters.map(cc => ({
        ...cc,
        budget: Number(cc.budget),
        remainingBudget: Number(cc.remainingBudget),
        spentBudget: Number(cc.spentBudget),
    }));

    // HATA DÜZELTMESİ: 'children' özelliğini doğru tipe dönüştürüyoruz.
    return { ...department, children: department.children as DepartmentResponseDto[], costCenters };
  }

  async update(id: string, updateDepartmentDto: UpdateDepartmentDto, userId: string): Promise<DepartmentResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true, customRole: true },
    });

    if (!user) {
      throw new NotFoundException('Kullanıcı bulunamadı');
    }

    // Departmanın varlığını ve şirkete aitliğini kontrol et
    const existingDepartment = await this.prisma.department.findFirst({
      where: {
        id,
        companyId: user.companyId,
      },
    });

    if (!existingDepartment) {
      throw new NotFoundException('Departman bulunamadı');
    }

    // Yönetici güncelleniyorsa kontrol et
    if (updateDepartmentDto.managerId) {
      const manager = await this.prisma.user.findFirst({
        where: {
          id: updateDepartmentDto.managerId,
          companyId: user.companyId,
        },
      });

      if (!manager) {
        throw new NotFoundException('Yönetici bulunamadı veya farklı bir şirkete ait');
      }
    }

    // Lokasyon güncelleniyorsa kontrol et
    if (updateDepartmentDto.locationId) {
      const location = await this.prisma.location.findFirst({
        where: {
          id: updateDepartmentDto.locationId,
          companyId: user.companyId,
        },
      });

      if (!location) {
        throw new NotFoundException('Lokasyon bulunamadı veya farklı bir şirkete ait');
      }
    }

    // Üst departman güncelleniyorsa kontrol et
    if (updateDepartmentDto.parentId !== undefined) {
      if (updateDepartmentDto.parentId === id) {
        throw new BadRequestException('Bir departman kendi üst departmanı olamaz');
      }

      if (updateDepartmentDto.parentId) {
        const parentDepartment = await this.prisma.department.findFirst({
          where: {
            id: updateDepartmentDto.parentId,
            companyId: user.companyId,
          },
        });

        if (!parentDepartment) {
          throw new NotFoundException('Üst departman bulunamadı veya farklı bir şirkete ait');
        }

        // Döngüsel bağımlılık kontrolü
        if (await this.checkCircularDependency(id, updateDepartmentDto.parentId)) {
          throw new BadRequestException('Bu işlem döngüsel bir bağımlılık oluşturacak');
        }
      }
    }

    const department = await this.prisma.department.update({
      where: { id },
      data: updateDepartmentDto,
      include: {
        manager: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        location: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return department;
  }

  async remove(id: string, userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { customRole: true },
    });

    if (!user) {
      throw new NotFoundException('Kullanıcı bulunamadı');
    }

    const permissions = user.customRole?.permissions as string[];
    if (!permissions?.includes('departments:delete')) {
      throw new ForbiddenException('Bu işlem için yetkiniz yok');
    }

    const department = await this.prisma.department.findFirst({
      where: {
        id,
        companyId: user.companyId,
      },
      include: {
        children: true,
        costCenters: true,
      },
    });

    if (!department) {
      throw new NotFoundException('Departman bulunamadı');
    }

    // Alt departmanlar varsa silinemesin
    if (department.children.length > 0) {
      throw new ConflictException('Bu departmana bağlı alt departmanlar var');
    }

    // Maliyet merkezleri varsa silinemesin
    if (department.costCenters.length > 0) {
      throw new ConflictException('Bu departmana bağlı maliyet merkezleri var');
    }

    await this.prisma.department.delete({
      where: { id },
    });
  }

  private async checkCircularDependency(departmentId: string, parentId: string): Promise<boolean> {
    let currentId: string | null = parentId;
    const visited = new Set<string>();

    while (currentId) {
      if (visited.has(currentId)) {
        return true; // Döngü tespit edildi
      }
      if (currentId === departmentId) {
        return true; // Departman kendi alt departmanı olamaz
      }
      visited.add(currentId);

      const parent = await this.prisma.department.findUnique({
        where: { id: currentId },
        select: { parentId: true },
      });

      currentId = parent?.parentId ?? null;
    }

    return false;
  }
}
