import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  try {
    // Create company first
    const company = await prisma.company.upsert({
      where: { id: 'default-company' },
      update: {},
      create: {
        id: 'default-company',
        name: 'ProcurementFlow Inc.',
      },
    });

    console.log('✓ Company created:', company.name);

    // Create admin user
    const hashedPassword = await argon2.hash('Admin123!');
    const adminUser = await prisma.user.upsert({
      where: { email: 'admin@procurementflow.com' },
      update: {},
      create: {
        email: 'admin@procurementflow.com',
        password: hashedPassword,
        fullName: 'Admin User',
        role: 'ADMIN',
        companyId: company.id,
        emailVerified: true,
        isActive: true,
        department: 'IT',
        role_title: 'System Administrator',
      },
    });

    console.log('✓ Admin user created:', adminUser.email);

    // Create location
    const location = await prisma.location.upsert({
      where: { id: 'default-location' },
      update: {},
      create: {
        id: 'default-location',
        name: 'Ana Ofis',
        description: 'Şirket ana ofisi',
        address: 'İstanbul, Türkiye',
        contactId: adminUser.id,
        companyId: company.id,
      },
    });

    console.log('✓ Location created:', location.name);

    // Create departments
    const departments = [
      { name: 'Yazılım Geliştirme', description: 'Yazılım geliştirme departmanı' },
      { name: 'Bilgi İşlem', description: 'IT altyapı ve sistem yönetimi' },
      { name: 'Pazarlama', description: 'Pazarlama ve reklam faaliyetleri' },
      { name: 'İnsan Kaynakları', description: 'İnsan kaynakları yönetimi' },
      { name: 'Satış', description: 'Satış operasyonları' },
      { name: 'Ar-Ge', description: 'Araştırma ve geliştirme' },
      { name: 'Operasyon', description: 'Operasyon ve lojistik' },
      { name: 'Müşteri Hizmetleri', description: 'Müşteri destek hizmetleri' },
      { name: 'Finans', description: 'Mali işler ve muhasebe' },
      { name: 'Hukuk', description: 'Hukuki işler' },
    ];

    for (const dept of departments) {
      const department = await prisma.department.upsert({
        where: {
          id: `dept-${dept.name.toLowerCase().replace(/\s+/g, '-').replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c')}`,
        },
        update: {},
        create: {
          id: `dept-${dept.name.toLowerCase().replace(/\s+/g, '-').replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c')}`,
          ...dept,
          companyId: company.id,
          managerId: adminUser.id,
          locationId: location.id,
        },
      });
      console.log(`✓ Department created: ${department.name}`);
    }

    console.log('\n✅ All data has been seeded successfully!');
    console.log('\nYou can now login with:');
    console.log('Email: admin@procurementflow.com');
    console.log('Password: Admin123!');
  } catch (error) {
    console.error('Error seeding data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();