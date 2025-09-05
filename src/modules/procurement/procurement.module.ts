import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ProcurementController } from './procurement.controller';
import { ProcurementService } from './procurement.service';
import { AIProvidersModule } from './common/ai-providers/ai-providers.module';
import { OrchestratorService } from './common/services/orchestrator.service';
import { StateMachineService } from './common/services/state-machine.service';
import { Phase1Service } from './phase1/services/phase1.service';
import { Phase2Service } from './phase2/services/phase2.service';
import { Phase3Service } from './phase3/services/phase3.service';
import { Phase4Service } from './phase4/services/phase4.service';

@Module({
  imports: [PrismaModule, AIProvidersModule],
  controllers: [ProcurementController],
  providers: [
    ProcurementService,
    // Main orchestrator service
    OrchestratorService,

    // Phase-specific services
    Phase1Service,
    Phase2Service,
    Phase3Service,
    Phase4Service,

    // Utility and helper services
    StateMachineService,
  ],
  exports: [OrchestratorService], // Export the main service
})
export class ProcurementModule {}
