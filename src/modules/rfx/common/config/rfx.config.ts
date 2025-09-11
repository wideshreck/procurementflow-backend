export const RFX_CONFIG = {
  DEFAULTS: {
    CURRENCY: 'TRY',
    PAGE_SIZE: 20,
    MAX_PAGE_SIZE: 100,
    QUESTION_DEADLINE_BUFFER_DAYS: 3,
    MIN_SUBMISSION_DEADLINE_HOURS: 24,
  },
  
  LIMITS: {
    MAX_TITLE_LENGTH: 200,
    MAX_DESCRIPTION_LENGTH: 5000,
    MAX_TAGS: 10,
    MAX_ATTACHMENTS: 20,
    MAX_ATTACHMENT_SIZE: 10 * 1024 * 1024, // 10MB
    MAX_INVITED_SUPPLIERS: 100,
    MAX_CUSTOM_SECTIONS: 10,
    MAX_FIELDS_PER_SECTION: 20,
  },
  
  VALIDATION: {
    ALLOWED_FILE_TYPES: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png',
    ],
    EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    PHONE_REGEX: /^[\d\s+()-]+$/,
    URL_REGEX: /^https?:\/\/.+/,
  },
  
  AI: {
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000,
    TIMEOUT: 30000,
    CACHE_TTL: 3600, // 1 hour
    MAX_TOKENS: 2000,
    TEMPERATURE: 0.7,
  },
  
  NOTIFICATIONS: {
    EMAIL_BATCH_SIZE: 50,
    REMINDER_DAYS_BEFORE_DEADLINE: [7, 3, 1],
    DIGEST_SEND_TIME: '09:00',
  },
  
  DOCUMENT_NUMBER: {
    PREFIX: {
      RFQ: 'RFQ',
      RFP: 'RFP',
      RFI: 'RFI',
    },
    FORMAT: '{prefix}-{year}-{number}',
    NUMBER_PADDING: 5,
  },
  
  STATUS_TRANSITIONS: {
    DRAFT: ['ACTIVE', 'CANCELLED'],
    ACTIVE: ['CLOSED', 'CANCELLED', 'SUSPENDED'],
    SUSPENDED: ['ACTIVE', 'CANCELLED'],
    CLOSED: ['ARCHIVED'],
    CANCELLED: ['ARCHIVED'],
    ARCHIVED: [],
  },
  
  EVALUATION_WEIGHTS: {
    PRICE: 40,
    TECHNICAL: 30,
    EXPERIENCE: 20,
    DELIVERY: 10,
  },
};

export const RFX_MESSAGES = {
  SUCCESS: {
    CREATED: 'RFx document created successfully',
    UPDATED: 'RFx document updated successfully',
    DELETED: 'RFx document deleted successfully',
    PUBLISHED: 'RFx document published successfully',
    TEMPLATE_CREATED: 'Template created successfully',
    SUPPLIERS_INVITED: 'Suppliers invited successfully',
    BID_RECEIVED: 'Bid received successfully',
  },
  
  ERROR: {
    NOT_FOUND: 'RFx document not found',
    TEMPLATE_NOT_FOUND: 'Template not found',
    INVALID_STATUS: 'Invalid status transition',
    DEADLINE_PASSED: 'Submission deadline has passed',
    UNAUTHORIZED: 'You are not authorized to perform this action',
    DUPLICATE_SUPPLIER: 'Supplier already invited',
    INVALID_FILE_TYPE: 'Invalid file type',
    FILE_TOO_LARGE: 'File size exceeds maximum allowed',
    AI_SERVICE_UNAVAILABLE: 'AI service is currently unavailable',
    VALIDATION_FAILED: 'Validation failed',
  },
  
  INFO: {
    NO_RESULTS: 'No results found',
    AI_GENERATING: 'Generating content with AI...',
    EMAIL_SENT: 'Email notification sent',
    REMINDER_SCHEDULED: 'Reminder scheduled',
  },
};