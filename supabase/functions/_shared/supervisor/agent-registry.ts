// ============================================
// Agent Registry Stub (Legacy)
// Original registry was removed with supervisor.
// This stub preserves type compatibility for agent-base.ts
// ============================================

import { ToolDefinition } from "../tool-definitions.ts";

export interface AgentConfig {
  name: string;
  systemPrompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  tools?: string[];
  defaultModel?: string;
  maxTurns?: number;
  forceToolUse?: boolean;
  maxRetries?: number;
  timeoutMs?: number;
}

export function getAgentTools(_agentName: string, _tools?: string[]): ToolDefinition[] {
  return [];
}
