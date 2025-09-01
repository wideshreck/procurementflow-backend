import {
  IsString,
  IsEnum,
  IsArray,
  ValidateNested,
  IsOptional,
  IsNotEmpty,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Defines the current state and expected action of the chatbot.
 * This acts as a state machine for the frontend-backend communication.
 */
export enum ChatbotMode {
  ASKING_FOR_INFO = 'ASKING_FOR_INFO',
  ASKING_FOR_DELIVERY_DETAILS = 'ASKING_FOR_DELIVERY_DETAILS',
  SUGGESTION = 'SUGGESTION',
  SUGGESTION_FOR_CATALOG = 'SUGGESTION_FOR_CATALOG',
  SUGGESTION_FOR_PREDEFINED_PROFILES = 'SUGGESTION_FOR_PREDEFINED_PROFILES',
  PHASE_ONE_DONE = 'PHASE_ONE_DONE',
  PHASE_TWO_CATALOG_MATCH = 'PHASE_TWO_CATALOG_MATCH',
  PHASE_TWO_SELECTED = 'PHASE_TWO_SELECTED',
  PHASE_TWO_DONE = 'PHASE_TWO_DONE',
  PHASE_THREE_SPECS = 'PHASE_THREE_SPECS',
  PHASE_THREE_APPROVAL = 'PHASE_THREE_APPROVAL',
  PHASE_THREE_DONE = 'PHASE_THREE_DONE',
  PHASE_FOUR_DONE = 'PHASE_FOUR_DONE',
  CONVERSATION_CANCELLED = 'CONVERSATION_CANCELLED',
}

/**
 * Defines the type of UI component the frontend should render for a question.
 */
export enum QuestionType {
  MULTI_CHOICE = 'MULTI_CHOICE',
  SINGLE_CHOICE = 'SINGLE_CHOICE',
  YES_NO = 'YES_NO',
  TEXT_INPUT = 'TEXT_INPUT',
}

// --- Data Structures for different MODES ---

class AnswerOptionDto {
  @IsString()
  @IsNotEmpty()
  option: string;

  @IsString()
  @IsOptional()
  justification?: string;
}

class QuestionDto {
  @IsString()
  @IsNotEmpty()
  question_id: string;

  @IsEnum(QuestionType)
  question_type: QuestionType;

  @IsString()
  @IsNotEmpty()
  question_text: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnswerOptionDto)
  answer_options: AnswerOptionDto[];

  @IsString()
  @IsNotEmpty()
  reason_of_question: string;
}

export class AskingForInfoResponseDto {
  @IsEnum(ChatbotMode)
  MODE: ChatbotMode.ASKING_FOR_INFO;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionDto)
  QUESTIONS: QuestionDto[];
}

export class AskingForDeliveryDetailsResponseDto {
  @IsEnum(ChatbotMode)
  MODE: ChatbotMode.ASKING_FOR_DELIVERY_DETAILS;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionDto)
  QUESTIONS: QuestionDto[];
}

class SuggestionDto {
  @IsString()
  @IsOptional()
  item_id?: string; // Used in Phase 2

  @IsString()
  @IsOptional()
  item_name?: string; // Used in Phase 2

  @IsString()
  @IsOptional()
  suggestion_name?: string; // Used in Phase 3

  @IsNumber()
  @IsOptional()
  estimated_cost_per_unit?: number; // Used in Phase 3

  @IsString()
  @IsOptional()
  last_updated_price?: string; // Used in Phase 2 for catalog suggestions

  @IsString()
  @IsNotEmpty()
  justification: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => TechnicalSpecificationDto)
  technical_specifications?: TechnicalSpecificationDto[]; // Used in Phase 3
}

export class SuggestionResponseDto {
  @IsEnum(ChatbotMode)
  MODE: ChatbotMode.SUGGESTION;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SuggestionDto)
  SUGGESTIONS: SuggestionDto[];
}

export class SuggestionForCatalogResponseDto {
  @IsEnum(ChatbotMode)
  MODE: ChatbotMode.SUGGESTION_FOR_CATALOG;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SuggestionDto)
  SUGGESTIONS_FOR_CATALOG: SuggestionDto[];
}

export class SuggestionForPredefinedProfilesResponseDto {
  @IsEnum(ChatbotMode)
  MODE: ChatbotMode.SUGGESTION_FOR_PREDEFINED_PROFILES;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SuggestionDto)
  SUGGESTIONS_FOR_PREDEFINED_PROFILES: SuggestionDto[];
}

// --- Data Structures for Phase Completions ---

class CategoryDto {
  @IsString()
  category_id: string;

  @IsString()
  category_name: string;
}

class CostCenterDto {
  @IsString()
  cost_center_id: string;

  @IsString()
  cost_center_name: string;

  @IsNumber()
  cost_center_budget: number;

  @IsNumber()
  cost_center_spent_budget: number;

  @IsNumber()
  cost_center_remaining_budget: number;
}

class Phase1CollectedDataDto {
  @IsString()
  item_title: string;

  @IsNumber()
  quantity: number;

  @IsString()
  uom: string; // Unit of Measure

  @IsString()
  @IsOptional()
  simple_definition?: string;

  @IsString()
  procurement_type: 'Ürün Alımı' | 'Hizmet Alımı';

  @IsString()
  request_justification: string;

  @ValidateNested()
  @Type(() => CategoryDto)
  category: CategoryDto;

  @ValidateNested()
  @Type(() => CostCenterDto)
  cost_center: CostCenterDto;
}

export class PhaseOneDoneResponseDto {
  @IsEnum(ChatbotMode)
  MODE: ChatbotMode.PHASE_ONE_DONE;

  @ValidateNested()
  @Type(() => Phase1CollectedDataDto)
  COLLECTED_DATA: Phase1CollectedDataDto;
}

// Phase 2 Catalog Matching Response
export class PhaseTwoCatalogMatchResponseDto {
  @IsEnum(ChatbotMode)
  MODE: ChatbotMode.PHASE_TWO_CATALOG_MATCH;

  @IsArray()
  @IsOptional()
  SUGGESTIONS?: any[];

  @IsString()
  @IsOptional()
  MESSAGE?: string;
}

// Phase 2 Selected - User selected a catalog item, proceeding to Phase 4
export class PhaseTwoSelectedResponseDto {
  @IsEnum(ChatbotMode)
  MODE: ChatbotMode.PHASE_TWO_SELECTED;

  @IsOptional()
  COLLECTED_DATA?: any;

  @IsOptional()
  SELECTED_CATALOG_ITEM?: any;
}

// Represents the completion of Phase 2, indicating whether a catalog item was selected.
export class PhaseTwoDoneResponseDto {
  @IsEnum(ChatbotMode)
  MODE: ChatbotMode.PHASE_TWO_DONE;

  @IsOptional()
  COLLECTED_DATA?: any;

  @IsString()
  @IsOptional()
  selected_item_id?: string; // ID of the selected catalog item, if any.
}

class TechnicalSpecificationDto {
  @IsString()
  spec_key: string;

  @IsString()
  spec_value: string;

  @IsString()
  @IsOptional()
  requirement_level?: 'Zorunlu' | 'Tercih Edilen';
}

class Phase3CollectedDataDto extends Phase1CollectedDataDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TechnicalSpecificationDto)
  technical_specifications: TechnicalSpecificationDto[];
}

// Phase 3 Specification Generation Response
export class PhaseThreeSpecsResponseDto {
  @IsEnum(ChatbotMode)
  MODE: ChatbotMode.PHASE_THREE_SPECS;

  @IsOptional()
  SPECIFICATIONS?: any;

  @IsString()
  @IsOptional()
  MESSAGE?: string;
}

export class PhaseThreeApprovalResponseDto {
  @IsEnum(ChatbotMode)
  MODE: ChatbotMode.PHASE_THREE_APPROVAL;

  @ValidateNested()
  @Type(() => Phase3CollectedDataDto)
  COLLECTED_DATA: Phase3CollectedDataDto;

  @IsOptional()
  SPECIFICATIONS?: any;
}

export class PhaseThreeDoneResponseDto {
  @IsEnum(ChatbotMode)
  MODE: ChatbotMode.PHASE_THREE_DONE;

  @ValidateNested()
  @Type(() => Phase3CollectedDataDto)
  COLLECTED_DATA: Phase3CollectedDataDto;

  @IsOptional()
  SPECIFICATIONS?: any;
}

export class PhaseFourDoneResponseDto {
  @IsEnum(ChatbotMode)
  MODE: ChatbotMode.PHASE_FOUR_DONE;

  @IsOptional()
  COLLECTED_DATA?: any;

  @IsString()
  @IsOptional()
  conversationId?: string;
}

export class ConversationCancelledResponseDto {
  @IsEnum(ChatbotMode)
  MODE: ChatbotMode.CONVERSATION_CANCELLED;

  @IsString()
  @IsNotEmpty()
  response: string;

  @IsString()
  @IsOptional()
  conversationId?: string;
}

/**
 * A union type representing all possible valid responses from the chatbot orchestrator.
 * This ensures type safety throughout the application.
 */
export type ChatbotResponse =
  | AskingForInfoResponseDto
  | AskingForDeliveryDetailsResponseDto
  | SuggestionResponseDto
  | SuggestionForCatalogResponseDto
  | SuggestionForPredefinedProfilesResponseDto
  | PhaseOneDoneResponseDto
  | PhaseTwoCatalogMatchResponseDto
  | PhaseTwoSelectedResponseDto
  | PhaseTwoDoneResponseDto
  | PhaseThreeSpecsResponseDto
  | PhaseThreeApprovalResponseDto
  | PhaseThreeDoneResponseDto
  | PhaseFourDoneResponseDto
  | ConversationCancelledResponseDto;
