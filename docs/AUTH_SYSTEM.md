# ProcurementFlow Authentication System

## Genel Bakış

ProcurementFlow, endüstri standardı güvenlik uygulamalarını takip eden kapsamlı bir kimlik doğrulama sistemi kullanır.

## Özellikler

### 🔐 Güvenlik Özellikleri

- **Argon2 Password Hashing**: Bcrypt yerine daha güvenli Argon2id kullanılır
- **JWT Token Yönetimi**: Access ve Refresh token desteği
- **Session Management**: Cihaz bazlı oturum takibi
- **Multi-Factor Authentication (MFA)**: TOTP tabanlı 2FA desteği
- **CSRF Koruması**: Token tabanlı CSRF koruması
- **Rate Limiting**: Brute-force saldırılarına karşı koruma
- **Login Attempt Tracking**: Başarısız giriş denemelerini takip
- **Account Locking**: Çok fazla başarısız denemeden sonra hesap kilitleme
- **Email Verification**: Email doğrulama sistemi
- **Password Reset**: Güvenli şifre sıfırlama
- **Audit Logging**: Tüm güvenlik olaylarının kaydı
- **Device Fingerprinting**: Cihaz tanıma ve takibi
- **Security Headers**: XSS, Clickjacking vb. saldırılara karşı koruma

### 📝 Kullanıcı Yönetimi

- Kayıt olma (signup)
- Giriş yapma (signin) 
- Çıkış yapma (logout)
- Token yenileme (refresh)
- Şifre değiştirme
- Şifre sıfırlama
- Email doğrulama
- MFA etkinleştirme/devre dışı bırakma
- Oturum yönetimi
- Denetim günlükleri görüntüleme

## API Endpoints

### Authentication

#### POST /api/auth/signup
Yeni kullanıcı kaydı oluşturur.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "fullName": "John Doe",
  "company": "Acme Corp",
  "phone": "+905551234567", // opsiyonel
  "department": "IT" // opsiyonel
}
```

**Response:**
```json
{
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "fullName": "John Doe",
    "company": "Acme Corp",
    "role": "USER",
    "emailVerified": false,
    "isActive": true
  },
  "tokens": {
    "accessToken": "jwt-access-token",
    "refreshToken": "jwt-refresh-token",
    "csrfToken": "csrf-token"
  }
}
```

#### POST /api/auth/signin
Email ve şifre ile giriş yapar.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "mfaCode": "123456" // MFA aktifse gerekli
}
```

#### POST /api/auth/logout
Mevcut oturumu sonlandırır.

#### POST /api/auth/refresh
Access token'ı yeniler.

#### POST /api/auth/verify-email
Email adresini doğrular.

**Request Body:**
```json
{
  "token": "verification-token"
}
```

#### POST /api/auth/forgot-password
Şifre sıfırlama emaili gönderir.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

#### POST /api/auth/reset-password
Yeni şifre belirler.

**Request Body:**
```json
{
  "token": "reset-token",
  "newPassword": "NewSecurePassword123!"
}
```

#### PUT /api/auth/change-password
Mevcut şifreyi değiştirir.

**Request Body:**
```json
{
  "currentPassword": "OldPassword123!",
  "newPassword": "NewPassword123!"
}
```

### Multi-Factor Authentication

#### GET /api/auth/mfa/setup
MFA kurulum bilgilerini getirir (QR kod, secret, backup kodları).

#### POST /api/auth/mfa/enable
MFA'yı etkinleştirir.

**Request Body:**
```json
{
  "secret": "mfa-secret",
  "verificationCode": "123456",
  "backupCodes": ["code1", "code2", "..."]
}
```

#### POST /api/auth/mfa/disable
MFA'yı devre dışı bırakır.

**Request Body:**
```json
{
  "password": "UserPassword123!"
}
```

### Session Management

#### GET /api/auth/sessions
Kullanıcının aktif oturumlarını listeler.

#### DELETE /api/auth/sessions/:sessionId
Belirli bir oturumu sonlandırır.

#### DELETE /api/auth/sessions
Mevcut oturum hariç tüm oturumları sonlandırır.

### Audit Logs

#### GET /api/auth/audit-logs
Kullanıcının denetim günlüklerini getirir.

**Query Parameters:**
- `limit`: Döndürülecek maksimum kayıt sayısı (varsayılan: 50)

## Güvenlik Konfigürasyonu

### Environment Variables

```bash
# JWT Configuration
JWT_SECRET=your-super-secret-key-minimum-32-chars
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
JWT_ISSUER=procurementflow
JWT_AUDIENCE=procurementflow://web

# Encryption
ENCRYPTION_KEY=your-encryption-key-minimum-32-chars

# Email Configuration
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=username
SMTP_PASS=password
SMTP_FROM=noreply@procurementflow.com

# Application
APP_URL=https://procurementflow.com
```

### Password Requirements

- Minimum 8 karakter
- En az bir büyük harf
- En az bir küçük harf
- En az bir rakam
- En az bir özel karakter
- Yaygın şifreler kabul edilmez
- Kullanıcı bilgilerini içeremez

### Rate Limiting

- Signup: 5 deneme / saat
- Login: 10 deneme / 15 dakika
- Password Reset: 3 deneme / saat

### Session Security

- Maksimum 5 aktif oturum
- 30 dakika işlem yapılmazsa oturum süresi dolar
- Session token'lar veritabanında saklanır
- Device fingerprinting ile cihaz takibi

### MFA Implementation

- TOTP (Time-based One-Time Password) algoritması
- 30 saniyelik zaman penceresi
- 10 adet backup kod
- Google Authenticator, Authy vb. uygulamalarla uyumlu

## Cleanup Tasks

Sistem otomatik olarak eski verileri temizler:

- **Her saat**: Süresi dolmuş oturumlar
- **Her gün saat 03:00**: Süresi dolmuş token'lar
- **Her hafta**: 30 günden eski login attempt kayıtları
- **Her hafta**: 90 günden eski audit log kayıtları

## Güvenlik En İyi Uygulamaları

1. **Production'da HTTPS kullanın**: Tüm trafiğin şifrelenmesi için
2. **Güçlü secret key'ler kullanın**: En az 32 karakter, rastgele
3. **Email doğrulamasını zorunlu tutun**: Kritik işlemler için
4. **MFA'yı teşvik edin**: Admin kullanıcılar için zorunlu yapın
5. **Audit logları düzenli kontrol edin**: Şüpheli aktiviteler için
6. **Rate limiting'i ayarlayın**: Use case'e göre optimize edin
7. **CORS'u doğru yapılandırın**: Sadece güvenilir origin'lere izin verin

## Hata Kodları

- `401 Unauthorized`: Geçersiz kimlik bilgileri veya token
- `403 Forbidden`: Hesap kilitli veya IP engellenmiş
- `409 Conflict`: Email zaten kullanımda
- `400 Bad Request`: Geçersiz veri veya zayıf şifre
- `429 Too Many Requests`: Rate limit aşıldı

## Geliştirici Notları

### Token Yapısı

**Access Token Payload:**
```json
{
  "sub": "user-id",
  "email": "user@example.com",
  "role": "USER",
  "sessionId": "session-id",
  "iat": 1234567890,
  "exp": 1234568790,
  "iss": "procurementflow",
  "aud": "procurementflow://web"
}
```

### CSRF Token Kullanımı

State-changing request'lerde (POST, PUT, DELETE) CSRF token gereklidir:

```javascript
// Header'da gönder
headers: {
  'X-CSRF-Token': csrfToken
}
```

### Cookie Yapılandırması

- **refresh_token**: httpOnly, secure (production), sameSite: lax
- **csrf_token**: secure (production), sameSite: lax

## Sorun Giderme

### "Account locked" hatası
- Çok fazla başarısız giriş denemesi
- 30 dakika bekleyin veya şifre sıfırlama kullanın

### "Invalid CSRF token" hatası
- CSRF token'ı header'da gönderin
- Token'ın güncel olduğundan emin olun

### "Session expired" hatası
- Access token'ı refresh endpoint'i ile yenileyin
- Tekrar login olun

## Yol Haritası

- [ ] OAuth2 provider entegrasyonu (Google, Microsoft)
- [ ] WebAuthn/Passkey desteği
- [ ] Risk-based authentication
- [ ] Anomaly detection
- [ ] IP whitelist/blacklist
- [ ] Gelişmiş device fingerprinting
