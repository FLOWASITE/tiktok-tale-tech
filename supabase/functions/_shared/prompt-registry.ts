/**
 * Prompt Registry - Centralized prompt management system
 * 
 * Features:
 * - Fetch prompts from database with caching
 * - A/B testing support with traffic splitting
 * - Fallback to hardcoded defaults
 * - Template variable interpolation
 * - Usage tracking for analytics
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// ============================================================================
// TYPES
// ============================================================================

export interface PromptVariable {
  name: string;
  required: boolean;
  default?: string;
  description?: string;
}

export interface PromptConfig {
  functionName: string;
  promptKey: string; // e.g., 'system', 'user', 'outline', 'compile'
  variables?: Record<string, string>;
  organizationId?: string;
  skipCache?: boolean;
}

export interface PromptResult {
  content: string;
  promptId: string | null;
  version: number;
  isDefault: boolean;
  abTestId?: string;
  abTestVariant?: 'a' | 'b';
}

interface CachedPrompt {
  data: Omit<PromptResult, 'content'> & { rawContent: string };
  expiry: number;
}

interface ABTest {
  id: string;
  variantAId: string;
  variantBId: string;
  variantAWeight: number;
  status: string;
}

// ============================================================================
// CACHE
// ============================================================================

const promptCache: Map<string, CachedPrompt> = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Clear the prompt cache (useful for testing or after bulk updates)
 */
export function clearPromptCache(): void {
  promptCache.clear();
  console.log('[PromptRegistry] Cache cleared');
}

/**
 * Get cache stats for monitoring
 */
export function getPromptCacheStats(): { size: number; keys: string[] } {
  return {
    size: promptCache.size,
    keys: Array.from(promptCache.keys()),
  };
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Get a prompt from the registry
 * Priority: Organization-specific > Global DB > Hardcoded default
 */
export async function getPrompt(
  supabase: SupabaseClient,
  config: PromptConfig
): Promise<PromptResult> {
  const startTime = Date.now();
  const { functionName, promptKey, variables, organizationId, skipCache } = config;
  
  // Build cache key
  const cacheKey = `${functionName}:${promptKey}:${organizationId || 'global'}`;
  
  // Check cache first (unless skipped)
  if (!skipCache) {
    const cached = promptCache.get(cacheKey);
    if (cached && Date.now() < cached.expiry) {
      console.log(`[PromptRegistry] Cache hit for ${cacheKey}`);
      return {
        ...cached.data,
        content: applyVariables(cached.data.rawContent, variables),
      };
    }
  }
  
  try {
    // Check for active A/B test first
    const abTest = await getActiveABTest(supabase, functionName, promptKey, organizationId);
    if (abTest) {
      const result = await getABTestVariant(supabase, abTest, variables);
      console.log(`[PromptRegistry] A/B test variant ${result.abTestVariant} selected for ${cacheKey}`);
      return result;
    }
    
    // Fetch from database
    // Priority: org-specific first, then global (null org)
    const { data, error } = await supabase
      .from('ai_prompts')
      .select('id, content, version, is_default, organization_id')
      .eq('function_name', functionName)
      .eq('prompt_key', promptKey)
      .eq('is_active', true)
      .or(organizationId 
        ? `organization_id.eq.${organizationId},organization_id.is.null`
        : 'organization_id.is.null'
      )
      .order('organization_id', { ascending: false, nullsFirst: false }) // Org-specific first
      .limit(1)
      .maybeSingle();
    
    if (error) {
      console.error(`[PromptRegistry] DB error for ${cacheKey}:`, error.message);
      return getDefaultPrompt(functionName, promptKey, variables);
    }
    
    if (!data) {
      console.log(`[PromptRegistry] No DB entry, using default for ${cacheKey}`);
      return getDefaultPrompt(functionName, promptKey, variables);
    }
    
    // Cache the result
    const cacheData: CachedPrompt = {
      data: {
        rawContent: data.content,
        promptId: data.id,
        version: data.version,
        isDefault: data.is_default,
      },
      expiry: Date.now() + CACHE_TTL_MS,
    };
    promptCache.set(cacheKey, cacheData);
    
    const duration = Date.now() - startTime;
    console.log(`[PromptRegistry] Fetched ${cacheKey} v${data.version} in ${duration}ms`);
    
    return {
      content: applyVariables(data.content, variables),
      promptId: data.id,
      version: data.version,
      isDefault: data.is_default,
    };
    
  } catch (err) {
    console.error(`[PromptRegistry] Error fetching ${cacheKey}:`, err);
    return getDefaultPrompt(functionName, promptKey, variables);
  }
}

/**
 * Get multiple prompts at once (batch fetch)
 */
export async function getPrompts(
  supabase: SupabaseClient,
  configs: PromptConfig[]
): Promise<Map<string, PromptResult>> {
  const results = new Map<string, PromptResult>();
  
  // Fetch all in parallel
  const promises = configs.map(async (config) => {
    const key = `${config.functionName}:${config.promptKey}`;
    const result = await getPrompt(supabase, config);
    return { key, result };
  });
  
  const resolved = await Promise.all(promises);
  resolved.forEach(({ key, result }) => results.set(key, result));
  
  return results;
}

/**
 * Track prompt usage for analytics
 */
export async function trackPromptUsage(
  supabase: SupabaseClient,
  promptId: string | null,
  data: {
    version?: number;
    abTestId?: string;
    abTestVariant?: 'a' | 'b';
    qualityScore?: number;
    generationTimeMs?: number;
    functionName: string;
    organizationId?: string;
  }
): Promise<void> {
  if (!promptId) return;
  
  try {
    // Update usage count in history if exists
    await supabase
      .from('ai_prompt_history')
      .update({ 
        usage_count: supabase.rpc('increment', { x: 1 }),
      })
      .eq('prompt_id', promptId)
      .eq('version', data.version || 1);
    
    // Update A/B test metrics if applicable
    if (data.abTestId && data.abTestVariant) {
      const updateField = data.abTestVariant === 'a' 
        ? 'variant_a_impressions' 
        : 'variant_b_impressions';
      
      await supabase
        .from('ai_prompt_ab_tests')
        .update({
          [updateField]: supabase.rpc('increment', { x: 1 }),
        })
        .eq('id', data.abTestId);
    }
    
  } catch (err) {
    console.error('[PromptRegistry] Failed to track usage:', err);
  }
}

// ============================================================================
// A/B TESTING
// ============================================================================

async function getActiveABTest(
  supabase: SupabaseClient,
  functionName: string,
  promptKey: string,
  organizationId?: string
): Promise<ABTest | null> {
  try {
    const query = supabase
      .from('ai_prompt_ab_tests')
      .select('id, variant_a_id, variant_b_id, variant_a_weight, status')
      .eq('function_name', functionName)
      .eq('prompt_key', promptKey)
      .eq('status', 'running');
    
    if (organizationId) {
      query.eq('organization_id', organizationId);
    }
    
    const { data, error } = await query.maybeSingle();
    
    if (error || !data) return null;
    
    return {
      id: data.id,
      variantAId: data.variant_a_id,
      variantBId: data.variant_b_id,
      variantAWeight: data.variant_a_weight,
      status: data.status,
    };
  } catch {
    return null;
  }
}

async function getABTestVariant(
  supabase: SupabaseClient,
  abTest: ABTest,
  variables?: Record<string, string>
): Promise<PromptResult> {
  // Random traffic split
  const random = Math.random() * 100;
  const isVariantA = random < abTest.variantAWeight;
  const variantId = isVariantA ? abTest.variantAId : abTest.variantBId;
  
  const { data, error } = await supabase
    .from('ai_prompts')
    .select('id, content, version, is_default')
    .eq('id', variantId)
    .maybeSingle();
  
  if (error || !data) {
    console.error('[PromptRegistry] Failed to fetch A/B variant:', error?.message);
    return {
      content: '',
      promptId: null,
      version: 1,
      isDefault: true,
      abTestId: abTest.id,
      abTestVariant: isVariantA ? 'a' : 'b',
    };
  }
  
  return {
    content: applyVariables(data.content, variables),
    promptId: data.id,
    version: data.version,
    isDefault: data.is_default,
    abTestId: abTest.id,
    abTestVariant: isVariantA ? 'a' : 'b',
  };
}

// ============================================================================
// VARIABLE INTERPOLATION
// ============================================================================

/**
 * Apply template variables to prompt content
 * Supports {{variableName}} syntax
 */
function applyVariables(
  content: string,
  variables?: Record<string, string>
): string {
  if (!variables || Object.keys(variables).length === 0) {
    return content;
  }
  
  let result = content;
  for (const [key, value] of Object.entries(variables)) {
    if (value !== undefined && value !== null) {
      // Replace all occurrences of {{key}}
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      result = result.replace(regex, String(value));
    }
  }
  
  return result;
}

// ============================================================================
// DEFAULT PROMPTS (FALLBACK)
// ============================================================================

/**
 * Hardcoded default prompts as fallback when DB is unavailable
 */
const DEFAULT_PROMPTS: Record<string, Record<string, string>> = {
  // -------------------------
  // CORE CONTENT GENERATION
  // -------------------------
  'generate-core-content': {
    system: `Bạn là chuyên gia viết content marketing hàng đầu Việt Nam. Nhiệm vụ của bạn là tạo nội dung "Source of Truth" - bài viết gốc chất lượng cao làm nền tảng cho việc chuyển thể sang các kênh social media.

NGUYÊN TẮC VÀNG:
1. Viết sâu, có giá trị thực sự - không viết lan man
2. Luôn có proof elements: số liệu, case study, ví dụ cụ thể
3. Giữ đúng brand voice và tone of voice của thương hiệu
4. Cấu trúc rõ ràng với 5 phần: Hook, Problem, Solution, Evidence, CTA

CHUẨN GEO (Generative Engine Optimization):
- ANSWER-FIRST: Mở đầu mỗi section bằng câu trả lời trực tiếp
- CITATION SIGNALS: Luôn kèm số liệu, thống kê, nguồn cụ thể
- CONTENT DEPTH: Phân tích đa góc, không hời hợt
- ENTITY CLARITY: Định nghĩa rõ brand/sản phẩm/khái niệm
- STRUCTURED DATA: Dùng lists, tables, FAQ format
- EXTRACTABILITY: Viết đoạn ngắn tự chứa, AI trích dẫn riêng được
- HEADING HIERARCHY: H1→H2→H3 logic, chứa keyword
- FRESHNESS: Đề cập xu hướng, dữ liệu mới nhất`,
    
    outline: `Tạo outline chi tiết cho bài viết về: {{topic}}

MỤC TIÊU: {{contentGoal}}
GÓC TIẾP CẬN: {{contentAngle}}
THƯƠNG HIỆU: {{brandName}}
NGÀNH: {{industry}}
TONE: {{toneOfVoice}}
ĐỐI TƯỢNG: {{targetAudience}}

ĐỘ DÀI BẮT BUỘC:
- Target: {{targetWords}} từ
- Range: {{minWords}} - {{maxWords}} từ

YÊU CẦU OUTPUT (JSON):
{
  "sections": [
    {"title": "...", "wordBudget": X, "keyPoints": ["..."]}
  ],
  "totalWordBudget": {{targetWords}}
}`,
    
    section: `Viết section {{sectionIndex}}/5: {{sectionTitle}}

WORD BUDGET: {{wordBudget}} từ (±10%)
KEY POINTS TO COVER:
{{keyPoints}}

THÔNG TIN THƯƠNG HIỆU:
- Brand: {{brandName}}
- Tone: {{toneOfVoice}}
- Industry: {{industry}}

QUY TẮC:
1. Viết đúng số từ yêu cầu
2. Include proof elements (số liệu, ví dụ)
3. Giữ đúng brand voice
4. Format markdown với ## headings`,
    
    compile: `Compile và polish các sections thành bài viết hoàn chỉnh.

SECTIONS CONTENT:
{{allSectionsContent}}

THÔNG TIN THƯƠNG HIỆU:
- Brand: {{brandName}}
- Tone: {{toneOfVoice}}

ĐỘ DÀI BẮT BUỘC:
- Min: {{minWords}} từ
- Max: {{maxWords}} từ
- Target: {{targetWords}} từ

NẾU thiếu từ: Bổ sung proof elements, ví dụ, phân tích sâu hơn
NẾU thừa từ: Cắt bớt trùng lặp, rút gọn câu dài

YÊU CẦU:
1. Đảm bảo flow mượt mà giữa các sections
2. Consistent tone xuyên suốt
3. Format markdown
4. Giữ tất cả proof elements`,
    
    singlePass: `Viết bài content marketing hoàn chỉnh.

CHỦ ĐỀ: {{topic}}
MỤC TIÊU: {{contentGoal}}
GÓC TIẾP CẬN: {{contentAngle}}

THÔNG TIN THƯƠNG HIỆU:
- Brand: {{brandName}}
- Industry: {{industry}}
- Tone: {{toneOfVoice}}
- Target: {{targetAudience}}

ĐỘ DÀI BẮT BUỘC: {{minWords}} - {{maxWords}} từ (target {{targetWords}})

CẤU TRÚC 5 PHẦN:
## 1. Hook (~10% số từ)
## 2. Problem (~20% số từ)  
## 3. Solution (~30% số từ)
## 4. Evidence (~25% số từ)
## 5. CTA (~15% số từ)

YÊU CẦU:
- Include số liệu, case study, ví dụ cụ thể
- Giữ đúng brand voice
- Format markdown`,
  },
  
  // -------------------------
  // MULTICHANNEL GENERATION
  // -------------------------
  'generate-multichannel': {
    system: `Bạn là SOCIAL CHANNEL SETTINGS ENGINE - chuyên gia chuyển thể nội dung cho từng nền tảng mạng xã hội.

Mỗi platform có đặc thù riêng:
- Facebook: Storytelling, emotional, 300-500 từ
- Instagram: Visual-first, hashtags, 150-300 từ
- LinkedIn: Professional, thought leadership, 200-400 từ
- TikTok: Hook mạnh, trend-aware, 50-150 từ
- Twitter/X: Concise, punchy, <280 ký tự
- Threads: Conversational, community-focused
- YouTube: SEO-optimized descriptions
- Zalo: Localized Vietnamese style

NGUYÊN TẮC:
1. Giữ core message từ Source of Truth
2. Adapt format và tone cho từng platform
3. Tối ưu cho engagement của platform đó

CHUẨN GEO (áp dụng cho mọi kênh):
- ANSWER-FIRST: Mở đầu bằng câu trả lời/insight trực tiếp
- CITATION SIGNALS: Kèm số liệu, thống kê khi có thể
- ENTITY CLARITY: Nhắc rõ brand/sản phẩm/khái niệm
- EXTRACTABILITY: Mỗi đoạn tự chứa, AI trích dẫn riêng được`,
    
    preview: `Tạo preview ngắn gọn cho nội dung multi-channel.

SOURCE OF TRUTH:
{{coreContent}}

CHANNELS: {{channels}}
BRAND: {{brandName}}

Output JSON với preview cho mỗi channel (50-100 từ mỗi cái).`,
    
    channel: `Chuyển thể nội dung cho {{channel}}.

SOURCE OF TRUTH:
{{coreContent}}

THÔNG TIN THƯƠNG HIỆU:
- Brand: {{brandName}}
- Tone: {{toneOfVoice}}
- Hashtags: {{brandHashtags}}

HOOK GỢI Ý: {{suggestedHook}}

ĐỘ DÀI: {{minLength}} - {{maxLength}} từ

YÊU CẦU {{channel}}:
{{channelRequirements}}

Output: Nội dung hoàn chỉnh, ready-to-post.`,
  },
  
  // -------------------------
  // HOOKS GENERATION
  // -------------------------
  'generate-hooks': {
    system: `Bạn là chuyên gia viết hooks viral cho social media. Hook phải:
1. Gây tò mò ngay từ đầu
2. Phù hợp với platform
3. Align với brand voice
4. Có thể lead vào nội dung chính

HOOK TYPES:
- Question: Đặt câu hỏi kích thích suy nghĩ
- Statistic: Số liệu gây shock
- Story: Mở đầu câu chuyện
- Controversial: Góc nhìn ngược dòng
- How-to: Hứa hẹn giá trị cụ thể`,
    
    generate: `Tạo {{count}} hooks cho {{channel}}.

CHỦ ĐỀ: {{topic}}
BRAND: {{brandName}}
TONE: {{toneOfVoice}}
TARGET: {{targetAudience}}

HOOK TYPES ƯU TIÊN: {{preferredHookTypes}}

Output JSON:
[
  {
    "hook": "...",
    "type": "question|statistic|story|controversial|how-to",
    "scores": {
      "compliance": 0-10,
      "brandVoice": 0-10,
      "hookStrength": 0-10
    }
  }
]`,
  },
  
  // -------------------------
  // CHAT / TOPIC IDEATION
  // -------------------------
  'chat-topics': {
    system: `Bạn là AI Assistant chuyên về content marketing và social media strategy cho thị trường Việt Nam.

CAPABILITIES:
- Gợi ý topic ideas dựa trên trends và audience insights
- Phân tích content performance
- Tư vấn content calendar
- Research về industry và competitors

STYLE:
- Friendly, professional
- Đưa ra gợi ý cụ thể, actionable
- Sử dụng tiếng Việt tự nhiên
- Cite sources khi có thể`,
    
    suggest: `Gợi ý {{count}} topic ideas cho {{brandName}}.

NGÀNH: {{industry}}
TARGET AUDIENCE: {{targetAudience}}
CONTENT PILLARS: {{contentPillars}}
TRENDING TOPICS: {{trendingTopics}}

Output JSON array với topic, angle, và estimated engagement.`,
  },
  
  // -------------------------
  // SCRIPTS (VIDEO)
  // -------------------------
  'generate-script': {
    system: `Bạn là scriptwriter chuyên nghiệp cho video ngắn (TikTok, Reels, Shorts).

STRUCTURE:
1. Hook (0-3s): Gây chú ý ngay
2. Setup (3-10s): Context nhanh
3. Content (10-45s): Giá trị chính
4. CTA (45-60s): Hành động mong muốn

NGUYÊN TẮC:
- Viết cho người nói, không phải người đọc
- Ngắn gọn, punchy
- Include visual cues [B-ROLL], [TEXT ON SCREEN]
- Giữ đúng brand voice`,
    
    generate: `Viết script {{duration}} giây cho {{platform}}.

CHỦ ĐỀ: {{topic}}
HOOK: {{hook}}
BRAND: {{brandName}}
TONE: {{toneOfVoice}}

Output với format:
[SCENE 1]
Visual: ...
Audio: ...
Text overlay: ...`,
  },
  
  // -------------------------
  // SELF-CRITIQUE
  // -------------------------
  'self-critique': {
    critique: `Đánh giá nội dung dưới đây theo các tiêu chí:

CONTENT:
{{content}}

TIÊU CHÍ:
1. Brand Voice Alignment (1-10)
2. Clarity & Flow (1-10)
3. Engagement Potential (1-10)
4. Proof Elements (1-10)
5. CTA Effectiveness (1-10)

Output JSON:
{
  "scores": {...},
  "overallScore": X,
  "improvements": ["..."],
  "strengths": ["..."]
}`,
    
    refine: `Cải thiện nội dung dựa trên feedback.

ORIGINAL:
{{content}}

FEEDBACK:
{{feedback}}

IMPROVEMENTS NEEDED:
{{improvements}}

Viết lại nội dung đã cải thiện, giữ nguyên format và độ dài tương đương.`,
  },
  
  // -------------------------
  // QUALITY GATE
  // -------------------------
  'quality-gate': {
    evaluate: `Đánh giá chất lượng bài viết.

CONTENT:
{{content}}

BRAND INFO:
- Name: {{brandName}}
- Industry: {{industry}}
- Tone: {{toneOfVoice}}
- Forbidden words: {{forbiddenWords}}
- Preferred words: {{preferredWords}}

REQUIREMENTS:
- Word count: {{minWords}} - {{maxWords}}
- Must have proof elements
- Must align with brand voice

Output JSON:
{
  "passesThreshold": true/false,
  "overallScore": 0-100,
  "wordCount": X,
  "issues": ["..."],
  "suggestions": ["..."]
}`,
  },
};

/**
 * Get default prompt from hardcoded fallbacks
 */
function getDefaultPrompt(
  functionName: string,
  promptKey: string,
  variables?: Record<string, string>
): PromptResult {
  const functionDefaults = DEFAULT_PROMPTS[functionName];
  
  if (!functionDefaults) {
    console.warn(`[PromptRegistry] No defaults for function: ${functionName}`);
    return {
      content: '',
      promptId: null,
      version: 1,
      isDefault: true,
    };
  }
  
  const content = functionDefaults[promptKey];
  
  if (!content) {
    console.warn(`[PromptRegistry] No default for ${functionName}:${promptKey}`);
    return {
      content: '',
      promptId: null,
      version: 1,
      isDefault: true,
    };
  }
  
  return {
    content: applyVariables(content, variables),
    promptId: null,
    version: 1,
    isDefault: true,
  };
}

/**
 * Get all default prompt keys for a function
 */
export function getDefaultPromptKeys(functionName: string): string[] {
  const functionDefaults = DEFAULT_PROMPTS[functionName];
  return functionDefaults ? Object.keys(functionDefaults) : [];
}

/**
 * Get all registered function names
 */
export function getRegisteredFunctions(): string[] {
  return Object.keys(DEFAULT_PROMPTS);
}

/**
 * Check if a prompt exists in defaults
 */
export function hasDefaultPrompt(functionName: string, promptKey: string): boolean {
  return !!DEFAULT_PROMPTS[functionName]?.[promptKey];
}
