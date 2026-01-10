import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// ============================================
// GENERATE CORE CONTENT - Long-form Single Source of Truth
// ============================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateCoreContentRequest {
  topic: string;
  contentGoal: string;
  contentAngle?: string;
  brandTemplateId?: string;
  organizationId?: string;
  targetAudience?: string;
  additionalContext?: string;
  topicHistoryId?: string;
}

interface CoreContentResponse {
  id: string;
  title: string;
  content: string;
  wordCount: number;
  keyMessages: string[];
  qualityScore: number;
  aiModel: string;
}

// Helper: Count words in Vietnamese/English text
function countWords(text: string): number {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

// Helper: Extract key messages from content
function extractKeyMessages(content: string): string[] {
  const messages: string[] = [];
  
  // Look for numbered lists or bullet points
  const bulletMatches = content.match(/^[\-\*•]\s+(.+)$/gm);
  if (bulletMatches) {
    bulletMatches.slice(0, 5).forEach(m => {
      const cleaned = m.replace(/^[\-\*•]\s+/, '').trim();
      if (cleaned.length > 20 && cleaned.length < 200) {
        messages.push(cleaned);
      }
    });
  }
  
  // Look for numbered items
  const numberedMatches = content.match(/^\d+[\.\)]\s+(.+)$/gm);
  if (numberedMatches) {
    numberedMatches.slice(0, 5).forEach(m => {
      const cleaned = m.replace(/^\d+[\.\)]\s+/, '').trim();
      if (cleaned.length > 20 && cleaned.length < 200) {
        messages.push(cleaned);
      }
    });
  }
  
  // Look for bold/emphasis patterns
  const boldMatches = content.match(/\*\*([^*]+)\*\*/g);
  if (boldMatches) {
    boldMatches.slice(0, 3).forEach(m => {
      const cleaned = m.replace(/\*\*/g, '').trim();
      if (cleaned.length > 10 && cleaned.length < 150) {
        messages.push(cleaned);
      }
    });
  }
  
  // Deduplicate
  return [...new Set(messages)].slice(0, 5);
}

// Build system prompt for long-form content generation
function buildSystemPrompt(
  topic: string,
  contentGoal: string,
  contentAngle: string | undefined,
  brandContext: any | null,
  targetAudience: string | undefined,
  additionalContext: string | undefined
): string {
  let prompt = `Bạn là một chuyên gia viết nội dung cấp cao. Nhiệm vụ của bạn là tạo ra nội dung gốc (Core Content) chất lượng cao.

## ĐỊNH NGHĨA CORE CONTENT
Core Content là nội dung nguồn đầy đủ (Single Source of Truth) - bài phân tích dài, logic hoàn chỉnh, CHƯA tối ưu cho bất kỳ nền tảng cụ thể nào. Nội dung này sẽ được transform sang các platform-specific variants sau.

## YÊU CẦU BẮT BUỘC
1. **Độ dài**: 800-2000 từ (tiếng Việt)
2. **Cấu trúc hoàn chỉnh**:
   - Mở bài hấp dẫn (hook + context)
   - Phân tích vấn đề sâu sắc
   - Giải pháp/Insights cụ thể
   - Ví dụ minh họa thực tế
   - Kết luận + Call-to-action
3. **Chất lượng**: Chuyên sâu, có giá trị, không chung chung
4. **Tone**: Chuyên nghiệp nhưng dễ hiểu

## CHỦ ĐỀ
${topic}

## MỤC TIÊU NỘI DUNG
${contentGoal === 'education' ? 'Giáo dục - Chia sẻ kiến thức hữu ích, hướng dẫn chi tiết' : ''}
${contentGoal === 'awareness' ? 'Nhận diện - Tăng nhận biết về vấn đề/giải pháp' : ''}
${contentGoal === 'engagement' ? 'Tương tác - Khuyến khích suy nghĩ, thảo luận' : ''}
${contentGoal === 'expertise' ? 'Xây dựng chuyên gia - Thể hiện chuyên môn sâu' : ''}
${contentGoal === 'conversion' ? 'Chuyển đổi - Thúc đẩy hành động, quyết định' : ''}
`;

  if (contentAngle) {
    prompt += `
## GÓC TIẾP CẬN
${contentAngle === 'educational' ? 'Chia sẻ kiến thức - Tips, hướng dẫn, thông tin hữu ích' : ''}
${contentAngle === 'storytelling' ? 'Kể chuyện - Narrative flow, cảm xúc, câu chuyện thực' : ''}
${contentAngle === 'promotional' ? 'Quảng cáo - CTA mạnh, urgency, ưu đãi rõ ràng' : ''}
${contentAngle === 'social_proof' ? 'Social Proof - Đánh giá, testimonial, case study' : ''}
${contentAngle === 'behind_the_scenes' ? 'Hậu trường - Quy trình, đội ngũ, behind-the-scenes' : ''}
${contentAngle === 'qa_faq' ? 'Q&A - Giải đáp thắc mắc, FAQ phổ biến' : ''}
`;
  }

  if (brandContext) {
    prompt += `
## BRAND CONTEXT
- Thương hiệu: ${brandContext.brand_name || 'N/A'}
- Định vị: ${brandContext.brand_positioning || 'N/A'}
- Tone of voice: ${(brandContext.tone_of_voice || []).join(', ') || 'N/A'}
- USP: ${brandContext.unique_value_proposition || 'N/A'}
`;
    
    if (brandContext.content_pillars && brandContext.content_pillars.length > 0) {
      prompt += `- Content pillars: ${brandContext.content_pillars.map((p: any) => p.name).join(', ')}\n`;
    }
  }

  if (targetAudience) {
    prompt += `
## ĐỐI TƯỢNG MỤC TIÊU
${targetAudience}
`;
  }

  if (additionalContext) {
    prompt += `
## BỐI CẢNH BỔ SUNG
${additionalContext}
`;
  }

  prompt += `
## OUTPUT FORMAT
Viết trực tiếp nội dung, KHÔNG thêm tiêu đề "Core Content" hay metadata.
Sử dụng Markdown formatting (##, **, -, 1.) cho cấu trúc rõ ràng.
Đảm bảo có ít nhất 5 điểm chính (key messages) được highlight bằng bold hoặc bullet points.
`;

  return prompt;
}

// Generate title from content
function generateTitle(topic: string, content: string): string {
  // Try to extract first heading
  const h1Match = content.match(/^#\s+(.+)$/m);
  if (h1Match) return h1Match[1].slice(0, 200);
  
  const h2Match = content.match(/^##\s+(.+)$/m);
  if (h2Match) return h2Match[1].slice(0, 200);
  
  // Use topic as title
  return topic.length > 200 ? topic.slice(0, 197) + '...' : topic;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get user from auth header
    const authHeader = req.headers.get('authorization');
    let userId: string | null = null;
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }
    
    // Parse request body
    const body: GenerateCoreContentRequest = await req.json();
    const {
      topic,
      contentGoal,
      contentAngle,
      brandTemplateId,
      organizationId,
      targetAudience,
      additionalContext,
      topicHistoryId,
    } = body;
    
    // Validate required fields
    if (!topic || topic.trim().length < 5) {
      return new Response(
        JSON.stringify({ error: 'Topic is required (min 5 characters)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!organizationId) {
      return new Response(
        JSON.stringify({ error: 'Organization ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`[generate-core-content] Starting for topic: "${topic.slice(0, 50)}..."`);
    
    // Fetch brand template if provided
    let brandContext: any = null;
    if (brandTemplateId) {
      const { data: brandData } = await supabase
        .from('brand_templates')
        .select('*')
        .eq('id', brandTemplateId)
        .single();
      
      if (brandData) {
        brandContext = brandData;
        console.log(`[generate-core-content] Loaded brand: ${brandData.brand_name}`);
      }
    }
    
    // Build system prompt
    const systemPrompt = buildSystemPrompt(
      topic,
      contentGoal || 'education',
      contentAngle,
      brandContext,
      targetAudience,
      additionalContext
    );
    
    // Call AI via Lovable Gateway
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }
    
    const aiModel = 'google/gemini-2.5-flash';
    
    console.log(`[generate-core-content] Calling AI model: ${aiModel}`);
    
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: aiModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Viết Core Content chất lượng cao về chủ đề: ${topic}` }
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });
    
    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error(`[generate-core-content] AI error:`, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }
    
    const aiResult = await aiResponse.json();
    const content = aiResult.choices?.[0]?.message?.content || '';
    
    if (!content || content.length < 500) {
      throw new Error('Generated content too short');
    }
    
    const wordCount = countWords(content);
    const keyMessages = extractKeyMessages(content);
    const title = generateTitle(topic, content);
    
    // Calculate quality score based on various factors
    let qualityScore = 50; // Base score
    
    // Word count scoring (800-2000 is ideal)
    if (wordCount >= 800 && wordCount <= 2000) {
      qualityScore += 20;
    } else if (wordCount >= 600) {
      qualityScore += 10;
    }
    
    // Key messages scoring
    qualityScore += Math.min(keyMessages.length * 4, 15);
    
    // Structure scoring (has headings)
    if (content.includes('##')) qualityScore += 5;
    if (content.includes('**')) qualityScore += 5;
    if (content.match(/^\d+[\.\)]/m)) qualityScore += 5;
    
    qualityScore = Math.min(qualityScore, 100);
    
    console.log(`[generate-core-content] Generated ${wordCount} words, score: ${qualityScore}`);
    
    // Save to database
    const { data: coreContent, error: insertError } = await supabase
      .from('core_contents')
      .insert({
        title,
        topic,
        content,
        word_count: wordCount,
        content_goal: contentGoal || 'education',
        content_angle: contentAngle || null,
        target_audience: targetAudience || null,
        key_messages: keyMessages,
        brand_template_id: brandTemplateId || null,
        organization_id: organizationId,
        user_id: userId,
        source_type: 'ai_generated',
        source_topic_history_id: topicHistoryId || null,
        quality_score: qualityScore,
        ai_model_used: aiModel,
        status: 'draft',
      })
      .select('id')
      .single();
    
    if (insertError) {
      console.error(`[generate-core-content] Insert error:`, insertError);
      throw new Error(`Failed to save core content: ${insertError.message}`);
    }
    
    const duration = Date.now() - startTime;
    console.log(`[generate-core-content] Completed in ${duration}ms, ID: ${coreContent.id}`);
    
    // Return response
    const response: CoreContentResponse = {
      id: coreContent.id,
      title,
      content,
      wordCount,
      keyMessages,
      qualityScore,
      aiModel,
    };
    
    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error(`[generate-core-content] Error:`, error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
