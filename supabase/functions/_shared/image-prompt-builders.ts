// ============================================
// Image Prompt Pipeline — Builder Functions
// Each builder returns PromptSegment | null
// ============================================

import type {
  PromptContext, PromptSegment, PromptBuilder, Channel,
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
    let content = `Generate an image based on this description, with NO brand styling applied:

${contentSummary}

Aspect Ratio: ${finalAspectRatio}

INSTRUCTIONS:
- Generate freely without any brand constraints
- Do NOT add brand colors, logos, or corporate styling
- Follow the description closely — do not add artistic interpretations
- Ensure output has clean composition suitable for ${channel} usage`;
    return { id: 'creative_mode', position: 'prefix', priority: 100, content };
  }

  if (promptMode === 'brand_only') {
    let content = `Create an image for ${brand.brandName} based closely on the user's description.

## CONTENT (FOLLOW CLOSELY FOR SUBJECT AND SCENE):
${contentSummary}

Optimize composition and framing for ${channel} (${finalAspectRatio}).
Apply brand colors as accents — do not let them overpower the image.
Do NOT add creative elements not mentioned in the description.

## ASPECT RATIO: ${finalAspectRatio}`;
    return { id: 'creative_mode', position: 'prefix', priority: 100, content };
  }

  // full mode — GUIDED CREATIVE (clear separation of constraints vs creative latitude)
  const content = `Create a visually compelling, brand-aligned ${isWithText ? 'SOCIAL GRAPHIC WITH TEXT' : 'image'} for ${brand.brandName}, optimized for ${channel}.

Required constraints: brand colors, channel-appropriate composition, target audience relevance.
Creative latitude: lighting, subject posing, background elements, color harmony beyond brand palette, artistic interpretation of the concept.

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

  // raw mode: skip channel spec entirely
  if (params.promptMode === 'raw') return null;

  // brand_only mode: lightweight channel hints (aspect ratio + composition only)
  if (params.promptMode === 'brand_only') {
    const content = `## CHANNEL: ${params.channel.toUpperCase()}
- Aspect Ratio: ${finalAspectRatio}
- Composition: ${channelSpec.composition}`;
    return { id: 'channel_spec', position: 'core', priority: 100, content };
  }

  // full mode: complete channel spec
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
    // full mode — STRONG dominant color directive
    if (brand.brandColors?.primary) {
      parts.push(`\n## ⚠️ COLOR PALETTE (MANDATORY — HIGHEST PRIORITY):`);
      parts.push(`- PRIMARY COLOR: ${brand.brandColors.primary} — This MUST be the dominant color in the image (40-60% of visible color area). Use for backgrounds, gradients, large shapes, or tonal washes.`);
      if (brand.brandColors.secondary && brand.brandColors.secondary.length > 0) {
        parts.push(`- SECONDARY COLORS: ${brand.brandColors.secondary.join(', ')} — Use as complementary accents (20-30% of color area)`);
      }
      parts.push(`- FORBIDDEN: Do NOT use generic blue (#3B82F6), teal, dark navy, or corporate black/gray unless they match the brand palette above.`);
      parts.push(`- The brand colors MUST be clearly recognizable in the final image — not hidden or muted.`);
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
// Channel-specific text layouts — replaces generic 3-part layout for supported channels
const CHANNEL_TEXT_LAYOUTS: Partial<Record<Channel, string>> = {
  tiktok: `Vertical storytelling layout:
- Bold text top 20% — large, attention-grabbing headline
- Face/product center 60% — main visual focus
- Subtle CTA bottom 20% — but leave space clear for platform captions
- IMPORTANT: Leave bottom 15-20% relatively clear for TikTok's built-in caption overlay zone`,

  instagram: `Visual-first layout:
- Minimal text overlay — 2-3 words maximum
- Image is the star, text is an accent element
- Clean, uncluttered composition — let the visual tell the story
- If text is included, use bold typography with high contrast`,

  youtube: `Thumbnail-optimized layout:
- Expressive face or key visual on left 40%
- Bold 3-5 word text on right 60% — maximum readability at small sizes
- HIGH CONTRAST is critical — thumbnails are viewed at very small sizes
- Use dramatic, attention-grabbing composition`,

  linkedin: `Professional layout:
- Insight-driven headline at top — thought leadership style
- Clean, professional visual center — business context
- Subtle branding bottom — understated and credible
- Maintain corporate professionalism throughout`,

  email: `Hero banner layout:
- Single centered message — clear and direct
- Clean background with focused subject
- CTA-friendly composition — leave space for button below
- Optimized for email client rendering — simple, high-impact`,
};

export const buildTextLayout: PromptBuilder = (ctx) => {
  const { params, isWithText } = ctx;
  if (!isWithText) return null;

  const parts: string[] = [];

  // Text-in-image section
  parts.push(buildTextInImageContent(params.textToInclude, params.textPosition, params.typographyStyle));

  // Structured layout (full mode only)
  if (params.promptMode === 'full' || !params.promptMode) {
    // Check for channel-specific layout first
    const channelLayout = CHANNEL_TEXT_LAYOUTS[params.channel];
    if (channelLayout) {
      parts.push(`\n## CHANNEL-OPTIMIZED TEXT LAYOUT (${params.channel.toUpperCase()}):\n${channelLayout}`);
    } else {
      // Fallback to generic structured 3-part layout for channels without specific layout
      parts.push(buildStructuredLayoutContent(params.footerInfo, params.brand.brandColors));
    }
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

  // brand_only: inject lightweight persona + journey hint (not full directives)
  if (params.promptMode === 'brand_only') {
    const hints: string[] = [];
    if (params.persona) {
      const p = params.persona;
      let hint = `Hint: This content targets ${p.name}`;
      if (p.ageRange) hint += ` (${p.ageRange})`;
      if (p.occupation) hint += `, ${p.occupation}`;
      hints.push(hint + '.');
    }
    if (params.journeyStage) {
      const stageLabels: Record<string, string> = { awareness: 'awareness', consideration: 'consideration', decision: 'decision', retention: 'retention' };
      hints.push(`Content stage: ${stageLabels[params.journeyStage] || params.journeyStage}. Consider this for emotional tone.`);
    }
    if (hints.length === 0) return null;
    return {
      id: 'strategic_context', position: 'core' as const, priority: 80,
      content: `## CONTEXT HINTS (Informational — prioritize user description):\n${hints.join('\n')}`,
    };
  }

  // raw mode: no strategic context
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
  const { negativePrompt, imageContentType } = ctx.params;

  // Default negative prompt for background mode (no text on image)
  const DEFAULT_BG_NEGATIVE = 'text, words, letters, numbers, watermark, logo, UI elements, blurry, low quality, distorted face, extra fingers, deformed hands';
  
  const effectiveNegative = negativePrompt
    || (imageContentType !== 'with_text' ? DEFAULT_BG_NEGATIVE : null);

  if (!effectiveNegative) return null;

  return {
    id: 'negative_prompt',
    position: 'suffix',
    priority: 50,
    content: `## ELEMENTS TO AVOID:\n${effectiveNegative}`,
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
5. SPATIAL OVERLAY GUIDELINE: Keep top 15% and bottom 20% of the image with lower visual complexity (softer colors, less detail) to ensure text overlay readability
6. Main subject should be clearly visible and not cropped
7. Use natural, professional lighting
8. Maintain brand-appropriate color temperature
9. NEVER create blank, white, or empty images - always include clear visual content
10. Background must have visible color, texture, or gradient - NEVER pure white (#FFFFFF)
11. Image must have at least one clear focal point or subject`,
  };
};

// ============================================
// 10. Vietnamese Text Accuracy (suffix) — sandwich reinforcement
// ============================================

/**
 * Counts Vietnamese diacritical marks in text for verification prompt
 */
function countVietnameseDiacritics(text: string): number {
  const diacriticChars = /[àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]/gi;
  return (text.match(diacriticChars) || []).length;
}

export const buildVietnameseTextAccuracy: PromptBuilder = (ctx) => {
  const { isWithText, params } = ctx;
  if (!isWithText || !params.textToInclude) return null;

  const text = params.textToInclude;
  const diacriticCount = countVietnameseDiacritics(text);
  
  // Also check structured elements for Vietnamese text
  const structuredTexts: string[] = [];
  // Note: structuredElements is not in ImagePromptParams but passed via generate-brand-image
  // This builder focuses on textToInclude which IS in params

  if (diacriticCount === 0) return null; // No Vietnamese text, skip

  return {
    id: 'vietnamese_text_accuracy',
    position: 'suffix',
    priority: 95,
    content: `## ⚠️ VIETNAMESE TEXT ACCURACY (MANDATORY — DO NOT SKIP):

EXACT TEXT TO RENDER (character-by-character):
"${text}"

Total Vietnamese diacritical marks in this text: ${diacriticCount}
Your rendered text MUST contain exactly ${diacriticCount} accent marks.

### CRITICAL DIACRITIC RULES:
- ă ≠ a (ă has breve accent — NEVER render as plain "a")
- â ≠ a (â has circumflex — NEVER render as plain "a")  
- ơ ≠ o (ơ has horn — NEVER render as plain "o")
- ô ≠ o (ô has circumflex — NEVER render as plain "o")
- ư ≠ u (ư has horn — NEVER render as plain "u")
- ê ≠ e (ê has circumflex — NEVER render as plain "e")
- đ ≠ d (đ has stroke — NEVER render as plain "d")
- Tone marks (sắc ́, huyền ̀, hỏi ̉, ngã ̃, nặng ̣) MUST be preserved exactly

### FONT REQUIREMENT:
- Use a font that supports FULL Vietnamese Unicode (e.g., Roboto, Noto Sans, Be Vietnam Pro, Montserrat)
- NEVER use decorative/display fonts that lack Vietnamese diacritics
- If unsure about font support, use Noto Sans — it has 100% Vietnamese coverage

### VERIFICATION:
- Count accent marks in your rendered text — must equal ${diacriticCount}
- If you CANNOT render the text accurately, leave the text area BLANK rather than rendering incorrect characters
- NEVER rephrase, shorten, or modify the text in any way`,
  };
};

// ============================================
// 11. Localization Suffix (suffix) — sandwich technique bottom
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
// 11. Brand Color Reinforcement (suffix) — sandwich technique
// ============================================

export const buildBrandColorReinforcement: PromptBuilder = (ctx) => {
  const { brand, promptMode = 'full' } = ctx.params;
  if (promptMode === 'raw') return null;
  if (!brand?.brandColors?.primary) return null;

  const colorList = [brand.brandColors.primary, ...(brand.brandColors.secondary || [])].join(', ');

  return {
    id: 'brand_color_reinforcement',
    position: 'suffix',
    priority: 99,
    content: `⚠️ FINAL COLOR CHECK: The image MUST prominently feature these brand colors: ${colorList}. If the image appears mostly blue, black, teal, or gray and those are NOT the brand colors above, regenerate with the correct palette.`,
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
  buildBrandColorReinforcement,
];
