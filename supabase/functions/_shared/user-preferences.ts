/**
 * User Preferences Utilities for AI Prompt Injection
 * 
 * Fetches and formats user preferences for inclusion in AI prompts
 */

export interface UserPreferencesContext {
  // Writing style
  preferredTone: string;
  emojiFrequency: string;
  contentLengthPreference: string;
  
  // Skill & behavior
  skillLevel: string;
  explanationDepth: string;
  
  // Inferred from edits
  inferredPreferences: Record<string, any>;
  
  // Categories
  preferredCategories: string[];
  dislikedCategories: string[];
  preferredFormats: string[];
  
  // Style patterns (high confidence)
  stylePatterns: Array<{
    category: string;
    preference: string;
    confidence: number;
  }>;
  
  // Stats
  avgEditPercentage: number;
  topicsGeneratedCount: number;
}

/**
 * Fetch user preferences from database
 */
export async function fetchUserPreferences(
  supabase: any,
  userId: string,
  brandTemplateId?: string | null
): Promise<UserPreferencesContext | null> {
  try {
    // Fetch user preferences
    const { data: prefs, error: prefsError } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (prefsError) {
      console.warn('Error fetching user preferences:', prefsError);
      return null;
    }

    if (!prefs) {
      return null;
    }

    // Fetch high-confidence style patterns
    let patternsQuery = supabase
      .from('content_style_patterns')
      .select('pattern_category, user_pattern, confidence_score')
      .eq('user_id', userId)
      .gte('confidence_score', 0.6)
      .order('confidence_score', { ascending: false })
      .limit(10);

    if (brandTemplateId) {
      // Also include patterns without brand (global) or matching brand
      patternsQuery = supabase
        .from('content_style_patterns')
        .select('pattern_category, user_pattern, confidence_score')
        .eq('user_id', userId)
        .gte('confidence_score', 0.6)
        .or(`brand_template_id.is.null,brand_template_id.eq.${brandTemplateId}`)
        .order('confidence_score', { ascending: false })
        .limit(10);
    }

    const { data: patterns } = await patternsQuery;

    return {
      preferredTone: prefs.preferred_tone || 'balanced',
      emojiFrequency: prefs.emoji_frequency || 'medium',
      contentLengthPreference: prefs.content_length_preference || 'balanced',
      skillLevel: prefs.skill_level || 'beginner',
      explanationDepth: prefs.explanation_depth || 'standard',
      inferredPreferences: prefs.inferred_preferences || {},
      preferredCategories: prefs.preferred_categories || [],
      dislikedCategories: prefs.disliked_categories || [],
      preferredFormats: prefs.preferred_formats || [],
      stylePatterns: (patterns || []).map((p: any) => ({
        category: p.pattern_category,
        preference: p.user_pattern,
        confidence: p.confidence_score,
      })),
      avgEditPercentage: prefs.avg_edit_percentage || 0,
      topicsGeneratedCount: prefs.topics_generated_count || 0,
    };
  } catch (err) {
    console.error('Error in fetchUserPreferences:', err);
    return null;
  }
}

/**
 * Build user preferences prompt section
 */
export function buildUserPreferencesSection(prefs: UserPreferencesContext | null): string {
  if (!prefs) {
    return '';
  }

  const parts: string[] = [];
  parts.push(`## 👤 USER PREFERENCES (Đã học từ hành vi)`);
  parts.push(`\nDựa trên lịch sử sử dụng của người dùng này:`);

  // Writing style
  const toneMap: Record<string, string> = {
    casual: 'thoải mái, thân thiện',
    balanced: 'cân bằng',
    formal: 'trang trọng',
    professional: 'chuyên nghiệp',
  };
  parts.push(`\n### Phong cách viết:`);
  parts.push(`- Tone: ${toneMap[prefs.preferredTone] || prefs.preferredTone}`);
  
  const lengthMap: Record<string, string> = {
    concise: 'Ngắn gọn, súc tích',
    balanced: 'Vừa phải',
    detailed: 'Chi tiết, đầy đủ',
  };
  parts.push(`- Độ dài: ${lengthMap[prefs.contentLengthPreference] || prefs.contentLengthPreference}`);
  
  const emojiMap: Record<string, string> = {
    none: 'Không dùng emoji',
    low: 'Ít emoji',
    medium: 'Emoji vừa phải',
    high: 'Nhiều emoji',
  };
  parts.push(`- Emoji: ${emojiMap[prefs.emojiFrequency] || prefs.emojiFrequency}`);

  // Inferred preferences (learned from edits)
  const inferred = prefs.inferredPreferences;
  if (Object.keys(inferred).length > 0) {
    parts.push(`\n### Preferences tự học được:`);
    if (inferred.avoid_emoji) parts.push(`- ⚠️ KHÔNG dùng emoji (user thường xóa emoji)`);
    if (inferred.prefer_emoji) parts.push(`- ✅ NÊN thêm emoji (user thường thêm emoji)`);
    if (inferred.prefer_concise) parts.push(`- ✅ Viết ngắn gọn hơn (user thường rút gọn nội dung)`);
    if (inferred.avoid_ellipsis) parts.push(`- ⚠️ KHÔNG dùng "..." (user thường xóa ellipsis)`);
    if (inferred.prefer_questions) parts.push(`- ✅ Dùng câu hỏi (user thường đổi thành câu hỏi)`);
  }

  // Style patterns (high confidence)
  if (prefs.stylePatterns.length > 0) {
    parts.push(`\n### Patterns đã học (confidence cao):`);
    prefs.stylePatterns.slice(0, 5).forEach(pattern => {
      parts.push(`- ${pattern.category}: ${pattern.preference} (${Math.round(pattern.confidence * 100)}%)`);
    });
  }

  // Preferred categories
  if (prefs.preferredCategories.length > 0) {
    parts.push(`\n### Categories ưa thích: ${prefs.preferredCategories.join(', ')}`);
    parts.push(`→ ƯU TIÊN gợi ý topics trong các categories này`);
  }

  // Disliked categories  
  if (prefs.dislikedCategories.length > 0) {
    parts.push(`\n### Categories không thích: ${prefs.dislikedCategories.join(', ')}`);
    parts.push(`→ HẠN CHẾ hoặc TRÁNH categories này`);
  }

  // Skill level adaptation
  const skillAdaptation: Record<string, string> = {
    beginner: 'Giải thích chi tiết hơn, dùng từ đơn giản, hướng dẫn từng bước',
    intermediate: 'Giải thích vừa phải, có thể dùng thuật ngữ chuyên ngành cơ bản',
    advanced: 'Giải thích ngắn gọn, tập trung vào insights và optimizations',
    expert: 'Không cần giải thích cơ bản, focus vào advanced techniques và A/B testing',
  };
  
  parts.push(`\n### Skill Level: ${prefs.skillLevel.toUpperCase()}`);
  parts.push(`→ ${skillAdaptation[prefs.skillLevel] || skillAdaptation.beginner}`);

  // AI adaptation note
  if (prefs.avgEditPercentage > 30) {
    parts.push(`\n⚠️ User thường edit ${prefs.avgEditPercentage}% nội dung - AI cần điều chỉnh để match style tốt hơn`);
  } else if (prefs.avgEditPercentage < 15 && prefs.topicsGeneratedCount > 20) {
    parts.push(`\n✅ AI đang match tốt với style user (chỉ ${prefs.avgEditPercentage}% edits)`);
  }

  return parts.join('\n');
}

/**
 * Merge user preferences into prompt context with priority
 */
export function mergeUserPreferencesIntoContext(
  baseContext: any,
  userPrefs: UserPreferencesContext | null
): any {
  if (!userPrefs) return baseContext;

  const merged = { ...baseContext };

  // Apply emoji preference (user pref overrides if strong signal)
  if (userPrefs.inferredPreferences.avoid_emoji) {
    merged.allowEmoji = false;
  } else if (userPrefs.inferredPreferences.prefer_emoji) {
    merged.allowEmoji = true;
  }

  // Apply length preference
  if (userPrefs.contentLengthPreference === 'concise' || userPrefs.inferredPreferences.prefer_concise) {
    merged.preferConcise = true;
  }

  // Apply skill-based explanation depth
  merged.skillLevel = userPrefs.skillLevel;
  merged.explanationDepth = userPrefs.explanationDepth;

  return merged;
}
