const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');

const prisma = new PrismaClient();

async function importCostCenters() {
  try {
    console.log('🚀 Cost Center import işlemi başlıyor...');
    
    // CSV dosyasını oku
    const csvPath = path.join(__dirname, '..', 'maliyet-merkezleri.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    
    // CSV'yi parse et
    const { data, errors } = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
      transform: (value) => value.trim(),
    });
    
    if (errors.length > 0) {
      console.error('❌ CSV parse hatası:', errors);
      return;
    }
    
    console.log(`📊 CSV dosyasından ${data.length} maliyet merkezi bulundu`);
    
    // Admin kullanıcısını bul (budget owner olarak kullanacağız)
    const adminUser = await prisma.user.findFirst({
      where: { email: 'admin@procurementflow.com' },
      include: { company: true }
    });
    
    if (!adminUser) {
      console.error('❌ Admin kullanıcı bulunamadı');
      return;
    }
    
    console.log(`👤 Budget Owner: ${adminUser.fullName} (${adminUser.email})`);
    console.log(`🏢 Şirket: ${adminUser.company.name}`);
    
    // Mevcut departmanları getir
    const departments = await prisma.department.findMany({
      where: { companyId: adminUser.companyId }
    });
    
    console.log(`📁 Mevcut departmanlar (${departments.length}):`);
    departments.forEach(dept => console.log(`  - ${dept.name}`));
    
    // Benzersiz departman isimlerini CSV'den çıkar
    const uniqueDepartmentNames = [...new Set(data.map(row => row.departmentName))];
    console.log(`\n📋 CSV'de bulunan departmanlar (${uniqueDepartmentNames.length}):`);
    uniqueDepartmentNames.forEach(name => console.log(`  - ${name}`));
    
    // Eksik departmanları oluştur
    const missingDepartments = uniqueDepartmentNames.filter(name => 
      !departments.some(dept => dept.name === name)
    );
    
    if (missingDepartments.length > 0) {
      console.log(`\n🔧 Eksik departmanlar oluşturuluyor (${missingDepartments.length}):`);
      
      // Default location'ı bul
      let defaultLocation = await prisma.location.findFirst({
        where: { companyId: adminUser.companyId }
      });
      
      if (!defaultLocation) {
        // Location yoksa oluştur
        defaultLocation = await prisma.location.create({
          data: {
            name: 'Tavuk Dünyası Genel Merkez',
            description: 'Ana şirket merkezi',
            address: 'İstanbul, Türkiye',
            contactId: adminUser.id,
            companyId: adminUser.companyId
          }
        });
        console.log(`📍 Default location oluşturuldu: ${defaultLocation.name}`);
      }
      
      for (const deptName of missingDepartments) {
        try {
          const newDept = await prisma.department.create({
            data: {
              name: deptName,
              description: `${deptName} departmanı`,
              managerId: adminUser.id,
              companyId: adminUser.companyId,
              locationId: defaultLocation.id
            }
          });
          console.log(`  ✅ ${newDept.name} departmanı oluşturuldu`);
        } catch (error) {
          console.error(`  ❌ ${deptName} departmanı oluşturulamadı:`, error.message);
        }
      }
    }
    
    // Güncellenmiş departman listesini al
    const updatedDepartments = await prisma.department.findMany({
      where: { companyId: adminUser.companyId }
    });
    
    console.log(`\n💾 Cost Center import işlemi başlıyor...`);
    
    let successCount = 0;
    let errorCount = 0;
    const errors_list = [];
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      
      try {
        // Departmanı bul
        const department = updatedDepartments.find(dept => dept.name === row.departmentName);
        
        if (!department) {
          throw new Error(`Departman bulunamadı: ${row.departmentName}`);
        }
        
        // Aynı isimde cost center var mı kontrol et
        const existing = await prisma.costCenter.findFirst({
          where: {
            name: row.name,
            companyId: adminUser.companyId
          }
        });
        
        if (existing) {
          console.log(`  ⚠️  ${row.name} zaten mevcut, atlanıyor`);
          continue;
        }
        
        // Cost center oluştur
        await prisma.costCenter.create({
          data: {
            name: row.name,
            description: row.description,
            budget: parseFloat(row.budget),
            remainingBudget: parseFloat(row.remainingBudget),
            spentBudget: parseFloat(row.spentBudget),
            budgetOwnerId: adminUser.id,
            departmentId: department.id,
            companyId: adminUser.companyId
          }
        });
        
        successCount++;
        console.log(`  ✅ ${row.name} (Bütçe: ${parseFloat(row.budget).toLocaleString('tr-TR')} TL)`);
        
      } catch (error) {
        errorCount++;
        errors_list.push({ row: i + 1, name: row.name, error: error.message });
        console.error(`  ❌ ${row.name}: ${error.message}`);
      }
    }
    
    console.log(`\n📊 İmport İstatistikleri:`);
    console.log(`  ✅ Başarılı: ${successCount}`);
    console.log(`  ❌ Hatalı: ${errorCount}`);
    console.log(`  📊 Toplam: ${data.length}`);
    
    if (errors_list.length > 0) {
      console.log(`\n❌ Hatalar:`);
      errors_list.forEach(err => {
        console.log(`  Satır ${err.row}: ${err.name} - ${err.error}`);
      });
    }
    
    console.log('\n🎉 Import işlemi tamamlandı!');
    
  } catch (error) {
    console.error('❌ Genel hata:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Script'i çalıştır
importCostCenters();