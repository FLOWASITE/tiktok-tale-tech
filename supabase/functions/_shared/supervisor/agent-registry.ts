// ============================================
// Agent Registry
// Declares specialized agents with metadata
// ============================================

import { ToolDefinition, CHAT_TOOLS } from "../tool-definitions.ts";

export interface AgentConfig {
  name: string;
  description: string;
  tools: string[]; // Tool names from CHAT_TOOLS
  defaultModel: string;
  systemPromptKey: string;
  maxTurns: number;
  timeoutMs: number;
  maxRetries: number;
  priority: number; // Lower = higher priority
  tokenBudget: number; // Max tokens for this agent
  forceToolUse?: boolean; // Force tool call on first turn
}

// Registry of all specialized agents
const AGENT_REGISTRY: Map<string, AgentConfig> = new Map();

// ============================================
// Default Agent Configurations
// ============================================

const DEFAULT_AGENTS: AgentConfig[] = [
  {
    name: 'research-agent',
    description: 'Collects data, trends, competitor info from web and database',
    tools: ['web_search', 'search_topics'],
    defaultModel: 'google/gemini-2.5-flash',
    systemPromptKey: 'research-agent',
    maxTurns: 2,
    timeoutMs: 15000,
    maxRetries: 2,
    priority: 1,
    tokenBudget: 2000,
  },
  {
    name: 'strategy-agent',
    description: 'Plans content calendars, strategies, analyzes gaps',
    tools: ['start_planning_session', 'generate_plan_draft', 'refine_plan', 'finalize_plan', 'get_active_session'],
    defaultModel: 'google/gemini-2.5-flash',
    systemPromptKey: 'strategy-agent',
    maxTurns: 3,
    timeoutMs: 10000,
    maxRetries: 2,
    priority: 2,
    tokenBudget: 2000,
  },
  {
    name: 'content-agent',
    description: 'Generates content: scripts, carousels, multichannel posts',
    tools: ['generate_script', 'generate_carousel', 'generate_multichannel', 'save_topic'],
    defaultModel: 'google/gemini-2.5-flash',
    systemPromptKey: 'content-agent',
    maxTurns: 3,
    timeoutMs: 60000,
    maxRetries: 2,
    priority: 3,
    tokenBudget: 8000,
    forceToolUse: true,
  },
  {
    name: 'reviewer-agent',
    description: 'Reviews content for compliance, quality, and brand consistency',
    tools: ['brand_voice_check', 'legal_compliance_check', 'platform_best_practices'],
    defaultModel: 'google/gemini-2.5-flash',
    systemPromptKey: 'reviewer-agent',
    maxTurns: 2,
    timeoutMs: 15000,
    maxRetries: 2,
    priority: 4,
    tokenBudget: 2000,
  },
  {
    name: 'brand-memory-agent',
    description: 'Manages and auto-updates Brand Profile based on user interactions',
    tools: [], // Uses direct DB operations, not chat tools
    defaultModel: 'google/gemini-2.5-flash-lite',
    systemPromptKey: 'brand-memory-agent',
    maxTurns: 1,
    timeoutMs: 10000,
    maxRetries: 1,
    priority: 0, // Highest priority but runs async
    tokenBudget: 1000,
  },
  {
    name: 'image-agent',
    description: 'Generates and edits images for content using AI models',
    tools: ['generate_image', 'edit_image'],
    defaultModel: 'google/gemini-2.5-flash',
    systemPromptKey: 'image-agent',
    maxTurns: 3,
    timeoutMs: 120000,
    maxRetries: 2,
    priority: 3,
    tokenBudget: 2000,
  },
];

// Initialize registry with defaults
for (const agent of DEFAULT_AGENTS) {
  AGENT_REGISTRY.set(agent.name, agent);
}

// ============================================
// Public API
// ============================================

/**
 * Get agent config by name
 */
export function getAgent(name: string): AgentConfig | undefined {
  return AGENT_REGISTRY.get(name);
}

/**
 * Get all registered agents
 */
export function getAllAgents(): AgentConfig[] {
  return Array.from(AGENT_REGISTRY.values());
}

/**
 * Register or update an agent at runtime
 */
export function registerAgent(config: AgentConfig): void {
  AGENT_REGISTRY.set(config.name, config);
  console.log(`[AgentRegistry] Registered agent: ${config.name}`);
}

/**
 * Get tool definitions for a specific agent
 */
export function getAgentTools(agentName: string): ToolDefinition[] {
  const agent = AGENT_REGISTRY.get(agentName);
  if (!agent) return [];
  
  return CHAT_TOOLS.filter(tool => 
    agent.tools.includes(tool.function.name)
  );
}

/**
 * Get total token budget for a list of agents
 */
export function getTotalTokenBudget(agentNames: string[]): number {
  return agentNames.reduce((sum, name) => {
    const agent = AGENT_REGISTRY.get(name);
    return sum + (agent?.tokenBudget || 0);
  }, 0);
}

/**
 * Get agents sorted by priority
 */
export function getAgentsByPriority(): AgentConfig[] {
  return Array.from(AGENT_REGISTRY.values())
    .sort((a, b) => a.priority - b.priority);
}
