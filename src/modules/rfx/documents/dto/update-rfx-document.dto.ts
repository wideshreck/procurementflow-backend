import { PartialType } from '@nestjs/mapped-types';
import { CreateRFxDocumentDto } from './create-rfx-document.dto';
import { IsEnum, IsOptional, IsArray, IsString } from 'class-validator';
import { RFxStatus } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateRFxDocumentDto extends PartialType(CreateRFxDocumentDto) {
  @ApiPropertyOptional({ enum: RFxStatus })
  @IsOptional()
  @IsEnum(RFxStatus)
  status?: RFxStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  additionalSupplierIds?: string[];
}