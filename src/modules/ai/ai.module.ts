import { Module } from '@nestjs/common';
import { RFxModule } from '../rfx/rfx.module';
import { AIController } from './ai.controller';

@Module({
  imports: [RFxModule],
  controllers: [AIController],
})
export class AIModule {}