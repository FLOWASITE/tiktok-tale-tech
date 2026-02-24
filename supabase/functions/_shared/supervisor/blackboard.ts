// ============================================
// Shared Blackboard
// Inter-agent communication via database
// ============================================

export interface BlackboardEntry {
  key: string;
  value: any;
  agentName: string;
  createdAt?: string;
}

export interface BlackboardClient {
  write(key: string, value: any, agentName: string): Promise<void>;
  read(key: string): Promise<any | null>;
  readAll(): Promise<BlackboardEntry[]>;
  readByAgent(agentName: string): Promise<BlackboardEntry[]>;
}

/**
 * Create a blackboard client for a session
 * Uses in-memory store for speed, persists to DB for durability
 */
export function createBlackboard(
  supabase: any,
  sessionId: string
): BlackboardClient {
  // In-memory cache for fast read/write within same request
  const memoryStore = new Map<string, BlackboardEntry>();

  return {
    async write(key: string, value: any, agentName: string): Promise<void> {
      const entry: BlackboardEntry = {
        key,
        value,
        agentName,
        createdAt: new Date().toISOString(),
      };
      
      // Write to memory first (fast path)
      memoryStore.set(key, entry);
      
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
      // Check memory first
      const cached = memoryStore.get(key);
      if (cached) return cached.value;

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
          memoryStore.set(key, { key, value: data.data_value, agentName: 'db' });
          return data.data_value;
        }
      } catch {}
      
      return null;
    },

    async readAll(): Promise<BlackboardEntry[]> {
      return Array.from(memoryStore.values());
    },

    async readByAgent(agentName: string): Promise<BlackboardEntry[]> {
      return Array.from(memoryStore.values())
        .filter(e => e.agentName === agentName);
    },
  };
}

/**
 * Build context string from blackboard for injection into agent prompts
 */
export function buildBlackboardContext(entries: BlackboardEntry[]): string {
  if (entries.length === 0) return '';

  const sections = entries.map(e => {
    const valueStr = typeof e.value === 'string' 
      ? e.value 
      : JSON.stringify(e.value, null, 2).slice(0, 500);
    return `### ${e.key} (from ${e.agentName})\n${valueStr}`;
  });

  return `\n## 📋 Context from Previous Agents\n${sections.join('\n\n')}`;
}
