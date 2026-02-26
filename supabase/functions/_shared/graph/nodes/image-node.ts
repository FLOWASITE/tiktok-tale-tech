// ============================================
// Image Node
// AI image generation
// ============================================

import { GraphState, buildStateContext } from "../graph-state.ts";
import { callAI } from "../../ai-provider.ts";
import { executeToolCall } from "../../tool-executor.ts";
import { CHAT_TOOLS } from "../../tool-definitions.ts";
import { BlackboardRetriever, formatRetrievedContext } from "../blackboard-retriever.ts";

const IMAGE_TOOLS = ['generate_image', 'edit_image'];

interface ImageNodeContext {
  supabase: any;
  userId?: string;
  organizationId?: string;
  brandTemplateId?: string;
  brandName?: string;
  industry?: string;
  userAccessToken?: string;
  /** Blackboard retriever for semantic context + memory storage */
  retriever?: BlackboardRetriever;
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

    // Use Blackboard v2 for context if available, fallback to legacy
    let contextStr = '';
    if (ctx.retriever) {
      try {
        const entries = await ctx.retriever.retrieve(state.userMessage, ['image_generation', 'generated_content'], 3);
        contextStr = formatRetrievedContext(entries);
      } catch {
        contextStr = buildStateContext(state);
      }
    } else {
      contextStr = buildStateContext(state);
    }

    const tools = CHAT_TOOLS.filter(t => IMAGE_TOOLS.includes(t.function.name));

    const aiResult = await callAI({
      functionName: 'image_node',
      organizationId: ctx.organizationId,
      messages: [
        { role: 'system', content: systemPrompt + contextStr },
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

    // Store image metadata to Blackboard v2 for cross-session memory
    if (ctx.retriever && result.success) {
      const imageMetadata = [
        args.prompt && `Prompt: ${args.prompt}`,
        args.aspect_ratio && `Aspect Ratio: ${args.aspect_ratio}`,
        args.style && `Style: ${args.style}`,
        args.channel && `Channel: ${args.channel}`,
        result.result?.url && `URL: ${result.result.url}`,
      ].filter(Boolean).join('\n');

      ctx.retriever.store(imageMetadata, 'image', 'image_generation', {
        prompt: args.prompt,
        aspect_ratio: args.aspect_ratio,
        style: args.style,
      }).catch(err => console.warn('[ImageNode] Blackboard store failed:', err));
    }

    console.log('[ImageNode] Complete');
    return {
      generatedImage: result.success ? result.result : null,
      metadata: {
        ...state.metadata,
        imagePrompt: args.prompt,
        imageAspectRatio: args.aspect_ratio,
        imageStyle: args.style,
      },
    };
  };
}
