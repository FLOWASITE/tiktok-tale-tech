import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AdCopyRequest {
  topic: string;
  platform: 'meta_feed' | 'meta_story' | 'google_rsa' | 'tiktok' | 'zalo' | 'linkedin';
  objective: string;
  landingUrl?: string;
  audienceBrief?: string;
  funnelStage: string;
  variationCount: number;
  brandTemplateId?: string;
  productId?: string;
  personaId?: string;
  campaignId?: string;
  organizationId: string;
  userId: string;
}

interface CharLimitConfig {
  ideal?: number;
  max: number;
}

interface PlatformLimits {
  primary_text?: CharLimitConfig;
  headline?: CharLimitConfig;
  description?: CharLimitConfig;
}

// Character limits per platform
const CHAR_LIMITS: Record<string, PlatformLimits> = {
  meta_feed: {
    primary_text: { ideal: 125, max: 500 },
    headline: { ideal: 40, max: 60 },
    description: { ideal: 25, max: 30 },
  },
  meta_story: {
    primary_text: { ideal: 90, max: 200 },
    headline: { ideal: 30, max: 40 },
  },
  google_rsa: {
    headline: { max: 30 },
    description: { max: 90 },
  },
  tiktok: {
    primary_text: { ideal: 80, max: 150 },
    headline: { ideal: 30, max: 50 },
  },
  zalo: {
    primary_text: { ideal: 100, max: 200 },
    headline: { ideal: 30, max: 50 },
    description: { ideal: 25, max: 40 },
  },
  linkedin: {
    primary_text: { ideal: 150, max: 600 },
    headline: { ideal: 70, max: 200 },
    description: { ideal: 60, max: 100 },
  },
};

// Policy checker rules
const POLICY_RULES = {
  forbidden_patterns: [
    /click here/gi,
    /buy now!!+/gi,
    /100% guarantee/gi,
    /earn \$?\d+ per day/gi,
    /lose \d+ kg in \d+ day/gi,
  ],
  excessive_caps_threshold: 0.5,
  excessive_punctuation: /[!?]{3,}/g,
};

interface PolicyWarning {
  field: string;
  type: string;
  message: string;
  severity: string;
}

function checkPolicyViolations(text: string, field: string): PolicyWarning[] {
  const warnings: PolicyWarning[] = [];
  
  // Check forbidden patterns
  for (const pattern of POLICY_RULES.forbidden_patterns) {
    if (pattern.test(text)) {
      warnings.push({
        field,
        type: 'policy_violation',
        message: `Text có thể vi phạm chính sách quảng cáo`,
        severity: 'warning',
      });
      break;
    }
  }
  
  // Check excessive capitalization
  const upperCount = (text.match(/[A-Z]/g) || []).length;
  const letterCount = (text.match(/[a-zA-Z]/g) || []).length;
  if (letterCount > 0 && upperCount / letterCount > POLICY_RULES.excessive_caps_threshold) {
    warnings.push({
      field,
      type: 'best_practice',
      message: 'Quá nhiều chữ viết hoa có thể giảm hiệu quả',
      severity: 'info',
    });
  }
  
  // Check excessive punctuation
  if (POLICY_RULES.excessive_punctuation.test(text)) {
    warnings.push({
      field,
      type: 'best_practice',
      message: 'Tránh sử dụng quá nhiều dấu chấm than hoặc hỏi',
      severity: 'info',
    });
  }
  
  return warnings;
}

function countChars(text: string | null): number {
  return text?.length || 0;
}

function checkCharLimits(text: string | null, field: string, limits: CharLimitConfig): PolicyWarning[] {
  const warnings: PolicyWarning[] = [];
  const count = countChars(text);
  
  if (count > limits.max) {
    warnings.push({
      field,
      type: 'character_limit',
      message: `Vượt ${count - limits.max} ký tự (tối đa ${limits.max})`,
      severity: 'error',
    });
  } else if (limits.ideal && count > limits.ideal) {
    warnings.push({
      field,
      type: 'character_limit',
      message: `Nên rút gọn (lý tưởng ${limits.ideal} ký tự)`,
      severity: 'warning',
    });
  }
  
  return warnings;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getUser(token);
    if (claimsError || !claimsData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const body: AdCopyRequest = await req.json();
    const { 
      topic, platform, objective, landingUrl, audienceBrief, 
      funnelStage, variationCount, brandTemplateId, productId, 
      personaId, campaignId, organizationId 
    } = body;
    const userId = claimsData.user.id;

    console.log('[generate-ad-copy] Request:', { topic, platform, objective, variationCount });

    // Fetch brand context
    let brandContext = '';
    if (brandTemplateId) {
      const { data: brand } = await supabase
        .from('brand_templates')
        .select('brand_name, brand_guideline, tone_of_voice, preferred_words, forbidden_words, cta_templates')
        .eq('id', brandTemplateId)
        .single();
      
      if (brand) {
        brandContext = `
Brand: ${brand.brand_name}
Guideline: ${brand.brand_guideline || ''}
Tone: ${(brand.tone_of_voice || []).join(', ')}
Preferred Words: ${(brand.preferred_words || []).join(', ')}
Forbidden Words: ${(brand.forbidden_words || []).join(', ')}
CTA Templates: ${(brand.cta_templates || []).join(', ')}
`.trim();
      }
    }

    // Fetch product context
    let productContext = '';
    if (productId) {
      const { data: product } = await supabase
        .from('brand_products')
        .select('name, description, benefits, unique_selling_points, pain_points_solved')
        .eq('id', productId)
        .single();
      
      if (product) {
        productContext = `
Product: ${product.name}
Description: ${product.description || ''}
Benefits: ${(product.benefits || []).join(', ')}
USPs: ${(product.unique_selling_points || []).join(', ')}
Solves: ${(product.pain_points_solved || []).join(', ')}
`.trim();
      }
    }

    // Fetch persona context
    let personaContext = '';
    if (personaId) {
      const { data: persona } = await supabase
        .from('customer_personas')
        .select('name, age_range, pain_points, desires, buying_motivation, objections')
        .eq('id', personaId)
        .single();
      
      if (persona) {
        personaContext = `
Target Persona: ${persona.name}
Age: ${persona.age_range || ''}
Pain Points: ${(persona.pain_points || []).join(', ')}
Desires: ${(persona.desires || []).join(', ')}
Buying Motivation: ${(persona.buying_motivation || []).join(', ')}
Objections: ${(persona.objections || []).join(', ')}
`.trim();
      }
    }

    // Build platform-specific prompt
    const limits = CHAR_LIMITS[platform] || CHAR_LIMITS.meta_feed;
    let platformInstructions = '';
    let outputFormat = '';

    if (platform === 'google_rsa') {
      platformInstructions = `
Platform: Google Responsive Search Ads (RSA)
- Generate 15 unique headlines (max 30 characters each)
- Generate 4 unique descriptions (max 90 characters each)
- Headlines should be diverse: include features, benefits, CTAs, questions
- Descriptions should complement headlines, not repeat them
- Use dynamic keyword insertion hints where appropriate
`;
      outputFormat = `
Return JSON array with ${variationCount} variations:
[{
  "headlines": ["headline1", "headline2", ...(15 headlines)],
  "descriptions": ["desc1", "desc2", "desc3", "desc4"]
}]`;
    } else if (platform === 'tiktok') {
      const ptLimits = limits.primary_text || { ideal: 80, max: 150 };
      const hlLimits = limits.headline || { ideal: 30, max: 50 };
      
      platformInstructions = `
Platform: TikTok In-Feed Ads
- Primary Text: ${ptLimits.ideal} chars ideal, max ${ptLimits.max} (hiển thị ở overlay)
- Headline: ${hlLimits.ideal} chars ideal, max ${hlLimits.max}
- Tone: Casual, trendy, Gen Z friendly
- Use hooks that work for vertical video
- Avoid overly salesy language
- Consider trending sounds/formats references
`;
      outputFormat = `
Return JSON array with ${variationCount} variations:
[{
  "primary_text": "...",
  "headline": "...",
  "cta_button": "learn_more|shop_now|sign_up|get_offer|download"
}]`;
    } else if (platform === 'zalo') {
      const ptLimits = limits.primary_text || { ideal: 100, max: 200 };
      const hlLimits = limits.headline || { ideal: 30, max: 50 };
      const descLimits = limits.description || { ideal: 25, max: 40 };
      
      platformInstructions = `
Platform: Zalo Official Account Ads
- Primary Text: ${ptLimits.ideal} chars ideal, max ${ptLimits.max}
- Headline: ${hlLimits.ideal} chars ideal, max ${hlLimits.max}
- Description: ${descLimits.ideal} chars ideal, max ${descLimits.max}
- Tone: Friendly, conversational, Vietnamese local
- Optimize for Zalo OA message style
- Use Vietnamese colloquial language appropriately
`;
      outputFormat = `
Return JSON array with ${variationCount} variations:
[{
  "primary_text": "...",
  "headline": "...",
  "description": "...",
  "cta_button": "learn_more|shop_now|send_message|get_offer|contact_us"
}]`;
    } else if (platform === 'linkedin') {
      const ptLimits = limits.primary_text || { ideal: 150, max: 600 };
      const hlLimits = limits.headline || { ideal: 70, max: 200 };
      const descLimits = limits.description || { ideal: 60, max: 100 };
      
      platformInstructions = `
Platform: LinkedIn Sponsored Content
- Primary Text: ${ptLimits.ideal} chars ideal, max ${ptLimits.max} (intro text)
- Headline: ${hlLimits.ideal} chars ideal, max ${hlLimits.max}
- Description: ${descLimits.ideal} chars ideal, max ${descLimits.max}
- Tone: Professional, thought leadership
- Use industry jargon appropriately
- Focus on business value, ROI, career growth
- Include data/statistics when relevant
`;
      outputFormat = `
Return JSON array with ${variationCount} variations:
[{
  "primary_text": "...",
  "headline": "...",
  "description": "...",
  "cta_button": "learn_more|sign_up|download|get_quote|contact_us"
}]`;
    } else {
      const metaType = platform === 'meta_story' ? 'Story' : 'Feed';
      const ptLimits = limits.primary_text || { ideal: 125, max: 500 };
      const hlLimits = limits.headline || { ideal: 40, max: 60 };
      const descLimits = limits.description || { ideal: 25, max: 30 };
      
      platformInstructions = `
Platform: Meta ${metaType} Ads (Facebook & Instagram)
- Primary Text: ${ptLimits.ideal || 125} chars ideal, max ${ptLimits.max || 500}
- Headline: ${hlLimits.ideal || 40} chars ideal, max ${hlLimits.max || 60}
- Link Description: ${descLimits.ideal || 25} chars ideal, max ${descLimits.max || 30}
- Optimize for mobile-first viewing
`;
      outputFormat = `
Return JSON array with ${variationCount} variations:
[{
  "primary_text": "...",
  "headline": "...",
  "description": "...",
  "cta_button": "learn_more|shop_now|sign_up|get_offer|contact_us|book_now"
}]`;
    }

    // Objective-based messaging
    const objectiveGuidance: Record<string, string> = {
      traffic: 'Focus on curiosity, benefits, and clear value proposition',
      conversions: 'Use urgency, social proof, specific numbers, and strong CTAs',
      engagement: 'Ask questions, be relatable, encourage interaction',
      awareness: 'Be memorable, focus on brand values and positioning',
      leads: 'Highlight value proposition, build trust, reduce friction',
    };

    // Funnel stage messaging
    const funnelGuidance: Record<string, string> = {
      awareness: 'Problem agitation, attention-grabbing hooks, introduce the solution',
      consideration: 'Feature-benefit comparison, testimonials, address objections',
      conversion: 'Urgency, limited-time offers, strong social proof, clear CTA',
      retention: 'Loyalty rewards, exclusive offers, community belonging',
    };

    const systemPrompt = `You are an expert advertising copywriter specializing in digital ads. 
Generate high-converting ad copy following these strict guidelines:

${platformInstructions}

Objective: ${objective}
Guidance: ${objectiveGuidance[objective] || objectiveGuidance.traffic}

Funnel Stage: ${funnelStage}
Guidance: ${funnelGuidance[funnelStage] || funnelGuidance.awareness}

${brandContext ? `\n--- BRAND CONTEXT ---\n${brandContext}` : ''}
${productContext ? `\n--- PRODUCT CONTEXT ---\n${productContext}` : ''}
${personaContext ? `\n--- TARGET PERSONA ---\n${personaContext}` : ''}
${audienceBrief ? `\n--- AUDIENCE BRIEF ---\n${audienceBrief}` : ''}
${landingUrl ? `\n--- LANDING URL ---\n${landingUrl}` : ''}

RULES:
1. Respect character limits strictly
2. Write in Vietnamese unless brand context specifies otherwise
3. Avoid policy-violating language (misleading claims, excessive caps, sensational terms)
4. Each variation must have a unique angle/approach
5. Use emojis sparingly and appropriately for the platform

${outputFormat}

IMPORTANT: Return ONLY valid JSON, no markdown or explanation.`;

    const userPrompt = `Generate ${variationCount} ad copy variations for: ${topic}`;

    // Call Lovable AI Gateway
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const aiResponse = await fetch('https://ai.lovable.dev/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${lovableApiKey}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.8,
        max_tokens: 4000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('[generate-ad-copy] AI error:', errorText);
      throw new Error(`AI call failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || '';
    
    // Parse JSON response
    let variations: any[];
    try {
      // Clean markdown if present
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      variations = JSON.parse(cleanContent);
    } catch (e) {
      console.error('[generate-ad-copy] Parse error:', content);
      throw new Error('Failed to parse AI response');
    }

    // Create ad copy record
    const { data: adCopy, error: insertError } = await supabase
      .from('ad_copies')
      .insert({
        title: topic.substring(0, 100),
        topic,
        platform,
        objective,
        landing_url: landingUrl || null,
        brand_template_id: brandTemplateId || null,
        campaign_id: campaignId || null,
        organization_id: organizationId,
        user_id: userId,
        audience_brief: audienceBrief || null,
        product_id: productId || null,
        persona_id: personaId || null,
        funnel_stage: funnelStage,
        status: 'draft',
      })
      .select()
      .single();

    if (insertError) {
      console.error('[generate-ad-copy] Insert error:', insertError);
      throw new Error(`Failed to save ad copy: ${insertError.message}`);
    }

    // Process and save variations
    const variationLabels = ['A', 'B', 'C', 'D', 'E'];
    const processedVariations = [];

    for (let i = 0; i < variations.length; i++) {
      const v = variations[i];
      const label = variationLabels[i] || `V${i + 1}`;
      const charCounts: Record<string, number> = {};
      const policyWarnings: PolicyWarning[] = [];

      if (platform === 'google_rsa') {
        // Process RSA variations
        charCounts.headlines = v.headlines?.length || 0;
        charCounts.descriptions = v.descriptions?.length || 0;
        
        // Check each headline/description
        v.headlines?.forEach((h: string, idx: number) => {
          charCounts[`headline_${idx}`] = h.length;
          if (h.length > 30) {
            policyWarnings.push({
              field: `headline_${idx}`,
              type: 'character_limit',
              message: `Headline ${idx + 1} vượt ${h.length - 30} ký tự`,
              severity: 'error',
            });
          }
          policyWarnings.push(...checkPolicyViolations(h, `headline_${idx}`));
        });
        
        v.descriptions?.forEach((d: string, idx: number) => {
          charCounts[`description_${idx}`] = d.length;
          if (d.length > 90) {
            policyWarnings.push({
              field: `description_${idx}`,
              type: 'character_limit',
              message: `Description ${idx + 1} vượt ${d.length - 90} ký tự`,
              severity: 'error',
            });
          }
          policyWarnings.push(...checkPolicyViolations(d, `description_${idx}`));
        });
      } else {
        // Process Meta variations
        charCounts.primary_text = countChars(v.primary_text);
        charCounts.headline = countChars(v.headline);
        charCounts.description = countChars(v.description);
        
        if (limits.primary_text) {
          policyWarnings.push(...checkCharLimits(v.primary_text, 'primary_text', limits.primary_text));
        }
        if (limits.headline) {
          policyWarnings.push(...checkCharLimits(v.headline, 'headline', limits.headline));
        }
        if (limits.description) {
          policyWarnings.push(...checkCharLimits(v.description, 'description', limits.description));
        }
        
        // Policy checks
        if (v.primary_text) policyWarnings.push(...checkPolicyViolations(v.primary_text, 'primary_text'));
        if (v.headline) policyWarnings.push(...checkPolicyViolations(v.headline, 'headline'));
      }

      const variationData = {
        ad_copy_id: adCopy.id,
        variation_label: label,
        primary_text: v.primary_text || null,
        headline: v.headline || null,
        description: v.description || null,
        cta_button: v.cta_button || 'learn_more',
        headlines: platform === 'google_rsa' ? v.headlines : [],
        descriptions: platform === 'google_rsa' ? v.descriptions : [],
        char_counts: charCounts,
        policy_warnings: policyWarnings,
        is_approved: false,
      };

      processedVariations.push(variationData);
    }

    // Insert all variations
    const { data: savedVariations, error: varError } = await supabase
      .from('ad_copy_variations')
      .insert(processedVariations)
      .select();

    if (varError) {
      console.error('[generate-ad-copy] Variations insert error:', varError);
    }

    const response = {
      ...adCopy,
      variations: savedVariations || [],
      policyCheck: {
        passed: processedVariations.every(v => 
          v.policy_warnings.filter((w: PolicyWarning) => w.severity === 'error').length === 0
        ),
        totalWarnings: processedVariations.reduce((sum, v) => sum + v.policy_warnings.length, 0),
      },
    };

    console.log('[generate-ad-copy] Success:', { id: adCopy.id, variations: savedVariations?.length });

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[generate-ad-copy] Error:', error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
