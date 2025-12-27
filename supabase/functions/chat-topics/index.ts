import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  brandTemplateId?: string;
  contentGoal?: string;
  organizationId?: string;
}

interface BrandContext {
  brandName: string;
  brandPositioning?: string;
  toneOfVoice?: string[];
  industry?: string[];
  contentPillars?: Array<{ name: string; keywords: string[] }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, brandTemplateId, contentGoal, organizationId }: ChatRequest = await req.json();

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch brand context if available
    let brandContext: BrandContext | null = null;
    if (brandTemplateId) {
      const { data: brand } = await supabase
        .from('brand_templates')
        .select('brand_name, brand_positioning, tone_of_voice, industry, content_pillars')
        .eq('id', brandTemplateId)
        .single();
      
      if (brand) {
        brandContext = {
          brandName: brand.brand_name,
          brandPositioning: brand.brand_positioning,
          toneOfVoice: brand.tone_of_voice,
          industry: brand.industry,
          contentPillars: brand.content_pillars as any,
        };
      }
    }

    // Fetch recent topic history for context
    let recentTopics: string[] = [];
    if (brandTemplateId) {
      const { data: history } = await supabase
        .from('topic_history')
        .select('topic')
        .eq('brand_template_id', brandTemplateId)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (history) {
        recentTopics = history.map(h => h.topic);
      }
    }

    // Build system prompt
    const systemPrompt = buildSystemPrompt(brandContext, contentGoal, recentTopics);

    // Prepare messages for AI
    const aiMessages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...messages,
    ];

    console.log('Chat-topics request:', {
      brandTemplateId,
      contentGoal,
      messageCount: messages.length,
      hasBrandContext: !!brandContext,
    });

    // Call Lovable AI with streaming
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: aiMessages,
        stream: true,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limits exceeded, please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required, please add funds to your Lovable AI workspace.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      return new Response(JSON.stringify({ error: 'AI gateway error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Return streaming response
    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });

  } catch (error) {
    console.error('Chat-topics error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function buildSystemPrompt(
  brandContext: BrandContext | null, 
  contentGoal?: string, 
  recentTopics?: string[]
): string {
  const goalLabels: Record<string, string> = {
    engagement: 'Tăng tương tác',
    awareness: 'Nâng cao nhận diện thương hiệu',
    conversion: 'Chuyển đổi / Bán hàng',
    education: 'Giáo dục khách hàng',
    expertise: 'Thể hiện chuyên môn',
  };

  let prompt = `Bạn là AI trợ lý gợi ý ý tưởng content marketing chuyên nghiệp, thân thiện và sáng tạo.

## Vai trò của bạn:
- Giúp người dùng tìm ý tưởng content phù hợp với brand và mục tiêu của họ
- Đưa ra gợi ý cụ thể, có thể hành động được ngay
- Giải thích ngắn gọn tại sao mỗi ý tưởng phù hợp
- Sử dụng emoji phù hợp để tạo sự thân thiện

## Nguyên tắc gợi ý topic:
1. Mỗi topic phải cụ thể, có góc nhìn rõ ràng (không chung chung)
2. Giải thích ngắn gọn WHY - tại sao topic này phù hợp với brand
3. Đề xuất format phù hợp: Multi-channel post, Video Script, hoặc Carousel
4. Tránh các topic đã được sử dụng gần đây
5. Cân bằng giữa evergreen content và trending topics

## Format trả lời khi gợi ý topic:
Khi gợi ý topic, format như sau:

📌 **Topic:** [Tên topic cụ thể - viết rõ ràng, cô đọng]
💡 **Lý do:** [Tại sao phù hợp - 1 câu ngắn]
🎯 **Format đề xuất:** [Multi-channel / Script / Carousel]

---

Ví dụ:

📌 **Topic:** 5 Bước Xây Dựng Thương Hiệu Cá Nhân Trên LinkedIn
💡 **Lý do:** Phù hợp với audience chuyên nghiệp, giúp tăng uy tín
🎯 **Format đề xuất:** Carousel

---

📌 **Topic:** Behind-the-scenes: Một Ngày Của Team Marketing
💡 **Lý do:** Tạo kết nối cảm xúc, tăng tương tác cao
🎯 **Format đề xuất:** Script

---

Gợi ý 2-4 topics, phân cách bằng dấu --- giữa mỗi topic.`;

  // Add brand context
  if (brandContext) {
    prompt += `

## Thông tin Brand:
- **Tên brand:** ${brandContext.brandName}`;
    
    if (brandContext.brandPositioning) {
      prompt += `
- **Định vị:** ${brandContext.brandPositioning}`;
    }
    
    if (brandContext.toneOfVoice?.length) {
      prompt += `
- **Tone of Voice:** ${brandContext.toneOfVoice.join(', ')}`;
    }
    
    if (brandContext.industry?.length) {
      prompt += `
- **Ngành:** ${brandContext.industry.join(', ')}`;
    }
    
    if (brandContext.contentPillars?.length) {
      prompt += `
- **Content Pillars:**
${brandContext.contentPillars.map(p => `  • ${p.name}: ${p.keywords?.slice(0, 3).join(', ') || ''}`).join('\n')}`;
    }
  }

  // Add content goal
  if (contentGoal && goalLabels[contentGoal]) {
    prompt += `

## Mục tiêu content hiện tại: ${goalLabels[contentGoal]}
Hãy tập trung gợi ý các topic phục vụ mục tiêu này.`;
  }

  // Add recent topics to avoid
  if (recentTopics?.length) {
    prompt += `

## Topics đã sử dụng gần đây (tránh lặp lại):
${recentTopics.slice(0, 5).map(t => `- ${t}`).join('\n')}`;
  }

  prompt += `

## Cách tương tác:
- Nếu người dùng chưa có ý tưởng: Hỏi về sản phẩm/dịch vụ chính hoặc đối tượng khách hàng
- Nếu người dùng đã có hướng: Gợi ý 2-4 topics cụ thể với giải thích
- Nếu người dùng muốn refine: Giúp làm sắc nét góc nhìn của topic
- Luôn sẵn sàng gợi ý thêm nếu người dùng muốn

Hãy bắt đầu cuộc trò chuyện một cách thân thiện và hữu ích!`;

  return prompt;
}
