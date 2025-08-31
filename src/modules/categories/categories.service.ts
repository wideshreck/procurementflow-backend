import { Injectable, NotFoundException, ConflictException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCategoryDto, UpdateCategoryDto, CategoryResponseDto } from './dto/category.dto';
import { Category, Prisma } from '@prisma/client';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  private async getCompanyId(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true },
    });
    if (!user || !user.companyId) {
      throw new NotFoundException('Kullanıcı veya şirket bilgisi bulunamadı');
    }
    return user.companyId;
  }

  async create(createCategoryDto: CreateCategoryDto, userId: string): Promise<CategoryResponseDto> {
    const companyId = await this.getCompanyId(userId);

    return this.prisma.$transaction(async (tx) => {
      let level = 1;
      let parentCategory: Category | null = null;
      let categoryCode: string;

      if (createCategoryDto.ParentCategoryID) {
        parentCategory = await tx.category.findFirst({
          where: {
            CategoryID: createCategoryDto.ParentCategoryID,
            companyId,
          },
        });

        if (!parentCategory) {
          throw new NotFoundException('Üst kategori bulunamadı veya farklı bir şirkete ait');
        }
        if (parentCategory.level >= 3) {
          throw new BadRequestException('Detay kategorisinin altına yeni kategori eklenemez.');
        }
        level = parentCategory.level + 1;
      }

      const existingCategory = await tx.category.findFirst({
        where: {
          name: createCategoryDto.name,
          ParentCategoryID: createCategoryDto.ParentCategoryID || null,
          companyId,
        },
      });

      if (existingCategory) {
        throw new ConflictException('Bu seviyede aynı isimde bir kategori zaten mevcut');
      }

      if (parentCategory) {
        const lastChild = await tx.category.findFirst({
          where: { ParentCategoryID: parentCategory.CategoryID, companyId },
          orderBy: { categoryCode: 'desc' },
        });
        if (lastChild) {
          const parts = lastChild.categoryCode.split('-');
          const lastNumber = parseInt(parts[parts.length - 1], 10);
          categoryCode = `${parentCategory.categoryCode}-${lastNumber + 1}`;
        } else {
          categoryCode = `${parentCategory.categoryCode}-1`;
        }
      } else {
        const lastRootCategory = await tx.category.findFirst({
          where: { ParentCategoryID: null, companyId },
          orderBy: { categoryCode: 'desc' },
        });
        if (lastRootCategory) {
          const lastCode = parseInt(lastRootCategory.categoryCode, 10);
          categoryCode = (lastCode + 1).toString();
        } else {
          categoryCode = '100000';
        }
      }

      const { parentName, ...dataToCreate } = createCategoryDto;

      const category = await tx.category.create({
        data: {
          ...dataToCreate,
          categoryCode,
          level,
          companyId,
        },
        include: {
          parent: { select: { CategoryID: true, name: true } },
        },
      });

      return this.mapToCategoryResponseDto(category);
    });
  }

  async bulkCreate(createCategoryDtos: CreateCategoryDto[], userId: string): Promise<{ count: number }> {
    const companyId = await this.getCompanyId(userId);
    let createdCount = 0;

    await this.prisma.$transaction(async (tx) => {
      const categoriesByName = new Map<string, Category>();
      const existingCategories = await tx.category.findMany({ where: { companyId } });
      existingCategories.forEach(c => categoriesByName.set(c.name, c));

      const dtosByParentName = new Map<string, CreateCategoryDto[]>();
      const rootDtos: CreateCategoryDto[] = [];

      for (const dto of createCategoryDtos) {
        if (dto.parentName) {
          if (!dtosByParentName.has(dto.parentName)) {
            dtosByParentName.set(dto.parentName, []);
          }
          dtosByParentName.get(dto.parentName)!.push(dto);
        } else {
          rootDtos.push(dto);
        }
      }

      const createCategoryRecursive = async (dto: CreateCategoryDto, parentId?: string) => {
        if (categoriesByName.has(dto.name)) {
          return; 
        }
        
        try {
          const createdCategory = await this.createInTransaction(tx, { ...dto, ParentCategoryID: parentId }, companyId);
          categoriesByName.set(createdCategory.name, createdCategory as Category);
          createdCount++;

          if (dtosByParentName.has(dto.name)) {
            const childrenDtos = dtosByParentName.get(dto.name)!;
            for (const childDto of childrenDtos) {
              await createCategoryRecursive(childDto, createdCategory.CategoryID);
            }
          }
        } catch (error) {
            console.error(`Kategori oluşturulamadı: ${dto.name}. Hata: ${error.message}`);
        }
      };

      for (const dto of rootDtos) {
        await createCategoryRecursive(dto);
      }

      for (const [parentName, dtos] of dtosByParentName.entries()) {
          if (categoriesByName.has(parentName)) {
              for (const dto of dtos) {
                  await createCategoryRecursive(dto, categoriesByName.get(parentName)!.CategoryID);
              }
          }
      }
    });

    return { count: createdCount };
  }

  private async createInTransaction(
    tx: Omit<Prisma.TransactionClient, '$commit' | '$rollback'>,
    dto: CreateCategoryDto,
    companyId: string
  ): Promise<Category> {
    let level = 1;
    let parentCategory: Category | null = null;
    let categoryCode: string;

    if (dto.ParentCategoryID) {
      parentCategory = await tx.category.findUnique({ where: { CategoryID: dto.ParentCategoryID } });
      if (!parentCategory) throw new Error(`Üst kategori bulunamadı: ${dto.ParentCategoryID}`);
      level = parentCategory.level + 1;
    }

    if (parentCategory) {
      const lastChild = await tx.category.findFirst({
        where: { ParentCategoryID: parentCategory.CategoryID },
        orderBy: { categoryCode: 'desc' },
      });
      categoryCode = lastChild
        ? `${parentCategory.categoryCode}-${parseInt(lastChild.categoryCode.split('-').pop()!) + 1}`
        : `${parentCategory.categoryCode}-1`;
    } else {
      const lastRoot = await tx.category.findFirst({
        where: { ParentCategoryID: null, companyId },
        orderBy: { categoryCode: 'desc' },
      });
      categoryCode = lastRoot ? (parseInt(lastRoot.categoryCode) + 1).toString() : '100000';
    }

    const { parentName, ...dataToCreate } = dto;
    return tx.category.create({
      data: { ...dataToCreate, categoryCode, level, companyId },
    });
  }

  async findAll(
    userId: string,
    includeInactive: boolean = false,
    format: 'flat' | 'hierarchical' = 'hierarchical',
  ): Promise<CategoryResponseDto[]> {
    const companyId = await this.getCompanyId(userId);
    const whereClause: Prisma.CategoryWhereInput = { companyId };
    if (!includeInactive) {
      whereClause.isActive = true;
    }

    const categories = await this.prisma.category.findMany({
      where: whereClause,
      include: {
        parent: { select: { CategoryID: true, name: true } },
        _count: { select: { products: true, services: true } },
      },
      orderBy: { categoryCode: 'asc' },
    });

    const categoriesWithCounts = categories.map(c => this.mapToCategoryResponseDto(c));

    if (format === 'flat') {
      return categoriesWithCounts;
    }

    return this.buildHierarchy(categoriesWithCounts);
  }

  async findOne(id: string, userId: string): Promise<CategoryResponseDto> {
    const companyId = await this.getCompanyId(userId);
    const category = await this.prisma.category.findFirst({
      where: { CategoryID: id, companyId },
      include: {
        parent: { select: { CategoryID: true, name: true } },
        children: {
            include: {
                _count: { select: { products: true, services: true } }
            }
        },
        _count: { select: { products: true, services: true } },
      },
    });

    if (!category) {
      throw new NotFoundException('Kategori bulunamadı');
    }

    const response = this.mapToCategoryResponseDto(category);
    if (category.children) {
        response.children = category.children.map(c => this.mapToCategoryResponseDto(c));
    }
    return response;
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto, userId: string): Promise<CategoryResponseDto> {
    const companyId = await this.getCompanyId(userId);

    return this.prisma.$transaction(async (tx) => {
      const categoryToUpdate = await tx.category.findFirst({
        where: { CategoryID: id, companyId },
      });

      if (!categoryToUpdate) {
        throw new NotFoundException('Kategori bulunamadı');
      }

      const data: Prisma.CategoryUpdateInput = { ...updateCategoryDto };

      if (updateCategoryDto.ParentCategoryID !== undefined && updateCategoryDto.ParentCategoryID !== categoryToUpdate.ParentCategoryID) {
        if (updateCategoryDto.ParentCategoryID === id) {
          throw new BadRequestException('Bir kategori kendi üst kategorisi olamaz');
        }

        let newLevel = 1;
        if (updateCategoryDto.ParentCategoryID) {
          const parentCategory = await tx.category.findFirst({
            where: { CategoryID: updateCategoryDto.ParentCategoryID, companyId },
          });

          if (!parentCategory) {
            throw new NotFoundException('Üst kategori bulunamadı');
          }
          if (parentCategory.level >= 3) {
            throw new BadRequestException('Detay kategorisi altına taşıma yapılamaz.');
          }
          if (await this.isCircular(tx, id, updateCategoryDto.ParentCategoryID)) {
            throw new BadRequestException('Döngüsel bağımlılık oluşturulamaz.');
          }
          
          const maxChildLevel = await this.getMaxChildLevel(tx, id);
          if (parentCategory.level + 1 + maxChildLevel > 3) {
              throw new BadRequestException('Bu taşıma işlemi 3 seviye kuralını ihlal ediyor.');
          }
          newLevel = parentCategory.level + 1;
        }
        data.level = newLevel;
        await this.updateChildLevels(tx, id, newLevel);
      }

      const updatedCategory = await tx.category.update({
        where: { CategoryID: id },
        data,
        include: { parent: { select: { CategoryID: true, name: true } } },
      });

      return this.mapToCategoryResponseDto(updatedCategory);
    });
  }

  async removeAll(userId: string): Promise<{ count: number }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Kullanıcı bulunamadı');
    if (user.role !== 'ADMIN') throw new ForbiddenException('Bu işlem için yetkiniz yok');

    return this.prisma.$transaction(async (tx) => {
      await tx.product.updateMany({ where: { companyId: user.companyId }, data: { CategoryID: null } });
      await tx.service.updateMany({ where: { companyId: user.companyId }, data: { CategoryID: null } });
      await tx.procurementRequest.updateMany({ where: { category: { companyId: user.companyId } }, data: { categoryId: null } });
      return tx.category.deleteMany({ where: { companyId: user.companyId } });
    });
  }

  async remove(id: string, userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Kullanıcı bulunamadı');
    if (user.role !== 'ADMIN') throw new ForbiddenException('Bu işlem için yetkiniz yok');

    const category = await this.prisma.category.findFirst({
      where: { CategoryID: id, companyId: user.companyId },
      include: { _count: { select: { children: true, products: true, services: true } } },
    });

    if (!category) throw new NotFoundException('Kategori bulunamadı');
    if (category._count.children > 0) throw new ConflictException('Bu kategoriye bağlı alt kategoriler var');
    if (category._count.products > 0 || category._count.services > 0) {
      throw new ConflictException('Bu kategoriye bağlı ürün veya hizmetler var');
    }

    await this.prisma.category.delete({ where: { CategoryID: id } });
  }

  private async isCircular(tx: any, categoryId: string, parentId: string | null): Promise<boolean> {
    let currentId = parentId;
    while (currentId) {
      if (currentId === categoryId) return true;
      const parent = await tx.category.findUnique({
        where: { CategoryID: currentId },
        select: { ParentCategoryID: true },
      });
      currentId = parent?.ParentCategoryID ?? null;
    }
    return false;
  }

  private async updateChildLevels(tx: any, parentId: string, parentLevel: number): Promise<void> {
    const children = await tx.category.findMany({ where: { ParentCategoryID: parentId } });
    for (const child of children) {
      const newLevel = parentLevel + 1;
      await tx.category.update({ where: { CategoryID: child.CategoryID }, data: { level: newLevel } });
      await this.updateChildLevels(tx, child.CategoryID, newLevel);
    }
  }

  private async getMaxChildLevel(tx: any, categoryId: string): Promise<number> {
    const children = await tx.category.findMany({ where: { ParentCategoryID: categoryId } });
    if (children.length === 0) return 0;
    let maxLevel = 0;
    for (const child of children) {
      const childLevel = await this.getMaxChildLevel(tx, child.CategoryID);
      if (childLevel > maxLevel) maxLevel = childLevel;
    }
    return maxLevel + 1;
  }

  private mapToCategoryResponseDto(category: any): CategoryResponseDto {
    const { _count, ...rest } = category;
    return {
      ...rest,
      productCount: _count?.products ?? 0,
      serviceCount: _count?.services ?? 0,
    };
  }

  private buildHierarchy(categories: CategoryResponseDto[]): CategoryResponseDto[] {
    const categoryMap = new Map<string, CategoryResponseDto>();
    const rootCategories: CategoryResponseDto[] = [];

    categories.forEach(cat => {
      cat.children = [];
      categoryMap.set(cat.CategoryID, cat);
    });

    categories.forEach(cat => {
      if (cat.ParentCategoryID) {
        const parent = categoryMap.get(cat.ParentCategoryID);
        if (parent) {
          parent.children?.push(cat);
        }
      } else {
        rootCategories.push(cat);
      }
    });

    return rootCategories;
  }

  async findOneWithDetails(id: string, userId: string): Promise<any> {
    const companyId = await this.getCompanyId(userId);

    const category = await this.prisma.category.findFirst({
        where: { CategoryID: id, companyId },
        select: { name: true, description: true, level: true }
    });

    if (!category) {
        throw new NotFoundException('Kategori bulunamadı');
    }

    const descendantIds = await this.getDescendantIds(id);
    const categoryIds = [id, ...descendantIds];

    const items = await this.prisma.product.findMany({
        where: { CategoryID: { in: categoryIds } },
        select: { price: true, createdAt: true, supplierProducts: { select: { supplier: { select: { name: true } } } } }
    }).then(products => products.map(p => ({ ...p, type: 'Ürün' })))
    .then(async products => {
        const services = await this.prisma.service.findMany({
            where: { CategoryID: { in: categoryIds } },
            select: { price: true, createdAt: true, supplierServices: { select: { supplier: { select: { name: true } } } } }
        });
        return [...products, ...services.map(s => ({ ...s, type: 'Hizmet' }))];
    });

    const totalCatalogValue = items.reduce((sum, item) => sum + item.price.toNumber(), 0);
    const averageItemPrice = items.length > 0 ? totalCatalogValue / items.length : 0;
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const newItemsLast30Days = items.filter(item => new Date(item.createdAt) > thirtyDaysAgo).length;

    const supplierContributions = new Map<string, number>();
    items.forEach(item => {
        const suppliers = (item as any).supplierProducts || (item as any).supplierServices;
        suppliers?.forEach((sp: any) => {
            const name = sp.supplier.name;
            supplierContributions.set(name, (supplierContributions.get(name) || 0) + item.price.toNumber());
        });
    });

    const topSuppliersByValue = [...supplierContributions.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, value]) => ({ name, value }));

    const subCategorySpends = await this.getSubCategorySpends(id);

    return {
        categoryInfo: category,
        kpis: {
            totalProducts: items.filter(i => i.type === 'Ürün').length,
            totalServices: items.filter(i => i.type === 'Hizmet').length,
            totalCatalogValue,
            uniqueSuppliers: supplierContributions.size,
            subCategoryCount: descendantIds.length,
            averageItemPrice,
            newItemsLast30Days,
        },
        charts: {
            subCategorySpends,
            top5MostValuableItems: items.sort((a, b) => b.price.toNumber() - a.price.toNumber()).slice(0, 5).map(i => ({ name: (i as any).name || 'İsimsiz', value: i.price.toNumber() })),
            topSuppliersByValue,
            priceDistribution: items.map(item => item.price.toNumber()),
        },
    };
  }

  private async getDescendantIds(categoryId: string): Promise<string[]> {
      const children = await this.prisma.category.findMany({
          where: { ParentCategoryID: categoryId },
          select: { CategoryID: true }
      });
      const ids = children.map(c => c.CategoryID);
      for (const childId of ids) {
          ids.push(...await this.getDescendantIds(childId));
      }
      return ids;
  }

  private async getSubCategorySpends(parentId: string): Promise<{ name: string, value: number }[]> {
      const children = await this.prisma.category.findMany({
          where: { ParentCategoryID: parentId },
          select: { CategoryID: true, name: true }
      });

      const spends: { name: string, value: number }[] = [];
      for (const child of children) {
          const descendantIds = await this.getDescendantIds(child.CategoryID);
          const categoryIds = [child.CategoryID, ...descendantIds];
          const totalValue = await this.prisma.product.aggregate({
              _sum: { price: true },
              where: { CategoryID: { in: categoryIds } }
          }).then(async result => {
              const serviceValue = await this.prisma.service.aggregate({
                  _sum: { price: true },
                  where: { CategoryID: { in: categoryIds } }
              });
              return (result._sum.price?.toNumber() || 0) + (serviceValue._sum.price?.toNumber() || 0);
          });
          spends.push({ name: child.name, value: totalValue });
      }
      return spends;
  }
}
