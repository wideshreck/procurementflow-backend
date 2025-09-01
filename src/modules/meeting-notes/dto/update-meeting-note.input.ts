import { PartialType } from '@nestjs/swagger';
import { CreateMeetingNoteInput } from './create-meeting-note.input';

export class UpdateMeetingNoteInput extends PartialType(CreateMeetingNoteInput) {}
