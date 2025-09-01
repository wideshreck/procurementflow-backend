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
          // Phase 4 can be reached from both Phase 2 (catalog selection) and Phase 3 (manual specs)
          const previousPhase = conversation.phase;
          if (previousPhase === ProcurementPhase.SUGGESTIONS) {
            this.logger.log('Phase 2 catalog selection complete, starting Phase 4');
            this.logger.log(`Current collected data before Phase 4: ${JSON.stringify(conversation.collectedData).substring(0, 200)}...`);
          } else {
            this.logger.log('Phase 3 complete, starting Phase 4');
          }
          response = await this.phase4Service.processPhase4(
            conversation.id,
            "Teslimat bilgilerini alalım",
          );
          this.logger.log(`Phase 4 response mode: ${response.MODE}`);
        }
      }

      await this.saveMessage(conversation.id, MessageRole.ASSISTANT, response);

      // Handle conversation completion: create new conversation ID for next interaction
      let finalConversationId = conversation.id;
      if (response.MODE === ChatbotMode.PHASE_FOUR_DONE) {
        // Create a new conversation for the next interaction when current one is completed
        const newConversation = await this.createNewConversation(userId);
        finalConversationId = newConversation.id;
        this.logger.log(`Conversation completed, new conversation ready: ${finalConversationId}`);
      }

      // Ensure conversationId is always included in response
      const responseWithId = {
        ...response,
        conversationId: finalConversationId,
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
   * Smart conversation management: Reuse active conversations, create new only when needed.
   * New conversations are only created when:
   * 1. No conversationId provided and no active conversation exists
   * 2. Provided conversationId is completed, cancelled, or doesn't exist
   * 3. Conversation belongs to different user
   */
  private async findOrCreateActiveConversation(
    userId: string,
    conversationId?: string,
  ): Promise<Conversation> {
    // If conversationId provided, try to find it and validate it
    if (conversationId) {
      const conversation = await this.prisma.conversation.findUnique({
        where: { id: conversationId },
      });
      
      // Return existing conversation if it belongs to user and is still active
      if (conversation && 
          conversation.userId === userId && 
          conversation.status === ConversationStatus.ACTIVE) {
        this.logger.log(`Reusing active conversation: ${conversationId}`);
        return conversation;
      }
      
      // If conversation exists but completed/cancelled, create new one
      if (conversation && conversation.userId === userId) {
        this.logger.log(`Conversation ${conversationId} is ${conversation.status}, creating new one`);
      } else if (conversation) {
        this.logger.log(`Conversation ${conversationId} belongs to different user, creating new one`);
      } else {
        this.logger.log(`Conversation ${conversationId} not found, creating new one`);
      }
      
      // Create new conversation since the provided one is not usable
      return await this.createNewConversation(userId);
    }

    // No conversationId provided, check if user has an active conversation
    const existingActiveConversation = await this.prisma.conversation.findFirst({
      where: { 
        userId, 
        status: ConversationStatus.ACTIVE 
      },
    });

    if (existingActiveConversation) {
      this.logger.log(`Found existing active conversation: ${existingActiveConversation.id}`);
      return existingActiveConversation;
    }

    // No active conversation found, create new one
    return await this.createNewConversation(userId);
  }

  /**
   * Creates a new conversation for the user.
   * Cancels any existing active conversations to prevent conflicts.
   */
  private async createNewConversation(userId: string): Promise<Conversation> {
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
    const currentData = conversation.collectedData
      ? { ...(conversation.collectedData as object) }
      : {};

    let newCollectedData = currentData;

    // Update collectedData on phase completion
    if ('COLLECTED_DATA' in response) {
      if (response.MODE === ChatbotMode.PHASE_ONE_DONE) {
        // For Phase 1, merge data directly
        newCollectedData = { ...currentData, ...response.COLLECTED_DATA };
        newCollectedData['phase1'] = response.COLLECTED_DATA;
      } else if (response.MODE === ChatbotMode.PHASE_TWO_DONE) {
        // For Phase 2 done, preserve all previous data
        newCollectedData = { ...currentData, ...response.COLLECTED_DATA };
        newCollectedData['phase2'] = response.COLLECTED_DATA;
      } else if (response.MODE === ChatbotMode.PHASE_THREE_DONE) {
        // For Phase 3, merge technical specifications
        newCollectedData = { ...currentData, ...response.COLLECTED_DATA };
        newCollectedData['phase3'] = response.COLLECTED_DATA;
      } else if (response.MODE === ChatbotMode.PHASE_FOUR_DONE) {
        // For Phase 4, ensure all data is preserved
        // The response.COLLECTED_DATA should already contain all merged data from Phase 4 service
        newCollectedData = response.COLLECTED_DATA;
      }
    }

    // Handle PHASE_TWO_CATALOG_MATCH and PHASE_TWO_SELECTED
    if (response.MODE === ChatbotMode.PHASE_TWO_CATALOG_MATCH || 
        response.MODE === ChatbotMode.PHASE_TWO_SELECTED) {
      this.logger.log(`Handling ${response.MODE} - transitioning to Phase 4`);
      if ('COLLECTED_DATA' in response) {
        // Merge catalog data with existing data
        const collectedData = response.COLLECTED_DATA as Record<string, any>;
        newCollectedData = { ...currentData, ...collectedData };
        newCollectedData['phase2'] = collectedData;
        this.logger.log(`Phase 2 collected data merged: ${JSON.stringify(newCollectedData).substring(0, 200)}...`);
        
        // Preserve technical specifications if they exist and ensure requirement_level is 'Zorunlu'
        if (collectedData.technical_specifications) {
          newCollectedData['technical_specifications'] = collectedData.technical_specifications.map((spec: any) => ({
            ...spec,
            requirement_level: 'Zorunlu'
          }));
        }
      }
      if ('SELECTED_CATALOG_ITEM' in response) {
        const selectedItem = response.SELECTED_CATALOG_ITEM as Record<string, any>;
        newCollectedData['selectedCatalogItem'] = selectedItem;
        
        // Extract technical specifications from selected item and ensure requirement_level is 'Zorunlu'
        if (selectedItem.technical_specifications) {
          newCollectedData['technical_specifications'] = selectedItem.technical_specifications.map((spec: any) => ({
            ...spec,
            requirement_level: 'Zorunlu'
          }));
        }
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
   * Does NOT create a new conversation - let the next message trigger that.
   * @returns undefined to signal frontend to clear its conversation ID
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
      
      // Return undefined to signal frontend to clear conversation ID
      // Next message will create a new conversation automatically
      return undefined;
    }
    
    // No active conversation found, return undefined
    this.logger.log(`No active conversation found for user ${userId}`);
    return undefined;
  }
}
