import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// Dışarıya dönerken hassas alanları asla göstermeyelim.
const publicUserSelect = {
  id: true,
  email: true,
  fullName: true,
  customRole: {
    select: {
      id: true,
      name: true,
      permissions: true,
    },
  },
  companyId: true,
  company: {
    select: {
      name: true,
    },
  },
  department: true,
  phone: true,
  role_title: true,
  isActive: true,
  lastLoginAt: true,
  lastLoginIp: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      select: publicUserSelect,
    });
  }

  findById(id: string) {
    // Bu metod, auth gibi iç servisler tarafından kullanılır ve parola dahil tüm kullanıcı verisine ihtiyaç duyar.
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  // ⬇️ Controller'ın kullandığı method (404 handling ile)
  async getPublicUserById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: publicUserSelect,
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  /**
   * Not: DB sütunu 'password' olsa da, burada parametreyi 'passwordHash' olarak adlandırıyoruz.
   * Böylece bu servisi kullanan kimse ham parolayı buraya yollarım sanmasın.
   * DB'ye yazarken { password: passwordHash } mapliyoruz.
   */
  async createUser(params: {
    email: string;
    passwordHash: string; // HASH beklenir
    fullName: string;
    company: string; // Bu artık şirket ADI
    phone?: string;
    department?: string;
    customRoleId?: string;
  }) {
    const { email, passwordHash, fullName, company: companyName, phone, department, customRoleId } = params;

    // Şirketi isme göre bul veya oluştur.
    let company = await this.prisma.company.findFirst({
        where: { name: companyName },
    });

    if (!company) {
        company = await this.prisma.company.create({
            data: { name: companyName },
        });
    }

    return this.prisma.user.create({
      data: {
        email,
        password: passwordHash,
        fullName,
        companyId: company.id, // Kullanıcıyı şirket ID'si ile bağla
        phone,
        department,
        customRoleId,
      },
      select: publicUserSelect,
    });
  }

  async updateUserCustomRole(id: string, customRoleId: string) {
    const userExists = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!userExists) throw new NotFoundException('User not found');

    const roleExists = await this.prisma.customRole.findUnique({
      where: { id: customRoleId },
      select: { id: true },
    });
    if (!roleExists) throw new NotFoundException('Custom role not found');

    return this.prisma.user.update({
      where: { id },
      data: { customRoleId },
      select: publicUserSelect,
    });
  }

  list(options?: {
    skip?: number;
    take?: number;
    searchTerm?: string;
    role?: string;
    status?: string;
    department?: string;
  }) {
    const where: any = {};

    if (options?.searchTerm) {
      where.OR = [
        { fullName: { contains: options.searchTerm, mode: 'insensitive' } },
        { email: { contains: options.searchTerm, mode: 'insensitive' } },
      ];
    }

    if (options?.role) {
      where.customRole = { name: options.role };
    }

    if (options?.status) {
      where.isActive = options.status === 'active';
    }

    if (options?.department) {
      where.department = { name: options.department };
    }

    return this.prisma.user.findMany({
      skip: options?.skip,
      take: options?.take,
      where,
      select: publicUserSelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  listCompanyUsers(companyId: string) {
    return this.prisma.user.findMany({
      where: { companyId },
      select: publicUserSelect,
      orderBy: { fullName: 'asc' },
    });
  }

  async updateUser(id: string, data: {
    email?: string;
    fullName?: string;
    phone?: string;
    department?: string;
    isActive?: boolean;
    customRoleId?: string;
  }) {
    const userExists = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!userExists) throw new NotFoundException('User not found');

    return this.prisma.user.update({
      where: { id },
      data,
      select: publicUserSelect,
    });
  }

  async deleteUser(id: string) {
    const userExists = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!userExists) throw new NotFoundException('User not found');

    await this.prisma.user.delete({
      where: { id },
    });
    return { message: 'User deleted successfully' };
  }
}
