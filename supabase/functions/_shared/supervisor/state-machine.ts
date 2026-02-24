// ============================================
// Supervisor State Machine
// Manages multi-agent workflow state transitions
// ============================================

export type WorkflowState = 
  | 'idle'
  | 'classifying'
  | 'researching'
  | 'planning'
  | 'generating'
  | 'reviewing'
  | 'completed'
  | 'failed'
  | 'error_recovery'
  | 'multi_step_routing'
  | 'sub_workflow'
  | 'merging_results'
  | 'image_generating';

export type WorkflowEvent =
  | 'user_message'
  | 'classified_simple'
  | 'classified_research'
  | 'classified_plan'
  | 'classified_generate'
  | 'classified_chat'
  | 'classified_complex'
  | 'classified_multi_step'
  | 'research_complete'
  | 'plan_complete'
  | 'content_complete'
  | 'review_approved'
  | 'review_needs_revision'
  | 'error'
  | 'recovery_success'
  | 'recovery_failed'
  | 'skip_agent'
  | 'sub_complete'
  | 'all_subs_complete'
  | 'merge_complete'
  | 'classified_image_generate'
  | 'image_complete';

export interface WorkflowTransition {
  from: WorkflowState;
  event: WorkflowEvent;
  to: WorkflowState;
  action?: string; // Agent to execute
  condition?: (context: WorkflowContext) => boolean;
}

export interface ConditionalTransition extends WorkflowTransition {
  condition: (context: WorkflowContext) => boolean;
}

// State machine transition table
const TRANSITIONS: WorkflowTransition[] = [
  // Start
  { from: 'idle', event: 'user_message', to: 'classifying' },
  
  // Classification outcomes
  { from: 'classifying', event: 'classified_chat', to: 'generating', action: 'content-agent' },
  { from: 'classifying', event: 'classified_simple', to: 'generating', action: 'content-agent' },
  { from: 'classifying', event: 'classified_generate', to: 'generating', action: 'content-agent' },
  { from: 'classifying', event: 'classified_research', to: 'researching', action: 'research-agent' },
  { from: 'classifying', event: 'classified_plan', to: 'planning', action: 'strategy-agent' },
  { from: 'classifying', event: 'classified_complex', to: 'researching', action: 'research-agent' },
  
  // Research -> Planning or Generating
  { from: 'researching', event: 'research_complete', to: 'planning', action: 'strategy-agent' },
  { from: 'researching', event: 'skip_agent', to: 'generating', action: 'content-agent' },
  { from: 'researching', event: 'error', to: 'error_recovery' },
  
  // Planning -> Generating
  { from: 'planning', event: 'plan_complete', to: 'generating', action: 'content-agent' },
  { from: 'planning', event: 'skip_agent', to: 'generating', action: 'content-agent' },
  { from: 'planning', event: 'error', to: 'error_recovery' },
  
  // Generating -> Reviewing or Completed
  { from: 'generating', event: 'content_complete', to: 'reviewing', action: 'reviewer-agent' },
  { from: 'generating', event: 'skip_agent', to: 'completed' },
  { from: 'generating', event: 'error', to: 'error_recovery' },
  
  // Reviewing outcomes
  { from: 'reviewing', event: 'review_approved', to: 'completed' },
  { from: 'reviewing', event: 'review_needs_revision', to: 'generating', action: 'content-agent' },
  { from: 'reviewing', event: 'skip_agent', to: 'completed' },
  { from: 'reviewing', event: 'error', to: 'error_recovery' },
  
  // Error recovery
  { from: 'error_recovery', event: 'recovery_success', to: 'generating', action: 'content-agent' },
  { from: 'error_recovery', event: 'recovery_failed', to: 'failed' },
  
  // Image generation
  { from: 'classifying', event: 'classified_image_generate', to: 'image_generating', action: 'image-agent' },
  { from: 'image_generating', event: 'image_complete', to: 'completed' },
  { from: 'image_generating', event: 'error', to: 'error_recovery' },
  { from: 'image_generating', event: 'skip_agent', to: 'completed' },
  
  // Multi-step workflow (Hierarchical Supervisor)
  { from: 'classifying', event: 'classified_multi_step', to: 'multi_step_routing' },
  { from: 'multi_step_routing', event: 'sub_complete', to: 'multi_step_routing' },
  { from: 'multi_step_routing', event: 'all_subs_complete', to: 'merging_results' },
  { from: 'multi_step_routing', event: 'error', to: 'error_recovery' },
  { from: 'merging_results', event: 'merge_complete', to: 'completed' },
  { from: 'merging_results', event: 'error', to: 'error_recovery' },
];

export interface SubWorkflow {
  id: string;
  steps: string[]; // Agent names in order
  currentStepIndex: number;
  results: Record<string, any>;
  status: 'pending' | 'running' | 'completed' | 'failed';
}

export interface WorkflowContext {
  sessionId: string;
  currentState: WorkflowState;
  previousStates: WorkflowState[];
  stateData: Record<string, any>;
  errorCount: number;
  maxErrors: number;
  startedAt: number;
  revisionCount: number;
  maxRevisions: number;
  // Hierarchical Supervisor support
  subWorkflows: SubWorkflow[];
  activeSubWorkflowId?: string;
  multiStepPlan?: string[];
}

export function createWorkflowContext(sessionId: string): WorkflowContext {
  return {
    sessionId,
    currentState: 'idle',
    previousStates: [],
    stateData: {},
    errorCount: 0,
    maxErrors: 3,
    startedAt: Date.now(),
    revisionCount: 0,
    maxRevisions: 2,
    subWorkflows: [],
  };
}

export interface TransitionResult {
  success: boolean;
  newState: WorkflowState;
  action?: string;
  error?: string;
}

/**
 * Attempt a state transition
 */
export function transition(
  context: WorkflowContext,
  event: WorkflowEvent
): TransitionResult {
  const validTransition = TRANSITIONS.find(
    t => t.from === context.currentState && t.event === event
      && (!t.condition || t.condition(context))
  );

  if (!validTransition) {
    return {
      success: false,
      newState: context.currentState,
      error: `No transition from '${context.currentState}' with event '${event}'`,
    };
  }

  // Guard: max errors
  if (event === 'error') {
    context.errorCount++;
    if (context.errorCount >= context.maxErrors) {
      context.previousStates.push(context.currentState);
      context.currentState = 'failed';
      return { success: true, newState: 'failed', error: 'Max errors reached' };
    }
  }

  // Guard: max revisions
  if (event === 'review_needs_revision') {
    context.revisionCount++;
    if (context.revisionCount >= context.maxRevisions) {
      // Force approve after max revisions
      context.previousStates.push(context.currentState);
      context.currentState = 'completed';
      return { success: true, newState: 'completed' };
    }
  }

  // Execute transition
  context.previousStates.push(context.currentState);
  context.currentState = validTransition.to;

  return {
    success: true,
    newState: validTransition.to,
    action: validTransition.action,
  };
}

/**
 * Check if workflow is in a terminal state
 */
export function isTerminalState(state: WorkflowState): boolean {
  return state === 'completed' || state === 'failed';
}

// ============================================
// Hierarchical Supervisor Helpers
// ============================================

/**
 * Create a sub-workflow for multi-step execution
 */
export function createSubWorkflow(steps: string[]): SubWorkflow {
  return {
    id: crypto.randomUUID(),
    steps,
    currentStepIndex: 0,
    results: {},
    status: 'pending',
  };
}

/**
 * Advance sub-workflow to next step, returns the next agent or null if done
 */
export function advanceSubWorkflow(sub: SubWorkflow): string | null {
  if (sub.currentStepIndex >= sub.steps.length) {
    sub.status = 'completed';
    return null;
  }
  sub.status = 'running';
  const agent = sub.steps[sub.currentStepIndex];
  sub.currentStepIndex++;
  return agent;
}

/**
 * Check if all sub-workflows are completed
 */
export function allSubWorkflowsComplete(context: WorkflowContext): boolean {
  return context.subWorkflows.length > 0 &&
    context.subWorkflows.every(sw => sw.status === 'completed' || sw.status === 'failed');
}

/**
 * Get allowed events for current state
 */
export function getAllowedEvents(state: WorkflowState): WorkflowEvent[] {
  return TRANSITIONS
    .filter(t => t.from === state)
    .map(t => t.event);
}
