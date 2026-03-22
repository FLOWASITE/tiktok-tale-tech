/**
 * Extract Regulation Content Edge Function
 * Uses Lovable AI to extract structured data from regulation text
 * Returns: document info, summary, key changes, claim restrictions, compliance impacts
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExtractRequest {
  text: string;
  category: string;
  jurisdiction: string;
  node_id?: string; // Optional: update node directly after extraction
  source_url?: string;
}

interface ExtractedData {
  document_number: string | null;
  document_type: string | null;
  document_title: string;
  effective_date: string | null;
  issuing_authority: string | null;
  summary: string;
  key_changes: string[];
  claim_restrictions: Array<{
    claim: string;
    restriction_type: 'forbidden' | 'requires_proof' | 'disclaimer_required';
    alternative?: string;
  }>;
  compliance_impacts: Array<{
    industry_code: string;
    impact_type: 'new_rule' | 'modified_rule' | 'removed_rule';
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }>;
  affected_industries: string[];
  confidence_score: number;
}

interface ExtractResult {
  success: boolean;
  data: ExtractedData | null;
  error?: string;
}

/**
 * Build extraction prompt based on jurisdiction
 */
function buildExtractionPrompt(text: string, category: string, jurisdiction: string): string {
  const isVietnamese = jurisdiction === 'VN';
  
  const prompt = isVietnamese ? `
Từ văn bản pháp luật Việt Nam dưới đây, trích xuất thông tin có cấu trúc JSON theo format sau:

{
  "document_number": "Số hiệu văn bản (VD: 38/2024/QH15, 108/2019/NĐ-CP)",
  "document_type": "Loại văn bản (Luật, Nghị định, Thông tư, Quyết định...)",
  "document_title": "Tên đầy đủ của văn bản",
  "effective_date": "Ngày có hiệu lực (format: YYYY-MM-DD hoặc null nếu không xác định)",
  "issuing_authority": "Cơ quan ban hành (VD: Quốc hội, Chính phủ, Bộ Tài chính...)",
  "summary": "Tóm tắt nội dung chính 200-500 từ, focus vào những điểm quan trọng nhất",
  "key_changes": ["Danh sách các thay đổi quan trọng so với quy định trước đó"],
  "claim_restrictions": [
    {
      "claim": "Nội dung claim bị cấm/hạn chế",
      "restriction_type": "forbidden | requires_proof | disclaimer_required",
      "alternative": "Cách diễn đạt thay thế được phép (nếu có)"
    }
  ],
  "compliance_impacts": [
    {
      "industry_code": "Mã ngành bị ảnh hưởng (VD: accounting_tax, food_beverage, real_estate)",
      "impact_type": "new_rule | modified_rule | removed_rule",
      "description": "Mô tả tác động cụ thể",
      "severity": "low | medium | high | critical"
    }
  ],
  "affected_industries": ["Danh sách các ngành nghề bị ảnh hưởng"],
  "confidence_score": 0.85
}

Lưu ý:
- Chỉ trích xuất thông tin có trong văn bản, không suy đoán
- claim_restrictions: focus vào các điều khoản liên quan đến quảng cáo, marketing, nội dung
- compliance_impacts: xác định rõ tác động đến ngành ${category}
- confidence_score: 0.0-1.0 dựa trên mức độ rõ ràng của văn bản

Danh mục ngành liên quan: ${category}

VĂN BẢN:
${text.substring(0, 15000)}
` : `
Extract structured information from the following legal/regulatory document:

{
  "document_number": "Document reference number",
  "document_type": "Type of document (Law, Regulation, Directive, Guidance...)",
  "document_title": "Full official title",
  "effective_date": "Effective date (format: YYYY-MM-DD or null)",
  "issuing_authority": "Issuing body/authority",
  "summary": "Summary of main content (200-500 words)",
  "key_changes": ["List of key changes from previous regulations"],
  "claim_restrictions": [
    {
      "claim": "Restricted/prohibited claim content",
      "restriction_type": "forbidden | requires_proof | disclaimer_required",
      "alternative": "Permitted alternative phrasing (if any)"
    }
  ],
  "compliance_impacts": [
    {
      "industry_code": "Affected industry code",
      "impact_type": "new_rule | modified_rule | removed_rule",
      "description": "Specific impact description",
      "severity": "low | medium | high | critical"
    }
  ],
  "affected_industries": ["List of affected industries"],
  "confidence_score": 0.85
}

Notes:
- Only extract information present in the document
- Focus on advertising, marketing, and content-related restrictions
- Identify specific impacts on the ${category} sector
- confidence_score: 0.0-1.0 based on document clarity

Category: ${category}
Jurisdiction: ${jurisdiction}

DOCUMENT:
${text.substring(0, 15000)}
`;

  return prompt;
}

/**
 * Call Lovable AI to extract structured data
 */
async function extractWithAI(text: string, category: string, jurisdiction: string): Promise<ExtractedData> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    throw new Error('LOVABLE_API_KEY is not configured');
  }
  
  const prompt = buildExtractionPrompt(text, category, jurisdiction);
  
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'system',
          content: `You are a legal document analyzer specializing in ${jurisdiction} regulations. 
Extract structured information from regulatory documents accurately.
Always respond with valid JSON matching the requested schema.
Be conservative with confidence scores - only high scores for clearly stated information.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.2,
      max_tokens: 4000,
    }),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('[extract-regulation] AI API error:', response.status, errorText);
    throw new Error(`AI API error: ${response.status}`);
  }
  
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  
  if (!content) {
    throw new Error('No content in AI response');
  }
  
  // Parse JSON from response (handle markdown code blocks)
  let jsonStr = content;
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1];
  }
  
  try {
    const extracted = JSON.parse(jsonStr);
    
    // Validate and normalize the response
    return {
      document_number: extracted.document_number || null,
      document_type: extracted.document_type || null,
      document_title: extracted.document_title || 'Untitled Document',
      effective_date: extracted.effective_date || null,
      issuing_authority: extracted.issuing_authority || null,
      summary: extracted.summary || '',
      key_changes: Array.isArray(extracted.key_changes) ? extracted.key_changes : [],
      claim_restrictions: Array.isArray(extracted.claim_restrictions) ? extracted.claim_restrictions : [],
      compliance_impacts: Array.isArray(extracted.compliance_impacts) ? extracted.compliance_impacts : [],
      affected_industries: Array.isArray(extracted.affected_industries) ? extracted.affected_industries : [],
      confidence_score: typeof extracted.confidence_score === 'number' 
        ? Math.min(1, Math.max(0, extracted.confidence_score)) 
        : 0.5,
    };
  } catch (parseError) {
    console.error('[extract-regulation] JSON parse error:', parseError, 'Content:', jsonStr);
    throw new Error('Failed to parse AI response as JSON');
  }
}

Deno.Deno.serve(withPerf({ functionName: 'extract-regulation-content', slowThresholdMs: 30000 }, async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const { text, category, jurisdiction, node_id, source_url }: ExtractRequest = await req.json();
    
    if (!text || text.length < 100) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          data: null,
          error: 'Text content is required (minimum 100 characters)' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    if (!category || !jurisdiction) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          data: null,
          error: 'Category and jurisdiction are required' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    console.log(`[extract-regulation] Processing ${text.length} chars for ${jurisdiction}/${category}`);
    
    // Extract structured data using AI
    const extractedData = await extractWithAI(text, category, jurisdiction);
    
    console.log(`[extract-regulation] Extracted: ${extractedData.document_title}, confidence: ${extractedData.confidence_score}`);
    
    // Optionally update the knowledge node directly
    if (node_id) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        
        // Parse effective date if present
        let effectiveDate: string | null = null;
        if (extractedData.effective_date) {
          const parsed = new Date(extractedData.effective_date);
          if (!isNaN(parsed.getTime())) {
            effectiveDate = parsed.toISOString().split('T')[0];
          }
        }
        
        await supabase
          .from('industry_knowledge_nodes')
          .update({
            extracted_data: extractedData,
            effective_date: effectiveDate,
            document_type: extractedData.document_type,
            display_name: {
              vi: extractedData.document_title,
              en: extractedData.document_title,
            },
            description: {
              vi: extractedData.summary,
              en: extractedData.summary,
            },
            parse_status: 'parsed',
          })
          .eq('id', node_id);
          
        console.log(`[extract-regulation] Updated node ${node_id}`);
      } catch (updateError) {
        console.error('[extract-regulation] Node update error:', updateError);
        // Don't fail the response for update errors
      }
    }
    
    const result: ExtractResult = {
      success: true,
      data: extractedData,
    };
    
    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('[extract-regulation] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
}));
