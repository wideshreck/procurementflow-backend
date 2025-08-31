# Frontend API Kullanım Örnekleri

## Token Refresh Problem Çözümü

### ❌ Yanlış Kullanım (Hata verir)
```javascript
// Bu hata verir: "Body cannot be empty when content-type is set to 'application/json'"
fetch('/api/auth/refresh', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json' // ❌ Body boşken bu header'ı göndermeyin
  },
  credentials: 'include'
});
```

### ✅ Doğru Kullanım
```javascript
// Çözüm 1: Content-Type header'ı hiç göndermeyin
fetch('/api/auth/refresh', {
  method: 'POST',
  credentials: 'include' // Sadece cookies için
});

// Çözüm 2: Boş JSON object gönderin
fetch('/api/auth/refresh', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  credentials: 'include',
  body: JSON.stringify({}) // Boş object
});
```

## Complete API Client (Güncellenmiş)

```javascript
class ApiClient {
  constructor() {
    this.baseURL = 'http://localhost:3000/api';
    this.accessToken = null;
    this.isRefreshing = false;
    this.failedQueue = [];
  }

  setAccessToken(token) {
    this.accessToken = token;
  }

  getCsrfToken() {
    return document.cookie
      .split('; ')
      .find(row => row.startsWith('csrf_token='))
      ?.split('=')[1];
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    const config = {
      credentials: 'include',
      ...options,
    };

    // Headers'ı dinamik olarak ayarla
    config.headers = {
      ...options.headers,
    };

    // Body varsa Content-Type ekle
    if (options.body) {
      config.headers['Content-Type'] = 'application/json';
    }

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

    try {
      const response = await fetch(url, config);
      
      if (response.status === 401 && !endpoint.includes('/auth/')) {
        return this.handleTokenRefresh(endpoint, config);
      }

      return response;
    } catch (error) {
      throw error;
    }
  }

  async handleTokenRefresh(originalEndpoint, originalConfig) {
    if (this.isRefreshing) {
      return new Promise((resolve, reject) => {
        this.failedQueue.push({ 
          resolve, 
          reject, 
          endpoint: originalEndpoint, 
          config: originalConfig 
        });
      });
    }

    this.isRefreshing = true;

    try {
      // Token refresh - Body YOK, Content-Type YOK
      const refreshResponse = await fetch(`${this.baseURL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        // Headers yok - sadece cookies
      });

      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
        this.setAccessToken(data.tokens.accessToken);

        this.processQueue(null);

        // Orijinal isteği tekrar dene
        originalConfig.headers = originalConfig.headers || {};
        originalConfig.headers['Authorization'] = `Bearer ${data.tokens.accessToken}`;
        return fetch(`${this.baseURL}${originalEndpoint}`, originalConfig);
      } else {
        this.processQueue(new Error('Token refresh failed'));
        this.logout();
        throw new Error('Authentication failed');
      }
    } catch (error) {
      this.processQueue(error);
      this.logout();
      throw error;
    } finally {
      this.isRefreshing = false;
    }
  }

  processQueue(error) {
    this.failedQueue.forEach(({ resolve, reject, endpoint, config }) => {
      if (error) {
        reject(error);
      } else {
        config.headers = config.headers || {};
        config.headers['Authorization'] = `Bearer ${this.accessToken}`;
        resolve(fetch(`${this.baseURL}${endpoint}`, config));
      }
    });
    this.failedQueue = [];
  }

  logout() {
    this.accessToken = null;
    window.location.href = '/login';
  }

  // GET istekleri
  async get(endpoint, options = {}) {
    return this.request(endpoint, { method: 'GET', ...options });
  }

  // POST istekleri
  async post(endpoint, data = null, options = {}) {
    const config = { method: 'POST', ...options };
    
    if (data !== null) {
      config.body = JSON.stringify(data);
    }
    
    return this.request(endpoint, config);
  }

  // PUT istekleri  
  async put(endpoint, data, options = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
      ...options,
    });
  }

  // DELETE istekleri
  async delete(endpoint, options = {}) {
    return this.request(endpoint, { method: 'DELETE', ...options });
  }
}

const apiClient = new ApiClient();
export default apiClient;
```

## Auth Service (Güncellenmiş)

```javascript
class AuthService {
  // Login
  async signin(email, password, mfaCode = null) {
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
      return data;
    }

    throw new Error(await response.text());
  }

  // Signup
  async signup(userData) {
    const response = await apiClient.post('/auth/signup', userData);
    
    if (response.ok) {
      const data = await response.json();
      apiClient.setAccessToken(data.tokens.accessToken);
      return data;
    }
    
    throw new Error(await response.text());
  }

  // Logout
  async logout() {
    try {
      await apiClient.post('/auth/logout'); // Body yok, otomatik olarak Content-Type eklenmez
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      apiClient.setAccessToken(null);
      window.location.href = '/login';
    }
  }

  // Manual token refresh
  async refreshToken() {
    const response = await fetch('http://localhost:3000/api/auth/refresh', {
      method: 'POST',
      credentials: 'include'
      // Content-Type header yok çünkü body yok
    });
    
    if (response.ok) {
      const data = await response.json();
      apiClient.setAccessToken(data.tokens.accessToken);
      return data;
    }
    
    throw new Error('Token refresh failed');
  }

  // Password change
  async changePassword(currentPassword, newPassword) {
    const response = await apiClient.put('/auth/change-password', {
      currentPassword,
      newPassword
    });
    
    if (!response.ok) {
      throw new Error(await response.text());
    }
    
    return response.json();
  }

  // Get current user
  async getCurrentUser() {
    const response = await apiClient.get('/auth/me');
    
    if (response.ok) {
      return response.json();
    }
    
    throw new Error('Failed to get current user');
  }
}

const authService = new AuthService();
export default authService;
```

## React Hook Örneği

```jsx
import { useState, useEffect, useCallback } from 'react';
import authService from './authService';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const checkAuthStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      // Önce refresh token'ı dene
      await authService.refreshToken();
      // Sonra user bilgilerini al
      const userData = await authService.getCurrentUser();
      setUser(userData);
    } catch (error) {
      console.log('Not authenticated');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (email, password, mfaCode = null) => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await authService.signin(email, password, mfaCode);
      
      if (result.requiresMfa) {
        return { requiresMfa: true };
      }

      setUser(result.user);
      return { success: true, user: result.user };
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setError(null);
    }
  }, []);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  return {
    user,
    isLoading,
    error,
    login,
    logout,
    refreshAuth: checkAuthStatus,
    isAuthenticated: !!user,
  };
}
```

## Test Script (Browser Console)

```javascript
// Token refresh test
async function testTokenRefresh() {
  try {
    console.log('Testing token refresh...');
    
    const response = await fetch('http://localhost:3000/api/auth/refresh', {
      method: 'POST',
      credentials: 'include'
      // Content-Type header yok
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Token refresh successful:', data);
    } else {
      console.log('❌ Token refresh failed:', response.status, await response.text());
    }
  } catch (error) {
    console.error('❌ Token refresh error:', error);
  }
}

// Login test
async function testLogin() {
  try {
    console.log('Testing login...');
    
    const response = await fetch('http://localhost:3000/api/auth/signin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'Test123!'
      })
    });
    
    console.log('Login response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Login successful:', data);
    } else {
      console.log('❌ Login failed:', await response.text());
    }
  } catch (error) {
    console.error('❌ Login error:', error);
  }
}

// Test both
testTokenRefresh();
// testLogin(); // Uncomment to test login
```

## Önemli Noktalar

1. **Refresh endpoint'i**: Body göndermiyoruz, Content-Type header'ı da eklemiyor
2. **Login/Signup**: Body var, Content-Type otomatik ekleniyor
3. **CSRF Token**: Sadece state-changing işlemlerde (POST/PUT/DELETE) gerekli
4. **Credentials**: Her istekte `credentials: 'include'` kullanıyoruz
5. **Error Handling**: 401 durumunda otomatik token refresh yapıyoruz
