import { PrismaClient, ContactRole } from '@prisma/client';

const prisma = new PrismaClient();

// Turkish names for contacts
const turkishNames = [
  'Ahmet Yılmaz', 'Mehmet Özkan', 'Ayşe Demir', 'Fatma Kaya', 'Mustafa Çelik',
  'Zeynep Aydın', 'Ali Şahin', 'Emine Koç', 'Hasan Öztürk', 'Selin Yıldız',
  'Burak Arslan', 'Gamze Doğan', 'Cem Karaca', 'Deniz Polat', 'Ebru Akkaya',
  'Kemal Güler', 'Tuğba Erdem', 'Orhan Kılıç', 'Pınar Çakır', 'Serkan Mutlu',
  'Ece Tunç', 'Emre Balcı', 'Gül Avan', 'İbrahim Işık', 'Merve Taş',
  'Oğuz Yaman', 'Sibel Güven', 'Tolga Şen', 'Ufuk Kocabaş', 'Yasemin Uz',
  'Canan Durmuş', 'Bora Kara', 'Dilek Özgür', 'Erhan Bilgi', 'Funda Alp',
  'Güven Tekin', 'Hilal Sever', 'İlker Erol', 'Jale Özkan', 'Levent Tok'
];

// Turkish professional titles
const turkishTitles = [
  'İş Geliştirme Uzmanı',
  'Satış Müdürü',
  'Finans Müdürü',
  'Operasyon Müdürü',
  'İnsan Kaynakları Uzmanı',
  'Pazarlama Müdürü',
  'Müşteri İlişkileri Uzmanı',
  'Proje Koordinatörü',
  'Teknik Müdür',
  'Kalite Kontrol Uzmanı',
  'Lojistik Uzmanı',
  'Satın Alma Uzmanı',
  'Muhasebe Müdürü',
  'İthalat/İhracat Uzmanı',
  'Bölge Satış Müdürü',
  'Ürün Müdürü',
  'Sistem Yöneticisi',
  'Halkla İlişkiler Uzmanı',
  'Ar-Ge Uzmanı',
  'Depo Müdürü'
];

// Contact roles mapping
const contactRoles: ContactRole[] = ['PRIMARY_CONTACT', 'EXECUTIVE', 'FINANCE', 'TECHNICAL'];

function generatePhoneNumber(): string {
  const operators = ['532', '533', '534', '535', '536', '537', '538', '539', '541', '542', '543', '544', '545', '546', '547', '548', '549'];
  const operator = operators[Math.floor(Math.random() * operators.length)];
  const number = Math.floor(Math.random() * 9000000) + 1000000; // 7 digit number
  return `+90 ${operator} ${String(number).substring(0, 3)} ${String(number).substring(3)}`;
}

function generateEmail(fullName: string, companyName: string): string {
  // Extract domain from company name (simplified)
  const nameParts = fullName.toLowerCase().split(' ');
  const firstName = nameParts[0];
  const lastName = nameParts[1] || '';
  
  // Create a simplified domain from company name
  let domain = companyName.toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z]/g, '')
    .substring(0, 10);
  
  if (!domain) domain = 'company';
  
  return `${firstName}.${lastName}@${domain}.com.tr`;
}

function getRandomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

async function addSupplierContacts() {
  try {
    console.log('Starting to add additional contacts to suppliers...');
    
    // Get all suppliers with their existing contacts
    const suppliers = await prisma.supplier.findMany({
      include: {
        contacts: true
      },
      orderBy: {
        companyName: 'asc'
      }
    });
    
    console.log(`Found ${suppliers.length} suppliers`);
    
    let totalContactsAdded = 0;
    
    for (const supplier of suppliers) {
      console.log(`Processing: ${supplier.companyName} (current contacts: ${supplier.contacts.length})`);
      
      // Add 1-2 additional contacts per supplier (so they'll have 2-3 total)
      const contactsToAdd = Math.floor(Math.random() * 2) + 1; // 1 or 2 additional contacts
      
      for (let i = 0; i < contactsToAdd; i++) {
        const fullName = getRandomItem(turkishNames);
        const title = getRandomItem(turkishTitles);
        const phone = generatePhoneNumber();
        const email = generateEmail(fullName, supplier.companyName);
        const role = getRandomItem(contactRoles);
        
        // Make sure we don't duplicate names for the same supplier
        const existingNames = supplier.contacts.map(c => c.fullName);
        if (existingNames.includes(fullName)) {
          continue; // Skip this name if it already exists
        }
        
        try {
          await prisma.supplierContact.create({
            data: {
              supplierId: supplier.id,
              fullName,
              email,
              phone,
              title,
              role
            }
          });
          
          totalContactsAdded++;
          console.log(`  + Added: ${fullName} - ${title} - ${email} - ${phone}`);
        } catch (error) {
          console.log(`  ! Failed to add contact for ${supplier.companyName}: ${error}`);
        }
      }
    }
    
    console.log(`\nCompleted! Added ${totalContactsAdded} additional contacts.`);
    
    // Show final summary
    const updatedSuppliers = await prisma.supplier.findMany({
      include: {
        contacts: true
      }
    });
    
    const totalContacts = updatedSuppliers.reduce((sum, s) => sum + s.contacts.length, 0);
    console.log(`\nFinal Summary:`);
    console.log(`Total suppliers: ${updatedSuppliers.length}`);
    console.log(`Total contacts: ${totalContacts}`);
    console.log(`Average contacts per supplier: ${(totalContacts / updatedSuppliers.length).toFixed(1)}`);
    
  } catch (error) {
    console.error('Error adding supplier contacts:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addSupplierContacts();