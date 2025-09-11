import { RFxType, RFxStatus } from '@prisma/client';

export interface RFxSection {
  title: string;
  fields: RFxField[];
  isEditable?: boolean;
  order?: number;
}

export interface RFxField {
  name: string;
  label: string;
  type?: 'text' | 'textarea' | 'number' | 'date' | 'select' | 'file';
  isRequired?: boolean;
  description?: string;
  placeholder?: string;
  value?: any;
  options?: Array<{ label: string; value: string }>;
  validation?: RFxFieldValidation;
}

export interface RFxFieldValidation {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  custom?: (value: any) => boolean | string;
}

export interface RFxAuditLog {
  action: string;
  userId: string;
  timestamp: Date;
  details?: string;
  metadata?: Record<string, any>;
}

export interface RFxBaseEntity {
  id: string;
  companyId: string;
  createdAt: Date;
  updatedAt: Date;
  createdById: string;
  lastModifiedById?: string;
}

export interface RFxSearchFilters {
  search?: string;
  type?: RFxType;
  status?: RFxStatus;
  categoryId?: string;
  startDate?: Date;
  endDate?: Date;
  tags?: string[];
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface RFxOperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: Record<string, any>;
}

export interface RFxNotification {
  type: 'email' | 'in-app' | 'sms';
  recipientId: string;
  subject: string;
  message: string;
  metadata?: Record<string, any>;
}