// ============================================
// Blackboard Stub (Legacy)
// Original blackboard was removed with supervisor.
// This stub preserves type compatibility for agent-base.ts
// ============================================

export interface BlackboardEntry {
  key: string;
  value: any;
  agent: string;
  timestamp: number;
}

export class BlackboardClient {
  constructor(_sessionId: string, _supabase: any) {}
  async readAll(): Promise<BlackboardEntry[]> { return []; }
  async write(_key: string, _value: any, _agent: string): Promise<void> {}
}

export function buildBlackboardContext(_entries: BlackboardEntry[]): string {
  return '';
}
