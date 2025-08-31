import { Injectable, NotFoundException, ConflictException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCategoryDto, UpdateCategoryDto, CategoryResponseDto } from './dto/category.dto';
import { Category } from '@prisma/client';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async create(createCategoryDto: CreateCategoryDto, userId: string): Promise<CategoryResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true },
    });

    if (!user) {
      throw new NotFoundException('Kullanıcı bulunamadı');
    }

    let categoryCode: string;
    let level = 1;
    let parentCategory: Category | null = null;

    if (createCategoryDto.ParentCategoryID) {
      parentCategory = await this.prisma.category.findFirst({
        where: {
          CategoryID: createCategoryDto.ParentCategoryID,
          companyId: user.companyId,
        },
      });

      if (!parentCategory) {
        throw new NotFoundException('Üst kategori bulunamadı veya farklı bir şirkete ait');
      }

      if (parentCategory.level >= 3) {
        throw new BadRequestException('Detay kategorisinin altına yeni kategori eklenemez.');
      }

      level = parentCategory.level + 1;

      const lastChild = await this.prisma.category.findFirst({
        where: {
          ParentCategoryID: createCategoryDto.ParentCategoryID,
          companyId: user.companyId,
        },
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
      const lastRootCategory = await this.prisma.category.findFirst({
        where: {
          ParentCategoryID: null,
          companyId: user.companyId,
        },
        orderBy: { categoryCode: 'desc' },
      });

      if (lastRootCategory) {
        categoryCode = (parseInt(lastRootCategory.categoryCode, 10) + 1).toString();
      } else {
        categoryCode = '100000';
      }
    }

    const existingCategory = await this.prisma.category.findFirst({
      where: {
        name: createCategoryDto.name,
        companyId: user.companyId,
      },
    });

    if (existingCategory) {
      throw new ConflictException('Bu isimde bir kategori zaten mevcut');
    }

    const { parentName, ...dataToCreate } = createCategoryDto;

    const category = await this.prisma.category.create({
      data: {
        ...dataToCreate,
        categoryCode,
        level,
        companyId: user.companyId,
      },
      include: {
        parent: {
          select: {
            CategoryID: true,
            name: true,
          },
        },
      },
    });

    return category as any;
  }

  async bulkCreate(createCategoryDtos: CreateCategoryDto[], userId: string): Promise<{ count: number }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { companyId: true } });
    if (!user) {
      throw new NotFoundException('Kullanıcı bulunamadı');
    }

    const createdCategoriesByName: { [name: string]: Category } = {};
    let createdCount = 0;

    const existingCategories = await this.prisma.category.findMany({ where: { companyId: user.companyId } });
    existingCategories.forEach(c => {
        createdCategoriesByName[c.name] = c;
    });

    let remainingDtos = [...createCategoryDtos];
    let lastRemainingCount = remainingDtos.length;

    while (remainingDtos.length > 0) {
        const dtosToProcess = [...remainingDtos];
        remainingDtos = [];

        for (const dto of dtosToProcess) {
            let parentId: string | undefined = undefined;

            if (dto.parentName) {
                const parent = createdCategoriesByName[dto.parentName];
                if (parent) {
                    parentId = parent.CategoryID;
                } else {
                    remainingDtos.push(dto);
                    continue;
                }
            }

            const categoryToCreate: CreateCategoryDto = { ...dto, ParentCategoryID: parentId };
            
            try {
                const newCategory = await this.create(categoryToCreate, userId);
                createdCategoriesByName[newCategory.name] = newCategory as Category;
                createdCount++;
            } catch (error) {
                if (error instanceof ConflictException) {
                    console.log(`Kategori zaten mevcut: ${dto.name}, atlanıyor.`);
                    if (!createdCategoriesByName[dto.name]) {
                       const existing = await this.prisma.category.findFirst({where: {name: dto.name, companyId: user.companyId}});
                       if(existing) createdCategoriesByName[dto.name] = existing;
                    }
                } else {
                    console.error(`Kategori oluşturulamadı: ${dto.name}. Hata: ${error.message}`);
                }
            }
        }

        if (remainingDtos.length === lastRemainingCount) {
            console.error("İşlenemeyen kategoriler kaldı:", remainingDtos.map(d => d.name));
            break;
        }
        lastRemainingCount = remainingDtos.length;
    }

    return { count: createdCount };
  }

  async findAll(
    userId: string,
    includeInactive: boolean = false,
    format: 'flat' | 'hierarchical' = 'hierarchical',
  ): Promise<CategoryResponseDto[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true },
    });

    if (!user) {
      throw new NotFoundException('Kullanıcı bulunamadı');
    }

    const whereClause: any = { companyId: user.companyId };
    if (!includeInactive) {
      whereClause.isActive = true;
    }

    const categories = await this.prisma.category.findMany({
      where: whereClause,
      include: {
        parent: {
          select: {
            CategoryID: true,
            name: true,
          },
        },
        children: {
          where: includeInactive ? {} : { isActive: true },
          select: {
            CategoryID: true,
            name: true,
            description: true,
            color: true,
            icon: true,
            isActive: true,
            ParentCategoryID: true,
            companyId: true,
            createdAt: true,
            updatedAt: true,
            categoryCode: true,
            level: true,
          },
        },
        _count: {
          select: {
            products: true,
            services: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const categoriesWithCounts = categories.map(cat => {
      const { _count, ...rest } = cat;
      return {
        ...rest,
        productCount: _count.products,
        serviceCount: _count.services,
      };
    });

    if (format === 'flat') {
      return categoriesWithCounts as any[];
    }

    const categoryMap = new Map<string, CategoryResponseDto>();
    const rootCategories: CategoryResponseDto[] = [];

    categoriesWithCounts.forEach((cat: any) => {
      categoryMap.set(cat.CategoryID, { ...cat, children: [] });
    });

    categoriesWithCounts.forEach((cat: any) => {
      const category = categoryMap.get(cat.CategoryID);
      if (category && cat.ParentCategoryID) {
        const parent = categoryMap.get(cat.ParentCategoryID);
        if (parent && parent.children) {
          parent.children.push(category);
        }
      } else if (category) {
        rootCategories.push(category);
      }
    });

    return rootCategories;
  }

  async findOne(id: string, userId: string): Promise<CategoryResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true },
    });

    if (!user) {
      throw new NotFoundException('Kullanıcı bulunamadı');
    }

    const category = await this.prisma.category.findFirst({
      where: {
        CategoryID: id,
        companyId: user.companyId,
      },
      include: {
        parent: {
          select: {
            CategoryID: true,
            name: true,
          },
        },
        children: true,
        _count: {
          select: {
            products: true,
            services: true,
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Kategori bulunamadı');
    }
    
    const { _count, ...rest } = category;
    return {
      ...rest,
      children: rest.children as CategoryResponseDto[],
      productCount: _count.products,
      serviceCount: _count.services,
    } as any;
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto, userId: string): Promise<CategoryResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true, role: true },
    });

    if (!user) {
      throw new NotFoundException('Kullanıcı bulunamadı');
    }

    const categoryToUpdate = await this.prisma.category.findFirst({
      where: {
        CategoryID: id,
        companyId: user.companyId,
      },
      include: { children: true },
    });

    if (!categoryToUpdate) {
      throw new NotFoundException('Kategori bulunamadı');
    }

    const data: any = { ...updateCategoryDto };

    if (updateCategoryDto.ParentCategoryID !== undefined && updateCategoryDto.ParentCategoryID !== categoryToUpdate.ParentCategoryID) {
      if (updateCategoryDto.ParentCategoryID === id) {
        throw new BadRequestException('Bir kategori kendi üst kategorisi olamaz');
      }

      let newLevel = 1;
      if (updateCategoryDto.ParentCategoryID) {
        const parentCategory = await this.prisma.category.findFirst({
          where: {
            CategoryID: updateCategoryDto.ParentCategoryID,
            companyId: user.companyId,
          },
        });

        if (!parentCategory) {
          throw new NotFoundException('Üst kategori bulunamadı veya farklı bir şirkete ait');
        }
        if (parentCategory.level >= 3) {
          throw new BadRequestException('Detay kategorisi altına taşıma yapılamaz.');
        }
        if (await this.checkCircularDependency(id, updateCategoryDto.ParentCategoryID)) {
          throw new BadRequestException('Bu işlem döngüsel bir bağımlılık oluşturacak');
        }
        
        const maxChildLevel = await this.getMaxChildLevel(id);
        if (parentCategory.level + 1 + maxChildLevel > 3) {
            throw new BadRequestException('Bu taşıma işlemi 3 seviye kuralını ihlal ediyor.');
        }

        newLevel = parentCategory.level + 1;
      }
      data.level = newLevel;
      await this.updateChildLevels(id, newLevel);
    }

    const category = await this.prisma.category.update({
      where: { CategoryID: id },
      data,
      include: {
        parent: {
          select: {
            CategoryID: true,
            name: true,
          },
        },
      },
    });

    return category as any;
  }

  async removeAll(userId: string): Promise<{ count: number }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true, role: true },
    });

    if (!user) {
      throw new NotFoundException('Kullanıcı bulunamadı');
    }
    if (user.role !== 'ADMIN') {
      throw new ForbiddenException('Bu işlem için yetkiniz yok');
    }

    // Önce ilişkili ürün ve hizmetlerin kategori bağlantısını kopar
    await this.prisma.product.updateMany({
      where: { companyId: user.companyId },
      data: { CategoryID: null },
    });
    await this.prisma.service.updateMany({
      where: { companyId: user.companyId },
      data: { CategoryID: null },
    });

    const deleteResult = await this.prisma.category.deleteMany({
      where: { companyId: user.companyId },
    });

    return deleteResult;
  }

  async remove(id: string, userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true, role: true },
    });

    if (!user) {
      throw new NotFoundException('Kullanıcı bulunamadı');
    }

    if (user.role !== 'ADMIN') {
      throw new ForbiddenException('Bu işlem için yetkiniz yok');
    }

    const category = await this.prisma.category.findFirst({
      where: {
        CategoryID: id,
        companyId: user.companyId,
      },
      include: {
        children: true,
        products: true,
        services: true,
      },
    });

    if (!category) {
      throw new NotFoundException('Kategori bulunamadı');
    }

    if (category.children.length > 0) {
      throw new ConflictException('Bu kategoriye bağlı alt kategoriler var');
    }

    if (category.products.length > 0 || category.services.length > 0) {
      throw new ConflictException('Bu kategoriye bağlı ürün veya hizmetler var');
    }

    await this.prisma.category.delete({
      where: { CategoryID: id },
    });
  }

  private async checkCircularDependency(categoryId: string, parentId: string): Promise<boolean> {
    let currentId: string | null = parentId;
    const visited = new Set<string>();

    while (currentId) {
      if (visited.has(currentId)) {
        return true;
      }
      if (currentId === categoryId) {
        return true;
      }
      visited.add(currentId);

      const parent = await this.prisma.category.findUnique({
        where: { CategoryID: currentId },
        select: { ParentCategoryID: true },
      });

      currentId = parent?.ParentCategoryID ?? null;
    }

    return false;
  }

  private async updateChildLevels(parentId: string, parentLevel: number): Promise<void> {
    const children = await this.prisma.category.findMany({
      where: { ParentCategoryID: parentId },
    });

    for (const child of children) {
      const newLevel = parentLevel + 1;
      await this.prisma.category.update({
        where: { CategoryID: child.CategoryID },
        data: { level: newLevel },
      });
      await this.updateChildLevels(child.CategoryID, newLevel);
    }
  }

  private async getMaxChildLevel(categoryId: string): Promise<number> {
    const children = await this.prisma.category.findMany({
        where: { ParentCategoryID: categoryId },
    });

    if (children.length === 0) {
        return 0;
    }

    let maxLevel = 0;
    for (const child of children) {
        const childLevel = await this.getMaxChildLevel(child.CategoryID);
        if (childLevel > maxLevel) {
            maxLevel = childLevel;
        }
    }

    return maxLevel + 1;
  }

  async findOneWithDetails(id: string, userId: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true },
    });

    if (!user) {
      throw new NotFoundException('Kullanıcı bulunamadı');
    }

    const categoryWithHierarchy = await this.prisma.category.findFirst({
      where: {
        CategoryID: id,
        companyId: user.companyId,
      },
      include: {
        products: { include: { supplierProducts: { include: { supplier: true } } } },
        services: { include: { supplierServices: { include: { supplier: true } } } },
        children: {
          include: {
            products: { include: { supplierProducts: { include: { supplier: true } } } },
            services: { include: { supplierServices: { include: { supplier: true } } } },
            children: {
              include: {
                products: { include: { supplierProducts: { include: { supplier: true } } } },
                services: { include: { supplierServices: { include: { supplier: true } } } },
              },
            },
          },
        },
      },
    });

    if (!categoryWithHierarchy) {
      throw new NotFoundException('Kategori bulunamadı');
    }

    const allProducts: any[] = [];
    const allServices: any[] = [];
    const subCategorySpends: any[] = [];

    const collectData = (category: any) => {
      if (category.products) allProducts.push(...category.products);
      if (category.services) allServices.push(...category.services);

      if (category.children && category.children.length > 0) {
        category.children.forEach((child: any) => {
          const childProductsValue = child.products.reduce((sum: number, p: { price: { toNumber: () => number; }; }) => sum + p.price.toNumber(), 0);
          const childServicesValue = child.services.reduce((sum: number, s: { price: { toNumber: () => number; }; }) => sum + s.price.toNumber(), 0);
          subCategorySpends.push({
            name: child.name,
            value: childProductsValue + childServicesValue,
          });
          collectData(child);
        });
      }
    };

    collectData(categoryWithHierarchy);

    const totalCatalogValue = allProducts.reduce((sum, p) => sum + p.price.toNumber(), 0) + allServices.reduce((sum, s) => sum + s.price.toNumber(), 0);
    
    const allItems = [
        ...allProducts.map((p: any) => ({ ...p, type: 'Ürün' })),
        ...allServices.map((s: any) => ({ ...s, type: 'Hizmet' }))
    ];

    const top5MostValuableItems = allItems.sort((a, b) => b.price.toNumber() - a.price.toNumber()).slice(0, 5);
    
    const supplierValueContributions: { [key: string]: number } = {};
    allItems.forEach((item: any) => {
        const suppliers = item.supplierProducts || item.supplierServices;
        if (suppliers) {
            suppliers.forEach((sp: any) => {
                const supplierName = sp.supplier.name;
                if (!supplierValueContributions[supplierName]) {
                    supplierValueContributions[supplierName] = 0;
                }
                supplierValueContributions[supplierName] += item.price.toNumber();
            });
        }
    });

    const topSuppliersByValue = Object.entries(supplierValueContributions)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const newItems = allItems.filter((item: any) => new Date(item.createdAt) > thirtyDaysAgo);

    const averageItemPrice = allItems.length > 0 ? totalCatalogValue / allItems.length : 0;

    return {
      categoryInfo: {
        name: categoryWithHierarchy.name,
        description: categoryWithHierarchy.description,
        level: categoryWithHierarchy.level,
      },
      kpis: {
        totalProducts: allProducts.length,
        totalServices: allServices.length,
        totalCatalogValue: totalCatalogValue,
        uniqueSuppliers: new Set(Object.keys(supplierValueContributions)).size,
        subCategoryCount: categoryWithHierarchy.children.length,
        averageItemPrice: averageItemPrice,
        newItemsLast30Days: newItems.length,
      },
      charts: {
        subCategorySpends,
        top5MostValuableItems,
        topSuppliersByValue,
        priceDistribution: allItems.map((item: any) => item.price.toNumber()),
      },
      newItems,
      allItems,
    };
  }
}
