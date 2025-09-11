export interface AIFieldSuggestion {
  label: string;
  description: string;
  isRequired: boolean;
  reasoning?: string;
}

export interface AIContentGeneration {
  content: string;
  confidence: number;
  suggestions?: string[];
}

export interface GenerateContentRequest {
  fieldLabel: string;
  fieldDescription?: string;
  rfxType: 'RFQ' | 'RFP' | 'RFI';
  category: string;
  companyContext?: string;
  procurementContext?: string;
}

export interface SuggestFieldsRequest {
  sectionTitle: string;
  existingFields: string[];
  rfxType: 'RFQ' | 'RFP' | 'RFI';
  category: string;
  industry?: string;
}

export interface ImproveContentRequest {
  currentContent: string;
  fieldLabel: string;
  rfxType: 'RFQ' | 'RFP' | 'RFI';
  improvements?: string[];
}

export interface GenerateTemplateRequest {
  rfxType: 'RFQ' | 'RFP' | 'RFI';
  category: string;
  description: string;
  specificRequirements?: string[];
}

export interface AIProvider {
  generateContent(request: GenerateContentRequest): Promise<AIContentGeneration>;
  suggestFields(request: SuggestFieldsRequest): Promise<AIFieldSuggestion[]>;
  improveContent(request: ImproveContentRequest): Promise<AIContentGeneration>;
  generateTemplate(request: GenerateTemplateRequest): Promise<any>;
  checkAvailability(): Promise<boolean>;
}