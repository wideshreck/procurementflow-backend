# CORS Hatası Çözümü ve Frontend Entegrasyon Örnekleri

## Backend Değişiklikleri

Backend'de CORS konfigürasyonu güncellendi. Artık şu header'lar destekleniyor:
- `X-CSRF-Token` (büyük harf)
- `X-Csrf-Token` (küçük harf)
- `Authorization`
- Standart HTTP header'lar

## Frontend Kod Örnekleri

### 1. Basit Fetch Örneği (Signin)

```javascript
// signin.js
async function signIn(email, password) {
  try {
    const response = await fetch('http://localhost:3000/api/auth/signin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Cookies için gerekli
      body: JSON.stringify({
        email,
        password
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('Login successful:', data);
      
      // Access token'ı state'de sakla
      localStorage.setItem('user', JSON.stringify(data.user)); // Sadece user bilgisi
      // Access token'ı memory'de sakla (güvenlik için)
      window.accessToken = data.tokens.accessToken;
      
      return data;
    } else {
      const errorText = await response.text();
      throw new Error(errorText);
    }
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}
```

### 2. Korumalı API İsteği (CSRF Token ile)

```javascript
// api-client.js
class ApiClient {
  constructor() {
    this.baseURL = 'http://localhost:3000/api';
    this.accessToken = null;
  }

  // CSRF token'ını cookie'den al
  getCsrfToken() {
    return document.cookie
      .split('; ')
      .find(row => row.startsWith('csrf_token='))
      ?.split('=')[1];
  }

  // Access token'ı ayarla
  setAccessToken(token) {
    this.accessToken = token;
  }

  // API isteği yap
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include', // Cookies için gerekli
      ...options,
    };

    // Access token ekle
    if (this.accessToken) {
      config.headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    // CSRF token ekle (POST, PUT, DELETE için)
    if (['POST', 'PUT', 'DELETE'].includes(options.method?.toUpperCase())) {
      const csrfToken = this.getCsrfToken();
      if (csrfToken) {
        config.headers['X-CSRF-Token'] = csrfToken;
      }
    }

    const response = await fetch(url, config);
    
    // 401 durumunda token yenileme
    if (response.status === 401 && !endpoint.includes('/auth/')) {
      const refreshed = await this.refreshToken();
      if (refreshed) {
        // Token yenilendi, tekrar dene
        config.headers['Authorization'] = `Bearer ${this.accessToken}`;
        return fetch(url, config);
      }
    }

    return response;
  }

  // Token yenile
  async refreshToken() {
    try {
      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        // Content-Type header'ı eklemeyin - body boş olduğu için
      });

      if (response.ok) {
        const data = await response.json();
        this.setAccessToken(data.tokens.accessToken);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  }

  // HTTP metodları
  get(endpoint, options = {}) {
    return this.request(endpoint, { method: 'GET', ...options });
  }

  post(endpoint, data, options = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
      ...options,
    });
  }

  put(endpoint, data, options = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
      ...options,
    });
  }

  delete(endpoint, options = {}) {
    return this.request(endpoint, { method: 'DELETE', ...options });
  }
}

// Global instance
const apiClient = new ApiClient();
export default apiClient;
```

### 3. React Hooks Örneği

```jsx
// useAuth.js
import { useState, useEffect, useCallback } from 'react';
import apiClient from './api-client';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Login
  const login = useCallback(async (email, password, mfaCode = null) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await apiClient.post('/auth/signin', {
        email,
        password,
        mfaCode
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.user.mfaRequired) {
          return { requiresMfa: true };
        }

        apiClient.setAccessToken(data.tokens.accessToken);
        setUser(data.user);
        return { success: true, user: data.user };
      } else {
        const errorText = await response.text();
        throw new Error(errorText);
      }
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Logout
  const logout = useCallback(async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      apiClient.setAccessToken(null);
      setUser(null);
      setError(null);
    }
  }, []);

  // Check auth status on mount
  useEffect(() => {
    async function checkAuth() {
      try {
        const response = await apiClient.get('/auth/me');
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setIsLoading(false);
      }
    }

    checkAuth();
  }, []);

  return {
    user,
    isLoading,
    error,
    login,
    logout,
    isAuthenticated: !!user,
  };
}
```

### 4. Login Component Örneği

```jsx
// LoginForm.jsx
import React, { useState } from 'react';
import { useAuth } from './useAuth';

function LoginForm() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    mfaCode: ''
  });
  const [showMfa, setShowMfa] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { login, error } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const result = await login(
        formData.email, 
        formData.password, 
        formData.mfaCode || null
      );

      if (result.requiresMfa) {
        setShowMfa(true);
      } else if (result.success) {
        // Login başarılı, redirect yap
        window.location.href = '/dashboard';
      }
    } catch (error) {
      console.error('Login failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="login-form">
      <div>
        <label>Email:</label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData(prev => ({
            ...prev,
            email: e.target.value
          }))}
          required
        />
      </div>

      <div>
        <label>Şifre:</label>
        <input
          type="password"
          value={formData.password}
          onChange={(e) => setFormData(prev => ({
            ...prev,
            password: e.target.value
          }))}
          required
        />
      </div>

      {showMfa && (
        <div>
          <label>MFA Kodu:</label>
          <input
            type="text"
            value={formData.mfaCode}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              mfaCode: e.target.value
            }))}
            placeholder="6 haneli kod"
            maxLength={6}
          />
        </div>
      )}

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Giriş yapılıyor...' : 'Giriş Yap'}
      </button>
    </form>
  );
}

export default LoginForm;
```

### 5. Korumalı Route Örneği

```jsx
// ProtectedRoute.jsx
import React from 'react';
import { useAuth } from './useAuth';

function ProtectedRoute({ children }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div>Yükleniyor...</div>;
  }

  if (!user) {
    // Kullanıcı giriş yapmamış, login sayfasına yönlendir
    window.location.href = '/login';
    return null;
  }

  return children;
}

export default ProtectedRoute;
```

### 6. Password Change Örneği

```jsx
// ChangePassword.jsx
import React, { useState } from 'react';
import apiClient from './api-client';

function ChangePassword() {
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (passwords.newPassword !== passwords.confirmPassword) {
      setMessage('Yeni şifreler eşleşmiyor');
      return;
    }

    setIsSubmitting(true);
    setMessage('');

    try {
      const response = await apiClient.put('/auth/change-password', {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword
      });

      if (response.ok) {
        setMessage('Şifre başarıyla değiştirildi');
        setPasswords({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      } else {
        const errorText = await response.text();
        setMessage(errorText);
      }
    } catch (error) {
      setMessage('Şifre değiştirme sırasında hata oluştu');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Mevcut Şifre:</label>
        <input
          type="password"
          value={passwords.currentPassword}
          onChange={(e) => setPasswords(prev => ({
            ...prev,
            currentPassword: e.target.value
          }))}
          required
        />
      </div>

      <div>
        <label>Yeni Şifre:</label>
        <input
          type="password"
          value={passwords.newPassword}
          onChange={(e) => setPasswords(prev => ({
            ...prev,
            newPassword: e.target.value
          }))}
          required
        />
      </div>

      <div>
        <label>Yeni Şifre Tekrar:</label>
        <input
          type="password"
          value={passwords.confirmPassword}
          onChange={(e) => setPasswords(prev => ({
            ...prev,
            confirmPassword: e.target.value
          }))}
          required
        />
      </div>

      {message && (
        <div className={message.includes('başarıyla') ? 'success' : 'error'}>
          {message}
        </div>
      )}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Değiştiriliyor...' : 'Şifre Değiştir'}
      </button>
    </form>
  );
}

export default ChangePassword;
```

## Test Etme

### 1. Browser Console'da Test

```javascript
// Browser console'da test edin:

// 1. Login test
fetch('http://localhost:3000/api/auth/signin', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include',
  body: JSON.stringify({
    email: 'test@example.com',
    password: 'Test123!'
  })
})
.then(response => response.json())
.then(data => console.log(data))
.catch(error => console.error('Error:', error));

// 2. CSRF token kontrolü
console.log('CSRF Token:', document.cookie
  .split('; ')
  .find(row => row.startsWith('csrf_token='))
  ?.split('=')[1]
);
```

### 2. Network Tab Kontrolü

Chrome DevTools > Network tab'ında şunları kontrol edin:
- ✅ Request headers'da `X-CSRF-Token` var mı?
- ✅ Response headers'da `Set-Cookie` var mı?
- ✅ Preflight OPTIONS isteği 204 döndürüyor mu?

## Sorun Giderme

### Hala CORS hatası alıyorsanız:

1. **Backend'i restart edin**
2. **Browser cache'i temizleyin**
3. **Network tab'da headers'ı kontrol edin**
4. **Console'da fetch test yapın**

### CSRF token eksik hatası alıyorsanız:

1. İlk signin'den sonra cookie'de `csrf_token` var mı kontrol edin
2. Subsequent isteklerde header doğru gönderiliyor mu kontrol edin
3. `credentials: 'include'` kullandığınızdan emin olun
