# ProcurementFlow API

Bu proje, NestJS, Fastify, Prisma ve Zod kullanılarak oluşturulmuş modern ve sağlam bir backend başlangıç şablonudur. Ölçeklenebilir, verimli ve bakımı kolay sunucu tarafı uygulamalar oluşturmak için güçlü bir temel sunar.

## Yapılan Çalışmalar (Güncel)

- **Procurement modülü** eklendi: `POST /procurement/create` ile tek aktif konuşma mantığında, kullanıcı mesajından yapılandırılmış bir tedarik talebi akışı başlatılır/ilerletilir.
- **LLM tabanlı akış**: OpenAI Chat Completions kullanılarak iki modda cevap üretilir:
  - **ASK**: Eksik bilgiler için az sayıda netleştirici soru listesi döner.
  - **FINAL**: Yeterli bilgi olduğunda nihai çıktı döner (başlık, kategori, alt kategori, kodlar ve nitelikler).
- **Şema doğrulama**: LLM cevabı JSON olarak parse edilir ve Zod ile `ASK`/`FINAL` şemalarına karşı doğrulanır (`src/modules/procurement/dto/reply.dto.ts`).
- **Veritabanı güncellemeleri**:
  - `Conversation`: `status`, isteğe bağlı final özet alanları (`finalTitle`, `finalCategoryCode`, `finalSubcategoryCode`, `finalAttributes`, `completedAt`).
  - `Message`: `content` ve isteğe bağlı `contentJson` (LLM’in yapılandırılmış çıktısı).
- **Akış kontrolleri**:
  - `cancel=true` gönderilirse konuşma iptal edilir ve iptal cevabı üretilir.
  - `isDone=true` gönderildiğinde konuşma `COMPLETED` olarak işaretlenir ve `FINAL` verileri konuşmaya işlenir.
- **Kullanım metrikleri**: OpenAI `usage` bilgisi (token sayıları) yanıtta döndürülür (varsa).

## Procurement Modülü

- **Endpoint**: `POST /procurement/create` (JWT gerektirir)
- **Amaç**: Kullanıcıdan gelen serbest metni ve/veya form cevaplarını kullanarak tedarik talebini netleştirmek ve nihai çıktıyı üretmek.
- **İstek gövdesi**:

```json
{
  "message": "Yeni ofis için 10 adet ergonomik sandalye alacağız",
  "conversationId": "ckxyz..." ,
  "isDone": false,
  "cancel": false,
  "answers": [
    { "id": "q1", "value": "Ergonomik" },
    { "id": "q2", "value": "Siyah" }
  ]
}
```

- **Yanıt gövdesi** (genel):

```json
{
  "conversationId": "ckxyz...",
  "status": "ACTIVE",
  "reply": { /* Aşağıdaki iki moddan biri */ },
  "usage": {
    "promptTokens": 123,
    "completionTokens": 456,
    "totalTokens": 579
  }
}
```

### Cevap Modu: ASK (Geçerli ve Güncel Örnek)

LLM yeterli bilgi olmadığında soru listesi üretir. Uygulama, bu JSON’u Zod ile doğrular ve `Message.contentJson` olarak saklar.

```json
{
  "schemaVersion": "1.0",
  "replyId": "rpl_1723670000000",
  "generatedAt": "2025-08-15T10:00:00.000Z",
  "mode": "ASK",
  "questions": [
    {
      "id": "q1",
      "text": "Tercih edilen marka veya model var mı?",
      "type": "single_choice",
      "options": [
        { "id": "LENOVO", "label": "Lenovo" },
        { "id": "HP", "label": "HP" },
        { "id": "DELL", "label": "Dell" },
        { "id": "GENEL", "label": "Genel" }
      ],
      "required": true
    },
    {
      "id": "q2",
      "text": "Teslim lokasyonu nedir?",
      "type": "text",
      "required": false,
      "placeholder": "Şehir/Adres"
    },
    {
      "id": "q3",
      "text": "Hedef tarih (YYYY-MM-DD)?",
      "type": "date",
      "required": false
    }
  ],
  "missing": ["TITLE", "SUBCATEGORY"],
  "hint": "Nihai başlık ve alt kategori için marka ve teslim bilgileri gerekiyor",
  "nextAction": "ANSWER_QUESTIONS"
}
```

### Cevap Modu: FINAL (Geçerli ve Güncel Örnek)

Yeterli bilgi olduğunda nihai ve yapısal çıktı döner. `isDone=true` gönderildiğinde konuşma `COMPLETED` olur ve `Conversation.final*` alanlarına yazılır.

```json
{
  "schemaVersion": "1.0",
  "replyId": "rpl_1723670500000",
  "generatedAt": "2025-08-15T10:08:20.000Z",
  "mode": "FINAL",
  "title": "Ergonomik Ofis Sandalyesi",
  "category": "Ürün",
  "subcategory": "Ofis Sandalyesi",
  "categoryCode": "FURN-OFFICE",
  "subcategoryCode": "CHAIR-ERG",
  "summary": "10 adet, siyah renk ergonomik ofis sandalyesi",
  "attributes": {
    "quantity": 10,
    "color": "Siyah",
    "armrest": true
  },
  "compliance": {
    "standardsOk": true,
    "warrantyOk": true,
    "sustainabilityAnswered": false,
    "notes": ["CE sertifikası mevcut"]
  },
  "confidence": 0.82,
  "clarityScore": 0.9,
  "clarityNotes": ["Teslim tarihi kullanıcı tarafından sağlandı"],
  "nextAction": "CREATE_PR"
}
```

### İptal Akışı

İstek `cancel=true` içerirse OpenAI çağrısı yapılmaz, konuşma `CANCELLED` olur ve kısa bilgilendirme mesajı döner.

```json
{
  "conversationId": "ckxyz...",
  "status": "CANCELLED",
  "reply": "Conversation cancelled. If you need anything else, you may start a new request."
}
```

### Notlar

- LLM’den dönen JSON çıktısı, sadece JSON nesnesi olmalı; metin/markdown veya kod bloğu içermemelidir. Bu kural istem içinde zorlanır.
- `answers` alanı gönderilirse, modelin daha tutarlı sonuç üretmesi için konuşma geçmişine ipucu olarak eklenir.

## Temel Özellikler

- **Framework**: Yüksek performans için [NestJS](https://nestjs.com/) ve [Fastify](https://www.fastify.io/) entegrasyonu.
- **Veritabanı**: [PostgreSQL](https://www.postgresql.org/) veritabanı ile güçlü ve güvenilir veri yönetimi.
- **ORM**: [Prisma](https://www.prisma.io/) ile typesafe veritabanı erişimi ve şema yönetimi.
- **Doğrulama (Validation)**: [Zod](https://zod.dev/) ile şema tabanlı, typesafe veri doğrulama.
- **Kimlik Doğrulama**: JWT (JSON Web Token) tabanlı kimlik doğrulama (`signup`, `signin`, `me` endpoint'leri).
- **Yetkilendirme**: Rol tabanlı erişim kontrolü (`ADMIN`, `USER` rolleri).
- **API Dokümantasyonu**: [Swagger (OpenAPI)](https://swagger.io/) ile otomatik oluşturulan ve interaktif API dokümantasyonu.
- **Yapılandırma**: Ortam değişkenleri (`.env`) ile esnek yapılandırma yönetimi.
- **Test**: `Jest` ile birim (unit) ve uçtan uca (end-to-end) testler.
- **Container Desteği**: [Docker](https://www.docker.com/) ve `docker-compose` ile kolay geliştirme ve dağıtım ortamı.
- **CI/CD**: GitHub Actions ile otomatik test, build ve Docker imajı yayınlama süreçleri.
- **Kod Kalitesi**: ESLint ve Prettier ile tutarlı ve temiz kod yapısı.

## Gereksinimler

- Node.js (v20 veya üstü)
- npm (v9 veya üstü)
- PostgreSQL (v16 veya üstü)
- Docker (isteğe bağlı, yerel geliştirme için)

## Kurulum ve Başlatma

1.  **Projeyi Klonlayın:**
    ```bash
    git clone <repository-url>
    cd procurementflow-backend
    ```

2.  **Bağımlılıkları Yükleyin:**
    ```bash
    npm ci
    ```

3.  **Ortam Değişkenlerini Ayarlayın:**
    `.env.example` dosyasını kopyalayarak `.env` adında yeni bir dosya oluşturun ve içindeki değişkenleri kendi ortamınıza göre düzenleyin.
    ```bash
    cp .env.example .env
    ```
    Gerekli değişkenler `src/config/environment.ts` dosyasında tanımlanmıştır:
    ```env
    NODE_ENV=development
    PORT=3000
    DATABASE_URL="postgresql://<KULLANICI>:<SIFRE>@localhost:5432/<VERITABANI_ADI>?schema=public"
    JWT_SECRET="<en-az-32-karakterli-guvenli-bir-anahtar>"
    JWT_EXPIRES_IN="15m"
    SWAGGER_ENABLED=true
    ```

4.  **Veritabanı Şemasını Uygulayın:**
    Prisma migration komutunu çalıştırarak veritabanı şemasını oluşturun.
    ```bash
    npx prisma migrate dev --name init
    ```

5.  **Prisma Client'ı Oluşturun:**
    Veritabanı şemasına uygun typesafe client'ı oluşturun.
    ```bash
    npx prisma generate
    ```

## Uygulamayı Çalıştırma

-   **Geliştirme Modu (İzlemeli):**
    ```bash
    npm run start:dev
    ```

-   **Production Modu:**
    ```bash
    npm run build
    npm run start:prod
    ```

## Testleri Çalıştırma

-   **Tüm Testler:**
    ```bash
    npm test
    ```

-   **Uçtan Uca (E2E) Testler:**
    Uçtan uca testleri çalıştırmadan önce test veritabanınızın ayarlı ve çalışır durumda olduğundan emin olun.
    ```bash
    npm run test:e2e
    ```

## API Endpoint'leri

API'ye `http://localhost:3000/api` adresi üzerinden erişilebilir.

-   **Health Checks**
    -   `GET /health/live`: Servisin ayakta olup olmadığını kontrol eder.
    -   `GET /health/ready`: Servisin ve veritabanı bağlantısının hazır olup olmadığını kontrol eder.

-   **Authentication**
    -   `POST /auth/signup`: Yeni kullanıcı kaydı oluşturur ve `accessToken` döner.
    -   `POST /auth/signin`: Kullanıcı girişi yapar ve `accessToken` döner.
    -   `GET /auth/me`: Geçerli token ile giriş yapmış kullanıcının bilgilerini döner.

-   **Users (ADMIN Yetkisi Gerekli)**
    -   `GET /users`: Tüm kullanıcıları listeler (sayfalama destekli).
    -   `PATCH /users/:id/role`: Belirtilen kullanıcının rolünü (`USER` veya `ADMIN`) günceller.

### API Dokümantasyonu

Uygulama çalışırken, interaktif Swagger dokümantasyonuna [http://localhost:3000/api/docs](http://localhost:3000/api/docs) adresinden erişebilirsiniz.

## Docker ile Geliştirme

Proje, `docker-compose` ile kolayca ayağa kaldırılabilir. Bu yöntem, yerel makinenize PostgreSQL kurma ihtiyacını ortadan kaldırır.

1.  **.env dosyasını oluşturun:** `docker-compose.yml` dosyasındaki `db` servisiyle uyumlu olduğundan emin olun.
    ```env
    DATABASE_URL="postgresql://admin:supersecretpassword@db:5432/app?schema=public"
    # Diğer değişkenler...
    ```

2.  **Container'ları Başlatın:**
    ```bash
    docker-compose up --build
    ```
    Bu komut, hem veritabanını hem de API servisini başlatacaktır.

## Sürekli Entegrasyon (CI)

Proje, `.github/workflows/ci.yml` dosyası ile tanımlanmış bir GitHub Actions CI akışına sahiptir. Bu akış, `main` branch'ine yapılan her `push` ve `pull_request` işleminde tetiklenir ve aşağıdaki adımları otomatik olarak gerçekleştirir:

1.  PostgreSQL test veritabanını başlatır.
2.  Node.js bağımlılıklarını kurar.
3.  Prisma Client'ı oluşturur.
4.  Lint ve test komutlarını çalıştırır.
5.  Uygulamayı build eder.
6.  OpenAPI dokümantasyonunu bir artifact olarak kaydeder.
7.  `main` branch'ine yapılan push'larda, uygulamanın Docker imajını oluşturur ve GitHub Container Registry (GHCR)'ye `latest` ve `commit-sha` etiketleriyle gönderir.
