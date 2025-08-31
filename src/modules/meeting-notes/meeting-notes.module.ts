import { Module } from '@nestjs/common';
import { MeetingNotesService } from './meeting-notes.service';
import { MeetingNotesController } from './meeting-notes.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [MeetingNotesController],
  providers: [MeetingNotesService],
})
export class MeetingNotesModule {}
