const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createSuppliers() {
  try {
    console.log('🏢 Tedarikçiler oluşturuluyor...');
    
    // Admin kullanıcısını bul
    const adminUser = await prisma.user.findFirst({
      where: { email: 'admin@procurementflow.com' },
      include: { company: true }
    });
    
    if (!adminUser) {
      console.error('❌ Admin kullanıcı bulunamadı');
      return;
    }
    
    console.log(`👤 Admin: ${adminUser.fullName}`);
    console.log(`🏢 Şirket: ${adminUser.company.name}`);
    
    // Mevcut kategorileri getir
    const categories = await prisma.category.findMany({
      where: { companyId: adminUser.companyId }
    });
    
    const categoryMap = {};
    categories.forEach(cat => {
      categoryMap[cat.name] = cat.CategoryID;
    });
    
    console.log(`\n📦 ${categories.length} kategori bulundu`);
    
    const suppliers = [
      // GIDA TEDARİKÇİLERİ (Direct)
      {
        companyName: 'Şenpiliç Gıda Sanayi A.Ş.',
        brandName: 'Şenpiliç',
        description: 'Türkiye\'nin lider beyaz et üreticilerinden, donuk ve taze tavuk ürünleri',
        country: 'Türkiye',
        city: 'İstanbul',
        district: 'Esenyurt',
        postalCode: '34522',
        address: 'Esenyurt Sanayi Sitesi, Haramidere Mah. No:45',
        website: 'www.senpilic.com.tr',
        taxOffice: 'Esenyurt Vergi Dairesi',
        taxNumber: '1234567890',
        supplierType: 'MANUFACTURER',
        categories: ['Tavuk Göğsü (Fileto)', 'Tavuk But & Kanat', 'Dondurulmuş Ürünler'],
        contact: {
          fullName: 'Ahmet Yılmaz',
          email: 'ahmet.yilmaz@senpilic.com.tr',
          phone: '+90 212 444 0 736',
          title: 'Kurumsal Satış Müdürü',
          role: 'PRIMARY_CONTACT'
        }
      },
      {
        companyName: 'Banvit Bandırma Vitaminli Yem Sanayii A.Ş.',
        brandName: 'Banvit',
        description: 'Entegre tavukçuluk, hindi ve hazır yemek üretimi',
        country: 'Türkiye',
        city: 'Balıkesir',
        district: 'Bandırma',
        postalCode: '10200',
        address: 'Bandırma Organize Sanayi Bölgesi',
        website: 'www.banvit.com',
        taxOffice: 'Bandırma Vergi Dairesi',
        taxNumber: '1234567891',
        supplierType: 'MANUFACTURER',
        categories: ['Tavuk Göğsü (Fileto)', 'Hindi Ürünleri', 'Dondurulmuş Ürünler'],
        contact: {
          fullName: 'Mehmet Özkan',
          email: 'mehmet.ozkan@banvit.com',
          phone: '+90 266 733 8000',
          title: 'Satış Direktörü',
          role: 'EXECUTIVE'
        }
      },
      {
        companyName: 'Erpiliç Entegre Tavukçuluk Üretim Pazarlama ve Ticaret Ltd. Şti.',
        brandName: 'Erpiliç',
        description: 'Beyaz et ve ileri işlenmiş ürünler, marine ürünler',
        country: 'Türkiye',
        city: 'Çanakkale',
        district: 'Biga',
        postalCode: '17200',
        address: 'Biga Organize Sanayi Bölgesi',
        website: 'www.erpilic.com.tr',
        taxOffice: 'Biga Vergi Dairesi',
        taxNumber: '1234567892',
        supplierType: 'MANUFACTURER',
        categories: ['Tavuk But & Kanat', 'Tavuk Kıyma', 'Marinasyon Karışımı (Özel)'],
        contact: {
          fullName: 'Zeynep Kaya',
          email: 'zeynep.kaya@erpilic.com.tr',
          phone: '+90 286 316 8000',
          title: 'Satış Müdürü',
          role: 'PRIMARY_CONTACT'
        }
      },
      {
        companyName: 'Keskinoğlu Tavukçuluk ve Damızlık İşletmeleri Sanayi Ticaret A.Ş.',
        brandName: 'Keskinoğlu',
        description: 'Organik tavuk, gübre ve yumurta üretimi',
        country: 'Türkiye',
        city: 'Denizli',
        district: 'Merkez',
        postalCode: '20100',
        address: 'Denizli Organize Sanayi Bölgesi',
        website: 'www.keskinoglu.com.tr',
        taxOffice: 'Denizli Vergi Dairesi',
        taxNumber: '1234567893',
        supplierType: 'MANUFACTURER',
        categories: ['Tavuk Göğsü (Fileto)', 'Organik Atık', 'Hammadde Alternatifleri'],
        contact: {
          fullName: 'Ali Keskin',
          email: 'ali.keskin@keskinoglu.com.tr',
          phone: '+90 258 269 1243',
          title: 'İş Geliştirme Müdürü',
          role: 'PRIMARY_CONTACT'
        }
      },
      {
        companyName: 'Gedik Piliç Entegre Üretim ve Pazarlama A.Ş.',
        brandName: 'Gedik Piliç',
        description: 'Beyaz et üretimi ve dağıtımı',
        country: 'Türkiye',
        city: 'Çorum',
        district: 'Merkez',
        postalCode: '19100',
        address: 'Çorum Organize Sanayi Bölgesi',
        website: 'www.gedikpilic.com',
        taxOffice: 'Çorum Vergi Dairesi',
        taxNumber: '1234567894',
        supplierType: 'MANUFACTURER',
        categories: ['Tavuk But & Kanat', 'Tavuk Göğsü (Fileto)', 'Dondurulmuş Ürünler'],
        contact: {
          fullName: 'Mustafa Gedik',
          email: 'mustafa.gedik@gedikpilic.com',
          phone: '+90 364 254 9595',
          title: 'Genel Müdür Yardımcısı',
          role: 'EXECUTIVE'
        }
      },
      {
        companyName: 'Sütaş Süt Ürünleri A.Ş.',
        brandName: 'Sütaş',
        description: 'Süt ve süt ürünleri üretimi - yoğurt, ayran, peynir',
        country: 'Türkiye',
        city: 'Bursa',
        district: 'Karacabey',
        postalCode: '16700',
        address: 'Karacabey Süt İşletmesi',
        website: 'www.sutas.com.tr',
        taxOffice: 'Karacabey Vergi Dairesi',
        taxNumber: '2234567890',
        supplierType: 'MANUFACTURER',
        categories: ['Süt & Süt Ürünleri', 'Ayran', 'Yoğurt & Ayran Bazı'],
        contact: {
          fullName: 'Fatma Demir',
          email: 'fatma.demir@sutas.com.tr',
          phone: '+90 224 724 9850',
          title: 'Kurumsal Satış Yöneticisi',
          role: 'PRIMARY_CONTACT'
        }
      },
      {
        companyName: 'Pınar Süt Mamülleri Sanayii A.Ş.',
        brandName: 'Pınar',
        description: 'Süt, et ve su ürünleri',
        country: 'Türkiye',
        city: 'İzmir',
        district: 'Bornova',
        postalCode: '35040',
        address: 'Pınarbaşı Mah. Kemalpaşa Cad. No:317',
        website: 'www.pinar.com.tr',
        taxOffice: 'Bornova Vergi Dairesi',
        taxNumber: '2234567891',
        supplierType: 'MANUFACTURER',
        categories: ['Süt & Süt Ürünleri', 'Şarküteri (Sucuk, Sosis, Pastırma)', 'İçecekler'],
        contact: {
          fullName: 'Cem Pınar',
          email: 'cem.pinar@pinar.com.tr',
          phone: '+90 232 495 0000',
          title: 'Satış Müdürü',
          role: 'PRIMARY_CONTACT'
        }
      },
      {
        companyName: 'Ülker Bisküvi Sanayi A.Ş.',
        brandName: 'Ülker',
        description: 'Bisküvi, çikolata ve tatlı ürünleri',
        country: 'Türkiye',
        city: 'İstanbul',
        district: 'Ümraniye',
        postalCode: '34760',
        address: 'Kısıklı Mah. Ferah Cad. No:1',
        website: 'www.ulker.com.tr',
        taxOffice: 'Ümraniye Vergi Dairesi',
        taxNumber: '2234567892',
        supplierType: 'MANUFACTURER',
        categories: ['Tatlı & Pastane', 'Çikolata (Bitter/Sütlü/Beyaz)', 'Kakao & Krem Şanti'],
        contact: {
          fullName: 'Ayşe Ülker',
          email: 'ayse.ulker@ulker.com.tr',
          phone: '+90 216 524 2500',
          title: 'Kurumsal Müşteriler Müdürü',
          role: 'PRIMARY_CONTACT'
        }
      },
      {
        companyName: 'Tat Konserve Sanayii A.Ş.',
        brandName: 'TAT',
        description: 'Salça, konserve, turşu ve sos ürünleri',
        country: 'Türkiye',
        city: 'İstanbul',
        district: 'Kartal',
        postalCode: '34870',
        address: 'Cevizli Mah. Tugay Yolu Cad. No:67',
        website: 'www.tat.com.tr',
        taxOffice: 'Kartal Vergi Dairesi',
        taxNumber: '2234567893',
        supplierType: 'MANUFACTURER',
        categories: ['Domates & Cherry Domates', 'Hardal, Ketçap, Mayonez Bazları', 'Sos Pompaları'],
        contact: {
          fullName: 'Mehmet Tat',
          email: 'mehmet.tat@tat.com.tr',
          phone: '+90 216 430 0000',
          title: 'Satış Direktörü',
          role: 'EXECUTIVE'
        }
      },
      {
        companyName: 'Unilever Sanayi ve Ticaret Türk A.Ş.',
        brandName: 'Unilever Food Solutions',
        description: 'Profesyonel mutfaklar için sos, çorba ve baharat çözümleri',
        country: 'Türkiye',
        city: 'İstanbul',
        district: 'Şişli',
        postalCode: '34394',
        address: 'Büyükdere Cad. No:121',
        website: 'www.unileverfoodsolutions.com.tr',
        taxOffice: 'Boğaziçi Kurumlar Vergi Dairesi',
        taxNumber: '2234567894',
        supplierType: 'MANUFACTURER',
        categories: ['Baharat & Otlar', 'Hardal, Ketçap, Mayonez Bazları', 'Barbekü & Acı Sos Bazı'],
        contact: {
          fullName: 'Özge Yılmaz',
          email: 'ozge.yilmaz@unilever.com',
          phone: '+90 212 453 7000',
          title: 'Food Solutions Müdürü',
          role: 'PRIMARY_CONTACT'
        }
      },
      {
        companyName: 'Altınmarka Gıda Sanayi ve Ticaret A.Ş.',
        brandName: 'Altınmarka',
        description: 'Yağ, margarin ve profesyonel mutfak yağları',
        country: 'Türkiye',
        city: 'İstanbul',
        district: 'Esenyurt',
        postalCode: '34510',
        address: 'Esenyurt Sanayi Sitesi',
        website: 'www.altinmarka.com.tr',
        taxOffice: 'Esenyurt Vergi Dairesi',
        taxNumber: '2234567895',
        supplierType: 'MANUFACTURER',
        categories: ['Ayçiçek Yağı', 'Margarin & Yağ Karışımları', 'Yağlar & Sos Bazları'],
        contact: {
          fullName: 'Hasan Altın',
          email: 'hasan.altin@altinmarka.com.tr',
          phone: '+90 212 659 6868',
          title: 'Satış Müdürü',
          role: 'PRIMARY_CONTACT'
        }
      },
      {
        companyName: 'Bunge Gıda Sanayi ve Ticaret A.Ş.',
        brandName: 'Bunge',
        description: 'Endüstriyel yağlar ve margarin üretimi',
        country: 'Türkiye',
        city: 'İstanbul',
        district: 'Şişli',
        postalCode: '34381',
        address: 'Maslak Mah. Eski Büyükdere Cad.',
        website: 'www.bunge.com.tr',
        taxOffice: 'Mecidiyeköy Vergi Dairesi',
        taxNumber: '2234567896',
        supplierType: 'MANUFACTURER',
        categories: ['Zeytinyalı', 'Tereyağı', 'Yağ Filtresi & Filtre Kağıdı'],
        contact: {
          fullName: 'Selin Öz',
          email: 'selin.oz@bunge.com',
          phone: '+90 212 376 7100',
          title: 'Ticari Müdür',
          role: 'EXECUTIVE'
        }
      },
      
      // AMBALAJ TEDARİKÇİLERİ
      {
        companyName: 'Huhtamaki Turkey Gıda Servisi Ambalajı A.Ş.',
        brandName: 'Huhtamaki',
        description: 'Kağıt bardak, tabak ve gıda ambalajları',
        country: 'Türkiye',
        city: 'İstanbul',
        district: 'Silivri',
        postalCode: '34570',
        address: 'Silivri Organize Sanayi Bölgesi',
        website: 'www.huhtamaki.com',
        taxOffice: 'Silivri Vergi Dairesi',
        taxNumber: '3334567890',
        supplierType: 'MANUFACTURER',
        categories: ['Ambalaj & Sarf', 'Burger/Wrap Kutusu', 'Sıcak/Soğuk Bardak & Kapak'],
        contact: {
          fullName: 'Kemal Acar',
          email: 'kemal.acar@huhtamaki.com',
          phone: '+90 212 858 0800',
          title: 'Satış Müdürü',
          role: 'PRIMARY_CONTACT'
        }
      },
      {
        companyName: 'Sarten Ambalaj Sanayi ve Ticaret A.Ş.',
        brandName: 'Sarten',
        description: 'Plastik ve kağıt ambalaj ürünleri',
        country: 'Türkiye',
        city: 'İstanbul',
        district: 'Beylikdüzü',
        postalCode: '34520',
        address: 'Beylikdüzü Organize Sanayi Bölgesi',
        website: 'www.sarten.com.tr',
        taxOffice: 'Beylikdüzü Vergi Dairesi',
        taxNumber: '3334567891',
        supplierType: 'MANUFACTURER',
        categories: ['PP/PE Kap & Kapak', 'Baskılı Poşet & Kutu', 'Take-away & Delivery'],
        contact: {
          fullName: 'Elif Sarten',
          email: 'elif.sarten@sarten.com.tr',
          phone: '+90 212 875 1700',
          title: 'İş Geliştirme Müdürü',
          role: 'PRIMARY_CONTACT'
        }
      },
      
      // TEMİZLİK TEDARİKÇİLERİ
      {
        companyName: 'Diversey Kimya Sanayi ve Ticaret A.Ş.',
        brandName: 'Diversey',
        description: 'Endüstriyel temizlik ve hijyen çözümleri',
        country: 'Türkiye',
        city: 'İstanbul',
        district: 'Ataşehir',
        postalCode: '34758',
        address: 'Ataşehir Bulvarı',
        website: 'www.diversey.com',
        taxOffice: 'Ataşehir Vergi Dairesi',
        taxNumber: '4444567890',
        supplierType: 'DISTRIBUTOR',
        categories: ['Temizlik & Hijyen', 'Dezenfektan (Gıda Uyumlu)', 'Temizlik Kimyasalları'],
        contact: {
          fullName: 'Burak Yılmaz',
          email: 'burak.yilmaz@diversey.com',
          phone: '+90 216 466 4646',
          title: 'Satış Müdürü',
          role: 'PRIMARY_CONTACT'
        }
      },
      {
        companyName: 'Ecolab Temizlik Sistemleri Ltd. Şti.',
        brandName: 'Ecolab',
        description: 'Profesyonel mutfak hijyen sistemleri',
        country: 'Türkiye',
        city: 'İstanbul',
        district: 'Sarıyer',
        postalCode: '34396',
        address: 'Maslak Mah. Ahi Evran Cad.',
        website: 'www.ecolab.com.tr',
        taxOffice: 'Sarıyer Vergi Dairesi',
        taxNumber: '4444567891',
        supplierType: 'DISTRIBUTOR',
        categories: ['Mutfak Hijyeni', 'Bulaşık Deterjanı & Durulama', 'Yağ Çözücü & Fırın Temizleyici'],
        contact: {
          fullName: 'Deniz Eco',
          email: 'deniz.eco@ecolab.com',
          phone: '+90 212 329 0700',
          title: 'Kurumsal Satış Yöneticisi',
          role: 'PRIMARY_CONTACT'
        }
      },
      
      // EKİPMAN TEDARİKÇİLERİ
      {
        companyName: 'Öztiryakiler Madeni Eşya Sanayi ve Ticaret A.Ş.',
        brandName: 'Öztiryakiler',
        description: 'Endüstriyel mutfak ekipmanları üretimi',
        country: 'Türkiye',
        city: 'İstanbul',
        district: 'Küçükçekmece',
        postalCode: '34295',
        address: 'Sefaköy Sanayi Sitesi',
        website: 'www.oztiryakiler.com.tr',
        taxOffice: 'Küçükçekmece Vergi Dairesi',
        taxNumber: '5554567890',
        supplierType: 'MANUFACTURER',
        categories: ['Mutfak Ekipmanları', 'Endüstriyel Buzdolabı', 'Konveksiyon Fırın'],
        contact: {
          fullName: 'Orhan Öztiryaki',
          email: 'orhan@oztiryakiler.com.tr',
          phone: '+90 212 671 0052',
          title: 'Genel Müdür',
          role: 'EXECUTIVE'
        }
      },
      {
        companyName: 'İnoksan Mutfak Sanayi ve Ticaret A.Ş.',
        brandName: 'İnoksan',
        description: 'Paslanmaz çelik mutfak ekipmanları',
        country: 'Türkiye',
        city: 'İstanbul',
        district: 'Arnavutköy',
        postalCode: '34555',
        address: 'Hadımköy Mevkii',
        website: 'www.inoksan.com',
        taxOffice: 'Arnavutköy Vergi Dairesi',
        taxNumber: '5554567891',
        supplierType: 'MANUFACTURER',
        categories: ['Pişirme Ekipmanları', 'Soğutma & Depolama', 'Hazırlık Ekipmanları'],
        contact: {
          fullName: 'İsmail İnoksan',
          email: 'ismail@inoksan.com',
          phone: '+90 212 444 6398',
          title: 'Satış Direktörü',
          role: 'EXECUTIVE'
        }
      },
      
      // LOJİSTİK TEDARİKÇİLERİ
      {
        companyName: 'Ekol Lojistik A.Ş.',
        brandName: 'Ekol',
        description: 'Soğuk zincir ve gıda lojistiği',
        country: 'Türkiye',
        city: 'İstanbul',
        district: 'Sultanbeyli',
        postalCode: '34935',
        address: 'Ekol Caddesi No:1',
        website: 'www.ekol.com',
        taxOffice: 'Sultanbeyli Vergi Dairesi',
        taxNumber: '6664567890',
        supplierType: 'SERVICE_PROVIDER',
        categories: ['Lojistik & Dağıtım', 'Soğuk Zincir Taşıma', 'Tedarikçi → Merkez Depo'],
        contact: {
          fullName: 'Ahmet Ekol',
          email: 'ahmet.ekol@ekol.com',
          phone: '+90 444 3565',
          title: 'Müşteri İlişkileri Müdürü',
          role: 'PRIMARY_CONTACT'
        }
      },
      {
        companyName: 'Horoz Lojistik Kargo Hizmetleri ve Ticaret A.Ş.',
        brandName: 'Horoz Lojistik',
        description: 'Yurt içi dağıtım ve depolama hizmetleri',
        country: 'Türkiye',
        city: 'İstanbul',
        district: 'Esenyurt',
        postalCode: '34522',
        address: 'Esenyurt Lojistik Merkezi',
        website: 'www.horoz.com.tr',
        taxOffice: 'Esenyurt Vergi Dairesi',
        taxNumber: '6664567891',
        supplierType: 'SERVICE_PROVIDER',
        categories: ['Depo → Şube Dağıtım', 'Paletleme & Depolama', 'Kargo & Kurye'],
        contact: {
          fullName: 'Fatih Horoz',
          email: 'fatih.horoz@horoz.com.tr',
          phone: '+90 444 0455',
          title: 'Operasyon Müdürü',
          role: 'PRIMARY_CONTACT'
        }
      },
      
      // TEKNOLOJİ TEDARİKÇİLERİ (Indirect)
      {
        companyName: 'Microsoft Türkiye Bilgisayar Yazılım Hizmetleri Ltd. Şti.',
        brandName: 'Microsoft',
        description: 'İşletim sistemleri, ofis yazılımları ve bulut hizmetleri',
        country: 'Türkiye',
        city: 'İstanbul',
        district: 'Sarıyer',
        postalCode: '34467',
        address: 'Levent Mah. Levent Cad. No:6',
        website: 'www.microsoft.com/tr-tr',
        taxOffice: 'Sarıyer Vergi Dairesi',
        taxNumber: '7774567890',
        supplierType: 'SERVICE_PROVIDER',
        categories: ['Yazılım & Lisans', 'Bulut Yedekleme', 'IT & Dijital'],
        contact: {
          fullName: 'Canan Microsoft',
          email: 'canan@microsoft.com',
          phone: '+90 212 280 5757',
          title: 'Kurumsal Müşteriler Müdürü',
          role: 'PRIMARY_CONTACT'
        }
      },
      {
        companyName: 'SAP Türkiye Yazılım Hizmetleri Ltd. Şti.',
        brandName: 'SAP',
        description: 'ERP ve iş zekası çözümleri',
        country: 'Türkiye',
        city: 'İstanbul',
        district: 'Şişli',
        postalCode: '34398',
        address: 'Maslak Mahallesi',
        website: 'www.sap.com/turkey',
        taxOffice: 'Mecidiyeköy Vergi Dairesi',
        taxNumber: '7774567891',
        supplierType: 'SERVICE_PROVIDER',
        categories: ['Yazılım & Lisans', 'Envanter Yönetimi', 'IT & Dijital'],
        contact: {
          fullName: 'Serkan SAP',
          email: 'serkan@sap.com',
          phone: '+90 212 334 9800',
          title: 'Satış Direktörü',
          role: 'EXECUTIVE'
        }
      },
      {
        companyName: 'Logo Yazılım Sanayi ve Ticaret A.Ş.',
        brandName: 'Logo',
        description: 'Muhasebe ve iş yönetimi yazılımları',
        country: 'Türkiye',
        city: 'Kocaeli',
        district: 'Gebze',
        postalCode: '41400',
        address: 'Gebze Organize Sanayi Bölgesi',
        website: 'www.logo.com.tr',
        taxOffice: 'Gebze Vergi Dairesi',
        taxNumber: '7774567895',
        supplierType: 'SERVICE_PROVIDER',
        categories: ['Muhasebe Yazılımı', 'Bordro Yazılımı', 'Yazılım & Lisans'],
        contact: {
          fullName: 'Tuğba Logo',
          email: 'tugba@logo.com.tr',
          phone: '+90 262 679 8000',
          title: 'İş Ortakları Müdürü',
          role: 'PRIMARY_CONTACT'
        }
      },
      
      // PAZARLAMA VE REKLAM (Indirect)
      {
        companyName: 'Publicis İstanbul İletişim Hizmetleri A.Ş.',
        brandName: 'Publicis',
        description: 'Reklam ajansı ve kreatif hizmetler',
        country: 'Türkiye',
        city: 'İstanbul',
        district: 'Şişli',
        postalCode: '34394',
        address: 'Levent Mahallesi',
        website: 'www.publicisistanbul.com',
        taxOffice: 'Şişli Vergi Dairesi',
        taxNumber: '8884567890',
        supplierType: 'SERVICE_PROVIDER',
        categories: ['Pazarlama & Marka', 'Dijital Pazarlama', 'Ajans Hizmeti'],
        contact: {
          fullName: 'Ece Publicis',
          email: 'ece@publicisistanbul.com',
          phone: '+90 212 336 0330',
          title: 'Müşteri Direktörü',
          role: 'EXECUTIVE'
        }
      },
      
      // İNŞAAT VE RENOVASYON (Indirect)
      {
        companyName: 'Tepe İnşaat Sanayi A.Ş.',
        brandName: 'Tepe İnşaat',
        description: 'Ticari alan inşaat ve renovasyon projeleri',
        country: 'Türkiye',
        city: 'İstanbul',
        district: 'Şişli',
        postalCode: '34394',
        address: 'Levent Mahallesi',
        website: 'www.tepeinsaat.com.tr',
        taxOffice: 'Mecidiyeköy Vergi Dairesi',
        taxNumber: '9994567890',
        supplierType: 'SERVICE_PROVIDER',
        categories: ['İnşaat & Tadilat', 'Mimari & İnce İşler', 'Kurulum Hizmeti'],
        contact: {
          fullName: 'Cem Tepe',
          email: 'cem@tepeinsaat.com.tr',
          phone: '+90 212 201 4000',
          title: 'Proje Müdürü',
          role: 'PRIMARY_CONTACT'
        }
      },
      
      // ENERJİ VE TESİS YÖNETİMİ
      {
        companyName: 'Enerjisa Enerji A.Ş.',
        brandName: 'Enerjisa',
        description: 'Elektrik tedarik ve enerji yönetimi',
        country: 'Türkiye',
        city: 'İstanbul',
        district: 'Ataşehir',
        postalCode: '34758',
        address: 'Ataşehir Bulvarı',
        website: 'www.enerjisa.com.tr',
        taxOffice: 'Ataşehir Vergi Dairesi',
        taxNumber: '1114567890',
        supplierType: 'SERVICE_PROVIDER',
        categories: ['Elektrik', 'Elektrik Tedarik Anlaşması', 'Enerji & Hizmetler'],
        contact: {
          fullName: 'Engin Enerji',
          email: 'engin@enerjisa.com.tr',
          phone: '+90 850 477 0 477',
          title: 'Kurumsal Müşteriler Müdürü',
          role: 'PRIMARY_CONTACT'
        }
      },
      
      // GÜVENLİK HİZMETLERİ
      {
        companyName: 'Securitas Güvenlik Hizmetleri A.Ş.',
        brandName: 'Securitas',
        description: 'Güvenlik personeli ve alarm sistemleri',
        country: 'Türkiye',
        city: 'İstanbul',
        district: 'Ataşehir',
        postalCode: '34758',
        address: 'İçerenköy Mahallesi',
        website: 'www.securitas.com.tr',
        taxOffice: 'Ataşehir Vergi Dairesi',
        taxNumber: '1224567890',
        supplierType: 'SERVICE_PROVIDER',
        categories: ['Güvenlik & Yangın', 'Özel Güvenlik Hizmeti', 'Alarm Sistemi Bakımı'],
        contact: {
          fullName: 'Güven Securitas',
          email: 'guven@securitas.com.tr',
          phone: '+90 212 444 0822',
          title: 'Satış Müdürü',
          role: 'PRIMARY_CONTACT'
        }
      },
      
      // İNSAN KAYNAKLARI VE EĞİTİM
      {
        companyName: 'Adecco Türkiye İnsan Kaynakları Ltd. Şti.',
        brandName: 'Adecco',
        description: 'İnsan kaynakları ve işe alım danışmanlığı',
        country: 'Türkiye',
        city: 'İstanbul',
        district: 'Şişli',
        postalCode: '34394',
        address: 'Levent Mahallesi',
        website: 'www.adecco.com.tr',
        taxOffice: 'Şişli Vergi Dairesi',
        taxNumber: '1334567890',
        supplierType: 'SERVICE_PROVIDER',
        categories: ['İnsan Kaynakları & Eğitim', 'İşe Alım & Bordro', 'Denetim & Danışmanlık'],
        contact: {
          fullName: 'Ayla Adecco',
          email: 'ayla@adecco.com.tr',
          phone: '+90 212 339 0700',
          title: 'Müşteri İlişkileri Müdürü',
          role: 'PRIMARY_CONTACT'
        }
      },
      
      // HUKUK VE DANIŞMANLIK
      {
        companyName: 'PwC Yeminli Mali Müşavirlik A.Ş.',
        brandName: 'PwC',
        description: 'Denetim ve vergi danışmanlığı',
        country: 'Türkiye',
        city: 'İstanbul',
        district: 'Şişli',
        postalCode: '34394',
        address: 'Levent Mahallesi',
        website: 'www.pwc.com.tr',
        taxOffice: 'Boğaziçi Kurumlar Vergi Dairesi',
        taxNumber: '1444567891',
        supplierType: 'SERVICE_PROVIDER',
        categories: ['Bağımsız Denetim', 'Vergi Danışmanlığı', 'Denetim & Danışmanlık'],
        contact: {
          fullName: 'Pınar PwC',
          email: 'pinar@pwc.com.tr',
          phone: '+90 212 326 6060',
          title: 'Direktör',
          role: 'EXECUTIVE'
        }
      },
      
      // SİGORTA VE FİNANS
      {
        companyName: 'Axa Sigorta A.Ş.',
        brandName: 'AXA',
        description: 'İşyeri ve sorumluluk sigortaları',
        country: 'Türkiye',
        city: 'İstanbul',
        district: 'Şişli',
        postalCode: '34384',
        address: 'Mecidiyeköy Mahallesi',
        website: 'www.axasigorta.com.tr',
        taxOffice: 'Mecidiyeköy Vergi Dairesi',
        taxNumber: '1554567890',
        supplierType: 'SERVICE_PROVIDER',
        categories: ['Sigorta', 'Yangın & Hırsızlık', 'Finans & Sigorta'],
        contact: {
          fullName: 'Akif Axa',
          email: 'akif@axasigorta.com.tr',
          phone: '+90 850 250 9999',
          title: 'Kurumsal Satış Müdürü',
          role: 'PRIMARY_CONTACT'
        }
      }
    ];
    
    console.log(`\n👥 ${suppliers.length} supplier oluşturuluyor...`);
    
    let supplierCount = 0;
    let contactCount = 0;
    let categoryRelationCount = 0;
    const createdSuppliers = [];
    
    for (const supplierData of suppliers) {
      try {
        // Supplier'ı kontrol et (taxNumber unique olduğu için)
        let supplier = await prisma.supplier.findFirst({
          where: {
            taxNumber: supplierData.taxNumber
          }
        });
        
        if (!supplier) {
          // Supplier oluştur
          const { contact, categories, ...supplierInfo } = supplierData;
          supplier = await prisma.supplier.create({
            data: {
              ...supplierInfo,
              companyId: adminUser.companyId,
              status: 'ACTIVE'
            }
          });
          supplierCount++;
          console.log(`  ✅ ${supplier.companyName}`);
          
          // Contact bilgisi ekle
          if (contact) {
            await prisma.supplierContact.create({
              data: {
                ...contact,
                supplierId: supplier.id
              }
            });
            contactCount++;
          }
          
          createdSuppliers.push(supplier);
        } else {
          console.log(`  ⚠️  ${supplier.companyName} zaten mevcut`);
        }
        
        // Kategori ilişkilerini oluştur
        if (supplierData.categories) {
          for (const categoryName of supplierData.categories) {
            const categoryId = categoryMap[categoryName];
            if (categoryId) {
              // İlişki var mı kontrol et
              const existing = await prisma.supplierCategory.findFirst({
                where: {
                  supplierId: supplier.id,
                  categoryId: categoryId
                }
              });
              
              if (!existing) {
                await prisma.supplierCategory.create({
                  data: {
                    supplierId: supplier.id,
                    categoryId: categoryId
                  }
                });
                categoryRelationCount++;
              }
            }
          }
        }
        
      } catch (error) {
        console.error(`  ❌ ${supplierData.companyName}: ${error.message}`);
      }
    }
    
    console.log(`\n✅ ${supplierCount} yeni supplier oluşturuldu`);
    console.log(`✅ ${contactCount} supplier contact oluşturuldu`);
    console.log(`✅ ${categoryRelationCount} kategori ilişkisi oluşturuldu`);
    
    return createdSuppliers;
    
  } catch (error) {
    console.error('❌ Supplier oluşturma hatası:', error);
    throw error;
  }
}

async function createRFxTemplates() {
  try {
    console.log('\n📋 RFx Template\'leri oluşturuluyor...');
    
    // Admin kullanıcısını bul
    const adminUser = await prisma.user.findFirst({
      where: { email: 'admin@procurementflow.com' },
      include: { company: true }
    });
    
    if (!adminUser) {
      console.error('❌ Admin kullanıcı bulunamadı');
      return;
    }
    
    // Mevcut kategorileri getir
    const categories = await prisma.category.findMany({
      where: { companyId: adminUser.companyId }
    });
    
    const categoryMap = {};
    categories.forEach(cat => {
      categoryMap[cat.name] = cat.CategoryID;
    });
    
    const templates = [
      {
        name: 'Tavuk Ürünleri Tedarik RFQ Şablonu',
        description: 'Beyaz et ve tavuk ürünleri için standart fiyat teklifi şablonu',
        type: 'RFQ',
        categoryId: categoryMap['Tavuk Göğsü (Fileto)'] || categoryMap['Proteinler (Tavuk & Diğer)'],
        basicInfo: {
          title: 'Temel Bilgiler',
          fields: [
            { label: 'Doküman Başlığı', isRequired: true },
            { label: 'RFX Türü', isRequired: true },
            { label: 'Doküman Numarası', isRequired: true }
          ],
          isEditable: false
        },
        technicalRequirements: {
          title: 'Teknik Gereksinimler',
          fields: [
            { label: 'Ürün Spesifikasyonları', description: 'Parça büyüklükleri, gramaj, kesim şekli', isRequired: true },
            { label: 'Kalite Standartları', description: 'ISO, HACCP, Helal sertifikaları', isRequired: true },
            { label: 'Soğuk Zincir Gereksinimleri', description: 'Sıcaklık aralıkları ve lojistik detayları', isRequired: true },
            { label: 'Paketleme Şartları', description: 'Ambalaj tipi ve boyutları', isRequired: true },
            { label: 'Teslimat Sıklığı', description: 'Haftalık, günlük teslimat planı', isRequired: true }
          ],
          isEditable: true
        },
        commercialTerms: {
          title: 'Ticari Şartlar',
          fields: [
            { label: 'Birim Fiyat', description: 'Kg başına fiyat', isRequired: true },
            { label: 'Minimum Sipariş Miktarı', isRequired: true },
            { label: 'Ödeme Vadesi', description: '30, 60, 90 gün vade seçenekleri', isRequired: true },
            { label: 'İndirim Oranları', description: 'Miktar bazlı indirimler', isRequired: false }
          ],
          isEditable: true
        }
      },
      {
        name: 'Restoran Renovasyon RFP Şablonu',
        description: 'Şube yenileme ve renovasyon projeleri için kapsamlı teklif şablonu',
        type: 'RFP',
        categoryId: categoryMap['İnşaat & Tadilat'],
        basicInfo: {
          title: 'Temel Bilgiler',
          fields: [
            { label: 'Proje Adı', isRequired: true },
            { label: 'Şube Lokasyonu', isRequired: true },
            { label: 'Proje Bütçesi', isRequired: true }
          ],
          isEditable: false
        },
        technicalRequirements: {
          title: 'Proje Gereksinimleri',
          fields: [
            { label: 'Mevcut Durum Analizi', description: 'Şubenin mevcut durumu ve sorunlar', isRequired: true },
            { label: 'Tasarım Konsepti', description: 'Yeni konsept ve tasarım kriterleri', isRequired: true },
            { label: 'İnşaat Kapsamı', description: 'Yapılacak işlerin detaylı listesi', isRequired: true },
            { label: 'Malzeme Kalitesi', description: 'Kullanılacak malzeme standartları', isRequired: true },
            { label: 'Proje Süresi', description: 'Başlangıç ve bitiş tarihleri', isRequired: true },
            { label: 'Çalışma Saatleri', description: 'Restoran operasyonunu aksatmayacak çalışma planı', isRequired: true }
          ],
          isEditable: true
        },
        evaluationCriteria: {
          title: 'Değerlendirme Kriterleri',
          fields: [
            { label: 'Fiyat', description: 'Toplam proje maliyeti (%30)', isRequired: true },
            { label: 'Deneyim', description: 'Benzer proje referansları (%25)', isRequired: true },
            { label: 'Proje Süresi', description: 'Teslim hızı (%20)', isRequired: true },
            { label: 'Kalite', description: 'Malzeme ve işçilik kalitesi (%15)', isRequired: true },
            { label: 'Garanti', description: 'Garanti süresi ve kapsamı (%10)', isRequired: true }
          ],
          isEditable: true
        }
      },
      {
        name: 'Mutfak Ekipmanı RFI Şablonu',
        description: 'Endüstriyel mutfak ekipmanları için bilgi talep şablonu',
        type: 'RFI',
        categoryId: categoryMap['Mutfak Ekipmanları'],
        basicInfo: {
          title: 'Temel Bilgiler',
          fields: [
            { label: 'Bilgi Talebi Başlığı', isRequired: true },
            { label: 'İlgili Departman', isRequired: true },
            { label: 'Talep Tarihi', isRequired: true }
          ],
          isEditable: false
        },
        introductionAndSummary: {
          title: 'Bilgi Talep Edilen Konular',
          fields: [
            { label: 'Ürün Kataloğu', description: 'Mevcut ürün portföyü', isRequired: true },
            { label: 'Teknik Özellikler', description: 'Kapasite, güç tüketimi, boyutlar', isRequired: true },
            { label: 'Referanslar', description: 'Daha önce çalışılan restoran zincirleri', isRequired: true },
            { label: 'Servis Ağı', description: 'Servis noktaları ve yanıt süreleri', isRequired: true },
            { label: 'Garanti Koşulları', description: 'Standart garanti ve ek garanti seçenekleri', isRequired: true },
            { label: 'Eğitim Hizmetleri', description: 'Personel eğitimi ve kullanım desteği', isRequired: false }
          ],
          isEditable: true
        }
      },
      {
        name: 'Temizlik Hizmetleri RFQ Şablonu',
        description: 'Restoran temizlik ve hijyen hizmetleri için fiyat teklifi şablonu',
        type: 'RFQ',
        categoryId: categoryMap['Temizlik & Hijyen'],
        basicInfo: {
          title: 'Temel Bilgiler',
          fields: [
            { label: 'Hizmet Başlığı', isRequired: true },
            { label: 'Hizmet Lokasyonları', isRequired: true },
            { label: 'Başlangıç Tarihi', isRequired: true }
          ],
          isEditable: false
        },
        scheduleAndProcedures: {
          title: 'Hizmet Takvimi',
          fields: [
            { label: 'Günlük Temizlik', description: 'Günlük rutin temizlik saatleri', isRequired: true },
            { label: 'Haftalık Derin Temizlik', description: 'Detaylı temizlik günleri', isRequired: true },
            { label: 'Aylık Bakım', description: 'Zemin cilalama, cam temizliği vb.', isRequired: true },
            { label: 'Acil Durum Müdahale', description: '7/24 erişim ve yanıt süresi', isRequired: true }
          ],
          isEditable: true
        },
        technicalRequirements: {
          title: 'Teknik Gereksinimler',
          fields: [
            { label: 'Personel Sayısı', description: 'Lokasyon başına personel', isRequired: true },
            { label: 'Temizlik Malzemeleri', description: 'Kullanılacak ürünler ve markalar', isRequired: true },
            { label: 'Hijyen Standartları', description: 'HACCP uyumlu temizlik prosedürleri', isRequired: true },
            { label: 'Ekipman', description: 'Temizlik makineleri ve ekipmanları', isRequired: true },
            { label: 'Raporlama', description: 'Günlük/haftalık temizlik raporları', isRequired: true }
          ],
          isEditable: true
        }
      },
      {
        name: 'Lojistik Hizmetleri RFP Şablonu',
        description: 'Soğuk zincir ve dağıtım hizmetleri için kapsamlı teklif şablonu',
        type: 'RFP',
        categoryId: categoryMap['Lojistik & Dağıtım'],
        basicInfo: {
          title: 'Temel Bilgiler',
          fields: [
            { label: 'Proje Adı', isRequired: true },
            { label: 'Kapsam', description: 'Şehir içi, şehirlerarası', isRequired: true },
            { label: 'Başlangıç Tarihi', isRequired: true }
          ],
          isEditable: false
        },
        technicalRequirements: {
          title: 'Lojistik Gereksinimleri',
          fields: [
            { label: 'Araç Filosu', description: 'Soğutmalı araç sayısı ve kapasiteleri', isRequired: true },
            { label: 'Sıcaklık Kontrolü', description: '-18°C, 0-4°C aralıkları', isRequired: true },
            { label: 'Teslimat Noktaları', description: 'Günlük teslimat yapılacak şube sayısı', isRequired: true },
            { label: 'Teslimat Saatleri', description: 'Sabah teslimat penceresi', isRequired: true },
            { label: 'İzleme Sistemi', description: 'GPS ve sıcaklık takip sistemi', isRequired: true },
            { label: 'Depolama', description: 'Ara depo ve cross-dock imkanları', isRequired: false }
          ],
          isEditable: true
        },
        commercialTerms: {
          title: 'Ticari Şartlar',
          fields: [
            { label: 'Fiyatlandırma Modeli', description: 'Km, kg, koli bazlı fiyatlandırma', isRequired: true },
            { label: 'Minimum Ücret', description: 'Günlük/haftalık minimum ücret', isRequired: true },
            { label: 'Yakıt Fiyat Farkı', description: 'Yakıt fiyat değişimi formülü', isRequired: true },
            { label: 'Hasar Sigortası', description: 'Ürün hasar ve kayıp sigortası', isRequired: true },
            { label: 'Ceza Şartları', description: 'Geç teslimat ve sıcaklık ihlali cezaları', isRequired: true }
          ],
          isEditable: true
        }
      },
      {
        name: 'Gıda Tedarik RFQ Şablonu',
        description: 'Genel gıda ürünleri için fiyat teklifi şablonu',
        type: 'RFQ',
        categoryId: categoryMap['Süt & Süt Ürünleri'],
        basicInfo: {
          title: 'Temel Bilgiler',
          fields: [
            { label: 'Teklif Başlığı', isRequired: true },
            { label: 'Ürün Kategorisi', isRequired: true },
            { label: 'Talep Numarası', isRequired: true }
          ],
          isEditable: false
        },
        technicalRequirements: {
          title: 'Ürün Gereksinimleri',
          fields: [
            { label: 'Ürün Listesi', description: 'Talep edilen ürünler ve miktarları', isRequired: true },
            { label: 'Kalite Belgeleri', description: 'ISO, TSE, Helal sertifikaları', isRequired: true },
            { label: 'Son Kullanma Tarihi', description: 'Minimum raf ömrü gereksinimleri', isRequired: true },
            { label: 'Teslimat Şekli', description: 'Paletli, kolili, birimli', isRequired: true }
          ],
          isEditable: true
        },
        commercialTerms: {
          title: 'Ticari Koşullar',
          fields: [
            { label: 'Fiyat Listesi', description: 'Birim fiyatlar ve toplam', isRequired: true },
            { label: 'Ödeme Koşulları', description: 'Vade ve ödeme yöntemi', isRequired: true },
            { label: 'Teslimat Süresi', description: 'Sipariş sonrası teslimat', isRequired: true },
            { label: 'Garanti Koşulları', description: 'İade ve değişim şartları', isRequired: false }
          ],
          isEditable: true
        }
      },
      {
        name: 'Yazılım Hizmeti RFP Şablonu',
        description: 'Yazılım geliştirme ve lisans hizmetleri için teklif şablonu',
        type: 'RFP',
        categoryId: categoryMap['Yazılım & Lisans'],
        basicInfo: {
          title: 'Proje Bilgileri',
          fields: [
            { label: 'Proje Adı', isRequired: true },
            { label: 'Proje Kapsamı', isRequired: true },
            { label: 'Hedef Kullanıcı Sayısı', isRequired: true }
          ],
          isEditable: false
        },
        technicalRequirements: {
          title: 'Teknik Gereksinimler',
          fields: [
            { label: 'Fonksiyonel Gereksinimler', description: 'İstenen özellikler listesi', isRequired: true },
            { label: 'Teknik Altyapı', description: 'Server, database, entegrasyon', isRequired: true },
            { label: 'Güvenlik Gereksinimleri', description: 'Veri güvenliği ve yedekleme', isRequired: true },
            { label: 'Performans Kriterleri', description: 'Yanıt süresi, kapasite', isRequired: true },
            { label: 'Entegrasyon', description: 'Mevcut sistemlerle entegrasyon', isRequired: true }
          ],
          isEditable: true
        },
        evaluationCriteria: {
          title: 'Değerlendirme Kriterleri',
          fields: [
            { label: 'Teknik Yeterlilik', description: '%30', isRequired: true },
            { label: 'Fiyat', description: '%25', isRequired: true },
            { label: 'Referanslar', description: '%20', isRequired: true },
            { label: 'Destek Hizmetleri', description: '%15', isRequired: true },
            { label: 'Proje Süresi', description: '%10', isRequired: true }
          ],
          isEditable: true
        }
      },
      {
        name: 'Güvenlik Hizmeti RFI Şablonu',
        description: 'Güvenlik ve alarm sistemleri için bilgi talep şablonu',
        type: 'RFI',
        categoryId: categoryMap['Güvenlik & Yangın'],
        basicInfo: {
          title: 'Bilgi Talebi',
          fields: [
            { label: 'Talep Konusu', isRequired: true },
            { label: 'Lokasyon Sayısı', isRequired: true },
            { label: 'İletişim Bilgileri', isRequired: true }
          ],
          isEditable: false
        },
        introductionAndSummary: {
          title: 'Hizmet Detayları',
          fields: [
            { label: 'Hizmet Kapsamı', description: 'Personel, kamera, alarm sistemleri', isRequired: true },
            { label: 'Deneyim', description: 'Benzer projelerdeki deneyim', isRequired: true },
            { label: 'Sertifikalar', description: 'Güvenlik lisansları ve belgeler', isRequired: true },
            { label: 'Teknoloji', description: 'Kullanılan sistemler ve yazılımlar', isRequired: true },
            { label: 'Acil Durum Prosedürleri', description: 'Müdahale süreleri ve yöntemleri', isRequired: true }
          ],
          isEditable: true
        }
      }
    ];
    
    let templateCount = 0;
    for (const templateData of templates) {
      try {
        // Şablon var mı kontrol et
        const existing = await prisma.rFxTemplate.findFirst({
          where: {
            name: templateData.name,
            companyId: adminUser.companyId
          }
        });
        
        if (!existing) {
          await prisma.rFxTemplate.create({
            data: {
              ...templateData,
              companyId: adminUser.companyId,
              createdById: adminUser.id,
              lastModifiedById: adminUser.id,
              isActive: true,
              isDefault: false,
              version: 1
            }
          });
          templateCount++;
          console.log(`  ✅ ${templateData.name}`);
        } else {
          console.log(`  ⚠️  ${templateData.name} zaten mevcut`);
        }
      } catch (error) {
        console.error(`  ❌ ${templateData.name}: ${error.message}`);
      }
    }
    
    console.log(`\n✅ ${templateCount} yeni RFx template oluşturuldu`);
    
  } catch (error) {
    console.error('❌ RFx template oluşturma hatası:', error);
    throw error;
  }
}

async function main() {
  try {
    console.log('🚀 Tavuk Dünyası için supplier ve RFx template kurulumu başlıyor...\n');
    
    // Supplier'ları oluştur
    await createSuppliers();
    
    // RFx Template'leri oluştur
    await createRFxTemplates();
    
    // İSTATİSTİKLER
    const adminUser = await prisma.user.findFirst({
      where: { email: 'admin@procurementflow.com' }
    });
    
    if (adminUser) {
      const totalSuppliers = await prisma.supplier.count({
        where: { companyId: adminUser.companyId }
      });
      
      const totalSupplierCategories = await prisma.supplierCategory.count({
        where: { supplier: { companyId: adminUser.companyId } }
      });
      
      const totalTemplates = await prisma.rFxTemplate.count({
        where: { companyId: adminUser.companyId }
      });
      
      console.log('\n📊 Genel İstatistikler:');
      console.log(`  👥 Toplam Supplier: ${totalSuppliers}`);
      console.log(`  🔗 Toplam Kategori İlişkisi: ${totalSupplierCategories}`);
      console.log(`  📋 Toplam RFx Template: ${totalTemplates}`);
    }
    
    console.log('\n🎉 Kurulum başarıyla tamamlandı!');
    console.log('📧 Giriş: admin@procurementflow.com');
    console.log('🔑 Şifre: Admin123!');
    
  } catch (error) {
    console.error('❌ Genel hata:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Script'i çalıştır
main();