import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { withPerf } from "../_shared/middleware/perf.ts";
import { generateTraceId } from "../_shared/logger.ts";
import { callAIWithMetrics } from "../_shared/ai-provider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(withPerf({ functionName: 'generate-character', slowThresholdMs: 30000 }, async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const traceId = generateTraceId();

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { brand_template_id, role_hint, count, existing_names, video_type } = await req.json();
    if (!brand_template_id) {
      return new Response(JSON.stringify({ error: "brand_template_id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch brand context including voice variants
    const { data: brand, error: brandErr } = await supabase
      .from('brand_templates')
        .select('name, tone_of_voice, content_pillars, industry_template_id, voice_variants, organization_id')
        .eq('id', brand_template_id)
        .maybeSingle();

    if (brandErr || !brand) {
      return new Response(JSON.stringify({ error: "Brand not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch industry context if available
    let industryContext = '';
    if (brand.industry_template_id) {
      const { data: industry } = await supabase
        .from('industry_templates')
        .select('name, description')
        .eq('id', brand.industry_template_id)
        .single();
      if (industry) {
        industryContext = `\nNgành: ${industry.name}. ${industry.description || ''}`;
      }
    }

    const numCharacters = Math.min(Math.max(count || 1, 1), 3);

    // Model + provider routing handled by callAIWithMetrics (admin override → user's provider key → fallback)

    // Build deduplication context
    const existingList = Array.isArray(existing_names) && existing_names.length > 0
      ? `\n\nNHÂN VẬT ĐÃ CÓ (KHÔNG tạo trùng tên hoặc ngoại hình giống): ${existing_names.join(', ')}`
      : '';

    // Build voice variant context for selected video type
    let voiceVariantContext = '';
    const variants = Array.isArray(brand.voice_variants) ? brand.voice_variants : [];
    if (video_type && variants.length > 0) {
      const matched = variants.find((v: any) => v.video_type === video_type);
      if (matched) {
        voiceVariantContext = `\n\nBRAND VOICE VARIANT cho thể loại "${video_type}":
- Giọng vùng miền ưu tiên: ${matched.regional_accent || 'tự chọn'}
- Xưng hô mặc định: ${matched.honorific || 'tự chọn'}
- Phong cách thoại: ${matched.speech_style || 'tự chọn'}
- Tone: ${matched.tone || 'theo brand'}
→ Nhân vật PHẢI tuân thủ các thiết lập giọng này.`;
      }
    }
    const variantsList = variants.length > 0
      ? `\nCác biến thể giọng có sẵn: ${variants.map((v: any) => v.video_type).join(', ')}`
      : '';

    const systemPrompt = `Bạn là chuyên gia xây dựng nhân vật đại diện thương hiệu cho content marketing video tại Việt Nam.
Dựa trên thông tin brand, tạo ${numCharacters} nhân vật phù hợp để xuất hiện trong video/content.
Nhân vật phải khớp tone, đối tượng mục tiêu, và ngành nghề của brand.

Quy tắc:
- Mỗi nhân vật có ngoại hình rõ ràng, dễ nhận diện, phù hợp văn hóa Việt Nam
- Trang phục phải phù hợp ngành và tông brand
- Mô tả chi tiết để AI video giữ nhất quán xuyên suốt các scene
- Nếu có ${numCharacters} nhân vật, tạo sự đa dạng (tuổi, vai trò, giới tính) nhưng cùng aesthetic
- suggested_voice_style: mô tả ngắn phong cách giọng nói phù hợp (VD: "Trầm ấm, chậm rãi", "Tươi sáng, năng động")
- honorific: đại từ xưng hô phù hợp vai trò và tông brand (VD: bác sĩ 40 tuổi thì "tôi" hoặc "mình"; nhân vật trẻ gần gũi thì "mình" hoặc "em")
- speech_style: phong cách diễn đạt khi nói (VD: "Nhẹ nhàng thuyết phục, dùng nhiều ví dụ thực tế" hoặc "Năng động, hay dùng từ trend")
- regional_accent: giọng vùng miền phù hợp brand (VD: "Bắc Hà Nội" cho brand chuyên nghiệp, "Nam Sài Gòn" cho brand trẻ trung)
${role_hint ? `- Gợi ý vai trò từ user: ${role_hint}` : ''}${existingList}${voiceVariantContext}`;

    const userPrompt = `BRAND: ${brand.name}
TONE: ${brand.tone_of_voice || 'chuyên nghiệp'}
ĐỐI TƯỢNG: ${brand.target_audience || 'chung'}
TÍNH CÁCH BRAND: ${brand.brand_personality || ''}
NÊN LÀM: ${(brand.do_list || []).join(', ')}
KHÔNG NÊN: ${(brand.dont_list || []).join(', ')}
TRỤ CỘT NỘI DUNG: ${(brand.content_pillars || []).join(', ')}${industryContext}${variantsList}
${video_type ? `\nTHỂ LOẠI VIDEO: ${video_type}` : ''}

Tạo ${numCharacters} nhân vật đại diện phù hợp nhất cho brand này.`;

    console.log(`[generate-character] traceId=${traceId} brand="${brand.name}" count=${numCharacters} existingNames=${existing_names?.length || 0}`);

    const result = await callAIWithMetrics(supabase, {
      functionName: 'generate-character',
      organizationId: (brand as any).organization_id,
      userId: user.id,
      brandTemplateId: brand_template_id,
      traceId,
      actionType: 'generate_character',
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "create_characters",
            description: "Create character profiles matching the brand",
            parameters: {
              type: "object",
              properties: {
                characters: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string", description: "Tên nhân vật (tiếng Việt)" },
                      description: { type: "string", description: "Mô tả 2-3 câu về nhân vật, vai trò và phong cách giao tiếp" },
                      gender: { type: "string", enum: ["Nam", "Nữ"] },
                      age_range: { type: "string", enum: ["18-25", "25-35", "35-45", "45-55", "55+"] },
                      hair: { type: "string", description: "Kiểu tóc và màu tóc chi tiết (tiếng Việt)" },
                      skin_tone: { type: "string", enum: ["Trắng sáng", "Ngăm", "Nâu ấm", "Da ngâm đậm"] },
                      body_type: { type: "string", description: "Vóc dáng ngắn gọn (tiếng Việt, VD: Thon gọn, Cân đối, Tráng kiện)" },
                      distinctive_features: { type: "string", description: "Đặc điểm nhận dạng nổi bật (kính, nốt ruồi, hình xăm...)" },
                      wardrobe: { type: "string", description: "Trang phục mặc định phù hợp brand và ngành" },
                      suggested_voice_style: { type: "string", description: "Phong cách giọng nói gợi ý (VD: Trầm ấm chậm rãi, Tươi sáng năng động)" },
                      honorific: { type: "string", description: "Đại từ xưng hô mặc định (VD: tôi, mình, em, chị, anh)" },
                      speech_style: { type: "string", description: "Phong cách diễn đạt khi nói (VD: Nhẹ nhàng thuyết phục, Năng động hay dùng từ trend)" },
                      regional_accent: { type: "string", description: "Giọng vùng miền (VD: Bắc Hà Nội, Nam Sài Gòn, Trung Huế)" },
                    },
                    required: ["name", "description", "gender", "age_range", "hair", "skin_tone", "body_type", "wardrobe", "suggested_voice_style", "honorific", "speech_style", "regional_accent"],
                  },
                },
              },
              required: ["characters"],
            },
          },
        },
      ],
      toolChoice: { type: "function", function: { name: "create_characters" } },
    });

    if (!result.success) {
      console.error(`[generate-character] traceId=${traceId} AI failed:`, result.error);
      const errMsg = result.error || '';
      if (errMsg.includes('429') || /rate/i.test(errMsg)) {
        return new Response(JSON.stringify({ error: "Rate limited, vui lòng thử lại sau." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (errMsg.includes('402') || /quota|credit|payment/i.test(errMsg)) {
        return new Response(JSON.stringify({ error: "Hết quota AI, vui lòng nạp thêm credits hoặc cấu hình API key riêng." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: `AI generation failed: ${errMsg}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = result.data;
    const toolCall = aiData?.choices?.[0]?.message?.tool_calls?.[0];

    let characters: any[] = [];
    if (toolCall?.function?.arguments) {
      const parsed = typeof toolCall.function.arguments === 'string'
        ? JSON.parse(toolCall.function.arguments)
        : toolCall.function.arguments;
      characters = parsed.characters || [];
    } else {
      const content = aiData?.choices?.[0]?.message?.content || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        characters = parsed.characters || [];
      }
    }

    if (characters.length === 0) {
      return new Response(JSON.stringify({ error: "AI không tạo được nhân vật, vui lòng thử lại." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Map to CharacterProfileInput format
    const profiles = characters.map((c: any) => ({
      name: c.name,
      description: c.description || '',
      appearance: {
        gender: c.gender,
        age_range: c.age_range,
        hair: c.hair,
        skin_tone: c.skin_tone,
        body_type: c.body_type || '',
        distinctive_features: c.distinctive_features || '',
        honorific: c.honorific || '',
        speech_style: c.speech_style || '',
        regional_accent: c.regional_accent || '',
      },
      wardrobe: c.wardrobe || '',
      suggested_voice_style: c.suggested_voice_style || '',
    }));

    console.log(`[generate-character] traceId=${traceId} Generated ${profiles.length} character(s) for brand "${brand.name}" via ${result.provider}/${result.model}`);

    return new Response(JSON.stringify({ characters: profiles }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error(`[generate-character] traceId=${traceId} Error:`, e);
    return new Response(JSON.stringify({ error: e.message || "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}));
