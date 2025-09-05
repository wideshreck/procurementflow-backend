import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateLocationDto, UpdateLocationDto, LocationResponseDto } from './dto/location.dto';

@Injectable()
export class LocationsService {
  constructor(private prisma: PrismaService) {}

  async create(createLocationDto: CreateLocationDto, userId: string): Promise<LocationResponseDto> {
    // Kullanıcının şirket bilgisini al
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true },
    });

    if (!user) {
      throw new NotFoundException('Kullanıcı bulunamadı');
    }

    // İletişim kişisinin aynı şirkette olduğunu kontrol et
    const contact = await this.prisma.user.findFirst({
      where: {
        id: createLocationDto.contactId,
        companyId: user.companyId,
      },
    });

    if (!contact) {
      throw new NotFoundException('İletişim kişisi bulunamadı veya farklı bir şirkete ait');
    }

    // Aynı isimde lokasyon var mı kontrol et
    const existingLocation = await this.prisma.location.findFirst({
      where: {
        name: createLocationDto.name,
        companyId: user.companyId,
      },
    });

    if (existingLocation) {
      throw new ConflictException('Bu isimde bir lokasyon zaten mevcut');
    }

    const location = await this.prisma.location.create({
      data: {
        ...createLocationDto,
        companyId: user.companyId,
      },
      include: {
        contact: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    return location;
  }

  async findAll(userId: string): Promise<LocationResponseDto[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true },
    });

    if (!user) {
      throw new NotFoundException('Kullanıcı bulunamadı');
    }

    return this.prisma.location.findMany({
      where: { companyId: user.companyId },
      include: {
        contact: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, userId: string): Promise<LocationResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true },
    });

    if (!user) {
      throw new NotFoundException('Kullanıcı bulunamadı');
    }

    const location = await this.prisma.location.findFirst({
      where: {
        id,
        companyId: user.companyId,
      },
      include: {
        contact: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
          },
        },
        departments: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!location) {
      throw new NotFoundException('Lokasyon bulunamadı');
    }

    return location;
  }

  async update(id: string, updateLocationDto: UpdateLocationDto, userId: string): Promise<LocationResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true, customRole: true },
    });

    if (!user) {
      throw new NotFoundException('Kullanıcı bulunamadı');
    }

    // Lokasyonun varlığını ve şirkete aitliğini kontrol et
    const existingLocation = await this.prisma.location.findFirst({
      where: {
        id,
        companyId: user.companyId,
      },
    });

    if (!existingLocation) {
      throw new NotFoundException('Lokasyon bulunamadı');
    }

    // Eğer iletişim kişisi güncelleniyorsa, aynı şirkette olduğunu kontrol et
    if (updateLocationDto.contactId) {
      const contact = await this.prisma.user.findFirst({
        where: {
          id: updateLocationDto.contactId,
          companyId: user.companyId,
        },
      });

      if (!contact) {
        throw new NotFoundException('İletişim kişisi bulunamadı veya farklı bir şirkete ait');
      }
    }

    // Eğer isim güncelleniyorsa, başka bir lokasyonun aynı isme sahip olmadığını kontrol et
    if (updateLocationDto.name && updateLocationDto.name !== existingLocation.name) {
      const duplicateLocation = await this.prisma.location.findFirst({
        where: {
          name: updateLocationDto.name,
          companyId: user.companyId,
          NOT: { id },
        },
      });

      if (duplicateLocation) {
        throw new ConflictException('Bu isimde bir lokasyon zaten mevcut');
      }
    }

    const location = await this.prisma.location.update({
      where: { id },
      data: updateLocationDto,
      include: {
        contact: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    return location;
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
    if (!permissions?.includes('locations:delete')) {
      throw new ForbiddenException('Bu işlem için yetkiniz yok');
    }

    const location = await this.prisma.location.findFirst({
      where: {
        id,
        companyId: user.companyId,
      },
      include: {
        departments: true,
      },
    });

    if (!location) {
      throw new NotFoundException('Lokasyon bulunamadı');
    }

    // Lokasyona bağlı departman varsa silinemesin
    if (location.departments.length > 0) {
      throw new ConflictException('Bu lokasyona bağlı departmanlar var, önce onları silmeniz gerekiyor');
    }

    await this.prisma.location.delete({
      where: { id },
    });
  }
}
