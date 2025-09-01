import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    // First get the admin user and company
    const adminUser = await prisma.user.findFirst({
      where: { email: 'admin@procurementflow.com' },
    });

    if (!adminUser) {
      console.error('Admin user not found');
      return;
    }

    console.log('Found admin user:', adminUser.id);
    console.log('Company ID:', adminUser.companyId);

    // Create a location first
    const location = await prisma.location.upsert({
      where: { 
        id: 'default-location-id' 
      },
      update: {},
      create: {
        id: 'default-location-id',
        name: 'Ana Ofis',
        description: 'Şirket ana ofisi',
        address: 'İstanbul, Türkiye',
        contactId: adminUser.id,
        companyId: adminUser.companyId,
      },
    });

    console.log('Location created/found:', location.id);

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
      try {
        const department = await prisma.department.upsert({
          where: {
            id: `dept-${dept.name.toLowerCase().replace(/\s+/g, '-')}`,
          },
          update: {},
          create: {
            id: `dept-${dept.name.toLowerCase().replace(/\s+/g, '-')}`,
            ...dept,
            companyId: adminUser.companyId,
            managerId: adminUser.id,
            locationId: location.id,
          },
        });
        console.log(`✓ Department created/updated: ${department.name}`);
      } catch (error) {
        console.error(`✗ Error with department ${dept.name}:`, error.message);
      }
    }

    console.log('\nAll departments have been seeded successfully!');
  } catch (error) {
    console.error('Error seeding data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();