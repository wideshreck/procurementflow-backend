import { BadRequestException } from '@nestjs/common';
import { RFxType, RFxStatus } from '@prisma/client';

export class RFxValidators {
  static validateRFxType(type: string): RFxType {
    if (!Object.values(RFxType).includes(type as RFxType)) {
      throw new BadRequestException(`Invalid RFx type: ${type}`);
    }
    return type as RFxType;
  }

  static validateRFxStatus(status: string): RFxStatus {
    if (!Object.values(RFxStatus).includes(status as RFxStatus)) {
      throw new BadRequestException(`Invalid RFx status: ${status}`);
    }
    return status as RFxStatus;
  }

  static validateDeadlines(
    submissionDeadline: Date,
    questionDeadline?: Date,
  ): void {
    const now = new Date();
    const submission = new Date(submissionDeadline);
    
    if (submission <= now) {
      throw new BadRequestException('Submission deadline must be in the future');
    }

    if (questionDeadline) {
      const question = new Date(questionDeadline);
      
      if (question <= now) {
        throw new BadRequestException('Question deadline must be in the future');
      }
      
      if (question >= submission) {
        throw new BadRequestException(
          'Question deadline must be before submission deadline',
        );
      }
    }
  }

  static validateBudget(budget: number | string): number {
    const numericBudget = typeof budget === 'string' ? parseFloat(budget) : budget;
    
    if (isNaN(numericBudget) || numericBudget < 0) {
      throw new BadRequestException('Invalid budget amount');
    }
    
    return numericBudget;
  }

  static validateEmail(email: string): string {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(email)) {
      throw new BadRequestException(`Invalid email format: ${email}`);
    }
    
    return email.toLowerCase();
  }

  static validatePhoneNumber(phone: string): string {
    const phoneRegex = /^[\d\s+()-]+$/;
    
    if (!phoneRegex.test(phone)) {
      throw new BadRequestException(`Invalid phone number format: ${phone}`);
    }
    
    return phone.replace(/\s/g, '');
  }

  static validateCurrency(currency: string): string {
    const validCurrencies = ['TRY', 'USD', 'EUR', 'GBP'];
    
    if (!validCurrencies.includes(currency)) {
      throw new BadRequestException(
        `Invalid currency: ${currency}. Valid currencies are: ${validCurrencies.join(', ')}`,
      );
    }
    
    return currency;
  }

  static validateArrayNotEmpty<T>(
    array: T[],
    fieldName: string,
  ): T[] {
    if (!array || array.length === 0) {
      throw new BadRequestException(`${fieldName} cannot be empty`);
    }
    
    return array;
  }

  static validateStringLength(
    value: string,
    fieldName: string,
    minLength?: number,
    maxLength?: number,
  ): string {
    if (minLength && value.length < minLength) {
      throw new BadRequestException(
        `${fieldName} must be at least ${minLength} characters long`,
      );
    }
    
    if (maxLength && value.length > maxLength) {
      throw new BadRequestException(
        `${fieldName} must not exceed ${maxLength} characters`,
      );
    }
    
    return value;
  }

  static validateQuantity(quantity: number): number {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new BadRequestException('Quantity must be a positive integer');
    }
    
    return quantity;
  }

  static validatePercentage(value: number, fieldName: string): number {
    if (value < 0 || value > 100) {
      throw new BadRequestException(
        `${fieldName} must be between 0 and 100`,
      );
    }
    
    return value;
  }

  static validateUrl(url: string): string {
    try {
      new URL(url);
      return url;
    } catch {
      throw new BadRequestException(`Invalid URL format: ${url}`);
    }
  }

  static sanitizeHtml(html: string): string {
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/on\w+="[^"]*"/gi, '')
      .replace(/on\w+='[^']*'/gi, '');
  }
}