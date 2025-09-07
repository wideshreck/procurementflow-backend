import { Injectable, BadRequestException } from '@nestjs/common';
import { WorkflowNodeType } from '@prisma/client';

interface WorkflowNode {
  id: string;
  type: string;
  data?: any;
  position: { x: number; y: number };
}

interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  dataType?: string;
  label?: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

interface NodePortDefinition {
  inputs: { [key: string]: string };
  outputs: { [key: string]: string };
}

@Injectable()
export class WorkflowValidatorService {
  private nodePortDefinitions: Map<string, NodePortDefinition>;

  constructor() {
    this.nodePortDefinitions = new Map<string, NodePortDefinition>();
    
    this.nodePortDefinitions.set('PROCUREMENT_REQUEST', {
      inputs: {},
      outputs: {
        'totalPrice': 'NUMBER',
        'unitPrice': 'NUMBER',
        'quantity': 'NUMBER',
        'category': 'STRING',
        'urgency': 'STRING',
        'default': 'ANY',
      },
    });
    
    this.nodePortDefinitions.set('APPROVE', {
      inputs: { 'default': 'ANY' },
      outputs: {},
    });
    
    this.nodePortDefinitions.set('REJECT', {
      inputs: { 'default': 'ANY' },
      outputs: {},
    });
    
    this.nodePortDefinitions.set('CONDITION_IF', {
      inputs: { 'value': 'NUMBER' },
      outputs: {
        'yes': 'BOOLEAN',
        'no': 'BOOLEAN',
      },
    });
    
    this.nodePortDefinitions.set('CONDITION_SWITCH', {
      inputs: { 'value': 'STRING' },
      outputs: {},
    });
    
    this.nodePortDefinitions.set('PARALLEL_FORK', {
      inputs: { 'default': 'ANY' },
      outputs: {},
    });
    
    this.nodePortDefinitions.set('PARALLEL_JOIN', {
      inputs: {},
      outputs: { 'default': 'BOOLEAN' },
    });
    
    this.nodePortDefinitions.set('PERSON_APPROVAL', {
      inputs: { 'default': 'ANY' },
      outputs: {
        'approved': 'BOOLEAN',
        'rejected': 'BOOLEAN',
      },
    });
    
    this.nodePortDefinitions.set('DEPARTMENT_APPROVAL', {
      inputs: { 'default': 'ANY' },
      outputs: {
        'approved': 'BOOLEAN',
        'rejected': 'BOOLEAN',
      },
    });
    
    this.nodePortDefinitions.set('EMAIL_NOTIFICATION', {
      inputs: { 'default': 'ANY' },
      outputs: { 'default': 'ANY' },
    });
    
    this.nodePortDefinitions.set('FORM', {
      inputs: { 'default': 'ANY' },
      outputs: { 'completed': 'BOOLEAN' },
    });
  }

  validateWorkflow(nodes: WorkflowNode[], edges: WorkflowEdge[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Check for required nodes
    const hasProcurementRequest = nodes.some(n => n.type === 'PROCUREMENT_REQUEST');
    if (!hasProcurementRequest) {
      errors.push('İş akışı bir "Alım İsteği" node\'u ile başlamalıdır');
    }

    const hasEndNode = nodes.some(n => n.type === 'APPROVE' || n.type === 'REJECT');
    if (!hasEndNode) {
      errors.push('İş akışı "Onayla" veya "Reddet" node\'u ile sonlanmalıdır');
    }

    // 2. Check for orphaned nodes (except PROCUREMENT_REQUEST)
    const nodeIds = new Set(nodes.map(n => n.id));
    const connectedNodes = new Set<string>();
    
    edges.forEach(edge => {
      connectedNodes.add(edge.source);
      connectedNodes.add(edge.target);
    });

    nodes.forEach(node => {
      if (node.type !== 'PROCUREMENT_REQUEST' && !connectedNodes.has(node.id)) {
        errors.push(`Node "${node.id}" bağlantısı eksik`);
      }
    });

    // 3. Validate node connections and data types
    edges.forEach(edge => {
      if (!nodeIds.has(edge.source)) {
        errors.push(`Edge "${edge.id}" geçersiz kaynak node'a sahip: "${edge.source}"`);
      }
      if (!nodeIds.has(edge.target)) {
        errors.push(`Edge "${edge.id}" geçersiz hedef node'a sahip: "${edge.target}"`);
      }

      // Type compatibility check
      const sourceNode = nodes.find(n => n.id === edge.source);
      const targetNode = nodes.find(n => n.id === edge.target);
      
      if (sourceNode && targetNode) {
        const isCompatible = this.checkTypeCompatibility(
          sourceNode,
          targetNode,
          edge.sourceHandle,
          edge.targetHandle
        );
        
        if (!isCompatible) {
          warnings.push(
            `Veri tipi uyumsuzluğu: "${sourceNode.id}" -> "${targetNode.id}"`
          );
        }
      }
    });

    // 4. Check for cycles
    if (this.hasCycle(nodes, edges)) {
      errors.push('İş akışında döngü tespit edildi');
    }

    // 5. Validate parallel structures
    const parallelForks = nodes.filter(n => n.type === 'PARALLEL_FORK');
    const parallelJoins = nodes.filter(n => n.type === 'PARALLEL_JOIN');
    
    if (parallelForks.length !== parallelJoins.length) {
      warnings.push('Paralel ayırma ve birleştirme node\'ları dengeli değil');
    }

    // 6. Validate node-specific configurations
    nodes.forEach(node => {
      const nodeErrors = this.validateNodeConfiguration(node);
      errors.push(...nodeErrors);
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private validateNodeConfiguration(node: WorkflowNode): string[] {
    const errors: string[] = [];

    switch (node.type) {
      case 'PERSON_APPROVAL':
        if (!node.data?.approverId) {
          errors.push(`"${node.id}" node'unda onaylayıcı seçilmemiş`);
        }
        break;
      
      case 'DEPARTMENT_APPROVAL':
        if (!node.data?.departmentId) {
          errors.push(`"${node.id}" node'unda departman seçilmemiş`);
        }
        break;
      
      case 'CONDITION_IF':
        if (!node.data?.operator || node.data?.value === undefined) {
          errors.push(`"${node.id}" koşul node'u eksik konfigürasyona sahip`);
        }
        break;
      
      case 'CONDITION_SWITCH':
        if (!node.data?.cases || node.data.cases.length < 1) {
          errors.push(`"${node.id}" switch node'unda en az bir durum tanımlanmalı`);
        }
        break;
      
      case 'PARALLEL_FORK':
        if (!node.data?.branchCount || node.data.branchCount < 2) {
          errors.push(`"${node.id}" paralel ayırma node'unda en az 2 dal olmalı`);
        }
        break;
      
      case 'PARALLEL_JOIN':
        if (!node.data?.joinStrategy) {
          errors.push(`"${node.id}" paralel birleştirme node'unda strateji seçilmemiş`);
        }
        break;
      
      case 'EMAIL_NOTIFICATION':
        if (!node.data?.to || !node.data?.subject) {
          errors.push(`"${node.id}" e-posta node'unda alıcı veya konu eksik`);
        }
        break;
    }

    return errors;
  }

  private checkTypeCompatibility(
    sourceNode: WorkflowNode,
    targetNode: WorkflowNode,
    sourceHandle?: string,
    targetHandle?: string
  ): boolean {
    const sourcePorts = this.nodePortDefinitions.get(sourceNode.type);
    const targetPorts = this.nodePortDefinitions.get(targetNode.type);

    if (!sourcePorts || !targetPorts) {
      return true; // Allow unknown types
    }

    const sourceType = sourcePorts.outputs[sourceHandle || 'default'] || 'ANY';
    const targetType = targetPorts.inputs[targetHandle || 'default'] || 'ANY';

    // ANY type is compatible with everything
    if (sourceType === 'ANY' || targetType === 'ANY') {
      return true;
    }

    return sourceType === targetType;
  }

  private hasCycle(nodes: WorkflowNode[], edges: WorkflowEdge[]): boolean {
    const adjacencyList = new Map<string, string[]>();
    
    // Build adjacency list
    nodes.forEach(node => {
      adjacencyList.set(node.id, []);
    });
    
    edges.forEach(edge => {
      const neighbors = adjacencyList.get(edge.source) || [];
      neighbors.push(edge.target);
      adjacencyList.set(edge.source, neighbors);
    });

    // DFS to detect cycle
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycleDFS = (nodeId: string): boolean => {
      visited.add(nodeId);
      recursionStack.add(nodeId);

      const neighbors = adjacencyList.get(nodeId) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (hasCycleDFS(neighbor)) {
            return true;
          }
        } else if (recursionStack.has(neighbor)) {
          return true;
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    for (const nodeId of adjacencyList.keys()) {
      if (!visited.has(nodeId)) {
        if (hasCycleDFS(nodeId)) {
          return true;
        }
      }
    }

    return false;
  }

  public getNodeOutputPorts(nodeType: string, nodeData?: any): string[] {
    switch (nodeType) {
      case 'PROCUREMENT_REQUEST':
        return ['totalPrice', 'unitPrice', 'quantity', 'category', 'urgency'];
      
      case 'CONDITION_IF':
        return ['yes', 'no'];
      
      case 'CONDITION_SWITCH':
        return nodeData?.cases?.map((c: any, i: number) => `case-${i}`) || [];
      
      case 'PARALLEL_FORK':
        return Array.from(
          { length: nodeData?.branchCount || 2 },
          (_, i) => `branch-${i}`
        );
      
      case 'PERSON_APPROVAL':
      case 'DEPARTMENT_APPROVAL':
        return ['approved', 'rejected'];
      
      case 'PARALLEL_JOIN':
      case 'EMAIL_NOTIFICATION':
      case 'FORM':
        return ['default'];
      
      default:
        return [];
    }
  }

  public getNodeInputPorts(nodeType: string, nodeData?: any): string[] {
    switch (nodeType) {
      case 'PROCUREMENT_REQUEST':
        return []; // No inputs
      
      case 'APPROVE':
      case 'REJECT':
        return ['default'];
      
      case 'CONDITION_IF':
        return ['value'];
      
      case 'CONDITION_SWITCH':
        return ['value'];
      
      case 'PARALLEL_JOIN':
        return Array.from(
          { length: nodeData?.inputCount || 2 },
          (_, i) => `input-${i}`
        );
      
      default:
        return ['default'];
    }
  }
}