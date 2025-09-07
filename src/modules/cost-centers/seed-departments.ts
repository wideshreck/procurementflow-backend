import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedDepartments() {
  const companyId = 'cm494857q00005iq86r7xmzs0'; // Replace with your actual company ID
  const managerId = 'cm494857r00005iq89snw7od7'; // Replace with your actual admin user ID
  const locationId = 'cm494857p00005iq8f3kqzu48'; // Replace with your actual location ID

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
      await prisma.department.create({
        data: {
          ...dept,
          companyId,
          managerId,
          locationId,
          createdById: managerId, // Assuming the manager is the creator
        },
      });
      console.log(`Created department: ${dept.name}`);
    } catch (error) {
      if (error.code === 'P2002') {
        console.log(`Department already exists: ${dept.name}`);
      } else {
        console.error(`Error creating department ${dept.name}:`, error);
      }
    }
  }

  await prisma.$disconnect();
}

seedDepartments().catch(console.error);
