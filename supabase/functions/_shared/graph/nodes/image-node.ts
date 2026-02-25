// ============================================
// Image Node
// AI image generation
// ============================================

import { GraphState, buildStateContext } from "../graph-state.ts";
import { callAI } from "../../ai-provider.ts";
import { executeToolCall } from "../../tool-executor.ts";
import { CHAT_TOOLS } from "../../tool-definitions.ts";

const IMAGE_TOOLS = ['generate_image', 'edit_image'];

interface ImageNodeContext {
  supabase: any;
  userId?: string;
  organizationId?: string;
  brandTemplateId?: string;
  brandName?: string;
  industry?: string;
  userAccessToken?: string;
}

function buildImageSystemPrompt(brandName?: string, industry?: string): string {
  return `You are an Image Agent specialized in creating visuals for social media content.

## WORKFLOW
1. Parse the user's request to determine: prompt description, style, aspect_ratio, target channel
2. Auto-select aspect_ratio based on channel:
   - TikTok/Reels/Stories: 9:16
   - Instagram Feed: 1:1 or 4:5
   - Facebook/LinkedIn: 16:9 or 1:1
   - YouTube Thumbnail: 16:9
3. Build a detailed prompt in English
4. Call generate_image or edit_image

## PROMPT RULES
- Write prompts in English for best results
- Include: lighting, composition, color palette, mood
- For product images: clean backgrounds
- For social media: text-safe zones, bold visuals, high contrast

${brandName ? `Brand: ${brandName}` : ''}
${industry ? `Industry: ${industry}` : ''}`;
}

export function createImageNode(ctx: ImageNodeContext) {
  return async function imageNode(state: GraphState): Promise<Partial<GraphState>> {
    console.log('[ImageNode] Starting');
    const systemPrompt = buildImageSystemPrompt(ctx.brandName, ctx.industry);
    const stateContext = buildStateContext(state);
    const tools = CHAT_TOOLS.filter(t => IMAGE_TOOLS.includes(t.function.name));

    const aiResult = await callAI({
      functionName: 'image_node',
      organizationId: ctx.organizationId,
      messages: [
        { role: 'system', content: systemPrompt + stateContext },
        { role: 'user', content: state.userMessage },
      ],
      tools,
      toolChoice: 'required',
    });

    if (!aiResult.success) {
      console.error('[ImageNode] AI call failed:', aiResult.error);
      return { generatedImage: null };
    }

    const message = aiResult.data?.choices?.[0]?.message;
    const toolCalls = message?.tool_calls || [];

    if (toolCalls.length === 0) {
      return { generatedImage: null };
    }

    // Execute image tool
    const tc = toolCalls[0];
    const args = JSON.parse(tc.function.arguments || '{}');
    const result = await executeToolCall(tc.function.name, args, {
      supabase: ctx.supabase,
      userId: ctx.userId,
      organizationId: ctx.organizationId,
      brandTemplateId: ctx.brandTemplateId,
      userAccessToken: ctx.userAccessToken,
    });

    console.log('[ImageNode] Complete');
    return { generatedImage: result.success ? result.result : null };
  };
}
