import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// Uygulamadaki rol tipi
export type Role = 'USER' | 'ADMIN';

// Dışarıya dönerken hassas alanları asla göstermeyelim.
// DÜZELTME: `companyId` alanı `select` sorgusuna eklendi.
const publicUserSelect = {
  id: true,
  email: true,
  fullName: true,
  role: true,
  companyId: true, // Hatanın çözümü için eklendi.
  company: {
    select: {
      name: true,
    },
  },
  department: true,
  phone: true,
  role_title: true,
  emailVerified: true,
  emailVerifiedAt: true,
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
    role?: Role;
  }) {
    const { email, passwordHash, fullName, company: companyName, phone, department, role = 'USER' } = params;

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
        role,
      },
      select: publicUserSelect,
    });
  }

  async updateUserRole(id: string, role: Role) {
    const exists = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('User not found');

    return this.prisma.user.update({
      where: { id },
      data: { role },
      select: publicUserSelect,
    });
  }

  list(options?: { skip?: number; take?: number }) {
    return this.prisma.user.findMany({
      skip: options?.skip,
      take: options?.take,
      select: publicUserSelect,
      orderBy: { createdAt: 'desc' },
    });
  }
}