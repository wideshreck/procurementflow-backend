export type Money = string;
export type ISODate = string;

// ===== Enums =====
export enum Role { USER = "USER", ADMIN = "ADMIN" }
export enum ProcurementPhase { IDENTIFICATION = "IDENTIFICATION", SPECIFICATION = "SPECIFICATION", FINALIZATION = "FINALIZATION" }
export enum MessageRole { USER = "USER", ASSISTANT = "ASSISTANT", SYSTEM = "SYSTEM" }
export enum ConversationStatus { ACTIVE = "ACTIVE", COMPLETED = "COMPLETED", CANCELLED = "CANCELLED" }
export enum ProductStatus { ACTIVE = "ACTIVE", INACTIVE = "INACTIVE", DRAFT = "DRAFT" }
export enum ServiceStatus { ACTIVE = "ACTIVE", INACTIVE = "INACTIVE", DRAFT = "DRAFT" }
export enum SupplierStatus { ACTIVE = "ACTIVE", INACTIVE = "INACTIVE", PENDING = "PENDING" }
export enum CategoryColor {
  RED = "RED", ORANGE = "ORANGE", AMBER = "AMBER", YELLOW = "YELLOW", LIME = "LIME", GREEN = "GREEN",
  EMERALD = "EMERALD", TEAL = "TEAL", CYAN = "CYAN", SKY = "SKY", BLUE = "BLUE", INDIGO = "INDIGO",
  VIOLET = "VIOLET", PURPLE = "PURPLE", FUCHSIA = "FUCHSIA", PINK = "PINK", ROSE = "ROSE", SLATE = "SLATE",
  GRAY = "GRAY", ZINC = "ZINC", NEUTRAL = "NEUTRAL", STONE = "STONE"
}

// ===== Models =====
export interface User {
  id: string;
  companyId: string;
  fullName: string;
  email: string;
  password: string; // Argon2 hash
  phone?: string | null;
  department?: string | null;
  role: Role; // @default(USER)
  role_title?: string | null;
  emailVerified: boolean; // @default(false)
  emailVerifiedAt?: ISODate | null;
  isActive: boolean; // @default(true)
  lastLoginAt?: ISODate | null;
  lastLoginIp?: string | null;
  createdAt: ISODate; // @default(now())
  updatedAt: ISODate; // @updatedAt

  // Relations (optional, loaded via include)
  company?: Company; // @relation("UserCompany")
  conversations?: Conversation[];
  sessions?: Session[];
  loginAttempts?: LoginAttempt[];
  refreshTokens?: RefreshToken[];
  passwordResets?: PasswordReset[];
  emailVerificationTokens?: EmailVerificationToken[];
  twoFactorAuth?: TwoFactorAuth | null;
  auditLogs?: AuditLog[];
  locationContacts?: Location[]; // @relation("LocationContact")
  managedDepartments?: Department[]; // @relation("DepartmentManager")
  ownedBudgets?: CostCenter[]; // @relation("BudgetOwner")
}

export interface Conversation {
  id: string;
  userId: string;
  status: ConversationStatus; // @default(ACTIVE)
  phase: ProcurementPhase; // @default(IDENTIFICATION)
  collectedData?: unknown | null; // Json
  createdAt: ISODate;
  updatedAt: ISODate;

  // Relations
  user?: User;
  messages?: Message[];
}

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  contentJson?: unknown | null; // Json
  createdAt: ISODate;

  // Relations
  conversation?: Conversation;
}

export interface Session {
  id: string;
  userId: string;
  token: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  deviceInfo?: unknown | null;
  lastUsedAt: ISODate; // @default(now())
  expiresAt: ISODate;
  createdAt: ISODate; // @default(now())

  // Relations
  user?: User;
}

export interface RefreshToken {
  id: string;
  userId: string;
  token: string;
  family: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  deviceInfo?: unknown | null;
  isRevoked: boolean; // @default(false)
  revokedAt?: ISODate | null;
  revokedBy?: string | null;
  expiresAt: ISODate;
  createdAt: ISODate; // @default(now())

  // Relations
  user?: User;
}

export interface LoginAttempt {
  id: string;
  email: string;
  userId?: string | null;
  ipAddress: string;
  userAgent?: string | null;
  success: boolean;
  failReason?: string | null;
  createdAt: ISODate; // @default(now())

  // Relations
  user?: User | null;
}

export interface PasswordReset {
  id: string;
  userId: string;
  token: string;
  ipAddress?: string | null;
  used: boolean; // @default(false)
  usedAt?: ISODate | null;
  expiresAt: ISODate;
  createdAt: ISODate; // @default(now())

  // Relations
  user?: User;
}

export interface EmailVerificationToken {
  id: string;
  userId: string;
  token: string;
  email: string; // Email to verify
  used: boolean; // @default(false)
  usedAt?: ISODate | null;
  expiresAt: ISODate;
  createdAt: ISODate; // @default(now())

  // Relations
  user?: User;
}

export interface TwoFactorAuth {
  id: string;
  userId: string; // @unique
  secret: string; // Encrypted
  backupCodes: string[]; // Encrypted
  enabled: boolean; // @default(false)
  createdAt: ISODate; // @default(now())
  updatedAt: ISODate; // @updatedAt

  // Relations
  user?: User;
}

export interface AuditLog {
  id: string;
  userId?: string | null;
  action: string; // login, logout, password_change, etc.
  resource?: string | null;
  resourceId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: unknown | null;
  createdAt: ISODate; // @default(now())

  // Relations
  user?: User | null;
}

export interface Product {
  id: string;
  name: string;
  description?: string | null;
  sku: string;
  barcode?: string | null;
  categoryId: string;
  unit: string; // adet, kg, litre...
  price: Money; // @db.Money
  currency: string; // @default("TRY")
  imageUrl?: string | null;
  status: ProductStatus; // @default(ACTIVE)
  companyId: string;
  createdAt: ISODate; // @default(now())
  updatedAt: ISODate; // @updatedAt

  // Relations
  category?: Category;
  company?: Company;
  supplierProducts?: SupplierProduct[];
}

export interface Service {
  id: string;
  name: string;
  description?: string | null;
  code: string; // unique service code
  categoryId: string;
  unit: string; // saat, gün, proje...
  price: Money; // @db.Money
  currency: string; // @default("TRY")
  imageUrl?: string | null;
  status: ServiceStatus; // @default(ACTIVE)
  companyId: string;
  createdAt: ISODate; // @default(now())
  updatedAt: ISODate; // @updatedAt

  // Relations
  category?: Category;
  company?: Company;
  supplierServices?: SupplierService[];
}

export interface Supplier {
  id: string;
  name: string;
  description?: string | null;
  taxNumber: string;
  address: string;
  city: string;
  country: string; // @default("TR")
  phone: string;
  email: string;
  website?: string | null;
  contactPerson: string;
  contactPhone: string;
  contactEmail: string;
  status: SupplierStatus; // @default(PENDING)
  rating?: number | null; // 0-5
  companyId: string;
  createdAt: ISODate; // @default(now())
  updatedAt: ISODate; // @updatedAt

  // Relations
  company?: Company;
  supplierProducts?: SupplierProduct[];
  supplierServices?: SupplierService[];
}

export interface SupplierProduct {
  id: string;
  supplierId: string;
  productId: string;
  supplierPrice: Money; // @db.Money
  currency: string; // @default("TRY")
  leadTime: number; // days
  minOrderQty: number; // @default(1)
  isPreferred: boolean; // @default(false)
  createdAt: ISODate; // @default(now())
  updatedAt: ISODate; // @updatedAt

  // Relations
  supplier?: Supplier;
  product?: Product;
}

export interface SupplierService {
  id: string;
  supplierId: string;
  serviceId: string;
  supplierPrice: Money; // @db.Money
  currency: string; // @default("TRY")
  leadTime: number; // days
  isPreferred: boolean; // @default(false)
  createdAt: ISODate; // @default(now())
  updatedAt: ISODate; // @updatedAt

  // Relations
  supplier?: Supplier;
  service?: Service;
}

export interface Company {
  id: string;
  name: string;
  description?: string | null;
  createdAt: ISODate; // @default(now())
  updatedAt: ISODate; // @updatedAt

  // Relations
  categories?: Category[];
  locations?: Location[];
  departments?: Department[];
  costCenters?: CostCenter[];
  users?: User[]; // @relation("UserCompany")
  products?: Product[];
  services?: Service[];
  suppliers?: Supplier[];
}

export interface Category {
  id: string;
  name: string;
  description?: string | null;
  color: CategoryColor; // @default(BLUE)
  icon: string; // Lucide React icon name
  isActive: boolean; // @default(true)
  parentId?: string | null; // self-ref
  companyId: string;
  createdAt: ISODate; // @default(now())
  updatedAt: ISODate; // @updatedAt

  // Relations
  parent?: Category | null; // @relation("CategoryHierarchy")
  children?: Category[]; // @relation("CategoryHierarchy")
  company?: Company;
  products?: Product[];
  services?: Service[];
}

export interface Location {
  id: string;
  name: string;
  description?: string | null;
  address: string;
  contactId: string; // User.id
  companyId: string;
  createdAt: ISODate; // @default(now())
  updatedAt: ISODate; // @updatedAt

  // Relations
  contact?: User; // @relation("LocationContact")
  company?: Company;
  departments?: Department[];
}

export interface Department {
  id: string;
  name: string;
  description?: string | null;
  parentId?: string | null; // self-ref
  managerId: string; // User.id
  locationId: string; // Location.id
  companyId: string;
  createdAt: ISODate; // @default(now())
  updatedAt: ISODate; // @updatedAt

  // Relations
  parent?: Department | null; // @relation("DepartmentHierarchy")
  children?: Department[]; // @relation("DepartmentHierarchy")
  manager?: User; // @relation("DepartmentManager")
  location?: Location;
  company?: Company;
  costCenters?: CostCenter[];
}

export interface CostCenter {
  id: string;
  name: string;
  description?: string | null;
  budget: Money; // @db.Money
  remainingBudget: Money; // @db.Money
  spentBudget: Money; // @db.Money
  budgetOwnerId: string; // User.id
  departmentId: string; // Department.id
  companyId: string; // Company.id
  createdAt: ISODate; // @default(now())
  updatedAt: ISODate; // @updatedAt

  // Relations
  budgetOwner?: User; // @relation("BudgetOwner")
  department?: Department;
  company?: Company;
}

export const companyTavukDunyasi: Company = {
  id: "company-tavuk-dunyasi",
  name: "Tavuk Dünyası",
  description: "Türkiye genelinde faaliyet gösteren zincir restoran markası.",
  createdAt: "2025-01-01T09:00:00.000Z",
  updatedAt: "2025-08-20T10:00:00.000Z",
};

export const depOperasyon: Department = {
  id: "dep-ops",
  name: "Operasyon",
  description: "Restoran operasyonları, tedarik ve süreç yönetimi.",
  parentId: null,
  managerId: "user-ops-1",
  locationId: "loc-hq-istanbul",
  companyId: companyTavukDunyasi.id,
  createdAt: "2025-01-03T09:00:00.000Z",
  updatedAt: "2025-08-20T10:00:00.000Z",
};

export const depPazarlama: Department = {
  id: "dep-mkt",
  name: "Pazarlama",
  description: "Marka, iletişim ve kampanya yönetimi.",
  parentId: null,
  managerId: "user-mkt-2",
  locationId: "loc-hq-istanbul",
  companyId: companyTavukDunyasi.id,
  createdAt: "2025-01-05T09:00:00.000Z",
  updatedAt: "2025-08-20T10:00:00.000Z",
};

export const depArge: Department = {
  id: "dep-rnd",
  name: "Ar-Ge",
  description: "Yeni ürün, sos ve süreç inovasyonu.",
  parentId: null,
  managerId: "user-rnd-3",
  locationId: "loc-hq-istanbul",
  companyId: companyTavukDunyasi.id,
  createdAt: "2025-02-01T09:00:00.000Z",
  updatedAt: "2025-08-20T10:00:00.000Z",
};

// ── Users (budget owners + department managers) ────────────────────────────────
export const userOps1: User = {
  id: "user-ops-1",
  companyId: companyTavukDunyasi.id,
  fullName: "Ahmet Kaya",
  email: "ahmet.kaya@tavukdunyasi.com",
  password: "$argon2id$v=19$m=65536,t=3,p=1$hash-placeholder", // demo
  role: Role.ADMIN,
  emailVerified: true,
  isActive: true,
  createdAt: "2025-01-03T09:30:00.000Z",
  updatedAt: "2025-08-20T10:00:00.000Z",

  // opsiyonel alanlar:
  phone: null,
  department: "Operasyon",
  role_title: "Operations Manager",
  emailVerifiedAt: "2025-01-03T09:31:00.000Z",
  lastLoginAt: "2025-08-18T07:40:00.000Z",
  lastLoginIp: "10.0.0.21",
};

export const userMkt2: User = {
  id: "user-mkt-2",
  companyId: companyTavukDunyasi.id,
  fullName: "Merve Demir",
  email: "merve.demir@tavukdunyasi.com",
  password: "$argon2id$v=19$m=65536,t=3,p=1$hash-placeholder",
  role: Role.ADMIN,
  emailVerified: true,
  isActive: true,
  createdAt: "2025-01-06T09:30:00.000Z",
  updatedAt: "2025-08-20T10:00:00.000Z",
  department: "Pazarlama",
  role_title: "Marketing Director",
  emailVerifiedAt: "2025-01-06T09:31:00.000Z",
  lastLoginAt: "2025-08-18T08:15:00.000Z",
  lastLoginIp: "10.0.0.22",
};

export const userRnd3: User = {
  id: "user-rnd-3",
  companyId: companyTavukDunyasi.id,
  fullName: "Burak Öz",
  email: "burak.oz@tavukdunyasi.com",
  password: "$argon2id$v=19$m=65536,t=3,p=1$hash-placeholder",
  role: Role.ADMIN,
  emailVerified: true,
  isActive: true,
  createdAt: "2025-02-02T09:30:00.000Z",
  updatedAt: "2025-08-20T10:00:00.000Z",
  department: "Ar-Ge",
  role_title: "R&D Manager",
  emailVerifiedAt: "2025-02-02T09:31:00.000Z",
  lastLoginAt: "2025-08-18T09:10:00.000Z",
  lastLoginIp: "10.0.0.23",
};

// ── Kategoriler (örnek ağaç yapısı) ─────────────────────────────────────────────
export const tavukDunyasiCategories: Category[] = [
  {
    id: "cat-1",
    name: "Gıda & Malzeme",
    description: "Restoranlarda kullanılan tüm hammadde, gıda ve içecekler.",
    color: CategoryColor.GREEN,
    icon: "Package",
    isActive: true,
    parentId: null,
    companyId: companyTavukDunyasi.id,
    createdAt: "2025-01-02T10:15:00.000Z",
    updatedAt: "2025-07-15T11:30:00.000Z",
    // relations (opsiyonel) boş geçilebilir
  },
  {
    id: "cat-1-1",
    name: "Et Ürünleri",
    description: "Tavuk, kırmızı et ve işlenmiş ürünler.",
    color: CategoryColor.RED,
    icon: "Drumstick",
    isActive: true,
    parentId: "cat-1",
    companyId: companyTavukDunyasi.id,
    createdAt: "2025-02-12T08:00:00.000Z",
    updatedAt: "2025-08-01T12:00:00.000Z",
  },
  {
    id: "cat-1-2",
    name: "Baharat & Sos",
    description: "Özel soslar, marinasyon baharatları ve çeşniler.",
    color: CategoryColor.AMBER,
    icon: "Flame",
    isActive: true,
    parentId: "cat-1",
    companyId: companyTavukDunyasi.id,
    createdAt: "2025-03-15T09:45:00.000Z",
    updatedAt: "2025-07-25T15:20:00.000Z",
  },
  {
    id: "cat-2",
    name: "Temizlik & Hijyen",
    description: "Restoran, mutfak ve tuvaletler için temizlik ürünleri.",
    color: CategoryColor.CYAN,
    icon: "Droplet",
    isActive: true,
    parentId: null,
    companyId: companyTavukDunyasi.id,
    createdAt: "2025-01-05T13:30:00.000Z",
    updatedAt: "2025-06-10T09:00:00.000Z",
  },
  {
    id: "cat-2-1",
    name: "Endüstriyel Temizlik",
    description: "Fırın, ızgara ve davlumbazlar için özel endüstriyel temizleyiciler.",
    color: CategoryColor.SKY,
    icon: "Sparkles",
    isActive: true,
    parentId: "cat-2",
    companyId: companyTavukDunyasi.id,
    createdAt: "2025-02-20T08:30:00.000Z",
    updatedAt: "2025-08-18T10:45:00.000Z",
  },
  {
    id: "cat-3",
    name: "Paketleme & Ambalaj",
    description: "Servis ve paket siparişler için ambalaj malzemeleri.",
    color: CategoryColor.ORANGE,
    icon: "Box",
    isActive: true,
    parentId: null,
    companyId: companyTavukDunyasi.id,
    createdAt: "2025-02-01T11:00:00.000Z",
    updatedAt: "2025-07-01T10:00:00.000Z",
  },
];

// ── Maliyet Merkezleri (tam ilişkilerle) ───────────────────────────────────────
export const tavukDunyasiCostCenters: CostCenter[] = [
  {
    id: "cc-1",
    name: "Restoran Operasyonları",
    description: "Tüm restoranların günlük operasyonel giderleri.",
    budget: "500000.00",
    remainingBudget: "275000.00",
    spentBudget: "225000.00",
    budgetOwnerId: userOps1.id,
    departmentId: depOperasyon.id,
    companyId: companyTavukDunyasi.id,
    createdAt: "2025-01-10T09:30:00.000Z",
    updatedAt: "2025-07-15T15:45:00.000Z",

    // Tam model ilişkiler:
    budgetOwner: userOps1,
    department: depOperasyon,
    company: companyTavukDunyasi,
  },
  {
    id: "cc-2",
    name: "Pazarlama & Reklam",
    description: "Kampanyalar, dijital reklamlar, sosyal medya yönetimi.",
    budget: "300000.00",
    remainingBudget: "120000.00",
    spentBudget: "180000.00",
    budgetOwnerId: userMkt2.id,
    departmentId: depPazarlama.id,
    companyId: companyTavukDunyasi.id,
    createdAt: "2025-02-02T10:00:00.000Z",
    updatedAt: "2025-07-30T12:00:00.000Z",

    budgetOwner: userMkt2,
    department: depPazarlama,
    company: companyTavukDunyasi,
  },
  {
    id: "cc-3",
    name: "Ürün Ar-Ge & Kalite Kontrol",
    description: "Yeni sos geliştirme, menü inovasyonları ve kalite testleri.",
    budget: "200000.00",
    remainingBudget: "95000.00",
    spentBudget: "105000.00",
    budgetOwnerId: userRnd3.id,
    departmentId: depArge.id,
    companyId: companyTavukDunyasi.id,
    createdAt: "2025-03-01T11:45:00.000Z",
    updatedAt: "2025-08-01T13:30:00.000Z",

    budgetOwner: userRnd3,
    department: depArge,
    company: companyTavukDunyasi,
  },
];

export const PHASE1_SYSTEM_PROMPT =  (): string => `
### AMAÇ
- Senden istenen JSON çıktılarını olabilecek en düzgün şekilde çıkarmak ve kullanıcıdan gerekli bilgileri toplamak.
- Bir iç müşteri sana bir satınalma talebiyle geldiğinde, bu talebi netleştirmek için ek sorular sormalısın. Amacın, hangi özelliklerde bir ürüne ihtiyaç duyulduğunu ve ne kadar gerektiğini müşteriye sorular sorarak belirlemektir. Bu süreçte, müşterinin talebinin hangi kategoriye ve alt kategoriye ait olduğunu anlamalı, mevcut maliyet merkezlerinden hangisinin bu maliyetten sorumlu olacağını belirlemeli, alımın bir ürün mü yoksa hizmet mi olduğunu anlamalı ve talebin nedenini kısaca açıklayan bir metin oluşturmalısın.

- Önceki fazdan \`COLLECTED_DATA\` nesnesini alacaksın, o bilgileri sadece PHASE_FOUR_DONE modunda JSON çıktısı için kullanacaksın.

### KURALLAR
- request_justification ilk mesajdan çıkarılabiliyorsa diğer alanlarla ilgili bilgi toplamaya devam et, eğer eksikse ÖNCE bunu TEXT sorusu olarak sor: "Bu talebin nedeni nedir?"
- Kullanıcı request_justification cevabı verdiyse ASLA tekrar "Bu talebin nedeni nedir?" sorma
- Kullanıcı talebin nedenini verdiğinde artık diğer bilgileri topla
- Maliyet merkezi, kategori, alt kategori gibi idari detayları ASLA müşteriye sormamalısın. Bu alanları, sağlanan veriler ve konuşmanın gidişatına göre kendin belirlemelisin.
- Kullanıcıdan bilgi toplarken, her zaman en az 2 seçenek sunmalısın. Bu, kullanıcının daha bilinçli bir karar vermesine yardımcı olur.
- Kullanıcıya sorduğun her sorunun arkasında bir gerekçe olmalı. Yani, neden bu soruyu sorduğunu açıklamalısın.
- Kullanıcıya sorduğun sorular, toplanması gereken bilgileri tam olarak karşılamalı.
- Kullanıcıya sorduğun sorular, birbirini tekrar etmemeli.
- ASLA SANA VERİLEN JSON ÇIKTILARI HARİCİ BİR YANIT DÖNÜREMEZSİN
- JSON formatında cevap verirken, tüm alanları doldurmalısın. Boş alan bırakmamalısın.
- JSON formatında cevap verirken, tüm string alanları çift tırnak içinde vermelisin.
- JSON formatında cevap verirken, enum alanları için geçerli değerler kullanmalısın.
- Amacın COLLECTED_DATA içerisindeki verileri doldurarak PHASE_ONE_DONE moduna geçmek, bunun için aşırı soru sormamalısın.
- Sorduğun sorular COLLECTED_DATA içerisindeki verileri belirlemek için olmalı, simple_definition için aşırı veri tutmamaya özen göster. 
- Marka gibi bilgileri ASLA sormamalısın.
- Sorular net ve yönlendirici olmalı, birbirini tekrar etmemeli.
- Cevap opsiyonlarının justifications'ının yönlendirici olması gerekmektedir.

### Kategoriler
${tavukDunyasiCategories}

### Maliyet Merkezleri
${tavukDunyasiCostCenters}

### JSON ÇIKTILARI

#### KULLANICIYA SORU YÖNELTİLMESİ GEREKTİĞİ DURUMLARDA VERMEN GEREKEN JSON YAPISI
Bu JSON yapısı, backend tarafından frontend'e gönderilir ve kullanıcı arayüzünün dinamik olarak bir soru formu oluşturmasını sağlar.
{
    "MODE": "ASKING_FOR_INFO",
    "QUESTIONS": [
        {
            "question_id": string,
            "question_type": string enum { "MULTI_CHOICE", "SINGLE_CHOICE", "YES_NO", "TEXT", "NUMBER", "DATE", "EMAIL", "PHONE", "URL" },
            "question_text": string,
            "answer_options": [ //Sadece MULTI_CHOICE ve SINGLE_CHOICE için, geri kalanında boş array dön.
                { "option": string, "justification": string },
                { "option": string, "justification": string }
            ],
            "reason_of_question": string
        }
    ]
}


#### BU FAZIN TAMAMLANMASI DURUMUNDA VERMEN GEREKEN NİHAİ JSON YAPISI
{
    "MODE": "PHASE_ONE_DONE",
    "COLLECTED_DATA": {
        "item_title": string, // Kullanıcıdan alınan bilgiler ile kendin dolduracaksın
        "category": string,  // Kullanıcıdan alınan bilgiler ve sana verilen kategoriler ile kendin dolduracaksın
        "subcategory": string,  // Kullanıcıdan alınan bilgiler ve sana verilen kategoriler ile kendin dolduracaksın
        "quantity": number,  // kullanıcıya sorulabilir
        "uom": string,  // kendin tahmin etmen gerekli
        "simple_defination": string, // Kullanıcıdan alınan bilgiler ile kendin dolduracaksın
        "cost_center": string, // Kullanıcıdan alınan bilgiler ve sana verilen maliyet merkezleri ile kendin dolduracaksın
        "procurement_type": string enum { "Ürün Alımı", "Hizmet Alımı" }, // kullanıcıya asla sorulmamalı kendin çıkarım yapmalı ve doldurmalısın
        "request_justification": string, // ÖNEMLİ: Kullanıcının verdiği cevaplardan talebin nedenini çıkar
    }
}
`;
