import { Injectable } from '@nestjs/common';
import { AUTH_CONSTANTS } from '../constants/auth.constants';
import { PasswordStrength } from '../interfaces/auth.interfaces';

@Injectable()
export class PasswordValidatorService {
  private commonPasswords = new Set([
    'password', '123456', '12345678', 'qwerty', 'abc123', 'monkey', '1234567',
    'letmein', 'trustno1', 'dragon', 'baseball', 'superman', 'iloveyou',
    'password123', 'welcome', 'admin', 'login', 'master', 'hello', 'freedom',
    'whatever', 'qazwsx', 'trustno1', 'jordan23', 'harley', 'password1',
    'robert', 'matthew', 'jordan', 'asshole', 'daniel', 'andrew', 'michelle',
    'password12345', 'password123456', 'admin123', 'root', 'toor', 'pass',
    'test', 'guest', 'oracle', 'changeme', 'password!', 'password1!', 
    '12345', '54321', '123456789', 'qwerty123', 'qwertyuiop', 'asdfghjkl'
  ]);

  validatePassword(password: string, userInfo?: { email?: string; fullName?: string }): PasswordStrength {
    const feedback: string[] = [];
    let score = 0;

    // Length check
    if (password.length < AUTH_CONSTANTS.PASSWORD_MIN_LENGTH) {
      feedback.push(`Şifre en az ${AUTH_CONSTANTS.PASSWORD_MIN_LENGTH} karakter olmalıdır`);
    } else if (password.length >= 12) {
      score += 2;
    } else {
      score += 1;
    }

    if (password.length > AUTH_CONSTANTS.PASSWORD_MAX_LENGTH) {
      feedback.push(`Şifre en fazla ${AUTH_CONSTANTS.PASSWORD_MAX_LENGTH} karakter olabilir`);
    }

    // Character requirements
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

    if (AUTH_CONSTANTS.PASSWORD_REQUIRE_UPPERCASE && !hasUppercase) {
      feedback.push('Şifre en az bir büyük harf içermelidir');
    } else if (hasUppercase) {
      score += 0.5;
    }

    if (AUTH_CONSTANTS.PASSWORD_REQUIRE_LOWERCASE && !hasLowercase) {
      feedback.push('Şifre en az bir küçük harf içermelidir');
    } else if (hasLowercase) {
      score += 0.5;
    }

    if (AUTH_CONSTANTS.PASSWORD_REQUIRE_NUMBER && !hasNumbers) {
      feedback.push('Şifre en az bir rakam içermelidir');
    } else if (hasNumbers) {
      score += 0.5;
    }

    if (AUTH_CONSTANTS.PASSWORD_REQUIRE_SPECIAL && !hasSpecial) {
      feedback.push('Şifre en az bir özel karakter içermelidir');
    } else if (hasSpecial) {
      score += 0.5;
    }

    // Common password check
    if (this.isCommonPassword(password.toLowerCase())) {
      feedback.push('Bu şifre çok yaygın kullanılıyor, daha güçlü bir şifre seçin');
      score = Math.max(0, score - 2);
    }

    // Sequential characters check
    if (this.hasSequentialCharacters(password)) {
      feedback.push('Şifre ardışık karakterler içermemeli (abc, 123, vb.)');
      score = Math.max(0, score - 1);
    }

    // Repeated characters check
    if (this.hasRepeatedCharacters(password)) {
      feedback.push('Şifre çok fazla tekrarlanan karakter içeriyor');
      score = Math.max(0, score - 1);
    }

    // User info check
    if (userInfo) {
      if (userInfo.email && password.toLowerCase().includes(userInfo.email.split('@')[0].toLowerCase())) {
        feedback.push('Şifre email adresinizin bir parçasını içermemeli');
        score = Math.max(0, score - 1);
      }

      if (userInfo.fullName) {
        const nameParts = userInfo.fullName.toLowerCase().split(/\s+/);
        for (const part of nameParts) {
          if (part.length > 2 && password.toLowerCase().includes(part)) {
            feedback.push('Şifre adınızın bir parçasını içermemeli');
            score = Math.max(0, score - 1);
            break;
          }
        }
      }
    }

    // Entropy check
    const entropy = this.calculateEntropy(password);
    if (entropy < 30) {
      feedback.push('Şifre daha karmaşık olmalı');
      score = Math.max(0, score - 1);
    } else if (entropy > 50) {
      score = Math.min(4, score + 1);
    }

    // Final score normalization
    score = Math.max(0, Math.min(4, Math.round(score)));

    // Add positive feedback for strong passwords
    if (score >= 3 && feedback.length === 0) {
      feedback.push('Güçlü şifre!');
    }

    return {
      score,
      feedback,
      isValid: feedback.length === 0 || (score >= 3 && !feedback.some(f => f.includes('en az')))
    };
  }

  private isCommonPassword(password: string): boolean {
    return this.commonPasswords.has(password);
  }

  private hasSequentialCharacters(password: string, threshold: number = 3): boolean {
    for (let i = 0; i < password.length - threshold + 1; i++) {
      let isSequential = true;
      let isReverseSequential = true;

      for (let j = 1; j < threshold; j++) {
        const currentChar = password.charCodeAt(i + j);
        const prevChar = password.charCodeAt(i + j - 1);

        if (currentChar !== prevChar + 1) {
          isSequential = false;
        }
        if (currentChar !== prevChar - 1) {
          isReverseSequential = false;
        }
      }

      if (isSequential || isReverseSequential) {
        return true;
      }
    }
    return false;
  }

  private hasRepeatedCharacters(password: string, threshold: number = 3): boolean {
    const regex = new RegExp(`(.)\\1{${threshold - 1},}`);
    return regex.test(password);
  }

  private calculateEntropy(password: string): number {
    const charsets = {
      lowercase: 26,
      uppercase: 26,
      numbers: 10,
      special: 32,
      extended: 128
    };

    let poolSize = 0;
    if (/[a-z]/.test(password)) poolSize += charsets.lowercase;
    if (/[A-Z]/.test(password)) poolSize += charsets.uppercase;
    if (/\d/.test(password)) poolSize += charsets.numbers;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) poolSize += charsets.special;
    if (/[^\x00-\x7F]/.test(password)) poolSize += charsets.extended;

    return password.length * Math.log2(poolSize);
  }

  generateStrongPassword(length: number = 16): string {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    const allChars = lowercase + uppercase + numbers + special;
    let password = '';
    
    // Ensure at least one character from each required set
    if (AUTH_CONSTANTS.PASSWORD_REQUIRE_LOWERCASE) {
      password += lowercase[Math.floor(Math.random() * lowercase.length)];
    }
    if (AUTH_CONSTANTS.PASSWORD_REQUIRE_UPPERCASE) {
      password += uppercase[Math.floor(Math.random() * uppercase.length)];
    }
    if (AUTH_CONSTANTS.PASSWORD_REQUIRE_NUMBER) {
      password += numbers[Math.floor(Math.random() * numbers.length)];
    }
    if (AUTH_CONSTANTS.PASSWORD_REQUIRE_SPECIAL) {
      password += special[Math.floor(Math.random() * special.length)];
    }
    
    // Fill the rest
    for (let i = password.length; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }
}
