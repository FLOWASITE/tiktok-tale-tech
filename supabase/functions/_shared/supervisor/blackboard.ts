// ============================================
// Shared Blackboard
// Inter-agent communication via database
// With Versioning & Context Pruning
// ============================================

export interface BlackboardEntry {
  key: string;
  value: any;
  agentName: string;
  createdAt?: string;
  version?: number;
}

export interface BlackboardClient {
  write(key: string, value: any, agentName: string): Promise<void>;
  read(key: string): Promise<any | null>;
  readAll(): Promise<BlackboardEntry[]>;
  readByAgent(agentName: string): Promise<BlackboardEntry[]>;
  readHistory(key: string, limit?: number): Promise<BlackboardEntry[]>;
  prune(): Promise<void>;
}

const MAX_VERSIONS_PER_KEY = 3;
const MAX_CONTEXT_TOKENS = 3000;

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Create a blackboard client for a session
 * Uses in-memory store with versioning, persists to DB for durability
 */
export function createBlackboard(
  supabase: any,
  sessionId: string
): BlackboardClient {
  // Versioned in-memory store: key -> array of entries (newest last)
  const memoryStore = new Map<string, BlackboardEntry[]>();

  return {
    async write(key: string, value: any, agentName: string): Promise<void> {
      const versions = memoryStore.get(key) || [];
      const entry: BlackboardEntry = {
        key,
        value,
        agentName,
        createdAt: new Date().toISOString(),
        version: versions.length + 1,
      };
      
      versions.push(entry);
      
      // Keep only latest N versions
      if (versions.length > MAX_VERSIONS_PER_KEY) {
        versions.splice(0, versions.length - MAX_VERSIONS_PER_KEY);
      }
      
      memoryStore.set(key, versions);
      
      // Persist to DB (async, non-blocking)
      try {
        await supabase.from('agent_blackboard').insert({
          session_id: sessionId,
          agent_name: agentName,
          data_key: key,
          data_value: value,
        });
      } catch (err) {
        console.warn(`[Blackboard] DB write failed for key=${key}:`, err);
      }
    },

    async read(key: string): Promise<any | null> {
      // Check memory first - return latest version
      const versions = memoryStore.get(key);
      if (versions?.length) return versions[versions.length - 1].value;

      // Fallback to DB
      try {
        const { data } = await supabase
          .from('agent_blackboard')
          .select('data_value')
          .eq('session_id', sessionId)
          .eq('data_key', key)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        if (data) {
          const entry: BlackboardEntry = { key, value: data.data_value, agentName: 'db', version: 1 };
          memoryStore.set(key, [entry]);
          return data.data_value;
        }
      } catch {}
      
      return null;
    },

    async readAll(): Promise<BlackboardEntry[]> {
      // Return only latest version of each key
      const latest: BlackboardEntry[] = [];
      for (const versions of memoryStore.values()) {
        if (versions.length > 0) {
          latest.push(versions[versions.length - 1]);
        }
      }
      return latest;
    },

    async readByAgent(agentName: string): Promise<BlackboardEntry[]> {
      const all = await this.readAll();
      return all.filter(e => e.agentName === agentName);
    },

    async readHistory(key: string, limit: number = MAX_VERSIONS_PER_KEY): Promise<BlackboardEntry[]> {
      const versions = memoryStore.get(key) || [];
      return versions.slice(-limit);
    },

    async prune(): Promise<void> {
      // Calculate total token usage across all latest entries
      let totalTokens = 0;
      const entries: Array<{ key: string; tokens: number }> = [];

      for (const [key, versions] of memoryStore.entries()) {
        if (versions.length === 0) continue;
        const latest = versions[versions.length - 1];
        const valueStr = typeof latest.value === 'string'
          ? latest.value
          : JSON.stringify(latest.value);
        const tokens = estimateTokens(valueStr);
        totalTokens += tokens;
        entries.push({ key, tokens });
      }

      if (totalTokens <= MAX_CONTEXT_TOKENS) return;

      console.log(`[Blackboard] Pruning: ${totalTokens} tokens > ${MAX_CONTEXT_TOKENS} limit`);

      // Strategy: For each key with multiple versions, keep only latest
      // and summarize the value if it's too long
      for (const [key, versions] of memoryStore.entries()) {
        if (versions.length <= 1) continue;
        
        // Keep only the latest version
        const latest = versions[versions.length - 1];
        memoryStore.set(key, [latest]);
      }

      // If still over budget, truncate large values
      totalTokens = 0;
      for (const [, versions] of memoryStore.entries()) {
        if (versions.length === 0) continue;
        const latest = versions[versions.length - 1];
        const valueStr = typeof latest.value === 'string'
          ? latest.value
          : JSON.stringify(latest.value);
        totalTokens += estimateTokens(valueStr);
      }

      if (totalTokens > MAX_CONTEXT_TOKENS) {
        // Truncate non-critical keys (research_data, content_plan)
        const truncatePriority = ['research_data', 'content_plan', 'review_result'];
        for (const key of truncatePriority) {
          const versions = memoryStore.get(key);
          if (!versions?.length) continue;
          const latest = versions[versions.length - 1];
          const valueStr = typeof latest.value === 'string'
            ? latest.value
            : JSON.stringify(latest.value);
          
          if (estimateTokens(valueStr) > 500) {
            // Truncate to ~500 tokens
            const truncated = valueStr.slice(0, 2000) + '\n...[truncated for token budget]';
            latest.value = truncated;
            console.log(`[Blackboard] Truncated key=${key} from ${valueStr.length} to 2000 chars`);
          }
        }
      }
    },
  };
}

/**
 * Build context string from blackboard for injection into agent prompts
 * Only uses latest version of each key
 */
export function buildBlackboardContext(entries: BlackboardEntry[]): string {
  if (entries.length === 0) return '';

  const sections = entries.map(e => {
    const valueStr = typeof e.value === 'string' 
      ? e.value 
      : JSON.stringify(e.value, null, 2).slice(0, 1500);
    const versionLabel = e.version ? ` v${e.version}` : '';
    return `### ${e.key}${versionLabel} (from ${e.agentName})\n${valueStr}`;
  });

  return `\n## 📋 Context from Previous Agents\n${sections.join('\n\n')}`;
}
