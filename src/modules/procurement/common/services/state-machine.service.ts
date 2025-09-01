import { Injectable } from '@nestjs/common';
import { ProcurementPhase } from '@prisma/client';
import { ChatbotResponse, ChatbotMode } from '../../dto/chatbot.dto';

interface StateTransition {
  from: ProcurementPhase;
  to: ProcurementPhase;
  condition: (response: ChatbotResponse) => boolean;
}

@Injectable()
export class StateMachineService {
  private readonly transitions: StateTransition[] = [
    // Phase 1 -> Phase 2 when Phase 1 is complete
    {
      from: ProcurementPhase.IDENTIFICATION,
      to: ProcurementPhase.SUGGESTIONS,
      condition: (response) =>
        response.MODE === ChatbotMode.PHASE_ONE_DONE,
    },
    // Phase 2 -> Phase 3 when Phase 2 is complete (catalog suggestions not wanted)
    {
      from: ProcurementPhase.SUGGESTIONS,
      to: ProcurementPhase.SPECS,
      condition: (response) =>
        response.MODE === ChatbotMode.PHASE_TWO_DONE,
    },
    // Phase 2 -> Phase 4 when catalog suggestion is selected
    {
      from: ProcurementPhase.SUGGESTIONS,
      to: ProcurementPhase.SUPPLIER_PRODUCT_SUGGESTIONS,
      condition: (response) =>
        response.MODE === ChatbotMode.PHASE_TWO_CATALOG_MATCH ||
        response.MODE === ChatbotMode.PHASE_TWO_SELECTED,
    },
    // Phase 3 -> Phase 4 when Phase 3 is complete (manual specs or predefined profile selected)
    {
      from: ProcurementPhase.SPECS,
      to: ProcurementPhase.SUPPLIER_PRODUCT_SUGGESTIONS,
      condition: (response) =>
        response.MODE === ChatbotMode.PHASE_THREE_DONE,
    },
    // Phase 4 -> Final when Phase 4 is complete
    {
      from: ProcurementPhase.SUPPLIER_PRODUCT_SUGGESTIONS,
      to: ProcurementPhase.FINAL,
      condition: (response) =>
        response.MODE === ChatbotMode.PHASE_FOUR_DONE,
    },
    // Keep the same phase when a suggestion is made
    {
      from: ProcurementPhase.SUGGESTIONS,
      to: ProcurementPhase.SUGGESTIONS,
      condition: (response) =>
        response.MODE === ChatbotMode.SUGGESTION ||
        response.MODE === ChatbotMode.SUGGESTION_FOR_CATALOG,
    },
    {
      from: ProcurementPhase.SPECS,
      to: ProcurementPhase.SPECS,
      condition: (response) =>
        response.MODE === ChatbotMode.SUGGESTION ||
        response.MODE === ChatbotMode.SUGGESTION_FOR_PREDEFINED_PROFILES ||
        response.MODE === ChatbotMode.PHASE_THREE_APPROVAL,
    },
  ];

  /**
   * Determines the next phase based on the current phase and the last response.
   * @param currentPhase - The current phase of the conversation.
   * @param lastResponse - The last response object from a phase service.
   * @returns The next procurement phase, or null if no transition is applicable.
   */
  getNextPhase(
    currentPhase: ProcurementPhase,
    lastResponse: ChatbotResponse,
  ): ProcurementPhase | null {
    const applicableTransition = this.transitions.find(
      (t) => t.from === currentPhase && t.condition(lastResponse),
    );

    return applicableTransition ? applicableTransition.to : null;
  }
}
