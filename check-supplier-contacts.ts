import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkSupplierContacts() {
  try {
    // Check all suppliers and their contacts
    const suppliers = await prisma.supplier.findMany({
      include: {
        contacts: true,
        company: true
      },
      orderBy: {
        companyName: 'asc'
      }
    });
    
    console.log(`Found ${suppliers.length} suppliers in database`);
    
    const suppliersWithContacts = suppliers.filter(s => s.contacts.length > 0);
    const suppliersWithoutContacts = suppliers.filter(s => s.contacts.length === 0);
    
    console.log(`Suppliers with contacts: ${suppliersWithContacts.length}`);
    console.log(`Suppliers without contacts: ${suppliersWithoutContacts.length}`);
    
    if (suppliersWithContacts.length > 0) {
      console.log('\nSuppliers with existing contacts:');
      suppliersWithContacts.forEach(supplier => {
        console.log(`- ${supplier.companyName} (${supplier.contacts.length} contacts)`);
        supplier.contacts.forEach(contact => {
          console.log(`  * ${contact.fullName} - ${contact.title} - ${contact.email} - ${contact.phone || 'No phone'}`);
        });
      });
    }
    
    if (suppliersWithoutContacts.length > 0) {
      console.log('\nSuppliers without contacts:');
      suppliersWithoutContacts.slice(0, 10).forEach(supplier => {
        console.log(`- ${supplier.companyName}`);
      });
      
      if (suppliersWithoutContacts.length > 10) {
        console.log(`  ... and ${suppliersWithoutContacts.length - 10} more`);
      }
    }
    
  } catch (error) {
    console.error('Error checking supplier contacts:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSupplierContacts();