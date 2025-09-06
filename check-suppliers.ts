import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkSuppliers() {
  try {
    // Check if there are any suppliers
    const suppliers = await prisma.supplier.findMany({
      include: {
        company: true,
      }
    });
    
    console.log(`Found ${suppliers.length} suppliers in database`);
    
    if (suppliers.length > 0) {
      console.log('\nFirst 5 suppliers:');
      suppliers.slice(0, 5).forEach(supplier => {
        console.log(`- ${supplier.companyName} (Company: ${supplier.company?.name || 'N/A'})`);
      });
    }
    
    // Check which company the admin user belongs to
    const adminUser = await prisma.user.findFirst({
      where: {
        email: 'admin@procurementflow.com'
      },
      include: {
        company: true
      }
    });
    
    if (adminUser) {
      console.log(`\nAdmin user company: ${adminUser.company?.name || 'No company'} (ID: ${adminUser.companyId})`);
      
      // Check suppliers for admin's company
      const companySuppliers = await prisma.supplier.findMany({
        where: {
          companyId: adminUser.companyId
        }
      });
      
      console.log(`Suppliers for admin's company: ${companySuppliers.length}`);
    }
    
  } catch (error) {
    console.error('Error checking suppliers:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSuppliers();