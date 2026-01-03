import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { callAI } from "../_shared/ai-provider.ts";
import { getChannelModelConfigs, getAIConfig, ChannelModelConfig } from "../_shared/ai-config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Channel content column mapping
const CHANNEL_COLUMN_MAP: Record<string, string> = {
  website: 'website_content',
  facebook: 'facebook_content',
  instagram: 'instagram_content',
  twitter: 'twitter_content',
  google_maps: 'google_maps_content',
  linkedin: 'linkedin_content',
  email: 'email_content',
  youtube: 'youtube_content',
  zalo_oa: 'zalo_oa_content',
  telegram: 'telegram_content',
  tiktok: 'tiktok_content',
  threads: 'threads_content',
};

// Default channel settings (simplified from generate-multichannel)
const DEFAULT_CHANNEL_SETTINGS: Record<string, { min_length: number; max_length: number; format: string }> = {
  website: { min_length: 800, max_length: 2000, format: 'H1 title, Intro, 4-6 H2 sections, Conclusion với CTA' },
  facebook: { min_length: 120, max_length: 300, format: 'Hook + emoji, bullets, CTA' },
  instagram: { min_length: 50, max_length: 150, format: 'Hook ngắn, nhiều xuống dòng, hashtags cuối' },
  twitter: { min_length: 0, max_length: 280, format: 'Thread 5-7 tweets, mỗi tweet đánh số' },
  google_maps: { min_length: 80, max_length: 150, format: 'Đánh giá khách quan, thực tế' },
  linkedin: { min_length: 150, max_length: 400, format: 'Professional, insight/số liệu, bullets' },
  email: { min_length: 150, max_length: 400, format: 'Subject line + body + CTA button' },
  youtube: { min_length: 500, max_length: 800, format: 'Script: Hook, Intro, Content segments, CTA, Outro' },
  zalo_oa: { min_length: 60, max_length: 150, format: 'Mobile-first, ngắn gọn, CTA rõ' },
  telegram: { min_length: 100, max_length: 500, format: 'Community format, bullets, thông tin giá trị' },
  tiktok: { min_length: 60, max_length: 150, format: 'Hook 3s, script ngắn 60-90 giây' },
  threads: { min_length: 50, max_length: 200, format: 'Conversational, personal, câu hỏi mở' },
};

interface ExpandRequest {
  contentId: string;
  newChannels: string[];
}

interface FooterInfo {
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  company_name?: string;
}

interface ChannelOverride {
  footer_enabled?: boolean;
  footer_template?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { contentId, newChannels } = await req.json() as ExpandRequest;
    console.log(`[expand-multichannel] Starting expansion for content ${contentId}, channels: ${newChannels.join(', ')}`);

    if (!contentId || !newChannels || newChannels.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing contentId or newChannels' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch existing content
    const { data: existingContent, error: fetchError } = await supabase
      .from('multi_channel_contents')
      .select('*')
      .eq('id', contentId)
      .single();

    if (fetchError || !existingContent) {
      console.error('[expand-multichannel] Content not found:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Content not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate: channels should not already exist
    const existingChannels = existingContent.selected_channels || [];
    const invalidChannels = newChannels.filter(ch => existingChannels.includes(ch));
    if (invalidChannels.length > 0) {
      return new Response(
        JSON.stringify({ error: `Channels already exist: ${invalidChannels.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

// Fetch brand template for context (including footer_info)
let brandContext = '';
    let brandAllowEmoji = true;
    let footerInfo: FooterInfo | null = null;
    let channelOverrides: Record<string, ChannelOverride> | null = null;
    let companyName: string | undefined;
    
    if (existingContent.brand_template_id) {
      const { data: brand } = await supabase
        .from('brand_templates')
        .select('*, footer_info, channel_overrides, brand_name')
        .eq('id', existingContent.brand_template_id)
        .single();

      if (brand) {
        brandAllowEmoji = brand.allow_emoji !== false;
        footerInfo = brand.footer_info as FooterInfo | null;
        channelOverrides = brand.channel_overrides as Record<string, ChannelOverride> | null;
        companyName = brand.brand_name;
        
        brandContext = `
## BRAND VOICE
- Tên thương hiệu: ${brand.brand_name}
- Định vị: ${brand.brand_positioning || 'N/A'}
- Tone of voice: ${(brand.tone_of_voice || []).join(', ')}
- Phong cách: ${(brand.language_style || []).join(', ')}
- Emoji: ${brandAllowEmoji ? 'Cho phép' : 'KHÔNG cho phép'}
${brand.preferred_words?.length ? `- Từ ưu tiên: ${brand.preferred_words.join(', ')}` : ''}
${brand.forbidden_words?.length ? `- Từ cấm: ${brand.forbidden_words.join(', ')}` : ''}
`;
      }
    }

// Helper to replace footer template variables
    const replaceFooterVariables = (
      template: string, 
      footer: FooterInfo | null,
      compName?: string
    ): string => {
      return template
        .replace(/\{phone\}/g, footer?.phone || '')
        .replace(/\{email\}/g, footer?.email || '')
        .replace(/\{website\}/g, footer?.website || '')
        .replace(/\{address\}/g, footer?.address || '')
        .replace(/\{company\}/g, compName || footer?.company_name || '');
    };

    // Format footer info for each channel (copied from generate-multichannel)
    const formatFooterInfo = (
      footer: FooterInfo | null,
      channel: string,
      useEmoji: boolean
    ): string => {
      if (!footer) return '';
      
      const channelOverride = channelOverrides?.[channel];
      
      // Check if this channel has footer disabled
      if (channelOverride?.footer_enabled === false) return '';
      
      // Check if this channel has a custom footer template
      if (channelOverride?.footer_template?.trim()) {
        return '\n\n' + replaceFooterVariables(channelOverride.footer_template, footer, companyName);
      }
      
      const divider = '━━━━━━━━━━━━━━━━━━━━';
      
      // FACEBOOK / INSTAGRAM / LINKEDIN - Card Style
      if (channel === 'facebook' || channel === 'instagram' || channel === 'linkedin') {
        const lines: string[] = ['\n\n' + divider];
        if (useEmoji) {
          lines.push('✨ **LIÊN HỆ NGAY** ✨');
          lines.push('');
          if (footer.phone) lines.push(`📞 **Hotline:** ${footer.phone}`);
          if (footer.email) lines.push(`📧 **Email:** ${footer.email}`);
          if (footer.website) lines.push(`🌐 **Website:** ${footer.website}`);
          if (footer.address) lines.push(`📍 **Địa chỉ:** ${footer.address}`);
        } else {
          lines.push('→ **LIÊN HỆ NGAY**');
          lines.push('');
          if (footer.phone) lines.push(`• **Hotline:** ${footer.phone}`);
          if (footer.email) lines.push(`• **Email:** ${footer.email}`);
          if (footer.website) lines.push(`• **Website:** ${footer.website}`);
          if (footer.address) lines.push(`• **Địa chỉ:** ${footer.address}`);
        }
        lines.push(divider);
        return lines.join('  \n');
      }
      
      // EMAIL - Professional Signature Block
      if (channel === 'email') {
        const lines: string[] = ['\n\n---'];
        if (companyName) lines.push(`\n**${companyName}**`);
        lines.push(divider);
        lines.push('');
        const contactLine: string[] = [];
        if (useEmoji) {
          if (footer.phone) contactLine.push(`📞 ${footer.phone}`);
          if (footer.email) contactLine.push(`📧 ${footer.email}`);
        } else {
          if (footer.phone) contactLine.push(`Tel: ${footer.phone}`);
          if (footer.email) contactLine.push(`Email: ${footer.email}`);
        }
        if (contactLine.length) lines.push(contactLine.join('  |  '));
        if (footer.website) lines.push(useEmoji ? `🌐 ${footer.website}` : footer.website);
        if (footer.address) lines.push(`\n*${footer.address}*`);
        return lines.join('  \n');
      }
      
      // WEBSITE - Author Box
      if (channel === 'website') {
        const lines: string[] = ['\n\n---\n'];
        lines.push(companyName ? `### Về ${companyName}` : '### Thông tin liên hệ');
        lines.push('');
        const contactParts: string[] = [];
        if (footer.phone) contactParts.push(useEmoji ? `📞 ${footer.phone}` : `Hotline: ${footer.phone}`);
        if (footer.email) contactParts.push(useEmoji ? `📧 ${footer.email}` : `Email: ${footer.email}`);
        if (footer.website) contactParts.push(useEmoji ? `🌐 ${footer.website}` : footer.website);
        if (contactParts.length) lines.push(contactParts.join(' | '));
        if (footer.address) lines.push(`\n${useEmoji ? '📍 ' : ''}${footer.address}`);
        return lines.join('  \n');
      }
      
      // TWITTER / TIKTOK / YOUTUBE - Compact CTA
      if (channel === 'twitter' || channel === 'tiktok' || channel === 'youtube') {
        if (!footer.website) return '';
        return useEmoji ? `\n\n👉 Theo dõi: ${footer.website}` : `\n\n→ Xem thêm: ${footer.website}`;
      }
      
      // ZALO OA / TELEGRAM / THREADS - Clean Professional
      if (channel === 'zalo_oa' || channel === 'telegram' || channel === 'threads') {
        const lines: string[] = ['\n\n' + divider];
        lines.push('**THÔNG TIN LIÊN HỆ:**');
        lines.push('');
        if (footer.phone) lines.push(`→ Hotline: ${footer.phone}`);
        if (footer.email) lines.push(`→ Email: ${footer.email}`);
        if (footer.website) lines.push(`→ Website: ${footer.website}`);
        return lines.join('  \n');
      }
      
      return '';
};

    // Build channel-specific prompts
    const channelInstructions = newChannels.map(channel => {
      const settings = DEFAULT_CHANNEL_SETTINGS[channel] || DEFAULT_CHANNEL_SETTINGS.facebook;
      return `
### ${channel.toUpperCase()}
- Độ dài: ${settings.min_length}-${settings.max_length} từ
- Format: ${settings.format}
`;
    }).join('\n');

    // Build system prompt
    const systemPrompt = `Bạn là chuyên gia content marketing đa kênh. 
Nhiệm vụ: Tạo nội dung cho các kênh mới dựa trên chủ đề và context đã có.

${brandContext}

## CHANNELS CẦN TẠO
${channelInstructions}

## QUY TẮC
1. Giữ đúng Brand Voice đã cấu hình
2. Mỗi kênh có format và độ dài riêng - PHẢI tuân thủ
3. Nội dung phải nhất quán về message với các kênh đã có
4. Sử dụng Markdown: **bold**, bullet points, emoji (nếu cho phép)
5. Luôn có Hook mạnh cho social channels
`;

    // Build user prompt with existing context
    const referenceContent = existingContent.facebook_content || existingContent.website_content || existingContent.instagram_content || '';
    
    const userPrompt = `Tạo nội dung cho các kênh: ${newChannels.join(', ')}

## CHỦ ĐỀ
${existingContent.topic}

## TIÊU ĐỀ
${existingContent.title}

## MỤC TIÊU
${existingContent.content_goal || 'engagement'}

## NỘI DUNG THAM KHẢO (từ kênh đã có)
${referenceContent ? referenceContent.substring(0, 500) + '...' : 'Không có'}

## YÊU CẦU OUTPUT
Trả về JSON object với key là tên channel, value là nội dung:
{
  ${newChannels.map(ch => `"${ch}": "nội dung cho ${ch}"`).join(',\n  ')}
}

QUAN TRỌNG: Chỉ trả về JSON object, không có text khác.`;

    // Define tool for structured output
    const tools = [
      {
        type: "function" as const,
        function: {
          name: "generate_channel_contents",
          description: "Generate content for multiple channels",
          parameters: {
            type: "object",
            properties: Object.fromEntries(
              newChannels.map(ch => [
                ch, 
                { 
                  type: "string", 
                  description: `Content for ${ch} channel` 
                }
              ])
            ),
            required: newChannels,
          },
        },
      },
    ];

    console.log('[expand-multichannel] Fetching per-channel model configs...');

    // ============================================
    // PER-CHANNEL MODEL ROUTING (Phase 3)
    // ============================================
    
    // Fetch channel-specific model configurations
    const channelConfigs = await getChannelModelConfigs(existingContent.organization_id);
    const defaultConfig = await getAIConfig('expand-multichannel-channels', existingContent.organization_id);
    const defaultModel = defaultConfig.model || 'google/gemini-2.5-flash';
    const defaultTemperature = defaultConfig.temperature ?? 0.7;
    
    // Group channels by their configured model
    const channelsByModel = new Map<string, { channels: string[]; config: ChannelModelConfig | undefined }>();
    
    for (const channel of newChannels) {
      const config = channelConfigs.get(channel);
      const modelKey = config?.model || defaultModel;
      
      if (!channelsByModel.has(modelKey)) {
        channelsByModel.set(modelKey, { channels: [], config });
      }
      channelsByModel.get(modelKey)!.channels.push(channel);
    }
    
    console.log(`[expand-multichannel] Grouped ${newChannels.length} channels into ${channelsByModel.size} model groups`);
    
    // Generate content for each model group
    let generatedContents: Record<string, string> = {};
    
    for (const [modelKey, { channels: groupChannels, config }] of channelsByModel) {
      console.log(`[expand-multichannel] Generating for model "${modelKey}": ${groupChannels.join(', ')}`);
      
      // Build tools for this channel group
      const groupTools = [
        {
          type: "function" as const,
          function: {
            name: "generate_channel_contents",
            description: `Generate content for channels: ${groupChannels.join(', ')}`,
            parameters: {
              type: "object",
              properties: Object.fromEntries(
                groupChannels.map(ch => [
                  ch, 
                  { type: "string", description: `Content for ${ch} channel` }
                ])
              ),
              required: groupChannels,
            },
          },
        },
      ];
      
      // Build channel-specific instructions for this group
      const groupChannelInstructions = groupChannels.map(channel => {
        const settings = DEFAULT_CHANNEL_SETTINGS[channel] || DEFAULT_CHANNEL_SETTINGS.facebook;
        return `
### ${channel.toUpperCase()}
- Độ dài: ${settings.min_length}-${settings.max_length} từ
- Format: ${settings.format}
`;
      }).join('\n');
      
      const groupSystemPrompt = `Bạn là chuyên gia content marketing đa kênh. 
Nhiệm vụ: Tạo nội dung cho các kênh mới dựa trên chủ đề và context đã có.

${brandContext}

## CHANNELS CẦN TẠO
${groupChannelInstructions}

## QUY TẮC
1. Giữ đúng Brand Voice đã cấu hình
2. Mỗi kênh có format và độ dài riêng - PHẢI tuân thủ
3. Nội dung phải nhất quán về message với các kênh đã có
4. Sử dụng Markdown: **bold**, bullet points, emoji (nếu cho phép)
5. Luôn có Hook mạnh cho social channels
`;
      
      const groupUserPrompt = `Tạo nội dung cho các kênh: ${groupChannels.join(', ')}

## CHỦ ĐỀ
${existingContent.topic}

## TIÊU ĐỀ
${existingContent.title}

## MỤC TIÊU
${existingContent.content_goal || 'engagement'}

## NỘI DUNG THAM KHẢO (từ kênh đã có)
${referenceContent ? referenceContent.substring(0, 500) + '...' : 'Không có'}

## YÊU CẦU OUTPUT
Trả về JSON object với key là tên channel, value là nội dung:
{
  ${groupChannels.map(ch => `"${ch}": "nội dung cho ${ch}"`).join(',\n  ')}
}

QUAN TRỌNG: Chỉ trả về JSON object, không có text khác.`;
      
      // Call AI with model override
      const aiResponse = await callAI({
        functionName: 'expand-multichannel-channels',
        organizationId: existingContent.organization_id,
        messages: [
          { role: 'system', content: groupSystemPrompt },
          { role: 'user', content: groupUserPrompt },
        ],
        tools: groupTools,
        toolChoice: { type: "function", function: { name: "generate_channel_contents" } },
        modelOverride: modelKey,
        temperatureOverride: config?.temperature ?? defaultTemperature,
      });
      
      if (!aiResponse.success) {
        console.error(`[expand-multichannel] AI call failed for model ${modelKey}:`, aiResponse.error);
        // Fill with error placeholders for this group
        for (const ch of groupChannels) {
          generatedContents[ch] = `[Lỗi tạo nội dung cho ${ch} - vui lòng thử lại]`;
        }
        continue;
      }
      
      // Parse AI response for this group
      const responseData = aiResponse.data;
      let groupContents: Record<string, string> = {};
      
      // Handle tool calls from response
      const toolCalls = responseData?.choices?.[0]?.message?.tool_calls;
      if (toolCalls && toolCalls.length > 0) {
        const toolCall = toolCalls[0];
        if (toolCall.function?.arguments) {
          try {
            groupContents = JSON.parse(toolCall.function.arguments);
          } catch (e) {
            console.error('[expand-multichannel] Failed to parse tool call:', e);
          }
        }
      } else {
        // Fallback: try to parse JSON from content
        const contentText = responseData?.choices?.[0]?.message?.content;
        if (contentText) {
          try {
            const jsonMatch = contentText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              groupContents = JSON.parse(jsonMatch[0]);
            }
          } catch (e) {
            console.error('[expand-multichannel] Failed to parse content JSON:', e);
          }
        }
      }
      
      // Merge group contents into main result
      Object.assign(generatedContents, groupContents);
      console.log(`[expand-multichannel] Generated ${Object.keys(groupContents).length} contents with model ${modelKey}`);
    }

    // Validate we got content for all channels
    const missingChannels = newChannels.filter(ch => !generatedContents[ch]);
    if (missingChannels.length > 0) {
      console.warn(`[expand-multichannel] Missing content for channels: ${missingChannels.join(', ')}`);
      // Fill with placeholder
      for (const ch of missingChannels) {
        generatedContents[ch] = `[Nội dung cho ${ch} - vui lòng regenerate]`;
      }
    }

console.log('[expand-multichannel] AI generated contents for:', Object.keys(generatedContents).join(', '));

    // ============================================
    // AUTO-APPEND FOOTER INFO (Post AI-generation)
    // ============================================
    const hasFooterInfo = footerInfo && (footerInfo.phone || footerInfo.email || footerInfo.website || footerInfo.address);
    
    if (hasFooterInfo) {
      console.log('[expand-multichannel] Appending footer info to generated contents');
      for (const channel of newChannels) {
        if (generatedContents[channel]) {
          generatedContents[channel] += formatFooterInfo(footerInfo, channel, brandAllowEmoji);
        }
      }
    }

    // Build update payload
    const updatePayload: Record<string, any> = {
      selected_channels: [...existingChannels, ...newChannels],
    };

    // Add content for each new channel
    for (const channel of newChannels) {
      const columnName = CHANNEL_COLUMN_MAP[channel];
      if (columnName && generatedContents[channel]) {
        updatePayload[columnName] = generatedContents[channel];
      }
    }

    // Update channel_statuses
    const currentStatuses = existingContent.channel_statuses || {};
    const updatedStatuses = { ...currentStatuses };
    for (const channel of newChannels) {
      updatedStatuses[channel] = 'draft';
    }
    updatePayload.channel_statuses = updatedStatuses;

    // Update database
    const { data: updatedContent, error: updateError } = await supabase
      .from('multi_channel_contents')
      .update(updatePayload)
      .eq('id', contentId)
      .select()
      .single();

    if (updateError) {
      console.error('[expand-multichannel] Update error:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update content' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[expand-multichannel] Successfully expanded content with ${newChannels.length} new channels`);

    return new Response(
      JSON.stringify(updatedContent),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[expand-multichannel] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
