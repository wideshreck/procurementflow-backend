import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMeetingNoteInput } from './dto/create-meeting-note.input';
import { UpdateMeetingNoteInput } from './dto/update-meeting-note.input';

@Injectable()
export class MeetingNotesService {
  constructor(private readonly prisma: PrismaService) {}

  create(createMeetingNoteInput: CreateMeetingNoteInput) {
    return this.prisma.meetingNote.create({
      data: {
        ...createMeetingNoteInput,
        date: new Date(createMeetingNoteInput.date),
      },
    });
  }

  findAll(supplierId: string) {
    return this.prisma.meetingNote.findMany({
      where: { supplierId },
    });
  }

  findOne(id: string) {
    return this.prisma.meetingNote.findUnique({
      where: { id },
    });
  }

  update(id: string, updateMeetingNoteInput: UpdateMeetingNoteInput) {
    return this.prisma.meetingNote.update({
      where: { id },
      data: updateMeetingNoteInput,
    });
  }

  remove(id: string) {
    return this.prisma.meetingNote.delete({
      where: { id },
    });
  }
}
