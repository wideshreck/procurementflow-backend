## RFQ/RFP Otomasyon ChatBot'u: Teknik Tasarım ve Süreç Akış Dokümanı

**Versiyon:** 2.1
**Tarih:** 24.08.2025

### 1. Genel Bakış ve Amaç

Bu doküman, RFQ/RFP (Teklif Talebi/İstek Talebi) süreçlerini otomatikleştirmek amacıyla geliştirilen chatbot sisteminin detaylı işleyişini, mantıksal fazlarını ve bu fazlar arasındaki teknik veri akışını açıklamaktadır. Sistemin ana hedefi, alım taleplerini başlangıç noktasından itibaren standartlaştırmak, süreci hızlandırmak ve insan hatasını minimize ederek kurumsal verimliliği artırmaktır.

Süreç, bir kullanıcının yeni bir alım talebi oluşturma amacıyla chatbot ile etkileşime geçmesiyle başlar ve tanımlanmış fazlar boyunca ilerler.

---

### 2. Faz 1: Talep Tanımlama ve Yapılandırılmış Veri Toplama

#### 2.1. Stratejik Hedef

Bu ilk fazın temel amacı, kullanıcının serbest metinle ifade ettiği alım ihtiyacını, sistemin işleyebileceği **yapılandırılmış ve standart bir veri formatına** dönüştürmektir. Bu aşamada toplanan veriler, talebin doğru bir şekilde anlaşılmasını, sınıflandırılmasını ve kurumun mevcut iş akışlarına (örneğin, bütçe kontrolü, onay mekanizmaları, kategori bazlı raporlama) hatasız bir şekilde entegre edilmesini sağlar. Fazın başarısı, tüm sürecin doğruluğu ve verimliliği için temel teşkil eder.

#### 2.2. Veri Şeması (Data Schema)

Aşağıdaki tablo, bu fazda toplanması hedeflenen veri alanlarını, amaçlarını ve validasyon kurallarını detaylandırmaktadır.

| Veri Alanı | JSON Alanı | Amaç ve Açıklama | Validasyon Kuralları / Notlar | Örnek |
| :--- | :--- | :--- | :--- | :--- |
| **Alımın Başlığı** | `item_title` | Talebi tek satırda, net bir şekilde özetler. | Zorunlu alan. Min 10, Max 255 karakter. | "Muhasebe Departmanı için 10 Adet Yeni Nesil Dizüstü Bilgisayar" |
| **Kategori** | `category` | Talebin ait olduğu en üst seviye alım grubunu belirtir. | Zorunlu alan. Sistemde önceden tanımlı kategoriler listesinden seçilmelidir. | "IT Donanım" |
| **Alt Kategori** | `subcategory` | Ana kategori altında talebi daha da spesifik hale getirir. | Zorunlu alan. Seçilen ana kategoriye bağlı alt kategoriler listesinden seçilmelidir. | "Dizüstü Bilgisayarlar" |
| **Miktar** | `quantity` | Talep edilen ürün/hizmetin miktarını belirtir. | Zorunlu alan. Pozitif tam sayı olmalıdır. | 10 |
| **Birim** | `uom` | Miktarın birimini belirtir (Unit of Measure). | Zorunlu alan. Sistemde önceden tanımlı birimler listesinden seçilmelidir. | "Adet" |
| **Kısa Tanım** | `simple_definition` | Talebin nedenini ve temel amacını açıklayan kısa bir metindir. | Opsiyonel alan. Max 500 karakter. | "Mevcut bilgisayarların 5 yıllık kullanım ömrünü doldurması ve artan yazılım ihtiyaçlarını karşılayamaması." |
| **Maliyet Merkezi** | `cost_center` | Harcamanın hangi bütçe kaleminden karşılanacağını tanımlar. | Zorunlu alan. ERP sistemi ile entegre, geçerli bir maliyet merkezi kodu olmalıdır. | "MUH-2025-B01" |
| **Alım Tipi** | `procurement_type` | Talebin somut bir **ürün** mü yoksa bir **hizmet** alımı mı olduğunu belirtir. | Zorunlu alan. Sadece 'Ürün Alımı' veya 'Hizmet Alımı' değerlerini alabilir. | "Ürün Alımı" |

#### 2.3. Operasyonel Süreç Akışı

1.  **Etkileşim Başlangıcı:** Kullanıcı talebini genel bir ifadeyle başlatır (örn: "Yeni bilgisayarlar almamız gerekiyor.").
2.  **Doğal Dil İşleme (NLU) ve Niyet Tespiti:** Sistem, kullanıcının ilk girdisini analiz ederek "yeni alım talebi oluşturma" niyetini anlar ve Faz 1 iş akışını tetikler. Girdiden `item_title` gibi alanlar için potansiyel verileri çıkarmaya çalışır.
3.  **Dinamik Bilgi Toplama (`MODE: ASKING_FOR_INFO`):** Chatbot, Veri Şeması'nda eksik olan zorunlu alanları doldurmak için bir soru-cevap döngüsü başlatır. Bu mod, backend'den frontend'e gönderilen bir komuttur ve "kullanıcıya bir soru göster" anlamına gelir.
4.  **Veri Doğrulama:** Kullanıcıdan alınan her yanıt, ilgili alanın validasyon kurallarına göre anlık olarak doğrulanır. Geçersiz bir veri girilirse (örn: listede olmayan bir kategori), chatbot kullanıcıya bir hata mesajı gösterir ve soruyu tekrarlar.
5.  **Fazın Tamamlanması (`MODE: PHASE_ONE_DONE`):** Tüm zorunlu alanlar başarıyla toplandığında ve doğrulandığında, sistem bu fazı tamamlar. Bu mod, bir fazın bittiğini ve bir sonraki faza geçilmesi gerektiğini belirten bir iç sistem durumudur.

#### 2.4. Teknik JSON Çıktıları ve Anlamları

##### 2.4.1. `MODE: ASKING_FOR_INFO`
Bu JSON yapısı, backend tarafından frontend'e gönderilir ve kullanıcı arayüzünün dinamik olarak bir soru formu oluşturmasını sağlar.
```javascript
{
    "MODE": "ASKING_FOR_INFO",
    "QUESTIONS": [
        {
            "question_id": "q_001",
            "question_type": "SINGLE_CHOISE", // Frontend'in tek seçimli bir bileşen (örn: radio button) render etmesini sağlar.
            "question_text": "Bu talep hakkında ürün mü hizmet mi satın alacaksınız?",
            "answer_options": [
                { "option": "Ürün Alımı", "justification": "" },
                { "option": "Hizmet Alımı", "justification": "" }
            ],
            "reason_of_question": "Talebinizin bir ürün mü yoksa hizmet alımı mı olduğunu belirlemek, sonraki adımları doğru şekilde yönlendirmemizi sağlayacaktır."
        }
    ]
}
```

##### 2.4.2. `MODE: PHASE_ONE_DONE`
Bu JSON yapısı, Faz 1'in başarıyla bittiğini ve toplanan verileri içerir. Bu, bir sonraki faza girdi olarak aktarılan bir iç sistem mesajıdır ve kullanıcıya doğrudan gösterilmez.
```javascript
{
    "MODE": "PHASE_ONE_DONE",
    "COLLECTED_DATA": {
        "item_title": "Muhasebe Departmanı için 10 Adet Yeni Nesil Dizüstü Bilgisayar",
        "category": "IT Donanım",
        "subcategory": "Dizüstü Bilgisayarlar",
        "quantity": 10,
        "uom": "Adet",
        "simple_definition": "Mevcut bilgisayarların 5 yıllık kullanım ömrünü doldurması ve artan yazılım ihtiyaçlarını karşılayamaması.",
        "cost_center": "MUH-2025-B01",
        "procurement_type": "Ürün Alımı"
    }
}
```

---

### 3. Faz 2: Katalog Eşleştirme ve Standart Ürün Önerme

#### 3.1. Stratejik Amaç

Bu fazın amacı, kurum içinde standardizasyonu teşvik etmek ve gereksiz harcamaları önlemektir. Yeni bir alım süreci başlatmadan önce, kullanıcının talebinin mevcut, onaylanmış ve standartlaştırılmış ürün/hizmet kataloğundaki bir kalemle karşılanıp karşılanamayacağı kontrol edilir. Bu, hem maliyet avantajı sağlar hem de tedarik süreçlerini önemli ölçüde hızlandırır.

#### 3.2. Operasyonel Süreç Akışı ve Karar Mantığı

1.  **Girdi Verisi:** Faz 1'den gelen `PHASE_ONE_DONE` JSON çıktısındaki `COLLECTED_DATA` objesi bu fazın girdisidir.
2.  **Akıllı Katalog Taraması:** Sistem, `subcategory` ve `procurement_type` alanlarını anahtar olarak kullanarak kurumun ürün/hizmet kataloğunda bir arama yapar. Bu arama, anahtar kelime eşleşmesinin yanı sıra, `simple_definition` alanındaki metni kullanarak anlamsal (semantic) bir arama da yapabilir.
3.  **Karar ve Yönlendirme Mantığı:**
    *   **Durum A: Eşleşme Bulundu:** Katalogda taleple uyumlu bir veya daha fazla kalem bulunursa, sistem bir öneri listesi hazırlar ve `MODE: SUGGESTION` durumuna geçer.
    *   **Durum B: Eşleşme Bulunamadı:** Katalogda taleple uyumlu hiçbir kalem bulunamazsa, sistem kullanıcıya bilgi verir ve süreci doğrudan **Faz 3**'e yönlendirir.

#### 3.3. Teknik JSON Çıktısı ve Anlamı

##### 3.3.1. `MODE: SUGGESTION`
Bu JSON yapısı, katalogda eşleşme bulunduğunda backend tarafından frontend'e gönderilir. Frontend, bu veriyi kullanarak kullanıcıya tıklanabilir bir öneri listesi sunar.
```javascript
{
    "MODE": "SUGGESTION",
    "SUGGESTIONS": [
        {
            "item_id": "PROD-01234", // Önerilen ürünün katalogdaki benzersiz ID'si
            "item_name": "Dell Latitude 5500",
            "justification": "Muhasebe departmanının standart olarak kullandığı ve performans açısından onaylanmış bir modeldir." // Kullanıcının neden bu seçeneği değerlendirmesi gerektiğini açıklayan metin.
        },
        {
            "item_id": "PROD-01238",
            "item_name": "HP EliteBook 850",
            "justification": "Benzer özelliklere sahip, daha uygun maliyetli bir alternatiftir."
        }
    ]
}
```
Kullanıcının bu listeden bir seçim yapması veya hiçbirini seçmemesi, sürecin **Faz 2.1**'e (Seçilen Kalemle Talep Oluşturma) mi yoksa **Faz 3**'e (Yeni Ürün/Hizmet için Teknik Şartname Oluşturma) mi ilerleyeceğini belirler.

---

### 4. Faz 3: Teknik Şartname Oluşturma

#### 4.1. Stratejik Hedef

Bu faza, katalogda uygun bir standart ürün/hizmet bulunamadığında veya kullanıcı tarafından mevcut öneriler reddedildiğinde girilir. Fazın temel amacı, kullanıcıyı yönlendirerek talep edilen yeni ürün veya hizmet için **açık, ölçülebilir ve eksiksiz bir teknik şartname** oluşturmaktır. Bu şartname, potansiyel tedarikçilere gönderilecek olan RFQ/RFP dokümanının teknik temelini oluşturacak ve gelen tekliflerin adil bir şekilde karşılaştırılabilmesini sağlayacaktır. Bu faz iki alt adımdan oluşur: Akıllı Öneri ve Manuel Veri Girişi.

---

#### 4.2. Faz 3.1: Akıllı Konfigürasyon Önerme (Suggestion)

##### 4.2.1. Operasyonel Süreç Akışı

1.  **Girdi Verisi:** Faz 1'den gelen `COLLECTED_DATA` objesi bu fazın temel girdisidir. Özellikle `cost_center`, `quantity` ve `subcategory` alanları bu faz için kritiktir.
2.  **Bütçe Kontrolü ve Öneri Hazırlığı:** Sistem, `cost_center` bilgisi üzerinden ilgili maliyet merkezinin kalan bütçesini kontrol eder. Ardından, `subcategory` ("Dizüstü Bilgisayarlar") ve kullanıcının departmanı gibi bilgilere dayanarak, **toplam maliyeti bütçeyi aşmayacak** şekilde tam konfigürasyon paketleri (öneriler) oluşturur. Örneğin, "Ekonomik Paket", "Standart Paket", "Performans Paketi" gibi.
3.  **Paket Halinde Öneri Sunma (`MODE: SUGGESTION`):** Chatbot, kullanıcıya tek tek özellik sormak yerine, hazırlanan bu tam konfigürasyon paketlerini bir bütün olarak sunar. Her paket, tüm teknik özellikleri ve neden önerildiğini içeren bir gerekçe ile birlikte gelir.
    *   **Örnek Diyalog:** "Muhasebe departmanınızın ihtiyaçları ve bütçeniz doğrultusunda sizin için iki farklı dizüstü bilgisayar konfigürasyonu hazırladım. Lütfen inceleyip seçiminizi yapın veya kendi özelliklerinizi belirtmek için 'Manuel Olarak Gireceğim' seçeneğini seçin."

##### 4.2.2. Teknik JSON Çıktısı (`MODE: SUGGESTION`)
Bu JSON yapısı, kullanıcıya sunulacak olan tam paketleri içerir.
```javascript
{
    "MODE": "SUGGESTION",
    "SUGGESTIONS": [
        {
            "suggestion_name": "Standart Paket (Önerilen)",
            "estimated_cost_per_unit": 1200,
            "justification": "Muhasebe departmanının günlük operasyonları için performans ve maliyet açısından en uygun konfigürasyondur.",
            "technical_specifications": [
                { "spec_key": "RAM", "spec_value": "16 GB" },
                { "spec_key": "İşlemci", "spec_value": "Intel Core i5 (12. Nesil)" },
                { "spec_key": "Depolama", "spec_value": "512 GB SSD" }
            ]
        },
        {
            "suggestion_name": "Ekonomik Paket",
            "estimated_cost_per_unit": 950,
            "justification": "Temel kullanım ihtiyaçları için bütçenize uygun, daha ekonomik bir alternatiftir.",
            "technical_specifications": [
                { "spec_key": "RAM", "spec_value": "8 GB" },
                { "spec_key": "İşlemci", "spec_value": "Intel Core i3 (12. Nesil)" },
                { "spec_key": "Depolama", "spec_value": "256 GB SSD" }
            ]
        }
    ]
}
```

---

#### 4.3. Faz 3.2: Yönlendirmeli Bilgi Toplama (Manuel Giriş)

##### 4.3.1. Operasyonel Süreç Akışı

Bu faza, yalnızca kullanıcı Faz 3.1'deki önerileri reddederse ve kendi özelliklerini belirtmek isterse girilir.

1.  **Şablon Yükleme:** Sistem, `COLLECTED_DATA.subcategory` değerine ("Dizüstü Bilgisayarlar") dayanarak, o alt kategori için bir teknik şartname şablonu yükler. Bu şablon, sorulması gereken standart soruları içerir (örn: RAM, İşlemci, Depolama vb.).
2.  **Yönlendirmeli Bilgi Toplama (`MODE: ASKING_FOR_INFO`):** Chatbot, şablondaki her bir teknik özellik için kullanıcıya tek tek sorular sormaya başlar.
3.  **Kullanıcı Tanımlı Özellik Ekleme:** Şablondaki tüm sorular tamamlandıktan sonra, chatbot kullanıcıya "Eklemek istediğiniz başka bir teknik özellik var mı?" diye sorarak özel gereksinimlerin de eklenmesine olanak tanır.
4.  **Fazın Tamamlanması:** Kullanıcı, tüm teknik özellikleri belirttiğinde faz tamamlanır.

#### 4.4. Faz 3 Sonu: Teknik Şartnamenin Tamamlanması (`MODE: PHASE_THREE_DONE`)

İster Faz 3.1'de bir öneri seçilsin, ister Faz 3.2'de manuel olarak özellikler girilsin, her iki yolun sonunda da Faz 3 tamamlanmış olur ve aşağıdaki gibi bir JSON çıktısı üretilir.

##### 4.4.1. `MODE: PHASE_THREE_DONE`
Bu JSON yapısı, Faz 3'ün başarıyla tamamlandığını ve hem Faz 1'de toplanan temel bilgileri hem de bu fazda oluşturulan detaylı teknik şartnameyi içerir. Bu çıktı, sürecin bir sonraki adımı olan tedarikçi araştırması ve RFQ oluşturma (Faz 4) için temel girdi olacaktır.
```javascript
{
    "MODE": "PHASE_THREE_DONE",
    "COLLECTED_DATA": {
        "item_title": "Muhasebe Departmanı için 10 Adet Yeni Nesil Dizüstü Bilgisayar",
        "category": "IT Donanım",
        "subcategory": "Dizüstü Bilgisayarlar",
        "quantity": 10,
        "uom": "Adet",
        "simple_definition": "Mevcut bilgisayarların 5 yıllık kullanım ömrünü doldurması ve artan yazılım ihtiyaçlarını karşılayamaması.",
        "cost_center": "MUH-2025-B01",
        "procurement_type": "Ürün Alımı",
        "technical_specifications": [
            {
                "spec_key": "RAM",
                "spec_value": "16 GB",
                "requirement_level": "Zorunlu"
            },
            {
                "spec_key": "İşlemci",
                "spec_value": "Intel Core i7 (12. Nesil) veya AMD Ryzen 7 (6000 Serisi)",
                "requirement_level": "Zorunlu"
            },
            {
                "spec_key": "Depolama",
                "spec_value": "512 GB",
                "requirement_level": "Zorunlu"
            },
            {
                "spec_key": "Ekran Boyutu",
                "spec_value": "15.6 inç",
                "requirement_level": "Tercih Edilen"
            }
        ]
    }
}
```

### 5. Ek Bilgiler: JSON Mimarisi ve Kavramlar

Bu bölüm, sistem tarafından üretilen JSON çıktılarında kullanılan temel kavramları ve mimari prensipleri açıklamaktadır.

#### 5.1. Sistem Modları (`MODE`)

`MODE` alanı, chatbot'un o anki durumunu ve bir sonraki adımda ne tür bir aksiyon beklendiğini tanımlayan bir durum makinesi (state machine) görevi görür. Bu, backend ve frontend arasındaki iletişimi standartlaştırır.

*   **`ASKING_FOR_INFO`:** Bu mod, backend'in frontend'e "kullanıcıya bir veya daha fazla soru yönelt" komutunu verdiğini belirtir. `QUESTIONS` objesi ile birlikte kullanılır.
*   **`PHASE_X_DONE`:** Bir fazın başarıyla tamamlandığını ve gerekli tüm verilerin toplandığını belirten bir iç sistem modudur. Bu mod, arka planda bir sonraki faza geçişi tetikler ve genellikle kullanıcıya gösterilmez. `COLLECTED_DATA` objesini içerir.
*   **`SUGGESTION`:** Bu mod, sistemin kullanıcıya bir veya daha fazla öneri sunduğunu belirtir. Bu öneriler, katalogdan ürünler veya teknik şartname paketleri olabilir. `SUGGESTIONS` objesi ile birlikte kullanılır.

#### 5.2. Soru Yapısı (`QUESTIONS` Objesi)

Sistem, kullanıcıdan bilgi toplamak için dinamik olarak sorular oluşturur. Her soru, aşağıdaki standart yapıya sahiptir:

*   **`question_id` (string):** Sorulan soruya ait, takip ve loglama amaçlı kullanılan benzersiz bir kimliktir.
*   **`question_type` (string):** Frontend'in ne tür bir kullanıcı arayüzü bileşeni (UI component) render etmesi gerektiğini belirtir.
    *   `MULTI_CHOICE`: Kullanıcının birden çok seçenek işaretleyebileceği bir liste (örn: checkbox listesi).
    *   `SINGLE_CHOICE`: Kullanıcının sadece tek bir seçenek işaretleyebileceği bir liste (örn: radio button listesi).
    *   `YES_NO`: Basit bir evet/hayır sorusu.
    *   `TEXT_INPUT`: Serbest metin girişi için bir alan.
*   **`answer_options` (array of objects):** `MULTI_CHOICE` ve `SINGLE_CHOICE` tipleri için sunulan seçenekleri içerir. Diğer soru tipleri için boş bir dizi (`[]`) olarak gönderilir.
    *   `option` (string): Kullanıcıya gösterilecek olan seçeneğin metni.
    *   `justification` (string): Bu seçeneğin neden sunulduğunu veya ne anlama geldiğini açıklayan yardımcı metin. Özellikle Faz 2 ve 3'teki önerilerde kullanılır.
*   **`reason_of_question` (string):** Kullanıcıya bu sorunun neden sorulduğunu açıklayarak, sürecin daha şeffaf ve anlaşılır olmasını sağlayan yardımcı bir metindir.

#### 5.3. Toplanan Veri Yapısı (`COLLECTED_DATA` Objesi)

Bu obje, fazlar boyunca toplanan ve bir sonraki faza aktarılan tüm yapılandırılmış veriyi içerir. Her fazın sonunda, bu obje yeni toplanan verilerle zenginleştirilir.


