// ============================================
// Image Prompt Pipeline — Builder Functions
// Each builder returns PromptSegment | null
// ============================================

import type {
  PromptContext, PromptSegment, PromptBuilder,
  ContentRole, ContentAngle, TextPosition, TypographyStyle,
} from './image-prompt-types.ts';
import {
  IMAGE_STYLE_PRESETS,
  JOURNEY_STAGE_VISUALS,
  CONTENT_ROLE_VISUALS,
  CONTENT_ANGLE_VISUALS,
  HOOK_TYPE_VISUALS,
  COUNTRY_CHARACTER_DIRECTIVES,
} from './image-prompt-data.ts';

// ============================================
// 1. Creative Mode (prefix) — sets the framing for each mode
// ============================================

export const buildCreativeMode: PromptBuilder = (ctx) => {
  const { params, finalAspectRatio, isWithText, channelSpec } = ctx;
  const { brand, contentSummary, channel, promptMode = 'full' } = params;

  if (promptMode === 'raw') {
    let content = `Generate an image based EXACTLY on this description, with NO additional brand styling or optimization:

${contentSummary}

Aspect Ratio: ${finalAspectRatio}

INSTRUCTIONS:
- Generate freely without any brand constraints
- Do NOT add brand colors, logos, or corporate styling
- Follow the description literally — do not add artistic interpretations
- Keep the image simple and focused on what is described`;
    return { id: 'creative_mode', position: 'prefix', priority: 100, content };
  }

  if (promptMode === 'brand_only') {
    let content = `Create an image for ${brand.brandName} that follows the user's description LITERALLY.

## CONTENT (FOLLOW EXACTLY — DO NOT REINTERPRET):
${contentSummary}

⚠️ IMPORTANT: DO NOT add artistic interpretations. Follow the user's description literally.
Do NOT optimize composition, do NOT add creative elements not mentioned in the description.
Only apply brand colors and identity — everything else comes from the user's description.

## ASPECT RATIO: ${finalAspectRatio}`;
    return { id: 'creative_mode', position: 'prefix', priority: 100, content };
  }

  // full mode
  const content = `Create a professional, brand-aligned ${isWithText ? 'SOCIAL GRAPHIC WITH TEXT' : 'image'} for ${brand.brandName}.

You have FULL CREATIVE FREEDOM to interpret and enhance the visual concept.
Optimize composition, color grading, lighting, and layout for maximum visual impact on ${channel}.

## ARTICLE CONTENT CONTEXT (HIGHEST PRIORITY):
${contentSummary}

CRITICAL: The image MUST visually represent the specific topic/concept mentioned above, not just a generic industry image. Analyze the content summary to identify the core subject and create imagery that directly illustrates it.`;

  return { id: 'creative_mode', position: 'prefix', priority: 100, content };
};

// ============================================
// 2. Localization Prefix (prefix) — sandwich technique top
// ============================================

export const buildLocalizationPrefix: PromptBuilder = (ctx) => {
  const { countryCode } = ctx.params;
  if (!countryCode) return null;
  const directive = COUNTRY_CHARACTER_DIRECTIVES[countryCode];
  if (!directive) return null;

  return {
    id: 'localization_prefix',
    position: 'prefix',
    priority: 90,
    content: `## MANDATORY CHARACTER ETHNICITY (DO NOT IGNORE):
ALL human characters in this image MUST be ${directive.ethnicity}.
- Ethnicity: ${directive.ethnicity}
- Cultural Context: ${directive.culturalContext}
- Setting: ${directive.settingHints}
- DO NOT use Western/Caucasian or other non-${countryCode} faces
- This is a STRICT requirement for brand authenticity in ${countryCode} market
- ANY person, model, or human figure MUST match this ethnicity requirement`,
  };
};

// ============================================
// 3. Channel Spec (core)
// ============================================

export const buildChannelSpec: PromptBuilder = (ctx) => {
  const { params, channelSpec, finalAspectRatio } = ctx;
  if (params.promptMode === 'raw' || params.promptMode === 'brand_only') return null;

  const content = `## CHANNEL: ${params.channel.toUpperCase()}
- Aspect Ratio: ${finalAspectRatio}
- Platform Style: ${channelSpec.style}
- Mood: ${channelSpec.mood}
- Composition: ${channelSpec.composition}

### Channel-Specific Visual Directions:
${channelSpec.visualDirections.map(d => `- ${d}`).join('\n')}

### Elements to AVOID for ${params.channel}:
${channelSpec.avoidElements.map(e => `- ${e}`).join('\n')}`;

  return { id: 'channel_spec', position: 'core', priority: 100, content };
};

// ============================================
// 4. Brand Identity & Colors (core)
// ============================================

export const buildBrandColors: PromptBuilder = (ctx) => {
  const { params } = ctx;
  const { brand, promptMode = 'full' } = params;

  if (promptMode === 'raw') return null;

  const parts: string[] = [];

  // Brand identity
  if (brand.imageStyle) {
    parts.push(`## BRAND VISUAL IDENTITY:\n- Style: ${brand.imageStyle}`);
  }
  if (brand.industry && brand.industry.length > 0) {
    parts.push(`- Industry Context: ${brand.industry.join(', ')}`);
  }

  // Color section differs by mode
  if (promptMode === 'brand_only') {
    if (brand.brandColors?.primary) {
      parts.push(`\n## BRAND COLORS (Subtle Integration):`);
      parts.push(`- Primary: ${brand.brandColors.primary} — subtly incorporate as accent, not dominant`);
      if (brand.brandColors.secondary && brand.brandColors.secondary.length > 0) {
        parts.push(`- Secondary: ${brand.brandColors.secondary.join(', ')} — use sparingly`);
      }
      parts.push(`- Let the content/subject determine the main color palette`);
      parts.push(`- Brand colors should complement, not overpower the image`);
    }
  } else {
    // full mode — dominant colors
    if (brand.brandColors?.primary) {
      parts.push(`\n## COLOR PALETTE (CRITICAL - MUST USE):`);
      parts.push(`- PRIMARY COLOR: ${brand.brandColors.primary} - Use this as the dominant accent color`);
      if (brand.brandColors.secondary && brand.brandColors.secondary.length > 0) {
        parts.push(`- SECONDARY COLORS: ${brand.brandColors.secondary.join(', ')} - Use as complementary accents`);
      }
      parts.push(`- Create a cohesive color harmony using these brand colors`);
      parts.push(`- Ensure sufficient contrast for readability if text is overlaid`);
    }
  }

  if (parts.length === 0) return null;
  return { id: 'brand_colors', position: 'core', priority: 95, content: parts.join('\n') };
};

// ============================================
// 5. Style Preset (core)
// ============================================

export const buildStylePreset: PromptBuilder = (ctx) => {
  const { imageStylePreset, promptMode = 'full' } = ctx.params;
  if (promptMode !== 'full') return null;
  if (!imageStylePreset || !IMAGE_STYLE_PRESETS[imageStylePreset]) return null;

  const preset = IMAGE_STYLE_PRESETS[imageStylePreset];
  const content = `## IMAGE STYLE PRESET (${imageStylePreset.toUpperCase().replace('_', ' ')}):
- Description: ${preset.description}
- Apply these qualities: ${preset.keywords.join(', ')}
- AVOID: ${preset.negativeKeywords.join(', ')}`;

  return { id: 'style_preset', position: 'core', priority: 90, content };
};

// ============================================
// 6. Text Layout (core) — text-in-image + structured layout
// ============================================

export const buildTextLayout: PromptBuilder = (ctx) => {
  const { params, isWithText } = ctx;
  if (!isWithText) return null;

  const parts: string[] = [];

  // Text-in-image section
  parts.push(buildTextInImageContent(params.textToInclude, params.textPosition, params.typographyStyle));

  // Structured layout (full mode only)
  if (params.promptMode === 'full' || !params.promptMode) {
    parts.push(buildStructuredLayoutContent(params.footerInfo, params.brand.brandColors));
  }

  return { id: 'text_layout', position: 'core', priority: 85, content: parts.join('\n') };
};

function buildTextInImageContent(
  textToInclude?: string,
  textPosition?: TextPosition,
  typographyStyle?: TypographyStyle,
): string {
  if (!textToInclude) return '';

  const positionGuide: Record<TextPosition, string> = {
    'center': 'Text prominently centered in the image, making it the focal point',
    'top': 'Text positioned in the upper third, with visual elements below',
    'bottom': 'Text positioned in the lower third, with visual elements above',
    'top-left': 'Text in the upper left corner, quote-style placement',
    'bottom-right': 'Text in the lower right corner, caption-style placement',
  };

  const styleGuide: Record<TypographyStyle, string> = {
    'modern': 'Clean sans-serif font, contemporary and professional',
    'classic': 'Elegant serif font, timeless and sophisticated',
    'bold': 'Heavy weight, impactful and attention-grabbing',
    'minimal': 'Thin weight, subtle and refined',
    'clean': 'Clean text with subtle shadow, no background box',
    'outline': 'Text with outline stroke for high contrast, no background box',
    'glow': 'Glowing text effect, no background box',
  };

  const pos = textPosition || 'center';
  const style = typographyStyle || 'modern';

  return `
## TEXT IN IMAGE (REQUIRED - Social Graphic Mode):
INCLUDE this exact text prominently in the image:
"${textToInclude}"

Typography Guidelines:
- Position: ${positionGuide[pos]}
- Typography Style: ${styleGuide[style]}
- Ensure HIGH CONTRAST between text and background for readability
- Text should be the PRIMARY FOCAL ELEMENT of the image
- Use brand colors for text if they provide good contrast
- Text must be LARGE and CLEARLY READABLE at social media viewing sizes
- Add subtle text shadow or backdrop if needed for legibility`;
}

function buildStructuredLayoutContent(
  footerInfo?: { company_name?: string; phone?: string; email?: string; website?: string; address?: string },
  brandColors?: { primary: string; secondary?: string[] },
): string {
  const contactLines: string[] = [];
  if (footerInfo?.address) contactLines.push(`📍 ${footerInfo.address}`);
  if (footerInfo?.phone) contactLines.push(`📞 ${footerInfo.phone}`);
  if (footerInfo?.email) contactLines.push(`📧 ${footerInfo.email}`);
  if (footerInfo?.website) contactLines.push(`🌐 ${footerInfo.website}`);

  const hasContactInfo = contactLines.length > 0;

  let section = `

## BỐ CỤC ẢNH SOCIAL GRAPHIC (BẮT BUỘC):

### VÙNG TRÊN (20% trên cùng):
- TIÊU ĐỀ: Chữ lớn, đậm (Bold), nổi bật, gây tò mò
- Font: Sans-serif đậm, PHẢI hỗ trợ tiếng Việt có dấu đầy đủ
- Màu: Trắng hoặc màu sáng trên nền tối, hoặc màu đậm trên nền sáng
- Tiêu đề lấy từ nội dung chính hoặc hook message

### VÙNG GIỮA (${hasContactInfo ? '50-60' : '60-70'}%):
- Hình ảnh chính / visual concept minh họa cho nội dung
- Để trống không gian thở, không chèn quá nhiều element
- Visual phải liên quan trực tiếp đến chủ đề bài viết`;

  if (hasContactInfo) {
    section += `

### VÙNG DƯỚI (20-30% dưới cùng):
- THÔNG TIN LIÊN HỆ với emojis tương ứng:
${contactLines.map(l => `  ${l}`).join('\n')}
- Màu chữ: Trắng hoặc sáng, dễ đọc trên nền tối
- Font size nhỏ hơn tiêu đề nhưng vẫn rõ ràng

### CTA (Call-to-Action):
- Đặt ngay dưới hoặc bên cạnh thông tin liên hệ
- Màu nổi bật: Vàng (#FFD700) hoặc Cam (#FF8C00) — tạo contrast mạnh
- Dạng button hoặc banner nổi bật
- Ví dụ: "Liên hệ ngay để được tư vấn miễn phí!" hoặc CTA phù hợp nội dung`;
  } else {
    section += `

### VÙNG DƯỚI (20% dưới cùng):
- CTA (Call-to-Action) nổi bật
- Màu nổi bật: Vàng (#FFD700) hoặc Cam (#FF8C00)
- Dạng button hoặc banner
- CTA phù hợp với nội dung bài viết`;
  }

  section += `

### QUY TẮC MÀU SẮC VÀ FONT CHỮ:
- Tone chủ đạo: Sử dụng brand primary color${brandColors?.primary ? ` (${brandColors.primary})` : ''}
- CTA: Màu vàng hoặc cam để tạo điểm nhấn mạnh
- Thông tin liên hệ: Màu trắng hoặc sáng trên nền tối
- Font chữ: PHẢI hỗ trợ tiếng Việt có dấu (ă, â, đ, ê, ô, ơ, ư)
- Phân biệt rõ ràng giữa tiêu đề (lớn, đậm), nội dung, và CTA (nổi bật)`;

  return section;
}

// ============================================
// 7. Strategic Context (core) — Hook + Role + Angle + Journey
// ============================================

export const buildStrategicContext: PromptBuilder = (ctx) => {
  const { params } = ctx;
  if (params.promptMode !== 'full' && params.promptMode !== undefined) return null;

  const sections: string[] = [];

  // Hook
  if (params.hookMessage) {
    let hookSection = `## HOOK MESSAGE (CRITICAL - Image must visually convey this):\n"${params.hookMessage}"`;
    if (params.hookType && HOOK_TYPE_VISUALS[params.hookType]) {
      hookSection += `\n- Hook Type: ${params.hookType} - ${HOOK_TYPE_VISUALS[params.hookType]}`;
    }
    sections.push(hookSection);
  }

  // Content Role
  if (params.contentRole && CONTENT_ROLE_VISUALS[params.contentRole]) {
    const roleGuide = CONTENT_ROLE_VISUALS[params.contentRole];
    const roleLabels: Record<ContentRole, string> = {
      seed: 'SEED - Awareness Stage',
      sprout: 'SPROUT - Trust Building Stage',
      harvest: 'HARVEST - Conversion Stage',
    };
    sections.push(`## CONTENT ROLE (${roleLabels[params.contentRole]}):
- Visual Style: ${roleGuide.style}
- Include: ${roleGuide.elements.join(', ')}
- AVOID: ${roleGuide.avoid.join(', ')}`);
  }

  // Content Angle
  if (params.contentAngle && CONTENT_ANGLE_VISUALS[params.contentAngle]) {
    const angleGuide = CONTENT_ANGLE_VISUALS[params.contentAngle];
    sections.push(`## CONTENT ANGLE (${params.contentAngle.toUpperCase().replace('_', ' ')}):
- Visual Approach: ${angleGuide.approach}
- Feel: ${angleGuide.feel}
- Key Elements: ${angleGuide.elements.join(', ')}`);
  }

  // Persona
  if (params.persona) {
    const p = params.persona;
    const lines = [`## TARGET AUDIENCE VISUAL CONSIDERATIONS:`, `- Target Persona: ${p.name}`];
    if (p.ageRange) lines.push(`- Age Range: ${p.ageRange} - Use age-appropriate visual language`);
    if (p.occupation) lines.push(`- Occupation: ${p.occupation} - Include relevant professional context`);
    if (p.interests && p.interests.length > 0) lines.push(`- Interests: ${p.interests.slice(0, 3).join(', ')} - Incorporate relatable elements`);
    if (p.communicationStyle) lines.push(`- Preferred Style: ${p.communicationStyle}`);
    sections.push(lines.join('\n'));
  }

  // Journey Stage
  if (params.journeyStage && JOURNEY_STAGE_VISUALS[params.journeyStage]) {
    const stageGuide = JOURNEY_STAGE_VISUALS[params.journeyStage];
    sections.push(`## FUNNEL STAGE VISUAL STRATEGY (${params.journeyStage.toUpperCase()}):
- Visual Style: ${stageGuide.visualStyle}
- Emotional Tone: ${stageGuide.emotionalTone}
- Key Elements to Include: ${stageGuide.elements.join(', ')}`);
  }

  // Content Type
  if (params.contentType) {
    const contentTypeGuides: Record<string, string> = {
      promotional: 'Focus on product/service, include call-to-action space, highlight value proposition',
      educational: 'Clear informative visuals, diagram-friendly, professional appearance',
      entertainment: 'Fun, engaging, shareable elements, trend-aware aesthetics',
      inspirational: 'Emotional imagery, aspirational scenarios, motivational tone',
    };
    if (contentTypeGuides[params.contentType]) {
      sections.push(`## CONTENT TYPE (${params.contentType.toUpperCase()}):\n${contentTypeGuides[params.contentType]}`);
    }
  }

  if (sections.length === 0) return null;
  return { id: 'strategic_context', position: 'core', priority: 80, content: sections.join('\n\n') };
};

// ============================================
// 8. Negative Prompt (suffix)
// ============================================

export const buildNegativePrompt: PromptBuilder = (ctx) => {
  const { negativePrompt } = ctx.params;
  if (!negativePrompt) return null;

  return {
    id: 'negative_prompt',
    position: 'suffix',
    priority: 50,
    content: `## ELEMENTS TO AVOID:\n${negativePrompt}`,
  };
};

// ============================================
// 9. Critical Rules (suffix)
// ============================================

export const buildCriticalRules: PromptBuilder = (ctx) => {
  const { isWithText, params } = ctx;
  const { promptMode = 'full' } = params;

  if (promptMode === 'raw') {
    let content = `## CRITICAL RULES:\n1. NEVER create blank, white, or empty images\n2. DO NOT include any logos or brand marks`;
    return { id: 'critical_rules', position: 'suffix', priority: 90, content };
  }

  if (promptMode === 'brand_only') {
    if (isWithText) {
      return {
        id: 'critical_rules',
        position: 'suffix',
        priority: 90,
        content: `## CRITICAL RULES:\n1. INCLUDE the specified text prominently and legibly\n2. Text must be CLEARLY READABLE with HIGH CONTRAST\n3. DO NOT include any logos or brand marks\n4. NEVER create blank, white, or empty images\n5. DO NOT add structured layouts, CTA buttons, or contact info sections unless explicitly described`,
      };
    }
    return {
      id: 'critical_rules',
      position: 'suffix',
      priority: 90,
      content: `## CRITICAL RULES:\n1. DO NOT include any text, words, letters, or typography\n2. DO NOT include any logos or brand marks\n3. NEVER create blank, white, or empty images\n4. Background must have visible color, texture, or gradient\n5. DO NOT add creative elements beyond what is described`,
    };
  }

  // full mode
  if (isWithText) {
    return {
      id: 'critical_rules',
      position: 'suffix',
      priority: 90,
      content: `## CRITICAL RULES (SOCIAL GRAPHIC WITH TEXT MODE):
1. INCLUDE the specified text prominently and legibly in the image
2. Text must be CLEARLY READABLE with HIGH CONTRAST
3. DO NOT include any logos or brand marks
4. Background/visual should COMPLEMENT, not compete with text
5. Main visual elements should support and frame the text
6. Use professional typography that matches the brand style
7. Maintain brand-appropriate color temperature
8. NEVER create blank, white, or empty images
9. Ensure text is the primary focal point
10. Add visual effects (shadow, glow, backdrop) if needed for text legibility`,
    };
  }

  return {
    id: 'critical_rules',
    position: 'suffix',
    priority: 90,
    content: `## CRITICAL RULES (BACKGROUND IMAGE MODE):
1. DO NOT include any text, words, letters, or typography in the image
2. DO NOT include any logos or brand marks
3. Image must be photorealistic OR stylized illustration based on brand style
4. Ensure the image works well as a background for text overlay
5. Main subject should be clearly visible and not cropped
6. Use natural, professional lighting
7. Maintain brand-appropriate color temperature
8. NEVER create blank, white, or empty images - always include clear visual content
9. Background must have visible color, texture, or gradient - NEVER pure white (#FFFFFF)
10. Image must have at least one clear focal point or subject`,
  };
};

// ============================================
// 10. Localization Suffix (suffix) — sandwich technique bottom
// ============================================

export const buildLocalizationSuffix: PromptBuilder = (ctx) => {
  const { countryCode } = ctx.params;
  if (!countryCode) return null;
  const directive = COUNTRY_CHARACTER_DIRECTIVES[countryCode];
  if (!directive) return null;

  return {
    id: 'localization_suffix',
    position: 'suffix',
    priority: 100,
    content: `REMINDER (FINAL CHECK): If this image contains ANY human figures, they MUST be ${directive.ethnicity}. DO NOT use non-${countryCode} faces.`,
  };
};

// ============================================
// DEFAULT BUILDER REGISTRY
// ============================================

export const DEFAULT_BUILDERS: PromptBuilder[] = [
  buildCreativeMode,
  buildLocalizationPrefix,
  buildChannelSpec,
  buildBrandColors,
  buildStylePreset,
  buildTextLayout,
  buildStrategicContext,
  buildNegativePrompt,
  buildCriticalRules,
  buildLocalizationSuffix,
];
