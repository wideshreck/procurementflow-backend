# 1. Adım: Temel imaj olarak resmi Python imajını kullan
FROM python:3.11-slim

# 2. Adım: Çalışma dizinini ayarla
WORKDIR /app

# 3. Adım: Bağımlılıkları kopyala ve yükle
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 4. Adım: Proje dosyalarını kopyala
COPY ./app /app/app

# 5. Adım: Ortam değişkenlerini ve .env dosyasını yönetme
# .env dosyasını doğrudan imajın içine kopyalamak güvenlik açısından önerilmez.
# Bunun yerine, container'ı çalıştırırken ortam değişkenlerini sağlayın.
# .env dosyanızdaki değişkenler: SUPABASE_URL, SUPABASE_KEY, OPENAI_MODEL, APP_NAME, OPENAI_API_KEY

# 6. Adım: Uygulamanın çalışacağı portu belirt
EXPOSE 8000

# 7. Adım: Uygulamayı başlatma komutu
# Gunicorn, production için daha sağlam bir seçimdir.
# 0.0.0.0 adresi, container dışından erişime izin verir.
CMD ["gunicorn", "-k", "uvicorn.workers.UvicornWorker", "-b", "0.0.0.0:8000", "app.main:app"]