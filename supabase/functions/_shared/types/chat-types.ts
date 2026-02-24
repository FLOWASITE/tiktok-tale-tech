// ============================================
// Shared Types for Chat System
// ============================================

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  brandTemplateId?: string;
  contentGoal?: string;
  organizationId?: string;
  userId?: string;
  enableTools?: boolean;
  enableAgenticLoop?: boolean;
  enableSupervisor?: boolean; // Use multi-agent supervisor loop
  maxAgentTurns?: number;
  forceWebSearch?: boolean; // Force web search even without trending keywords
}

export interface RAGResult {
  content_type: string;
  content_id: string;
  content_text: string;
  similarity: number;
  metadata: Record<string, any>;
}

export interface BrandContext {
  brandName: string;
  brandPositioning?: string;
  toneOfVoice?: string[];
  industry?: string[];
  contentPillars?: Array<{ name: string; keywords: string[] }>;
  uniqueValueProposition?: string;
  targetAgeRange?: string;
  targetGender?: string;
  evergreenThemes?: string[];
  brandHashtags?: string[];
  mainCompetitors?: string[];
  industryTemplateId?: string;
  // Style Guide fields
  preferredWords?: string[];
  bannedWords?: string[];
  sentenceStyle?: 'short' | 'balanced' | 'long';
  emojiPolicy?: 'none' | 'minimal' | 'moderate';
}

export interface IndustryMemory {
  id: string;
  code: string;
  name: string;
  version: string;
  target_audience: string;
  compliance_rules: Array<string | { rule: string; level?: string }>;
  claim_restrictions: Array<string | { claim: string; reason?: string }>;
  forbidden_terms: string[];
  brand_voice: {
    tone_of_voice?: string[];
    formality_level?: string;
    language_style?: string[];
    allow_emoji?: boolean;
    cta_policy?: string;
  };
  channel_settings?: Record<string, { risk_level: string; notes?: string }>;
  metadata?: { applies_to?: string[]; legal_basis?: string[] };
  argument_patterns?: { valid_patterns?: string[]; forbidden_patterns?: string[] };
  system_rules?: string[];
  preferred_words?: string[];
  forbidden_words?: string[];
}

export interface GlossaryTerm {
  term: string;
  abbreviation: string | null;
  category: string;
  definition: string;
  example_usage: string | null;
  is_preferred: boolean;
  related_terms: string[];
}
