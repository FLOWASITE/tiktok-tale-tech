// ============================================
// Graph Checkpoint Manager
// Persist & resume graph state across Edge Function invocations
// ============================================

import { GraphState } from "./graph-state.ts";

export interface CheckpointRecord {
  id: string;
  sessionId: string;
  nodeName: string;
  graphState: GraphState;
  createdAt: string;
  status: 'active' | 'completed' | 'failed';
}

/**
 * Save a checkpoint after a node completes
 */
export async function saveCheckpoint(
  supabase: any,
  state: GraphState,
  completedNode: string
): Promise<string> {
  const checkpointId = crypto.randomUUID();

  // Serialize state — strip large non-essential data to stay within JSONB limits
  const serialized = serializeState(state);

  try {
    const { error } = await supabase.from('workflow_checkpoints').insert({
      id: checkpointId,
      session_id: state.sessionId,
      node_name: completedNode,
      graph_state: serialized,
      status: 'active',
    });

    if (error) {
      console.warn(`[Checkpoint] Save failed:`, error.message);
      return '';
    }

    console.log(`[Checkpoint] Saved after node '${completedNode}' (id: ${checkpointId})`);
    return checkpointId;
  } catch (err) {
    console.warn(`[Checkpoint] Save error:`, err);
    return '';
  }
}

/**
 * Load the latest checkpoint for a session
 */
export async function loadCheckpoint(
  supabase: any,
  sessionId: string
): Promise<CheckpointRecord | null> {
  try {
    const { data, error } = await supabase
      .from('workflow_checkpoints')
      .select('*')
      .eq('session_id', sessionId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      sessionId: data.session_id,
      nodeName: data.node_name,
      graphState: data.graph_state as GraphState,
      createdAt: data.created_at,
      status: data.status,
    };
  } catch {
    return null;
  }
}

/**
 * Validate a checkpoint for resume eligibility.
 * Checks staleness (> 5 min = reject) and status.
 */
export interface CheckpointValidation {
  valid: boolean;
  reason?: string;
  checkpoint?: CheckpointRecord;
}

export async function validateCheckpoint(
  supabase: any,
  continuationToken: string,
  maxAgeMs: number = 5 * 60 * 1000 // 5 minutes
): Promise<CheckpointValidation> {
  try {
    const { data, error } = await supabase
      .from('workflow_checkpoints')
      .select('*')
      .eq('id', continuationToken)
      .single();

    if (error || !data) {
      return { valid: false, reason: 'Checkpoint not found' };
    }

    // Check status
    if (data.status !== 'active') {
      return { valid: false, reason: `Checkpoint status is '${data.status}', expected 'active'` };
    }

    // Staleness check
    const createdAt = new Date(data.created_at).getTime();
    const age = Date.now() - createdAt;
    if (age > maxAgeMs) {
      return { valid: false, reason: `Checkpoint is stale (${Math.round(age / 1000)}s old, max ${maxAgeMs / 1000}s)` };
    }

    const checkpoint: CheckpointRecord = {
      id: data.id,
      sessionId: data.session_id,
      nodeName: data.node_name,
      graphState: data.graph_state as GraphState,
      createdAt: data.created_at,
      status: data.status,
    };

    return { valid: true, checkpoint };
  } catch (err) {
    return { valid: false, reason: `Validation error: ${err}` };
  }
}

/**
 * Mark a checkpoint as completed
 */
export async function completeCheckpoint(
  supabase: any,
  checkpointId: string
): Promise<void> {
  try {
    await supabase
      .from('workflow_checkpoints')
      .update({ status: 'completed' })
      .eq('id', checkpointId);
  } catch {
    // Non-critical
  }
}

/**
 * Mark a checkpoint as failed
 */
export async function failCheckpoint(
  supabase: any,
  checkpointId: string
): Promise<void> {
  try {
    await supabase
      .from('workflow_checkpoints')
      .update({ status: 'failed' })
      .eq('id', checkpointId);
  } catch {
    // Non-critical
  }
}

// ---- Serialization helpers ----

/**
 * Prepare state for JSONB storage by truncating large fields
 */
function serializeState(state: GraphState): any {
  const s: any = { ...state };

  // Truncate large string fields
  if (s.generatedContent && s.generatedContent.length > 10000) {
    s.generatedContent = s.generatedContent.slice(0, 10000) + '\n...[truncated for checkpoint]';
  }

  if (s.researchData && typeof s.researchData === 'string' && s.researchData.length > 5000) {
    s.researchData = s.researchData.slice(0, 5000) + '\n...[truncated]';
  }

  // Trim node results to essential info
  if (s.nodeResults?.length) {
    s.nodeResults = s.nodeResults.map((nr: any) => ({
      nodeName: nr.nodeName,
      success: nr.success,
      durationMs: nr.durationMs,
      error: nr.error,
      // Drop stateUpdate and full content to save space
    }));
  }

  // Drop messages beyond last 10 for size
  if (s.messages?.length > 10) {
    s.messages = s.messages.slice(-10);
  }

  return s;
}
