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
  uniqueValueProposition?: string;
  targetAgeRange?: string;
  targetGender?: string;
  evergreenThemes?: string[];
  brandHashtags?: string[];
  mainCompetitors?: string[];
  industryTemplateId?: string;
}

interface IndustryMemory {
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

// Fetch industry memory from database
async function fetchIndustryMemory(
  supabase: any,
  industryTemplateId: string,
  languageCode: string = 'vi'
): Promise<IndustryMemory | null> {
  try {
    // First try with requested language
    const { data: template, error } = await supabase
      .from('industry_templates')
      .select(`
        id, code, version, target_audience, is_active,
        compliance_rules, claim_restrictions, forbidden_terms,
        brand_voice, channel_settings, metadata,
        argument_patterns, system_rules, preferred_words, forbidden_words,
        industry_template_translations!inner (
          name, language_code
        )
      `)
      .eq('id', industryTemplateId)
      .eq('is_active', true)
      .eq('industry_template_translations.language_code', languageCode)
      .maybeSingle();

    if (error) {
      console.error('Error fetching industry memory:', error);
      return null;
    }

    // If no result with requested language, try fallback to English
    if (!template) {
      const { data: fallbackTemplate, error: fallbackError } = await supabase
        .from('industry_templates')
        .select(`
          id, code, version, target_audience, is_active,
          compliance_rules, claim_restrictions, forbidden_terms,
          brand_voice, channel_settings, metadata,
          argument_patterns, system_rules, preferred_words, forbidden_words,
          industry_template_translations!inner (
            name, language_code
          )
        `)
        .eq('id', industryTemplateId)
        .eq('is_active', true)
        .eq('industry_template_translations.language_code', 'en')
        .maybeSingle();

      if (fallbackError || !fallbackTemplate) {
        console.log('No industry template found for:', industryTemplateId);
        return null;
      }

      return {
        id: fallbackTemplate.id,
        code: fallbackTemplate.code,
        name: fallbackTemplate.industry_template_translations?.[0]?.name || fallbackTemplate.code,
        version: fallbackTemplate.version,
        target_audience: fallbackTemplate.target_audience || 'both',
        compliance_rules: fallbackTemplate.compliance_rules || [],
        claim_restrictions: fallbackTemplate.claim_restrictions || [],
        forbidden_terms: fallbackTemplate.forbidden_terms || [],
        brand_voice: fallbackTemplate.brand_voice || {},
        channel_settings: fallbackTemplate.channel_settings,
        metadata: fallbackTemplate.metadata,
        argument_patterns: fallbackTemplate.argument_patterns,
        system_rules: fallbackTemplate.system_rules || [],
        preferred_words: fallbackTemplate.preferred_words || [],
        forbidden_words: fallbackTemplate.forbidden_words || [],
      };
    }

    return {
      id: template.id,
      code: template.code,
      name: template.industry_template_translations?.[0]?.name || template.code,
      version: template.version,
      target_audience: template.target_audience || 'both',
      compliance_rules: template.compliance_rules || [],
      claim_restrictions: template.claim_restrictions || [],
      forbidden_terms: template.forbidden_terms || [],
      brand_voice: template.brand_voice || {},
      channel_settings: template.channel_settings,
      metadata: template.metadata,
      argument_patterns: template.argument_patterns,
      system_rules: template.system_rules || [],
      preferred_words: template.preferred_words || [],
      forbidden_words: template.forbidden_words || [],
    };
  } catch (error) {
    console.error('Error in fetchIndustryMemory:', error);
    return null;
  }
}

// Build industry context section for system prompt
function buildIndustryContextSection(industryMemory: IndustryMemory | null): string {
  if (!industryMemory) return '';

  let section = `

## 🔒 INDUSTRY MEMORY (ƯU TIÊN CAO NHẤT - KHÔNG ĐƯỢC VI PHẠM)

### Ngành: ${industryMemory.name} (v${industryMemory.version})
- Target Audience: ${industryMemory.target_audience === 'B2B' ? 'Doanh nghiệp' : industryMemory.target_audience === 'B2C' ? 'Cá nhân' : 'Cả hai'}`;

  // Forbidden terms - highest priority
  if (industryMemory.forbidden_terms?.length) {
    section += `

### ⛔ TỪ CẤM NGÀNH (TUYỆT ĐỐI KHÔNG DÙNG):
${industryMemory.forbidden_terms.map(t => `- "${t}"`).join('\n')}
→ KHÔNG được gợi ý topic chứa các từ này, KHÔNG viết lại, KHÔNG paraphrase!`;
  }

  // Compliance rules
  if (industryMemory.compliance_rules?.length) {
    section += `

### ✅ QUY TẮC TUÂN THỦ:
${industryMemory.compliance_rules.map(r => {
      if (typeof r === 'string') return `- ${r}`;
      return `- ${r.rule}${r.level ? ` (${r.level})` : ''}`;
    }).join('\n')}`;
  }

  // Claim restrictions
  if (industryMemory.claim_restrictions?.length) {
    section += `

### ⚠️ CLAIM BỊ HẠN CHẾ (KHÔNG ĐƯỢC HỨA HẸN):
${industryMemory.claim_restrictions.map(c => {
      if (typeof c === 'string') return `- ${c}`;
      return `- ${c.claim}${c.reason ? ` (Lý do: ${c.reason})` : ''}`;
    }).join('\n')}`;
  }

  // Argument patterns
  if (industryMemory.argument_patterns) {
    const { valid_patterns, forbidden_patterns } = industryMemory.argument_patterns;
    if (valid_patterns?.length || forbidden_patterns?.length) {
      section += `

### 💬 ARGUMENT PATTERNS:`;
      if (valid_patterns?.length) {
        section += `
✅ Patterns được phép:
${valid_patterns.map(p => `- ${p}`).join('\n')}`;
      }
      if (forbidden_patterns?.length) {
        section += `
❌ Patterns KHÔNG được phép:
${forbidden_patterns.map(p => `- ${p}`).join('\n')}`;
      }
    }
  }

  // System rules
  if (industryMemory.system_rules?.length) {
    section += `

### 📋 SYSTEM RULES (Quy tắc hệ thống):
${industryMemory.system_rules.map(r => `- ${r}`).join('\n')}`;
  }

  // Preferred words
  if (industryMemory.preferred_words?.length) {
    section += `

### 👍 TỪ NÊN DÙNG:
${industryMemory.preferred_words.map(w => `- "${w}"`).join('\n')}`;
  }

  // Industry brand voice baseline
  if (industryMemory.brand_voice) {
    const bv = industryMemory.brand_voice;
    const voiceParts: string[] = [];
    if (bv.tone_of_voice?.length) voiceParts.push(`Tone: ${bv.tone_of_voice.join(', ')}`);
    if (bv.formality_level) voiceParts.push(`Formality: ${bv.formality_level}`);
    if (bv.language_style?.length) voiceParts.push(`Style: ${bv.language_style.join(', ')}`);
    if (bv.cta_policy) voiceParts.push(`CTA: ${bv.cta_policy}`);
    if (typeof bv.allow_emoji === 'boolean') voiceParts.push(`Emoji: ${bv.allow_emoji ? 'có' : 'không'}`);
    
    if (voiceParts.length) {
      section += `

### 🎯 BASELINE BRAND VOICE (từ ngành):
${voiceParts.map(p => `- ${p}`).join('\n')}`;
    }
  }

  section += `

⚠️ **QUAN TRỌNG**: Industry Memory OVERRIDE mọi yêu cầu khác nếu mâu thuẫn. Nếu user yêu cầu topic vi phạm các quy tắc trên, từ chối nhẹ nhàng và đề xuất alternative.`;

  return section;
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

    // Fetch brand context with extended fields + personas + products + mappings in parallel
    let brandContext: BrandContext | null = null;
    let personasContext: string[] = [];
    let productsContext: string[] = [];
    let productPersonaContext: string[] = [];
    let recentTopics: string[] = [];
    let industryMemory: IndustryMemory | null = null;
    
    if (brandTemplateId) {
      const [brandResult, personasResult, productsResult, mappingsResult, historyResult] = await Promise.all([
        supabase
          .from('brand_templates')
          .select(`
            brand_name, brand_positioning, tone_of_voice, industry, content_pillars,
            unique_value_proposition, target_age_range, target_gender, evergreen_themes,
            brand_hashtags, main_competitors, industry_template_id
          `)
          .eq('id', brandTemplateId)
          .single(),
        supabase
          .from('customer_personas')
          .select(`
            id, name, occupation, age_range, pain_points, desires, buying_triggers, is_primary,
            device_usage, tech_savviness, buying_motivation, communication_style, 
            typical_funnel_stage, objections, journey_map, priority_score
          `)
          .eq('brand_template_id', brandTemplateId)
          .order('priority_score', { ascending: false, nullsFirst: false })
          .order('is_primary', { ascending: false })
          .limit(5),
        supabase
          .from('brand_products')
          .select('id, name, category, description, unique_selling_points, suggested_content_angles, is_featured')
          .eq('brand_template_id', brandTemplateId)
          .eq('is_active', true)
          .order('is_featured', { ascending: false })
          .limit(5),
        supabase
          .from('product_persona_mappings')
          .select('product_id, persona_id, relevance_score, is_primary_product, custom_pitch, key_benefits, preferred_content_angles')
          .eq('brand_template_id', brandTemplateId)
          .order('relevance_score', { ascending: false })
          .limit(20),
        supabase
          .from('topic_history')
          .select('topic')
          .eq('brand_template_id', brandTemplateId)
          .order('created_at', { ascending: false })
          .limit(10)
      ]);
      
      if (brandResult.data) {
        const brand = brandResult.data;
        brandContext = {
          brandName: brand.brand_name,
          brandPositioning: brand.brand_positioning,
          toneOfVoice: brand.tone_of_voice,
          industry: brand.industry,
          contentPillars: brand.content_pillars as any,
          uniqueValueProposition: brand.unique_value_proposition,
          targetAgeRange: brand.target_age_range,
          targetGender: brand.target_gender,
          evergreenThemes: brand.evergreen_themes,
          brandHashtags: brand.brand_hashtags,
          mainCompetitors: brand.main_competitors,
          industryTemplateId: brand.industry_template_id,
        };

        // Fetch Industry Memory if brand has industry_template_id
        if (brand.industry_template_id) {
          industryMemory = await fetchIndustryMemory(supabase, brand.industry_template_id, 'vi');
        }
      }

      // Build enhanced personas context
      if (personasResult.data?.length) {
        personasContext = personasResult.data.map((p: any) => {
          const parts = [
            `${p.name}${p.is_primary ? ' ⭐' : ''} (${p.occupation || 'N/A'}, ${p.age_range || 'N/A'})`,
          ];
          
          if (p.device_usage) parts.push(`📱 ${p.device_usage}`);
          if (p.tech_savviness) parts.push(`🔧 Tech: ${p.tech_savviness}`);
          if (p.typical_funnel_stage) parts.push(`📊 Stage: ${p.typical_funnel_stage.toUpperCase()}`);
          if (p.communication_style) parts.push(`💬 Style: ${p.communication_style}`);
          
          parts.push(`Pain Points: ${(p.pain_points || []).slice(0, 3).join(', ')}`);
          parts.push(`Desires: ${(p.desires || []).slice(0, 3).join(', ')}`);
          
          if (p.buying_motivation?.length) {
            parts.push(`Động lực mua: ${p.buying_motivation.slice(0, 2).join(', ')}`);
          }
          if (p.objections?.length) {
            parts.push(`Objections: ${p.objections.slice(0, 2).join(', ')}`);
          }
          
          return parts.join(' | ');
        });
        console.log('Loaded', personasResult.data.length, 'enhanced personas for chat context');
      }

      // Build products context
      if (productsResult.data?.length) {
        productsContext = productsResult.data.map((p: any) => 
          `${p.is_featured ? '⭐ ' : ''}${p.name}${p.category ? ` (${p.category})` : ''}: ${(p.suggested_content_angles || []).slice(0, 2).join(', ')}`
        );
        console.log('Loaded', productsResult.data.length, 'products for chat context');
      }

      // Build product-persona mappings context
      if (mappingsResult.data?.length && personasResult.data?.length && productsResult.data?.length) {
        const personaMap = new Map(personasResult.data.map((p: any) => [p.id, p.name]));
        const productMap = new Map(productsResult.data.map((p: any) => [p.id, p.name]));
        
        productPersonaContext = mappingsResult.data
          .filter((m: any) => personaMap.has(m.persona_id) && productMap.has(m.product_id))
          .map((m: any) => {
            const parts = [
              `${productMap.get(m.product_id)} → ${personaMap.get(m.persona_id)} (${m.relevance_score}%)`
            ];
            if (m.is_primary_product) parts[0] = '⭐ ' + parts[0];
            if (m.custom_pitch) parts.push(`Pitch: "${m.custom_pitch}"`);
            if (m.key_benefits?.length) parts.push(`Benefits: ${m.key_benefits.slice(0, 2).join(', ')}`);
            return parts.join(' | ');
          });
        console.log('Loaded', productPersonaContext.length, 'product-persona mappings');
      }

      if (historyResult.data) {
        recentTopics = historyResult.data.map(h => h.topic);
      }
    }

    // Build system prompt with extended context including Industry Memory
    const systemPrompt = buildSystemPrompt(
      brandContext, 
      contentGoal, 
      recentTopics, 
      personasContext, 
      productsContext, 
      productPersonaContext,
      industryMemory
    );

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
      hasIndustryMemory: !!industryMemory,
      industryVersion: industryMemory?.version,
      industryName: industryMemory?.name,
      forbiddenTermsCount: industryMemory?.forbidden_terms?.length || 0,
      complianceRulesCount: industryMemory?.compliance_rules?.length || 0,
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
  recentTopics?: string[],
  personasContext?: string[],
  productsContext?: string[],
  productPersonaContext?: string[],
  industryMemory?: IndustryMemory | null
): string {
  const goalLabels: Record<string, string> = {
    engagement: 'Tăng tương tác',
    awareness: 'Nâng cao nhận diện thương hiệu',
    conversion: 'Chuyển đổi / Bán hàng',
    education: 'Giáo dục khách hàng',
    expertise: 'Thể hiện chuyên môn',
  };

  const safeIndustryMemory = industryMemory ?? null;
  
  let prompt = `Bạn là AI trợ lý gợi ý ý tưởng content marketing chuyên nghiệp, thân thiện và sáng tạo.

## Vai trò của bạn:
- Giúp người dùng tìm ý tưởng content phù hợp với brand và mục tiêu của họ
- Đưa ra gợi ý cụ thể, có thể hành động được ngay
- Giải thích ngắn gọn tại sao mỗi ý tưởng phù hợp
- Sử dụng emoji phù hợp để tạo sự thân thiện`;

  // INJECT INDUSTRY MEMORY FIRST (Highest Priority)
  const industrySection = buildIndustryContextSection(safeIndustryMemory);
  if (industrySection) {
    prompt += industrySection;
  }

  prompt += `

## Nguyên tắc gợi ý topic:
1. Mỗi topic phải cụ thể, có góc nhìn rõ ràng (không chung chung)
2. Giải thích ngắn gọn WHY - tại sao topic này phù hợp với brand
3. Đề xuất format phù hợp: Multi-channel post, Video Script, hoặc Carousel
4. Tránh các topic đã được sử dụng gần đây
5. Cân bằng giữa evergreen content và trending topics
6. ${industryMemory ? 'TUÂN THỦ Industry Memory: Không gợi ý topic vi phạm từ cấm, compliance rules, hoặc claim restrictions' : 'Đảm bảo content phù hợp với ngành'}
7. ${industryMemory?.argument_patterns ? 'Áp dụng argument patterns: Sử dụng valid patterns, tránh forbidden patterns' : 'Sử dụng lập luận logic và thuyết phục'}

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

    // Extended brand info
    if (brandContext.uniqueValueProposition) {
      prompt += `
- **UVP:** ${brandContext.uniqueValueProposition}`;
    }

    if (brandContext.evergreenThemes?.length) {
      prompt += `
- **Evergreen Themes:** ${brandContext.evergreenThemes.join(', ')}`;
    }

    if (brandContext.targetAgeRange || brandContext.targetGender) {
      prompt += `
- **Target Audience:** ${brandContext.targetAgeRange || ''} ${brandContext.targetGender || ''}`;
    }
  }

  // Add enhanced personas context
  if (personasContext?.length) {
    prompt += `

## Customer Personas (ĐỐI TƯỢNG KHÁCH HÀNG - ENHANCED):
${personasContext.map(p => `- ${p}`).join('\n')}

### Hướng dẫn tạo content theo Persona:
- 📱 **Device Usage**: Nếu mobile-first → content ngắn, dễ scan, có emoji
- 🔧 **Tech Savviness**: Nếu low → giải thích đơn giản, tránh jargon
- 📊 **Funnel Stage**: TOFU → educational, MOFU → so sánh/case study, BOFU → CTA mạnh
- 💬 **Communication Style**: Adapt tone theo style (consultative = tư vấn sâu, direct = thẳng thắn)
→ Gợi ý topics GIẢI QUYẾT pain points, xử lý objections, hoặc khơi gợi desires của personas!`;
  }

  // Add products context
  if (productsContext?.length) {
    prompt += `

## Products/Services (SẢN PHẨM/DỊCH VỤ):
${productsContext.map(p => `- ${p}`).join('\n')}
→ Có thể gợi ý topics về use cases, benefits, testimonials của sản phẩm`;
  }

  // Add product-persona mappings
  if (productPersonaContext?.length) {
    prompt += `

## PRODUCT-PERSONA MAPPING (Sản phẩm phù hợp với từng Persona):
${productPersonaContext.map(m => `- ${m}`).join('\n')}

### Hướng dẫn sử dụng mappings:
- Khi gợi ý topic cho 1 persona, ưu tiên sản phẩm có relevance cao (>80%)
- Sử dụng custom pitch làm góc nhìn content khi có
- Kết hợp key_benefits với pain_points của persona để tạo topic hấp dẫn
- Topic có thể là: product use case + persona pain point giải quyết`;
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

  // Self-correction for compliance (if Industry Memory exists)
  if (industryMemory) {
    prompt += `

## 🔍 SELF-CORRECTION (Kiểm tra trước khi output):

Trước khi gợi ý BẤT KỲ topic nào, BẮT BUỘC kiểm tra:
[ ] Topic KHÔNG chứa từ cấm ngành? (${industryMemory.forbidden_terms?.slice(0, 3).join(', ')}...)
[ ] Topic KHÔNG vi phạm claim restrictions?
[ ] Góc viết phù hợp với compliance rules?
[ ] Argument pattern hợp lệ (không dùng forbidden patterns)?

Nếu FAIL bất kỳ mục nào → KHÔNG gợi ý topic đó, thay bằng alternative phù hợp.
Nếu user yêu cầu topic vi phạm → Từ chối nhẹ nhàng, giải thích lý do, đề xuất alternative.`;
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
