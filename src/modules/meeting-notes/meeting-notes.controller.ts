import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { MeetingNotesService } from './meeting-notes.service';
import { CreateMeetingNoteInput } from './dto/create-meeting-note.input';
import { UpdateMeetingNoteInput } from './dto/update-meeting-note.input';

@Controller('meeting-notes')
export class MeetingNotesController {
  constructor(private readonly meetingNotesService: MeetingNotesService) {}

  @Post()
  create(@Body() createMeetingNoteInput: CreateMeetingNoteInput) {
    return this.meetingNotesService.create(createMeetingNoteInput);
  }

  @Get()
  findAll(@Query('supplierId') supplierId: string) {
    return this.meetingNotesService.findAll(supplierId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.meetingNotesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateMeetingNoteInput: UpdateMeetingNoteInput) {
    return this.meetingNotesService.update(id, updateMeetingNoteInput);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.meetingNotesService.remove(id);
  }
}
