import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

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

    const { brand_template_id, role_hint, count } = await req.json();
    if (!brand_template_id) {
      return new Response(JSON.stringify({ error: "brand_template_id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch brand context
    const { data: brand, error: brandErr } = await supabase
      .from('brand_templates')
      .select('name, tone_of_voice, target_audience, brand_personality, do_list, dont_list, content_pillars, industry_template_id')
      .eq('id', brand_template_id)
      .single();

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

    const numCharacters = Math.min(count || 1, 3);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `Bạn là chuyên gia xây dựng nhân vật đại diện thương hiệu cho content marketing.
Dựa trên thông tin brand, tạo ${numCharacters} nhân vật phù hợp để xuất hiện trong video/content.
Nhân vật phải khớp tone, đối tượng mục tiêu, và ngành nghề của brand.

Quy tắc:
- Mỗi nhân vật có ngoại hình rõ ràng, dễ nhận diện, phù hợp văn hóa Việt Nam
- Trang phục phải phù hợp ngành và tông brand
- Mô tả chi tiết để AI video giữ nhất quán
- Nếu có ${numCharacters} nhân vật, tạo sự đa dạng (tuổi, vai trò) nhưng cùng aesthetic
${role_hint ? `- Gợi ý vai trò: ${role_hint}` : ''}`;

    const userPrompt = `BRAND: ${brand.name}
TONE: ${brand.tone_of_voice || 'chuyên nghiệp'}
ĐỐI TƯỢNG: ${brand.target_audience || 'chung'}
TÍNH CÁCH BRAND: ${brand.brand_personality || ''}
NÊN LÀM: ${(brand.do_list || []).join(', ')}
KHÔNG NÊN: ${(brand.dont_list || []).join(', ')}
TRỤ CỘT NỘI DUNG: ${(brand.content_pillars || []).join(', ')}${industryContext}

Tạo ${numCharacters} nhân vật đại diện phù hợp nhất cho brand này.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
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
                        description: { type: "string", description: "Mô tả 2-3 câu về nhân vật, vai trò và phong cách" },
                        gender: { type: "string", enum: ["Nam", "Nữ"] },
                        age_range: { type: "string", enum: ["18-25", "25-35", "35-45", "45-55", "55+"] },
                        hair: { type: "string", description: "Kiểu tóc và màu tóc (tiếng Việt)" },
                        skin_tone: { type: "string", enum: ["Trắng sáng", "Ngăm", "Nâu ấm", "Da ngâm đậm"] },
                        body_type: { type: "string", description: "Vóc dáng ngắn gọn (tiếng Việt)" },
                        distinctive_features: { type: "string", description: "Đặc điểm nhận dạng nổi bật" },
                        wardrobe: { type: "string", description: "Trang phục mặc định phù hợp brand" },
                      },
                      required: ["name", "description", "gender", "age_range", "hair", "skin_tone", "wardrobe"],
                    },
                  },
                },
                required: ["characters"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "create_characters" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      const errText = await aiResponse.text();
      console.error("[generate-character] AI error:", status, errText);
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, vui lòng thử lại sau." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Hết quota AI, vui lòng nạp thêm credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI generation failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    let characters: any[] = [];
    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      characters = parsed.characters || [];
    } else {
      const content = aiData.choices?.[0]?.message?.content || '';
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
      },
      wardrobe: c.wardrobe || '',
    }));

    console.log(`[generate-character] Generated ${profiles.length} character(s) for brand "${brand.name}"`);

    return new Response(JSON.stringify({ characters: profiles }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("[generate-character] Error:", e);
    return new Response(JSON.stringify({ error: e.message || "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
