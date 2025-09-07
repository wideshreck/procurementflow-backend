import { Injectable } from '@nestjs/common';
import { WorkflowNodeType, EdgeDataType } from '@prisma/client';
import { CreateWorkflowDto } from '../dto/create-workflow.dto';
import { Node } from '../dto/node.dto';
import { WorkflowEdgeDto } from '../dto/workflow-edge.dto';

type PortDefinition = { [key: string]: EdgeDataType };

@Injectable()
export class WorkflowValidatorService {
  public validate(workflowDto: CreateWorkflowDto): void {
    const errors: string[] = [];
    const { nodes, edges } = workflowDto;

    // Rule 1: Must start with a PROCUREMENT_REQUEST node.
    const startNodes = nodes.filter(
      (n) => n.type === WorkflowNodeType.PROCUREMENT_REQUEST,
    );
    if (startNodes.length === 0) {
      errors.push('İş akışı bir "Alım İsteği" node\'u ile başlamalıdır.');
    }
    if (startNodes.length > 1) {
      errors.push('İş akışında birden fazla "Alım İsteği" node\'u olamaz.');
    }

    // Rule 2: Must end with an APPROVE or REJECT node.
    const endNodes = nodes.filter(
      (n) =>
        n.type === WorkflowNodeType.APPROVE || n.type === WorkflowNodeType.REJECT,
    );
    if (endNodes.length === 0) {
      errors.push('İş akışı "Onayla" veya "Reddet" node\'u ile sonlanmalıdır.');
    }

    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const edgesBySource = this.groupEdgesBy(edges, 'source');
    const edgesByTarget = this.groupEdgesBy(edges, 'target');

    for (const node of nodes) {
      const { inputs, outputs } = this.getNodePorts(node, edges);
      const inputHandles = Object.keys(inputs);
      const outputHandles = Object.keys(outputs);

      const incomingEdges = edgesByTarget.get(node.id) || [];
      const outgoingEdges = edgesBySource.get(node.id) || [];

      // Rule 3: All nodes except PROCUREMENT_REQUEST must have inputs.
      if (node.type !== WorkflowNodeType.PROCUREMENT_REQUEST) {
        if (incomingEdges.length === 0) {
          errors.push(`"${node.label || node.id}" node'unun girişi boş bırakılamaz.`);
        }
        if (incomingEdges.length > inputHandles.length) {
          errors.push(`"${node.label || node.id}" node'u beklenenden fazla giriş bağlantısına sahip.`);
        }
      }

      // Rule 4: All nodes except APPROVE/REJECT must have outputs.
      if (
        node.type !== WorkflowNodeType.APPROVE &&
        node.type !== WorkflowNodeType.REJECT
      ) {
        if (outgoingEdges.length === 0) {
          errors.push(`"${node.label || node.id}" node'unun çıkışı boş bırakılamaz.`);
        }
        if (outgoingEdges.length > outputHandles.length) {
           errors.push(`"${node.label || node.id}" node'u beklenenden fazla çıkış bağlantısına sahip.`);
        }
      }

      // Rule 5: Data type compatibility check.
      for (const edge of outgoingEdges) {
        const targetNode = nodeMap.get(edge.target);
        if (!targetNode) continue;

        const sourcePortType = outputs[edge.sourceHandle || 'default'];
        const { inputs: targetInputs } = this.getNodePorts(targetNode, edges);
        const targetPortType = targetInputs[edge.targetHandle || 'default'];

        if (sourcePortType && targetPortType && sourcePortType !== targetPortType) {
          errors.push(
            `Tip uyuşmazlığı: "${node.label || node.id}" (${sourcePortType}) -> "${
              targetNode.label || targetNode.id
            }" (${targetPortType})`,
          );
        }
      }
    }
    
    // Rule 6: Parallel processing rules
    this.validateParallelPaths(nodes, edges, errors);


    if (errors.length > 0) {
      throw new Error(errors.join('\n'));
    }
  }

  private getNodePorts(
    node: Node,
    edges: WorkflowEdgeDto[],
  ): {
    inputs: PortDefinition;
    outputs: PortDefinition;
  } {
    const inputs: PortDefinition = {};
    const outputs: PortDefinition = {};

    switch (node.type) {
      case WorkflowNodeType.PROCUREMENT_REQUEST:
        outputs['totalPrice'] = EdgeDataType.NUMBER;
        outputs['unitPrice'] = EdgeDataType.NUMBER;
        outputs['quantity'] = EdgeDataType.NUMBER;
        outputs['category'] = EdgeDataType.STRING;
        outputs['urgency'] = EdgeDataType.STRING;
        break;
      case WorkflowNodeType.APPROVE:
      case WorkflowNodeType.REJECT:
        inputs['default'] = EdgeDataType.ANY;
        break;
      case WorkflowNodeType.CONDITION_IF:
        inputs['default'] = EdgeDataType.NUMBER;
        outputs['yes'] = EdgeDataType.BOOLEAN;
        outputs['no'] = EdgeDataType.BOOLEAN;
        break;
      case WorkflowNodeType.CONDITION_SWITCH:
        inputs['default'] = EdgeDataType.STRING;
        // The outputs are dynamically generated based on the cases defined in the node's data.
        node.data.cases.forEach((caseValue) => {
          // Use a sanitized version of the case value for the handle ID
          const handleId = caseValue.toLowerCase().replace(/\s+/g, '-');
          outputs[handleId] = EdgeDataType.BOOLEAN;
        });
        break;
      case WorkflowNodeType.PARALLEL_FORK:
        inputs['default'] = EdgeDataType.ANY;
        // Outputs are determined by the number of outgoing edges
        edges
          .filter((e) => e.source === node.id)
          .forEach((edge, i) => {
            outputs[edge.sourceHandle || `branch-${i}`] = EdgeDataType.ANY;
          });
        break;
      case WorkflowNodeType.PARALLEL_JOIN:
        outputs['default'] = EdgeDataType.BOOLEAN;
        // Inputs are determined by the number of incoming edges
        edges
          .filter((e) => e.target === node.id)
          .forEach((edge, i) => {
            inputs[edge.targetHandle || `input-${i}`] = EdgeDataType.BOOLEAN;
          });
        break;
      case WorkflowNodeType.PERSON_APPROVAL:
      case WorkflowNodeType.DEPARTMENT_APPROVAL:
        inputs['default'] = EdgeDataType.ANY;
        outputs['approved'] = EdgeDataType.BOOLEAN;
        outputs['rejected'] = EdgeDataType.BOOLEAN;
        break;
    }
    return { inputs, outputs };
  }
  
  private validateParallelPaths(nodes: Node[], edges: WorkflowEdgeDto[], errors: string[]): void {
    const forks = nodes.filter(
      (n): n is Extract<Node, { type: 'PARALLEL_FORK' }> =>
        n.type === WorkflowNodeType.PARALLEL_FORK,
    );
    if (forks.length === 0) return;

    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const edgesBySource = this.groupEdgesBy(edges, 'source');

    for (const fork of forks) {
      const outgoingEdges = edgesBySource.get(fork.id) || [];
      const approvalNodesOnPaths = new Set<string>();

      for (const edge of outgoingEdges) {
        let currentNode = nodeMap.get(edge.target);
        while (currentNode && currentNode.type !== WorkflowNodeType.PARALLEL_JOIN) {
          if (currentNode.type === WorkflowNodeType.PERSON_APPROVAL || currentNode.type === WorkflowNodeType.DEPARTMENT_APPROVAL) {
            approvalNodesOnPaths.add(currentNode.id);
          }
          const nextEdge = (edgesBySource.get(currentNode.id) || [])[0];
          if (!nextEdge) break;
          currentNode = nodeMap.get(nextEdge.target);
        }
        if (!currentNode || currentNode.type !== WorkflowNodeType.PARALLEL_JOIN) {
          errors.push(`"${fork.label || fork.id}" ile başlayan paralel yol bir PARALLEL_JOIN ile birleştirilmelidir.`);
        }
      }

      if (outgoingEdges.length > 1 && approvalNodesOnPaths.size === 0) {
         // This is a simple split, not a parallel approval, which is allowed.
      }
    }
  }


  private groupEdgesBy(
    edges: WorkflowEdgeDto[],
    key: 'source' | 'target',
  ): Map<string, WorkflowEdgeDto[]> {
    const map = new Map<string, WorkflowEdgeDto[]>();
    for (const edge of edges) {
      const id = edge[key];
      if (!map.has(id)) {
        map.set(id, []);
      }
      map.get(id)!.push(edge);
    }
    return map;
  }
}
