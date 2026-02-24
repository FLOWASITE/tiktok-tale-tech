// ============================================
// Brand Memory Agent
// Dedicated agent for managing Brand Profile
// Runs asynchronously (non-blocking) after interactions
// ============================================

import { saveBrandMemory, searchBrandMemory } from "../supervisor/brand-memory.ts";
import { callAI } from "../ai-provider.ts";
import { streamToText } from "../stream-utils.ts";

export interface BrandMemoryAgentInput {
  supabase: any;
  brandTemplateId: string;
  organizationId: string;
  sessionId: string;
  /** The user message that triggered this */
  userMessage: string;
  /** Generated content from this session */
  generatedContent?: string;
  /** User edits from this session */
  userEdits?: Array<{ original: string; edited: string }>;
  /** Number of brand-related changes detected */
  brandChangeCount?: number;
}

interface BrandUpdate {
  action: 'update_voice' | 'add_term' | 'remove_term' | 'update_style';
  field: string;
  value: string;
  reason: string;
  confidence: number;
}

/**
 * Run Brand Memory Agent asynchronously
 * Triggered when user frequently modifies brand-related content
 */
export async function runBrandMemoryAgent(
  input: BrandMemoryAgentInput
): Promise<void> {
  const { supabase, brandTemplateId, organizationId } = input;

  // Only run when there's enough signal (>= 2 brand changes)
  if ((input.brandChangeCount || 0) < 2 && !input.userEdits?.length) {
    return;
  }

  try {
    console.log(`[BrandMemoryAgent] Analyzing brand patterns for ${brandTemplateId}`);

    // 1. Fetch current brand template
    const { data: brand, error: brandError } = await supabase
      .from('brand_templates')
      .select('brand_name, tone_of_voice, preferred_words, forbidden_words, language_style, formality_level, brand_positioning')
      .eq('id', brandTemplateId)
      .single();

    if (brandError || !brand) {
      console.warn('[BrandMemoryAgent] Could not fetch brand template:', brandError);
      return;
    }

    // 2. Fetch recent brand memories for context
    let recentMemories: string[] = [];
    try {
      const memories = await searchBrandMemory(
        supabase,
        brandTemplateId,
        input.userMessage,
        ['correction', 'style_preference', 'learned_rule'],
        10
      );
      recentMemories = memories.map(m => `[${m.memoryType}] ${m.content}`);
    } catch {}

    // 3. Build context for LLM analysis
    const editsContext = input.userEdits?.length
      ? input.userEdits.map(e => `Changed: "${e.original.slice(0, 150)}" → "${e.edited.slice(0, 150)}"`).join('\n')
      : 'No explicit edits this session.';

    const brandContext = `
Brand: ${brand.brand_name}
Tone: ${brand.tone_of_voice || 'Not set'}
Style: ${brand.language_style || 'Not set'}
Formality: ${brand.formality_level || 'Not set'}
Preferred words: ${(brand.preferred_words || []).join(', ') || 'None'}
Forbidden words: ${(brand.forbidden_words || []).join(', ') || 'None'}
Positioning: ${brand.brand_positioning || 'Not set'}
`.trim();

    const memoriesContext = recentMemories.length > 0
      ? `\nRecent learnings:\n${recentMemories.join('\n')}`
      : '';

    // 4. Ask LLM to suggest brand profile updates
    const result = await callAI({
      functionName: 'brand-memory-agent',
      organizationId,
      messages: [
        {
          role: 'system',
          content: `You are a Brand Profile Manager. Analyze user behavior and suggest specific brand profile updates.

Output JSON array of updates (max 3):
[{
  "action": "update_voice|add_term|remove_term|update_style",
  "field": "tone_of_voice|preferred_words|forbidden_words|language_style|formality_level",
  "value": "the new/updated value",
  "reason": "why this update is needed based on user behavior",
  "confidence": 0.5-0.95
}]

Rules:
- Only suggest updates with confidence >= 0.6
- Prefer incremental changes over drastic rewrites
- If no updates needed, return empty array []
- Focus on patterns, not one-time changes`,
        },
        {
          role: 'user',
          content: `Current Brand Profile:\n${brandContext}\n${memoriesContext}\n\nUser edits this session:\n${editsContext}\n\nUser request: ${input.userMessage.slice(0, 300)}`,
        },
      ],
      modelOverride: 'google/gemini-2.5-flash-lite',
      temperatureOverride: 0.2,
    });

    if (!result.success || !result.data) return;

    const text = await streamToText(result.data);
    let updates: BrandUpdate[] = [];
    try {
      updates = JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim());
      if (!Array.isArray(updates)) updates = [];
    } catch {
      return;
    }

    // 5. Apply updates
    for (const update of updates.filter(u => u.confidence >= 0.6).slice(0, 3)) {
      await applyBrandUpdate(supabase, brandTemplateId, organizationId, brand, update);
    }

    if (updates.length > 0) {
      console.log(`[BrandMemoryAgent] Applied ${updates.length} brand updates for ${brand.brand_name}`);
    }
  } catch (err) {
    console.warn('[BrandMemoryAgent] Error:', err);
  }
}

/**
 * Apply a single brand profile update
 */
async function applyBrandUpdate(
  supabase: any,
  brandTemplateId: string,
  organizationId: string,
  currentBrand: any,
  update: BrandUpdate
): Promise<void> {
  try {
    switch (update.action) {
      case 'add_term': {
        if (update.field === 'preferred_words') {
          const current = currentBrand.preferred_words || [];
          if (!current.includes(update.value)) {
            await supabase
              .from('brand_templates')
              .update({ preferred_words: [...current, update.value] })
              .eq('id', brandTemplateId);
          }
        } else if (update.field === 'forbidden_words') {
          const current = currentBrand.forbidden_words || [];
          if (!current.includes(update.value)) {
            await supabase
              .from('brand_templates')
              .update({ forbidden_words: [...current, update.value] })
              .eq('id', brandTemplateId);
          }
        }
        break;
      }

      case 'remove_term': {
        if (update.field === 'preferred_words') {
          const current = (currentBrand.preferred_words || []).filter((w: string) => w !== update.value);
          await supabase
            .from('brand_templates')
            .update({ preferred_words: current })
            .eq('id', brandTemplateId);
        } else if (update.field === 'forbidden_words') {
          const current = (currentBrand.forbidden_words || []).filter((w: string) => w !== update.value);
          await supabase
            .from('brand_templates')
            .update({ forbidden_words: current })
            .eq('id', brandTemplateId);
        }
        break;
      }

      case 'update_voice':
      case 'update_style': {
        const allowedFields = ['tone_of_voice', 'language_style', 'formality_level'];
        if (allowedFields.includes(update.field)) {
          await supabase
            .from('brand_templates')
            .update({ [update.field]: update.value })
            .eq('id', brandTemplateId);
        }
        break;
      }
    }

    // Save the update as a brand memory entry for audit trail
    await saveBrandMemory(
      supabase,
      brandTemplateId,
      organizationId,
      'brand_update',
      `${update.action}: ${update.field} = "${update.value}" (reason: ${update.reason})`,
      'brand_memory_agent',
      update.confidence
    );
  } catch (err) {
    console.warn(`[BrandMemoryAgent] Failed to apply update ${update.action}:`, err);
  }
}
