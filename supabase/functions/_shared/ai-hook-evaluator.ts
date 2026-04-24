// ============================================
// AI-Powered Hook Evaluator
// Combines regex patterns with AI evaluation for hook quality
// ============================================

import { callAI } from './ai-provider.ts';
import { HOOK_CRITERIA } from './critique-criteria.ts';
import { isCircuitOpen } from './circuit-breaker.ts';

const HOOK_EVAL_MODEL = 'google/gemini-2.5-flash-lite';

export interface HookScore {
  overall: number;          // 1-10
  curiosity: number;        // 1-10 - Does it create curiosity?
  scrollStop: number;       // 1-10 - Will it stop scrolling?
  platformFit: number;      // 1-10 - Fits the platform?
  emotion: number;          // 1-10 - Triggers emotion?
  suggestion?: string;      // Improvement suggestion
  pattern?: string;         // Detected pattern type
}

export interface HookEvaluation {
  regexScore: number;       // Score from regex patterns (0-18)
  aiScore?: HookScore;      // Score from AI evaluation
  combinedScore: number;    // Final combined score (0-18)
  issues: string[];
  strengths: string[];
}

// AI evaluation is expensive, only use for borderline cases
const AI_EVAL_THRESHOLD = 8; // Only call AI if regex score < 8/18

/**
 * Evaluate hook using regex patterns only (fast, free)
 */
export function evaluateHookWithRegex(
  text: string,
  channel?: string
): { score: number; issues: string[]; strengths: string[]; patterns: string[] } {
  let score = 0;
  const issues: string[] = [];
  const strengths: string[] = [];
  const patterns: string[] = [];
  
  // Get first line/hook
  const firstLine = text.split('\n')[0] || text.slice(0, 100);
  
  // Check positive patterns
  for (const [name, config] of Object.entries(HOOK_CRITERIA.patterns)) {
    if (config.regex.test(firstLine)) {
      score += config.score;
      strengths.push(config.description);
      patterns.push(name);
    }
  }
  
  // Check anti-patterns
  for (const antiPattern of HOOK_CRITERIA.antiPatterns) {
    if (antiPattern.pattern.test(firstLine)) {
      score += antiPattern.penalty; // Negative value
      issues.push(antiPattern.reason);
    }
  }
  
  // Check channel-specific rules
  if (channel && HOOK_CRITERIA.channelRules[channel as keyof typeof HOOK_CRITERIA.channelRules]) {
    const rules = HOOK_CRITERIA.channelRules[channel as keyof typeof HOOK_CRITERIA.channelRules];
    
    if (firstLine.length < rules.minHookLength) {
      issues.push(`Hook quá ngắn cho ${channel} (min: ${rules.minHookLength} ký tự)`);
      score -= 1;
    }
    if (firstLine.length > rules.maxHookLength) {
      issues.push(`Hook quá dài cho ${channel} (max: ${rules.maxHookLength} ký tự)`);
      score -= 1;
    }
    
    // Check emoji requirement
    const hasEmoji = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{2600}-\u{26FF}]/u.test(firstLine);
    if (rules.requireEmoji && !hasEmoji) {
      issues.push(`${channel} cần emoji trong hook`);
      score -= 1;
    }
  }
  
  // Normalize score to 0-18 range
  score = Math.max(0, Math.min(18, score));
  
  return { score, issues, strengths, patterns };
}

/**
 * Evaluate hook using AI (slower, costs tokens)
 * Only called when regex score is low
 */
export async function evaluateHookWithAI(
  hook: string,
  channel: string,
  brandVoice?: string,
  organizationId?: string
): Promise<HookScore | null> {
  const prompt = `Đánh giá hook/câu mở đầu này cho kênh ${channel} (thang 1-10):

Hook: "${hook}"
${brandVoice ? `Brand voice: ${brandVoice}` : ''}

Tiêu chí:
1. **Curiosity** (1-10): Hook có tạo tò mò không? Người đọc có muốn đọc tiếp?
2. **Scroll-stopping** (1-10): Hook có mạnh đến mức dừng scroll không?
3. **Platform Fit** (1-10): Phù hợp ${channel}? (độ dài, tone, emoji)
4. **Emotion** (1-10): Có trigger cảm xúc (tò mò, sợ bỏ lỡ, hứng thú)?
5. **Overall** (1-10): Điểm tổng thể

Trả về JSON:
{
  "curiosity": 1-10,
  "scrollStop": 1-10,
  "platformFit": 1-10,
  "emotion": 1-10,
  "overall": 1-10,
  "pattern": "number_hook|question_hook|story_hook|pain_point|generic",
  "suggestion": "Gợi ý cải thiện nếu overall < 7"
}

CHỈ TRẢ VỀ JSON.`;

  // Short-circuit if breaker is OPEN for this model — avoids spamming Lovable Gateway
  // with 402 (out of credits) calls when we already know it will fail.
  try {
    if (await isCircuitOpen(HOOK_EVAL_MODEL)) {
      return null;
    }
  } catch {
    // breaker check is best-effort; if it errors, proceed normally
  }

  try {
    const result = await callAI({
      functionName: 'evaluate-hook',
      organizationId,
      messages: [
        { role: 'system', content: 'Bạn là chuyên gia đánh giá hook/headline cho social media. Đánh giá nghiêm khắc và thực tế.' },
        { role: 'user', content: prompt },
      ],
      modelOverride: HOOK_EVAL_MODEL, // Fast, cheap
    });

    if (result.success && result.data?.choices?.[0]?.message?.content) {
      const content = result.data.choices[0].message.content;
      // Parse JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as HookScore;
      }
    }
  } catch (error) {
    console.error('AI hook evaluation error:', error);
  }

  return null;
}

/**
 * Combined hook evaluation - regex first, AI for borderline cases
 */
export async function evaluateHook(
  text: string,
  channel: string,
  options?: {
    brandVoice?: string;
    organizationId?: string;
    forceAI?: boolean;
  }
): Promise<HookEvaluation> {
  // Step 1: Always run regex evaluation (fast, free)
  const regexResult = evaluateHookWithRegex(text, channel);
  
  // Step 2: Decide if AI evaluation is needed
  const needsAI = options?.forceAI || regexResult.score < AI_EVAL_THRESHOLD;
  
  let aiScore: HookScore | undefined;
  let combinedScore = regexResult.score;
  
  if (needsAI) {
    try {
      const aiResult = await evaluateHookWithAI(
        text.split('\n')[0] || text.slice(0, 100),
        channel,
        options?.brandVoice,
        options?.organizationId
      );
      
      if (aiResult) {
        aiScore = aiResult;
        
        // Combine scores: 40% regex, 60% AI (when AI is used)
        const aiNormalized = (aiResult.overall / 10) * 18; // Normalize to 0-18
        combinedScore = Math.round(regexResult.score * 0.4 + aiNormalized * 0.6);
        
        // Add AI suggestion to issues if score is low
        if (aiResult.suggestion && aiResult.overall < 7) {
          regexResult.issues.push(`AI: ${aiResult.suggestion}`);
        }
      }
    } catch (error) {
      console.error('AI hook evaluation failed, using regex only:', error);
    }
  }
  
  return {
    regexScore: regexResult.score,
    aiScore,
    combinedScore: Math.max(0, Math.min(18, combinedScore)),
    issues: regexResult.issues,
    strengths: regexResult.strengths,
  };
}

/**
 * Batch evaluate hooks for multiple channels
 */
export async function evaluateMultiChannelHooks(
  channelContents: Record<string, string>,
  options?: {
    brandVoice?: string;
    organizationId?: string;
  }
): Promise<Record<string, HookEvaluation>> {
  const results: Record<string, HookEvaluation> = {};
  
  // Evaluate all channels in parallel
  const evaluations = await Promise.all(
    Object.entries(channelContents).map(async ([channel, content]) => {
      const evaluation = await evaluateHook(content, channel, options);
      return { channel, evaluation };
    })
  );
  
  for (const { channel, evaluation } of evaluations) {
    results[channel] = evaluation;
  }
  
  return results;
}
