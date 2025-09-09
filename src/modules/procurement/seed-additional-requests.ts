import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedAdditionalProcurementRequests() {
  try {
    // Get first user for creating requests
    const user = await prisma.user.findFirst();
    if (!user) {
      console.error('No user found. Please create a user first.');
      return;
    }

    // Get categories
    const categories = await prisma.category.findMany({
      where: {
        name: {
          in: ['Yazılım & Lisans', 'Güvenlik & Yangın', 'Süt & Süt Ürünleri', 'Lojistik & Dağıtım']
        }
      }
    });

    console.log(`Found ${categories.length} categories`);

    const categoryMap: Record<string, string> = {};
    categories.forEach(cat => {
      categoryMap[cat.name] = cat.CategoryID;
    });

    // Additional procurement requests for specified categories
    const additionalRequests = [
      // Yazılım & Lisans
      {
        itemTitle: 'Microsoft 365 Business Premium Lisansları',
        categoryId: categoryMap['Yazılım & Lisans'],
        quantity: 250,
        uom: 'Lisans',
        simpleDefinition: 'Şirket genelinde kullanılacak Office 365 lisansları, Exchange email ve Teams dahil',
        procurementType: 'SERVICES',
        justification: 'Yıllık lisans yenileme ve yeni kullanıcılar için ek lisans ihtiyacı',
        purchaseFrequency: 'Annual',
        currency: 'USD',
        unitPrice: 22,
        totalPrice: 5500,
        status: 'PENDING_APPROVAL' as const,
        technicalSpecs: [
          { specKey: 'Lisans Tipi', specValue: 'Business Premium', requirementLevel: 'MANDATORY', notes: 'En az 1TB OneDrive alanı' },
          { specKey: 'Kullanıcı Sayısı', specValue: '250 kullanıcı', requirementLevel: 'MANDATORY', notes: 'Genişletilebilir olmalı' },
          { specKey: 'Exchange Kapasite', specValue: '100GB/kullanıcı', requirementLevel: 'MANDATORY', notes: 'Email posta kutusu boyutu' },
          { specKey: 'Teams', specValue: 'Full Teams dahil', requirementLevel: 'MANDATORY', notes: 'Video konferans ve paylaşım' },
          { specKey: 'Destek', specValue: '7/24 Telefon desteği', requirementLevel: 'PREFERRED', notes: 'Türkçe destek tercih edilir' },
        ],
        deliveryLocation: 'Online Aktivasyon',
        dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        urgency: 'HIGH' as const,
        additionalNotes: 'Mevcut lisansların 30 gün içinde sona erecek, geçiş planı gerekli',
      },
      {
        itemTitle: 'ERP Yazılım Modülü - Finans ve Muhasebe',
        categoryId: categoryMap['Yazılım & Lisans'],
        quantity: 1,
        uom: 'Paket',
        simpleDefinition: 'SAP veya Oracle tabanlı finans modülü lisansı ve implementasyonu',
        procurementType: 'SERVICES',
        justification: 'Mevcut sistemin yetersizliği ve entegrasyon ihtiyacı',
        purchaseFrequency: 'One-time',
        currency: 'EUR',
        unitPrice: 85000,
        totalPrice: 85000,
        status: 'DRAFT' as const,
        technicalSpecs: [
          { specKey: 'Platform', specValue: 'SAP S/4HANA veya Oracle Cloud', requirementLevel: 'MANDATORY', notes: 'Cloud tabanlı olmalı' },
          { specKey: 'Modüller', specValue: 'FI, CO, TR', requirementLevel: 'MANDATORY', notes: 'Finans, kontroling, hazine modülleri' },
          { specKey: 'Kullanıcı Lisansı', specValue: '50 concurrent user', requirementLevel: 'MANDATORY', notes: 'Eş zamanlı kullanıcı' },
          { specKey: 'Entegrasyon', specValue: 'REST API desteği', requirementLevel: 'MANDATORY', notes: 'Mevcut sistemlerle entegrasyon' },
          { specKey: 'Eğitim', specValue: '40 saat kullanıcı eğitimi', requirementLevel: 'MANDATORY', notes: 'Yerinde eğitim' },
        ],
        deliveryLocation: 'İstanbul Genel Merkez',
        dueDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        urgency: 'MEDIUM' as const,
        additionalNotes: 'Implementasyon süresi max 6 ay, fazlı geçiş planı',
      },

      // Güvenlik & Yangın
      {
        itemTitle: 'Güvenlik Kamera Sistemi Yenileme',
        categoryId: categoryMap['Güvenlik & Yangın'],
        quantity: 150,
        uom: 'Adet',
        simpleDefinition: '4K IP kameralar, NVR sistemi ve 6 aylık kayıt kapasitesi',
        procurementType: 'GOODS',
        justification: 'Mevcut analog sistem eskidi, görüntü kalitesi yetersiz',
        purchaseFrequency: 'One-time',
        currency: 'TRY',
        unitPrice: 3500,
        totalPrice: 525000,
        status: 'IN_PROGRESS' as const,
        technicalSpecs: [
          { specKey: 'Çözünürlük', specValue: '4K (3840x2160)', requirementLevel: 'MANDATORY', notes: 'Minimum 30fps' },
          { specKey: 'Gece Görüş', specValue: 'IR 50 metre', requirementLevel: 'MANDATORY', notes: 'Akıllı IR özellikli' },
          { specKey: 'Lens', specValue: '2.8-12mm varifocal', requirementLevel: 'PREFERRED', notes: 'Motorize zoom' },
          { specKey: 'Koruma', specValue: 'IP67', requirementLevel: 'MANDATORY', notes: 'Dış mekan kullanımı için' },
          { specKey: 'Analitik', specValue: 'Hareket, yüz algılama', requirementLevel: 'PREFERRED', notes: 'AI destekli analitik' },
        ],
        deliveryLocation: 'Tüm Şubeler (15 Lokasyon)',
        dueDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
        urgency: 'HIGH' as const,
        additionalNotes: 'Kurulum ve konfigürasyon dahil, 3 yıl garanti',
      },
      {
        itemTitle: 'Yangın Algılama ve Söndürme Sistemi',
        categoryId: categoryMap['Güvenlik & Yangın'],
        quantity: 5,
        uom: 'Set',
        simpleDefinition: 'Mutfak davlumbaz yangın söndürme sistemi, FM200 gazlı',
        procurementType: 'GOODS',
        justification: 'Yeni açılan şubeler için zorunlu yangın güvenlik sistemi',
        purchaseFrequency: 'One-time',
        currency: 'TRY',
        unitPrice: 45000,
        totalPrice: 225000,
        status: 'PENDING_APPROVAL' as const,
        technicalSpecs: [
          { specKey: 'Sistem Tipi', specValue: 'FM200 Gazlı', requirementLevel: 'MANDATORY', notes: 'Mutfak uyumlu' },
          { specKey: 'Kapasite', specValue: '50m³ alan', requirementLevel: 'MANDATORY', notes: 'Davlumbaz boyutuna uygun' },
          { specKey: 'Algılama', specValue: 'Isı ve duman dedektörü', requirementLevel: 'MANDATORY', notes: 'Çift algılama sistemi' },
          { specKey: 'Aktivasyon', specValue: 'Otomatik + Manuel', requirementLevel: 'MANDATORY', notes: 'Acil durum butonu' },
          { specKey: 'Sertifika', specValue: 'TSE, CE', requirementLevel: 'MANDATORY', notes: 'İtfaiye onaylı' },
        ],
        deliveryLocation: 'Ankara, İzmir, Antalya Şubeleri',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        urgency: 'HIGH' as const,
        additionalNotes: 'İtfaiye raporlu kurulum, yıllık bakım sözleşmesi dahil',
      },

      // Süt & Süt Ürünleri
      {
        itemTitle: 'Günlük Süt Tedariki',
        categoryId: categoryMap['Süt & Süt Ürünleri'],
        quantity: 5000,
        uom: 'Litre/Gün',
        simpleDefinition: 'Pastörize günlük süt, %3 yağlı, 1L ambalaj',
        procurementType: 'GOODS',
        justification: 'Restoran zinciri için günlük süt ihtiyacı',
        purchaseFrequency: 'Daily',
        currency: 'TRY',
        unitPrice: 28,
        totalPrice: 140000,
        status: 'APPROVED' as const,
        technicalSpecs: [
          { specKey: 'Yağ Oranı', specValue: '%3 (Tam Yağlı)', requirementLevel: 'MANDATORY', notes: 'Sabit yağ oranı' },
          { specKey: 'İşleme', specValue: 'UHT Pastörize', requirementLevel: 'MANDATORY', notes: 'Raf ömrü min 5 gün' },
          { specKey: 'Ambalaj', specValue: '1 Litre Tetrapack', requirementLevel: 'MANDATORY', notes: 'Gıda güvenliği onaylı' },
          { specKey: 'Teslimat Sıcaklığı', specValue: '0-4°C', requirementLevel: 'MANDATORY', notes: 'Soğuk zincir' },
          { specKey: 'Sertifikalar', specValue: 'ISO 22000, Helal', requirementLevel: 'MANDATORY', notes: 'Gıda güvenliği belgeleri' },
        ],
        deliveryLocation: 'Merkez Depo + 20 Şube',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        urgency: 'HIGH' as const,
        additionalNotes: 'Günlük teslimat 06:00-08:00 arası, soğuk zincir kırılmamalı',
      },
      {
        itemTitle: 'Beyaz Peynir Tedariki',
        categoryId: categoryMap['Süt & Süt Ürünleri'],
        quantity: 2000,
        uom: 'Kg',
        simpleDefinition: 'Tam yağlı inek beyaz peyniri, salamura, 1kg ambalaj',
        procurementType: 'GOODS',
        justification: 'Kahvaltı menüsü için aylık peynir ihtiyacı',
        purchaseFrequency: 'Monthly',
        currency: 'TRY',
        unitPrice: 95,
        totalPrice: 190000,
        status: 'PENDING_APPROVAL' as const,
        technicalSpecs: [
          { specKey: 'Peynir Tipi', specValue: 'İnek Beyaz Peynir', requirementLevel: 'MANDATORY', notes: 'Tam yağlı' },
          { specKey: 'Tuz Oranı', specValue: 'Max %3', requirementLevel: 'MANDATORY', notes: 'Düşük tuzlu' },
          { specKey: 'Olgunlaşma', specValue: 'Min 3 ay', requirementLevel: 'PREFERRED', notes: 'Olgun peynir' },
          { specKey: 'Ambalaj', specValue: '1kg vakum', requirementLevel: 'MANDATORY', notes: 'Porsiyon ambalaj' },
          { specKey: 'Raf Ömrü', specValue: 'Min 6 ay', requirementLevel: 'MANDATORY', notes: 'Üretim tarihinden itibaren' },
        ],
        deliveryLocation: 'İstanbul Merkez Depo',
        dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        urgency: 'MEDIUM' as const,
        additionalNotes: 'Numune onayı sonrası teslimat, soğuk zincir zorunlu',
      },

      // Lojistik & Dağıtım
      {
        itemTitle: 'Soğuk Zincir Lojistik Hizmeti',
        categoryId: categoryMap['Lojistik & Dağıtım'],
        quantity: 365,
        uom: 'Gün',
        simpleDefinition: 'Merkez depodan şubelere günlük soğuk zincir dağıtım hizmeti',
        procurementType: 'SERVICES',
        justification: 'Gıda güvenliği için profesyonel soğuk zincir lojistik ihtiyacı',
        purchaseFrequency: 'Annual',
        currency: 'TRY',
        unitPrice: 8500,
        totalPrice: 3102500,
        status: 'IN_PROGRESS' as const,
        technicalSpecs: [
          { specKey: 'Araç Sayısı', specValue: 'Min 10 soğutmalı araç', requirementLevel: 'MANDATORY', notes: 'ATP sertifikalı' },
          { specKey: 'Sıcaklık Aralığı', specValue: '-18°C / +4°C', requirementLevel: 'MANDATORY', notes: 'Çift bölmeli' },
          { specKey: 'Kapasite', specValue: '5-10 ton/araç', requirementLevel: 'MANDATORY', notes: 'Farklı tonajda araçlar' },
          { specKey: 'GPS Takip', specValue: '7/24 canlı takip', requirementLevel: 'MANDATORY', notes: 'Web tabanlı takip' },
          { specKey: 'Teslimat Penceresi', specValue: '05:00-09:00', requirementLevel: 'MANDATORY', notes: 'Sabah teslimatı' },
          { specKey: 'Sigorta', specValue: 'Kargo sigortası', requirementLevel: 'MANDATORY', notes: 'Ürün bedeli kadar' },
        ],
        deliveryLocation: 'İstanbul ve Çevre İller (50 Nokta)',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        urgency: 'HIGH' as const,
        additionalNotes: 'Bayram ve tatil günleri dahil, kesintisiz hizmet, SLA %99',
      },
      {
        itemTitle: 'E-Ticaret Kargo Dağıtım Hizmeti',
        categoryId: categoryMap['Lojistik & Dağıtım'],
        quantity: 50000,
        uom: 'Gönderi/Yıl',
        simpleDefinition: 'Online sipariş teslimatı için kargo hizmeti',
        procurementType: 'SERVICES',
        justification: 'E-ticaret kanalı için hızlı ve güvenilir kargo hizmeti',
        purchaseFrequency: 'Annual',
        currency: 'TRY',
        unitPrice: 45,
        totalPrice: 2250000,
        status: 'DRAFT' as const,
        technicalSpecs: [
          { specKey: 'Teslimat Süresi', specValue: 'Şehir içi 1 gün', requirementLevel: 'MANDATORY', notes: 'Aynı gün teslimat opsiyonu' },
          { specKey: 'Kapsam', specValue: 'Türkiye geneli', requirementLevel: 'MANDATORY', notes: '81 il teslimat' },
          { specKey: 'Paket Boyutu', specValue: 'Max 30kg, 120cm', requirementLevel: 'MANDATORY', notes: 'Desi hesaplaması' },
          { specKey: 'İade Lojistiği', specValue: 'Ücretsiz iade', requirementLevel: 'MANDATORY', notes: '14 gün içinde' },
          { specKey: 'Entegrasyon', specValue: 'API entegrasyonu', requirementLevel: 'MANDATORY', notes: 'Otomatik gönderi oluşturma' },
          { specKey: 'SMS Bilgilendirme', specValue: 'Teslimat aşamaları', requirementLevel: 'PREFERRED', notes: 'Müşteri bilgilendirme' },
        ],
        deliveryLocation: 'Türkiye Geneli',
        dueDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        urgency: 'LOW' as const,
        additionalNotes: 'Aylık hacim garantisi 4000 gönderi, kampanya dönemlerinde esneklik',
      },
    ];

    console.log(`\n📦 ${additionalRequests.length} yeni alım talebi oluşturuluyor...`);

    for (const request of additionalRequests) {
      try {
        const now = new Date();
        const auditTrail = {
          created_by: user.id,
          created_at: now.toISOString(),
          last_modified_by: user.id,
          last_modified_at: now.toISOString(),
          phase_completion_times: {
            phase1_completed_at: now.toISOString(),
            phase2_completed_at: now.toISOString(),
            phase3_completed_at: now.toISOString(),
            phase4_completed_at: now.toISOString(),
          },
          requester_info: {
            user_id: user.id,
            user_name: user.fullName || 'System User',
            user_email: user.email,
            department: user.department || 'Satın Alma',
          }
        };

        if (!request.categoryId) {
          console.log(`  ⚠️  Kategori bulunamadı: ${request.itemTitle}`);
          continue;
        }

        await prisma.procurementRequest.create({
          data: {
            itemTitle: request.itemTitle,
            categoryId: request.categoryId,
            quantity: request.quantity,
            uom: request.uom,
            simpleDefinition: request.simpleDefinition,
            procurementType: request.procurementType,
            justification: request.justification,
            purchaseFrequency: request.purchaseFrequency,
            currency: request.currency,
            unitPrice: request.unitPrice,
            totalPrice: request.totalPrice,
            status: request.status,
            auditTrail: [auditTrail] as any,
            technicalSpecifications: {
              create: request.technicalSpecs.map(spec => ({
                specKey: spec.specKey,
                specValue: spec.specValue,
                requirementLevel: spec.requirementLevel,
                notes: spec.notes,
              })),
            },
            deliveryDetails: {
              create: {
                deliveryLocation: request.deliveryLocation,
                dueDate: request.dueDate,
                urgency: request.urgency,
                additionalNotes: request.additionalNotes,
              },
            },
          },
        });

        console.log(`✅ Created: ${request.itemTitle}`);
      } catch (error: any) {
        console.error(`❌ Error creating ${request.itemTitle}:`, error.message);
      }
    }

    // Statistics
    const totalRequests = await prisma.procurementRequest.count();
    const requestsByCategory = await prisma.procurementRequest.groupBy({
      by: ['categoryId'],
      _count: true,
    });

    console.log('\n📊 Özet:');
    console.log(`  Toplam alım talebi: ${totalRequests}`);
    console.log(`  Kategori başına talepler:`);
    
    for (const cat of requestsByCategory) {
      const category = await prisma.category.findUnique({
        where: { CategoryID: cat.categoryId || '' }
      });
      console.log(`    - ${category?.name || cat.categoryId}: ${cat._count}`);
    }

    console.log('\n🎉 Yeni alım talepleri başarıyla oluşturuldu!');
  } catch (error) {
    console.error('Error seeding procurement requests:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
seedAdditionalProcurementRequests()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });