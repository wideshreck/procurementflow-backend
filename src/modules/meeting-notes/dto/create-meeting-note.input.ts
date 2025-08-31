import { IsString, IsDate, IsNotEmpty } from 'class-validator';

export class CreateMeetingNoteInput {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsDate()
  @IsNotEmpty()
  date: Date;

  @IsString()
  @IsNotEmpty()
  supplierId: string;
}
