import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  Conversation,
  MessageRole,
  ConversationStatus,
  ProcurementPhase,
} from '@prisma/client';
import { ChatbotResponse, ChatbotMode } from '../../dto/chatbot.dto';
import { Phase1ResponseDto } from '../../phase1/dto/phase1.dto';
import { StateMachineService } from './state-machine.service';
import { Phase1Service } from '../../phase1/services/phase1.service';
import { Phase2Service } from '../../phase2/services/phase2.service';
import { Phase3Service } from '../../phase3/services/phase3.service';
import { Phase4Service } from '../../phase4/services/phase4.service';

@Injectable()
export class OrchestratorService {
  private readonly logger = new Logger(OrchestratorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stateMachine: StateMachineService,
    private readonly phase1Service: Phase1Service,
    private readonly phase2Service: Phase2Service,
    private readonly phase3Service: Phase3Service,
    private readonly phase4Service: Phase4Service,
  ) {}

  /**
   * Main entry point for processing user messages.
   * It orchestrates the entire procurement process based on the conversation's state.
   * @param userId - The ID of the user initiating the message.
   * @param message - The content of the user's message.
   * @returns A structured response object for the frontend.
   */
  async processMessage(
    userId: string,
    message: string,
    conversationId?: string,
  ): Promise<ChatbotResponse> {
    try {
      // HACK: Create a test user and company for the demo endpoint if they don't exist
      if (userId === 'test-user-demo') {
        await this.prisma.company.upsert({
          where: { id: 'test-company' },
          update: {},
          create: {
            id: 'test-company',
            name: 'Test Company',
          },
        });
        await this.prisma.user.upsert({
          where: { id: 'test-user-demo' },
          update: {},
          create: {
            id: 'test-user-demo',
            email: 'test-user-demo@example.com',
            password: 'password',
            fullName: 'Test User',
            companyId: 'test-company',
          },
        });
      }
      let conversation = await this.findOrCreateActiveConversation(userId, conversationId);
      await this.saveMessage(conversation.id, MessageRole.USER, message);

      let response: ChatbotResponse;

      // Route the request to the appropriate phase handler
      switch (conversation.phase) {
        case ProcurementPhase.IDENTIFICATION:
          const phase1Response = await this.phase1Service.processPhase1(
            userId,
            message,
            conversation.id
          );
          response = this.convertPhase1ResponseToChatbotResponse(phase1Response);
          break;
          
        case ProcurementPhase.SUGGESTIONS:
          response = await this.phase2Service.process(conversation, message);
          break;
          
        case ProcurementPhase.SPECS:
          response = await this.phase3Service.process(conversation, message);
          break;
          
        case ProcurementPhase.SUPPLIER_PRODUCT_SUGGESTIONS:
          response = await this.phase4Service.processPhase4(conversation.id, message);
          break;
          
        case ProcurementPhase.FINAL:
          // Mark conversation as completed
          await this.prisma.conversation.update({
            where: { id: conversation.id },
            data: { 
              status: ConversationStatus.COMPLETED,
              updatedAt: new Date()
            },
          });
          
          this.logger.log(`Conversation ${conversation.id} completed successfully`);
          response = {
            MODE: ChatbotMode.PHASE_FOUR_DONE,
            COLLECTED_DATA: conversation.collectedData as any,
            conversationId: conversation.id,
          };
          break;
          
        default:
          throw new Error(`Unknown or unhandled phase: ${conversation.phase}`);
      }

      // Check for state transitions based on the response
      const nextPhase = this.stateMachine.getNextPhase(
        conversation.phase,
        response,
      );

      if (
        response.MODE === ChatbotMode.SUGGESTION ||
        response.MODE === ChatbotMode.SUGGESTION_FOR_CATALOG ||
        response.MODE === ChatbotMode.SUGGESTION_FOR_PREDEFINED_PROFILES ||
        response.MODE === ChatbotMode.PHASE_THREE_APPROVAL
      ) {
        // No phase transition, just save the message and return the response
      } else if (nextPhase) {
        conversation = await this.transitionToPhase(
          conversation,
          nextPhase,
          response,
        );

        // Handle automatic phase starts after transitions
        if (nextPhase === ProcurementPhase.SUGGESTIONS) {
          this.logger.log('Phase 1 complete, starting Phase 2');
          const phase1Data = (response as any).COLLECTED_DATA;
          response = await this.phase2Service.process(
            conversation,
            JSON.stringify(phase1Data),
          );
        } else if (nextPhase === ProcurementPhase.SPECS) {
          this.logger.log('Phase 2 complete, starting Phase 3');
          const phase2Data = (response as any).COLLECTED_DATA;
          response = await this.phase3Service.process(
            conversation,
            JSON.stringify(phase2Data),
          );
        } else if (nextPhase === ProcurementPhase.SUPPLIER_PRODUCT_SUGGESTIONS) {
          this.logger.log('Phase 3 complete, starting Phase 4');
          response = await this.phase4Service.processPhase4(
            conversation.id,
            "Phase 3 tamamlandı, teslimat bilgilerini alalım",
          );
        }
      }

      await this.saveMessage(conversation.id, MessageRole.ASSISTANT, response);

      // Ensure conversationId is always included in response
      const responseWithId = {
        ...response,
        conversationId: conversation.id,
      };

      return responseWithId;
    } catch (error) {
      this.logger.error(
        `Error processing message for user ${userId}: ${error.message}`,
        error.stack,
      );
      // Re-throw the original error to preserve its context
      throw error;
    }
  }

  /**
   * Clean conversation management: Each conversation is isolated and unique.
   * New conversations are always created unless a specific ID is provided.
   */
  private async findOrCreateActiveConversation(
    userId: string,
    conversationId?: string,
  ): Promise<Conversation> {
    // If conversationId provided, try to find it and validate it's still active
    if (conversationId) {
      const conversation = await this.prisma.conversation.findUnique({
        where: { id: conversationId },
      });
      
      // Only return existing conversation if it belongs to user and is still active
      if (conversation && 
          conversation.userId === userId && 
          conversation.status === ConversationStatus.ACTIVE) {
        return conversation;
      }
      
      // If conversation exists but completed/cancelled, log it and create new one
      if (conversation && conversation.userId === userId) {
        this.logger.log(`Conversation ${conversationId} is ${conversation.status}, creating new one`);
      }
    }

    // Always create a new conversation for clean isolation
    // Close any other active conversations for this user to prevent conflicts
    await this.prisma.conversation.updateMany({
      where: { 
        userId, 
        status: ConversationStatus.ACTIVE 
      },
      data: { 
        status: ConversationStatus.CANCELLED,
        updatedAt: new Date()
      },
    });

    this.logger.log(`Creating new conversation for user ${userId}`);
    const newConversation = await this.prisma.conversation.create({
      data: {
        userId,
        status: ConversationStatus.ACTIVE,
        phase: ProcurementPhase.IDENTIFICATION,
        collectedData: {},
      },
    });
    
    this.logger.log(`✅ New conversation created: ${newConversation.id}`);
    return newConversation;
  }

  /**
   * Transitions a conversation to a new phase and updates its collected data.
   */
  private async transitionToPhase(
    conversation: Conversation,
    nextPhase: ProcurementPhase,
    response: ChatbotResponse,
  ): Promise<Conversation> {
    const newCollectedData = conversation.collectedData
      ? { ...(conversation.collectedData as object) }
      : {};

    // Update collectedData on phase completion
    if ('COLLECTED_DATA' in response) {
      if (response.MODE === ChatbotMode.PHASE_ONE_DONE) {
        newCollectedData['phase1'] = response.COLLECTED_DATA;
      } else if (response.MODE === ChatbotMode.PHASE_TWO_DONE) {
        newCollectedData['phase2'] = response.COLLECTED_DATA;
      } else if (response.MODE === ChatbotMode.PHASE_THREE_DONE) {
        newCollectedData['phase3'] = response.COLLECTED_DATA;
      } else if (response.MODE === ChatbotMode.PHASE_FOUR_DONE) {
        newCollectedData['phase4'] = response.COLLECTED_DATA;
      }
    }

    // Handle PHASE_TWO_CATALOG_MATCH separately
    if (response.MODE === ChatbotMode.PHASE_TWO_CATALOG_MATCH) {
      if ('COLLECTED_DATA' in response) {
        newCollectedData['phase2'] = response.COLLECTED_DATA;
      }
      if ('SELECTED_CATALOG_ITEM' in response) {
        newCollectedData['selectedCatalogItem'] = response.SELECTED_CATALOG_ITEM;
      }
    }

    const updatedConversation = await this.prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        phase: nextPhase,
        collectedData: newCollectedData,
        status:
          nextPhase === ProcurementPhase.FINAL
            ? ConversationStatus.COMPLETED
            : conversation.status,
      },
    });

    // If the conversation is complete, delete its history
    if (nextPhase === ProcurementPhase.FINAL) {
      await this.deleteConversationHistory(conversation.id);
    }

    return updatedConversation;
  }

  /**
   * Deletes all messages associated with a conversation.
   */
  private async deleteConversationHistory(conversationId: string): Promise<void> {
    await this.prisma.message.deleteMany({
      where: { conversationId },
    });
    this.logger.log(`Deleted history for conversation ${conversationId}`);
  }

  /**
   * Saves a message (user or assistant) to the database.
   */
  private async saveMessage(
    conversationId: string,
    role: MessageRole,
    content: string | object,
  ): Promise<void> {
    const isJson = typeof content === 'object';
    await this.prisma.message.create({
      data: {
        conversationId,
        role,
        content: isJson ? JSON.stringify(content) : content.toString(),
        contentJson: isJson ? content : undefined,
      },
    });
  }

  /**
   * Converts Phase1ResponseDto to ChatbotResponse format
   */
  private convertPhase1ResponseToChatbotResponse(phase1Response: Phase1ResponseDto): ChatbotResponse {
    if (phase1Response.MODE === 'PHASE_ONE_DONE') {
      return {
        MODE: ChatbotMode.PHASE_ONE_DONE,
        COLLECTED_DATA: phase1Response.COLLECTED_DATA || {},
      } as ChatbotResponse;
    } else {
      return {
        MODE: ChatbotMode.ASKING_FOR_INFO,
        QUESTIONS: phase1Response.QUESTIONS || [],
      } as ChatbotResponse;
    }
  }

  /**
   * Cancels the active conversation for a user.
   * @returns The cancelled conversation ID if found.
   */
  async cancelConversation(userId: string): Promise<string | undefined> {
    const activeConversation = await this.prisma.conversation.findFirst({
      where: { userId, status: ConversationStatus.ACTIVE },
    });

    if (activeConversation) {
      // Update status to CANCELLED instead of deleting
      await this.prisma.conversation.update({
        where: { id: activeConversation.id },
        data: { status: ConversationStatus.CANCELLED },
      });
      
      // Also delete the history for cancelled conversations
      await this.deleteConversationHistory(activeConversation.id);

      this.logger.log(`Cancelled conversation ${activeConversation.id} for user ${userId}`);
      return activeConversation.id;
    }
    
    return undefined;
  }
}
