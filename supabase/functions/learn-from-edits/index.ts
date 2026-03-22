import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EditAnalysisRequest {
  contentId: string;
  contentType: 'script' | 'carousel' | 'multichannel' | 'topic';
  originalText: string;
  editedText: string;
  brandTemplateId?: string;
  organizationId?: string;
  editContext?: {
    section?: string; // 'hook', 'cta', 'body', 'caption'
    channel?: string;
  };
}

interface DetectedPattern {
  category: string;
  editType: 'add' | 'remove' | 'rephrase' | 'restructure';
  originalPattern: string;
  userPattern: string;
  confidence: number;
}

/**
 * Analyze edits and extract patterns
 */
function analyzeEdits(original: string, edited: string, context?: { section?: string; channel?: string }): DetectedPattern[] {
  const patterns: DetectedPattern[] = [];
  
  // Normalize texts
  const origLower = original.toLowerCase().trim();
  const editLower = edited.toLowerCase().trim();
  
  // Calculate basic edit metrics
  const origWords = original.split(/\s+/).filter(Boolean);
  const editWords = edited.split(/\s+/).filter(Boolean);
  const lengthDiff = editWords.length - origWords.length;
  const lengthRatio = editWords.length / Math.max(origWords.length, 1);
  
  // 1. Length preference pattern
  if (lengthRatio < 0.7) {
    patterns.push({
      category: 'length',
      editType: 'remove',
      originalPattern: `${origWords.length} words`,
      userPattern: `${editWords.length} words (shortened ${Math.round((1 - lengthRatio) * 100)}%)`,
      confidence: Math.min(0.9, 0.5 + (1 - lengthRatio) * 0.5),
    });
  } else if (lengthRatio > 1.3) {
    patterns.push({
      category: 'length',
      editType: 'add',
      originalPattern: `${origWords.length} words`,
      userPattern: `${editWords.length} words (expanded ${Math.round((lengthRatio - 1) * 100)}%)`,
      confidence: Math.min(0.9, 0.5 + (lengthRatio - 1) * 0.3),
    });
  }
  
  // 2. Emoji pattern detection
  const origEmojis = (original.match(/[\u{1F300}-\u{1F9FF}]/gu) || []).length;
  const editEmojis = (edited.match(/[\u{1F300}-\u{1F9FF}]/gu) || []).length;
  
  if (editEmojis > origEmojis && origEmojis === 0) {
    patterns.push({
      category: 'emoji',
      editType: 'add',
      originalPattern: 'No emojis',
      userPattern: `Added ${editEmojis} emojis`,
      confidence: 0.8,
    });
  } else if (origEmojis > 0 && editEmojis === 0) {
    patterns.push({
      category: 'emoji',
      editType: 'remove',
      originalPattern: `${origEmojis} emojis`,
      userPattern: 'Removed all emojis',
      confidence: 0.8,
    });
  }
  
  // 3. Punctuation patterns
  const origExclamations = (original.match(/!/g) || []).length;
  const editExclamations = (edited.match(/!/g) || []).length;
  
  if (origExclamations > editExclamations && origExclamations > 0) {
    patterns.push({
      category: 'tone',
      editType: 'rephrase',
      originalPattern: 'Exclamation marks',
      userPattern: 'Reduced exclamations (calmer tone)',
      confidence: 0.6,
    });
  }
  
  // 4. Ellipsis pattern
  const origEllipsis = (original.match(/\.\.\./g) || []).length;
  const editEllipsis = (edited.match(/\.\.\./g) || []).length;
  
  if (origEllipsis > 0 && editEllipsis < origEllipsis) {
    patterns.push({
      category: 'structure',
      editType: 'remove',
      originalPattern: 'Ellipsis (...)',
      userPattern: 'Removed ellipsis',
      confidence: 0.7,
    });
  }
  
  // 5. CTA pattern (if editing CTA section)
  if (context?.section === 'cta' || editLower.includes('click') || editLower.includes('liên hệ') || editLower.includes('đăng ký')) {
    if (lengthRatio < 0.8) {
      patterns.push({
        category: 'cta',
        editType: 'rephrase',
        originalPattern: original.substring(0, 100),
        userPattern: edited.substring(0, 100),
        confidence: 0.75,
      });
    }
  }
  
  // 6. Hook pattern (if editing hook section or first sentence changed significantly)
  if (context?.section === 'hook') {
    patterns.push({
      category: 'hook',
      editType: 'rephrase',
      originalPattern: original.substring(0, 150),
      userPattern: edited.substring(0, 150),
      confidence: 0.7,
    });
  }
  
  // 7. Question to statement or vice versa
  const origHasQuestion = original.includes('?');
  const editHasQuestion = edited.includes('?');
  
  if (origHasQuestion && !editHasQuestion) {
    patterns.push({
      category: 'structure',
      editType: 'rephrase',
      originalPattern: 'Question format',
      userPattern: 'Statement format',
      confidence: 0.6,
    });
  } else if (!origHasQuestion && editHasQuestion) {
    patterns.push({
      category: 'structure',
      editType: 'rephrase',
      originalPattern: 'Statement format',
      userPattern: 'Question format',
      confidence: 0.6,
    });
  }
  
  return patterns;
}

/**
 * Calculate edit percentage
 */
function calculateEditPercentage(original: string, edited: string): number {
  const origWords = original.split(/\s+/).filter(Boolean);
  const editWords = edited.split(/\s+/).filter(Boolean);
  
  // Simple word overlap check
  const origSet = new Set(origWords.map(w => w.toLowerCase()));
  const editSet = new Set(editWords.map(w => w.toLowerCase()));
  
  const intersection = [...origSet].filter(w => editSet.has(w));
  const union = new Set([...origSet, ...editSet]);
  
  const similarity = intersection.length / union.size;
  return Math.round((1 - similarity) * 100);
}

Deno.serve(withPerf({ functionName: 'learn-from-edits' }, async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: EditAnalysisRequest = await req.json();
    const { contentId, contentType, originalText, editedText, brandTemplateId, organizationId, editContext } = body;

    if (!originalText || !editedText) {
      return new Response(JSON.stringify({ error: "Missing original or edited text" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[learn-from-edits] Processing edit for ${contentType} by user ${user.id}`);

    // 1. Analyze edits and detect patterns
    const detectedPatterns = analyzeEdits(originalText, editedText, editContext);
    const editPercentage = calculateEditPercentage(originalText, editedText);

    console.log(`[learn-from-edits] Detected ${detectedPatterns.length} patterns, edit percentage: ${editPercentage}%`);

    // 2. Store patterns with confidence boosting for repeated patterns
    for (const pattern of detectedPatterns) {
      // Check if pattern already exists
      const { data: existingPattern } = await supabase
        .from('content_style_patterns')
        .select('*')
        .eq('user_id', user.id)
        .eq('pattern_category', pattern.category)
        .eq('content_type', contentType)
        .maybeSingle();

      if (existingPattern) {
        // Boost confidence and update
        const newConfidence = Math.min(0.95, existingPattern.confidence_score + 0.1);
        const existingExamples = existingPattern.examples || [];
        const newExample = {
          original: pattern.originalPattern.substring(0, 200),
          edited: pattern.userPattern.substring(0, 200),
          timestamp: new Date().toISOString(),
        };

        await supabase
          .from('content_style_patterns')
          .update({
            confidence_score: newConfidence,
            occurrence_count: existingPattern.occurrence_count + 1,
            last_seen_at: new Date().toISOString(),
            examples: [...existingExamples.slice(-4), newExample], // Keep last 5 examples
            user_pattern: pattern.userPattern,
          })
          .eq('id', existingPattern.id);

        console.log(`[learn-from-edits] Updated pattern ${pattern.category}: confidence ${newConfidence}`);
      } else {
        // Insert new pattern
        await supabase
          .from('content_style_patterns')
          .insert({
            user_id: user.id,
            brand_template_id: brandTemplateId || null,
            organization_id: organizationId || null,
            content_type: contentType,
            pattern_category: pattern.category,
            original_pattern: pattern.originalPattern.substring(0, 500),
            user_pattern: pattern.userPattern.substring(0, 500),
            edit_type: pattern.editType,
            confidence_score: pattern.confidence,
            examples: [{
              original: pattern.originalPattern.substring(0, 200),
              edited: pattern.userPattern.substring(0, 200),
              timestamp: new Date().toISOString(),
            }],
          });

        console.log(`[learn-from-edits] Created new pattern ${pattern.category}`);
      }
    }

    // 3. Update user preferences if patterns are strong enough
    const { data: userPrefs } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    const currentInferred = userPrefs?.inferred_preferences || {};
    let updatedInferred = { ...currentInferred };
    let preferencesChanged = false;

    for (const pattern of detectedPatterns) {
      if (pattern.confidence >= 0.7) {
        // High confidence pattern - update user preferences
        if (pattern.category === 'emoji' && pattern.editType === 'remove') {
          updatedInferred.avoid_emoji = true;
          preferencesChanged = true;
        } else if (pattern.category === 'emoji' && pattern.editType === 'add') {
          updatedInferred.prefer_emoji = true;
          preferencesChanged = true;
        } else if (pattern.category === 'length' && pattern.editType === 'remove') {
          updatedInferred.prefer_concise = true;
          preferencesChanged = true;
        } else if (pattern.category === 'structure' && pattern.userPattern.includes('ellipsis')) {
          updatedInferred.avoid_ellipsis = true;
          preferencesChanged = true;
        }
      }
    }

    if (preferencesChanged) {
      if (userPrefs) {
        // Update existing preferences
        await supabase
          .from('user_preferences')
          .update({
            inferred_preferences: updatedInferred,
            avg_edit_percentage: Math.round((userPrefs.avg_edit_percentage * 0.9 + editPercentage * 0.1)),
          })
          .eq('user_id', user.id);
      } else {
        // Create new preferences
        await supabase
          .from('user_preferences')
          .insert({
            user_id: user.id,
            organization_id: organizationId || null,
            inferred_preferences: updatedInferred,
            avg_edit_percentage: editPercentage,
          });
      }
      console.log(`[learn-from-edits] Updated user preferences with inferred settings`);
    }

    return new Response(JSON.stringify({
      success: true,
      patternsDetected: detectedPatterns.length,
      patterns: detectedPatterns,
      editPercentage,
      preferencesUpdated: preferencesChanged,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("[learn-from-edits] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}));
