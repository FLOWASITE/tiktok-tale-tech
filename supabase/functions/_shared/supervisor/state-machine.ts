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
  | 'error_recovery';

export type WorkflowEvent =
  | 'user_message'
  | 'classified_simple'
  | 'classified_research'
  | 'classified_plan'
  | 'classified_generate'
  | 'classified_chat'
  | 'classified_complex'
  | 'research_complete'
  | 'plan_complete'
  | 'content_complete'
  | 'review_approved'
  | 'review_needs_revision'
  | 'error'
  | 'recovery_success'
  | 'recovery_failed'
  | 'skip_agent';

export interface WorkflowTransition {
  from: WorkflowState;
  event: WorkflowEvent;
  to: WorkflowState;
  action?: string; // Agent to execute
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
];

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

/**
 * Get allowed events for current state
 */
export function getAllowedEvents(state: WorkflowState): WorkflowEvent[] {
  return TRANSITIONS
    .filter(t => t.from === state)
    .map(t => t.event);
}
