import { Injectable, NotFoundException, ConflictException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCostCenterDto, UpdateCostCenterDto, CostCenterResponseDto } from './dto/cost-center.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class CostCentersService {
  constructor(private prisma: PrismaService) {}

  async create(createCostCenterDto: CreateCostCenterDto, userId: string): Promise<CostCenterResponseDto> {
    // Kullanıcının şirket bilgisini al
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true },
    });

    if (!user) {
      throw new NotFoundException('Kullanıcı bulunamadı');
    }

    // Bütçe sahibinin aynı şirkette olduğunu kontrol et
    const budgetOwner = await this.prisma.user.findFirst({
      where: {
        id: createCostCenterDto.budgetOwnerId,
        companyId: user.companyId,
      },
    });

    if (!budgetOwner) {
      throw new NotFoundException('Bütçe sahibi bulunamadı veya farklı bir şirkete ait');
    }

    // Departmanın aynı şirkete ait olduğunu kontrol et
    const department = await this.prisma.department.findFirst({
      where: {
        id: createCostCenterDto.departmentId,
        companyId: user.companyId,
      },
    });

    if (!department) {
      throw new NotFoundException('Departman bulunamadı veya farklı bir şirkete ait');
    }

    // Aynı isimde maliyet merkezi var mı kontrol et
    const existingCostCenter = await this.prisma.costCenter.findFirst({
      where: {
        name: createCostCenterDto.name,
        departmentId: createCostCenterDto.departmentId,
      },
    });

    if (existingCostCenter) {
      throw new ConflictException('Bu departmanda aynı isimde bir maliyet merkezi zaten mevcut');
    }

    const costCenter = await this.prisma.costCenter.create({
      data: {
        ...createCostCenterDto,
        companyId: user.companyId,
        remainingBudget: createCostCenterDto.budget,
        spentBudget: 0,
      },
      include: {
        budgetOwner: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        department: {
          select: {
            id: true,
            name: true,
            location: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return this.mapToCostCenterResponse(costCenter);
  }

  async findAll(userId: string): Promise<CostCenterResponseDto[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true },
    });

    if (!user) {
      throw new NotFoundException('Kullanıcı bulunamadı');
    }

    const costCenters = await this.prisma.costCenter.findMany({
      where: { companyId: user.companyId },
      include: {
        budgetOwner: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        department: {
          select: {
            id: true,
            name: true,
            location: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return costCenters.map(cc => this.mapToCostCenterResponse(cc));
  }

  async findOne(id: string, userId: string): Promise<CostCenterResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true },
    });

    if (!user) {
      throw new NotFoundException('Kullanıcı bulunamadı');
    }

    const costCenter = await this.prisma.costCenter.findFirst({
      where: {
        id,
        companyId: user.companyId,
      },
      include: {
        budgetOwner: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        department: {
          select: {
            id: true,
            name: true,
            location: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!costCenter) {
      throw new NotFoundException('Maliyet merkezi bulunamadı');
    }

    return this.mapToCostCenterResponse(costCenter);
  }

  async update(id: string, updateCostCenterDto: UpdateCostCenterDto, userId: string): Promise<CostCenterResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true, role: true },
    });

    if (!user) {
      throw new NotFoundException('Kullanıcı bulunamadı');
    }

    // Maliyet merkezinin varlığını ve şirkete aitliğini kontrol et
    const existingCostCenter = await this.prisma.costCenter.findFirst({
      where: {
        id,
        companyId: user.companyId,
      },
    });

    if (!existingCostCenter) {
      throw new NotFoundException('Maliyet merkezi bulunamadı');
    }

    // Bütçe sahibi güncelleniyorsa kontrol et
    if (updateCostCenterDto.budgetOwnerId) {
      const budgetOwner = await this.prisma.user.findFirst({
        where: {
          id: updateCostCenterDto.budgetOwnerId,
          companyId: user.companyId,
        },
      });

      if (!budgetOwner) {
        throw new NotFoundException('Bütçe sahibi bulunamadı veya farklı bir şirkete ait');
      }
    }

    // Departman güncelleniyorsa kontrol et
    if (updateCostCenterDto.departmentId) {
      const department = await this.prisma.department.findFirst({
        where: {
          id: updateCostCenterDto.departmentId,
          companyId: user.companyId,
        },
      });

      if (!department) {
        throw new NotFoundException('Departman bulunamadı veya farklı bir şirkete ait');
      }
    }

    // Bütçe güncelleniyorsa, kalan bütçeyi de güncelle
    let dataToUpdate: any = { ...updateCostCenterDto };
    if (updateCostCenterDto.budget !== undefined) {
      const budgetDiff = new Decimal(updateCostCenterDto.budget).minus(existingCostCenter.budget);
      const newRemainingBudget = new Decimal(existingCostCenter.remainingBudget).plus(budgetDiff);
      
      if (newRemainingBudget.lessThan(0)) {
        throw new BadRequestException('Yeni bütçe, harcanan miktardan az olamaz');
      }

      dataToUpdate.remainingBudget = newRemainingBudget;
    }

    const costCenter = await this.prisma.costCenter.update({
      where: { id },
      data: dataToUpdate,
      include: {
        budgetOwner: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        department: {
          select: {
            id: true,
            name: true,
            location: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return this.mapToCostCenterResponse(costCenter);
  }

  async remove(id: string, userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true, role: true },
    });

    if (!user) {
      throw new NotFoundException('Kullanıcı bulunamadı');
    }

    // Sadece ADMIN rolü silebilir
    if (user.role !== 'ADMIN') {
      throw new ForbiddenException('Bu işlem için yetkiniz yok');
    }

    const costCenter = await this.prisma.costCenter.findFirst({
      where: {
        id,
        companyId: user.companyId,
      },
    });

    if (!costCenter) {
      throw new NotFoundException('Maliyet merkezi bulunamadı');
    }

    // Harcama varsa uyarı ver
    // DÜZELTME: Decimal tipi `greaterThan` metodu ile karşılaştırıldı.
    if (new Decimal(costCenter.spentBudget).greaterThan(0)) {
      throw new ConflictException('Bu maliyet merkezinde harcama yapılmış, silinemez');
    }

    await this.prisma.costCenter.delete({
      where: { id },
    });
  }

  private mapToCostCenterResponse(costCenter: any): CostCenterResponseDto {
    const budget = Number(costCenter.budget);
    const remainingBudget = Number(costCenter.remainingBudget);
    const spentBudget = Number(costCenter.spentBudget);
    
    const budgetUtilization = budget > 0 ? (spentBudget / budget) * 100 : 0;
    let budgetStatus: 'under' | 'near' | 'over' = 'under';
    
    if (budgetUtilization >= 100) {
      budgetStatus = 'over';
    } else if (budgetUtilization >= 80) {
      budgetStatus = 'near';
    }

    return {
      ...costCenter,
      budget,
      remainingBudget,
      spentBudget,
      budgetUtilization: Math.round(budgetUtilization * 100) / 100,
      budgetStatus,
    };
  }
}