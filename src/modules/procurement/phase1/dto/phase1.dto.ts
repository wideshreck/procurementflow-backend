import { IsString, IsNumber, IsOptional, IsEnum, Min, MaxLength } from 'class-validator';

export enum ProcurementType {
  PRODUCT = 'Ürün Alımı',
  SERVICE = 'Hizmet Alımı'
}

export class CategoryDto {
  @IsString()
  category_id: string;

  @IsString()
  category_name: string;
}

export class CostCenterDto {
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

export class Phase1DataDto {
  @IsString()
  @Min(10)
  @MaxLength(255)
  item_title: string;

  @IsNumber()
  quantity: number;

  @IsString()
  uom: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  simple_definition?: string;

  @IsEnum(ProcurementType)
  procurement_type: ProcurementType;

  @IsString()
  @MaxLength(500)
  request_justification: string;

  category: CategoryDto;

  cost_center: CostCenterDto;
}

export class Phase1QuestionDto {
  question_id: string;
  question_type: 'SINGLE_CHOICE' | 'MULTI_CHOICE' | 'YES_NO' | 'TEXT_INPUT';
  question_text: string;
  answer_options: Array<{
    option: string;
    justification: string;
  }>;
  reason_of_question: string;
}

export class Phase1ResponseDto {
  conversationId: string;
  MODE: 'ASKING_FOR_INFO' | 'PHASE_ONE_DONE';
  QUESTIONS?: Phase1QuestionDto[];
  COLLECTED_DATA?: Phase1DataDto;
}
