import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAndFixSuppliers() {
  try {
    // Get all suppliers
    const allSuppliers = await prisma.supplier.findMany({
      include: {
        contacts: true,
        _count: {
          select: { contacts: true }
        }
      }
    });
    
    console.log('Total suppliers:', allSuppliers.length);
    console.log('\nSuppliers by company:');
    
    // Group by companyId
    const byCompany: Record<string, any[]> = {};
    allSuppliers.forEach(s => {
      if (!byCompany[s.companyId]) {
        byCompany[s.companyId] = [];
      }
      byCompany[s.companyId].push(s);
    });
    
    // Get first company ID
    const companies = await prisma.company.findMany();
    const defaultCompanyId = companies[0]?.id;
    
    console.log('\nCompanies found:', companies.map(c => ({ id: c.id, name: c.name })));
    console.log('Default company ID:', defaultCompanyId);
    
    // Show suppliers by company
    Object.entries(byCompany).forEach(([companyId, suppliers]) => {
      console.log(`\nCompany ${companyId}: ${suppliers.length} suppliers`);
      suppliers.forEach(s => {
        console.log(`  - ${s.companyName} (${s.brandName || 'No brand'}): status=${s.status}, contacts=${s._count.contacts}`);
      });
    });
    
    // Update suppliers without proper companyId if needed
    if (defaultCompanyId) {
      const suppliersToUpdate = allSuppliers.filter(s => s.companyId !== defaultCompanyId);
      if (suppliersToUpdate.length > 0) {
        console.log(`\nUpdating ${suppliersToUpdate.length} suppliers to company ${defaultCompanyId}...`);
        
        for (const supplier of suppliersToUpdate) {
          await prisma.supplier.update({
            where: { id: supplier.id },
            data: { companyId: defaultCompanyId }
          });
          console.log(`  Updated: ${supplier.companyName}`);
        }
      }
    }
    
    // Add contacts to suppliers without them
    const suppliersWithoutContacts = allSuppliers.filter(s => s._count.contacts === 0);
    
    if (suppliersWithoutContacts.length > 0) {
      console.log(`\nAdding contacts to ${suppliersWithoutContacts.length} suppliers...`);
      
      const turkishNames = [
        { fullName: 'Ahmet Yılmaz', title: 'Satış Müdürü' },
        { fullName: 'Mehmet Demir', title: 'İş Geliştirme Uzmanı' },
        { fullName: 'Ayşe Kaya', title: 'Müşteri İlişkileri Yöneticisi' },
        { fullName: 'Fatma Öztürk', title: 'Satış Temsilcisi' },
        { fullName: 'Ali Çelik', title: 'Bölge Müdürü' },
        { fullName: 'Zeynep Aydın', title: 'Operasyon Müdürü' },
        { fullName: 'Hasan Şahin', title: 'Ticaret Müdürü' },
        { fullName: 'Elif Yıldız', title: 'Pazarlama Uzmanı' },
        { fullName: 'Mustafa Arslan', title: 'Genel Müdür Yardımcısı' },
        { fullName: 'Esra Koç', title: 'Satış Koordinatörü' }
      ];
      
      for (let i = 0; i < suppliersWithoutContacts.length; i++) {
        const supplier = suppliersWithoutContacts[i];
        const nameInfo = turkishNames[i % turkishNames.length];
        const phone = `+90 ${5 + Math.floor(Math.random() * 5)}${Math.floor(Math.random() * 100).toString().padStart(2, '0')} ${Math.floor(Math.random() * 1000).toString().padStart(3, '0')} ${Math.floor(Math.random() * 100).toString().padStart(2, '0')} ${Math.floor(Math.random() * 100).toString().padStart(2, '0')}`;
        const email = `${nameInfo.fullName.toLowerCase().replace(' ', '.').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')}@${supplier.companyName.toLowerCase().replace(/\s+/g, '').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')}.com.tr`;
        
        await prisma.supplierContact.create({
          data: {
            supplierId: supplier.id,
            fullName: nameInfo.fullName,
            email: email,
            phone: phone,
            title: nameInfo.title,
            role: 'PRIMARY_CONTACT'
          }
        });
        
        console.log(`  Added contact to ${supplier.companyName}: ${nameInfo.fullName} - ${phone}`);
      }
    }
    
    console.log('\nDone!');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAndFixSuppliers();