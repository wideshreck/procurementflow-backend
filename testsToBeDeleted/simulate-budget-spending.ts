import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

async function simulateBudgetSpending() {
  try {
    // Get all cost centers
    const costCenters = await prisma.costCenter.findMany({
      where: {
        companyId: 'default-company',
      },
    });

    console.log(`Found ${costCenters.length} cost centers to update`);

    // Define spending percentages for different cost centers
    const spendingPatterns = {
      'Hammadde Alım Bütçesi': 0.75, // %75 harcanmış
      'Lojistik ve Nakliye Bütçesi': 0.82, // %82 harcanmış
      'Ambalaj Malzemeleri Bütçesi': 0.65, // %65 harcanmış
      'Restoran Ekipmanları Bütçesi': 0.45, // %45 harcanmış
      'Hijyen ve Temizlik Bütçesi': 0.90, // %90 harcanmış
      'Soslar ve Baharatlar Bütçesi': 0.70, // %70 harcanmış
      'Yağ ve Kızartma Malzemeleri': 0.88, // %88 harcanmış
      'Yan Ürünler Bütçesi': 0.60, // %60 harcanmış
      'İçecek Tedarik Bütçesi': 0.55, // %55 harcanmış
      'Soğutma Sistemleri Bütçesi': 0.30, // %30 harcanmış
      'POS ve Kasa Sistemleri': 0.25, // %25 harcanmış
      'Güvenlik Sistemleri Bütçesi': 0.40, // %40 harcanmış
      'Pazarlama Kampanyaları': 0.85, // %85 harcanmış
      'Dijital Pazarlama Bütçesi': 0.92, // %92 harcanmış
      'Menü Tasarım ve Baskı': 0.78, // %78 harcanmış
      'Müşteri Sadakat Programı': 0.50, // %50 harcanmış
      'Personel Üniformaları': 0.95, // %95 harcanmış
      'Personel Eğitim Programları': 0.68, // %68 harcanmış
      'Çalışan Yemek Hizmetleri': 0.73, // %73 harcanmış
      'İşe Alım ve Kariyer': 0.58, // %58 harcanmış
      'Franchise Geliştirme': 0.35, // %35 harcanmış
      'Satış Promosyonları': 0.77, // %77 harcanmış
      'Kurumsal Satışlar': 0.42, // %42 harcanmış
      'Online Sipariş Sistemi': 0.80, // %80 harcanmış
      'Restoran Yönetim Yazılımı': 0.65, // %65 harcanmış
      'Mobil Uygulama Geliştirme': 0.72, // %72 harcanmış
      'Yeni Ürün Geliştirme': 0.48, // %48 harcanmış
      'Kalite Kontrol Laboratuvarı': 0.63, // %63 harcanmış
      'Sürdürülebilirlik Projeleri': 0.38, // %38 harcanmış
      'Müşteri Deneyimi Araştırması': 0.52, // %52 harcanmış
      'Çağrı Merkezi Operasyonları': 0.87, // %87 harcanmış
      'Müşteri Geri Bildirim Sistemi': 0.45, // %45 harcanmış
      'Sosyal Medya Yönetimi': 0.76, // %76 harcanmış
      'Mali Denetim ve Danışmanlık': 0.20, // %20 harcanmış
      'Sigorta ve Risk Yönetimi': 0.93, // %93 harcanmış
      'Finansal Yazılımlar': 0.56, // %56 harcanmış
      'Marka Tescil ve Fikri Mülkiyet': 0.15, // %15 harcanmış
      'Franchise Sözleşmeleri': 0.28, // %28 harcanmış
      'Gıda Mevzuat Uyumu': 0.61, // %61 harcanmış
      'Tedarikçi Sözleşmeleri': 0.44, // %44 harcanmış
    };

    // Default spending percentage for any cost center not in the pattern
    const defaultSpendingPercentage = 0.50; // %50

    // Update each cost center
    for (const costCenter of costCenters) {
      // Get spending percentage for this cost center
      const spendingPercentage = spendingPatterns[costCenter.name] || defaultSpendingPercentage;
      
      // Calculate spent and remaining budget
      const totalBudget = new Prisma.Decimal(costCenter.budget.toString());
      const spentBudget = totalBudget.mul(spendingPercentage);
      const remainingBudget = totalBudget.sub(spentBudget);
      
      // Update the cost center
      await prisma.costCenter.update({
        where: { id: costCenter.id },
        data: {
          spentBudget: spentBudget,
          remainingBudget: remainingBudget,
        },
      });
      
      console.log(`✓ Updated ${costCenter.name}:`);
      console.log(`  Total: ₺${totalBudget.toFixed(2)}`);
      console.log(`  Spent: ₺${spentBudget.toFixed(2)} (${(spendingPercentage * 100).toFixed(0)}%)`);
      console.log(`  Remaining: ₺${remainingBudget.toFixed(2)}`);
      console.log(`  Verification: ${spentBudget.add(remainingBudget).equals(totalBudget) ? '✅ Correct' : '❌ Error'}`);
    }

    // Verify all budgets
    console.log('\n📊 Budget Summary:');
    const updatedCostCenters = await prisma.costCenter.findMany({
      where: {
        companyId: 'default-company',
      },
      include: {
        department: true,
      },
    });

    let totalBudget = new Prisma.Decimal(0);
    let totalSpent = new Prisma.Decimal(0);
    let totalRemaining = new Prisma.Decimal(0);

    for (const cc of updatedCostCenters) {
      totalBudget = totalBudget.add(cc.budget);
      totalSpent = totalSpent.add(cc.spentBudget);
      totalRemaining = totalRemaining.add(cc.remainingBudget);
    }

    console.log(`\nTotal Budget: ₺${totalBudget.toFixed(2)}`);
    console.log(`Total Spent: ₺${totalSpent.toFixed(2)} (${totalBudget.gt(0) ? ((totalSpent.div(totalBudget)).mul(100)).toFixed(1) : 0}%)`);
    console.log(`Total Remaining: ₺${totalRemaining.toFixed(2)} (${totalBudget.gt(0) ? ((totalRemaining.div(totalBudget)).mul(100)).toFixed(1) : 0}%)`);
    console.log(`\nVerification (Spent + Remaining = Total): ${totalSpent.add(totalRemaining).equals(totalBudget) ? '✅ PASSED' : '❌ FAILED'}`);

    console.log('\n✅ Budget spending simulation completed successfully!');
  } catch (error) {
    console.error('Error simulating budget spending:', error);
  } finally {
    await prisma.$disconnect();
  }
}

simulateBudgetSpending();