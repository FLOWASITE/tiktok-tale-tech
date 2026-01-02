// ============================================
// Content Critique Criteria Definitions
// Professional Content Marketing Standards
// ============================================

// ================== HOOK CRITERIA (18 điểm) ==================
export const HOOK_CRITERIA = {
  // Positive patterns (tăng điểm)
  patterns: {
    number_hook: {
      regex: /^[0-9]|^\d+%|^\d+ (bước|cách|lý do|sai lầm|mẹo|tip|điều|thói quen)/i,
      score: 4,
      description: 'Số liệu cụ thể gây tò mò',
    },
    question_hook: {
      regex: /\?(\s|$)/,
      score: 3,
      description: 'Câu hỏi khơi gợi tương tác',
    },
    shocking_statement: {
      regex: /(sốc|không thể tin|bất ngờ|thực tế|sự thật|phũ phàng|hóa ra|thật sự)/i,
      score: 4,
      description: 'Statement tạo shock value',
    },
    story_hook: {
      regex: /(Tôi đã|Chúng tôi|Câu chuyện|Có 1 lần|Từng có|Lần đầu|Nhớ khi)/i,
      score: 3,
      description: 'Mở đầu bằng câu chuyện',
    },
    pain_point: {
      regex: /(khó khăn|vật lộn|đau đầu|mệt mỏi|chán nản|stress|lo lắng|sợ|băn khoăn)/i,
      score: 3,
      description: 'Đánh vào pain point',
    },
    curiosity_gap: {
      regex: /(bí mật|ít ai biết|hầu như không|hiếm khi|bỏ lỡ|đừng bỏ qua)/i,
      score: 3,
      description: 'Tạo curiosity gap',
    },
    urgency: {
      regex: /(ngay|lập tức|ngay bây giờ|trước khi quá muộn|còn kịp|đừng chờ|hôm nay)/i,
      score: 2,
      description: 'Tạo urgency',
    },
  },
  
  // Anti-patterns (trừ điểm)
  antiPatterns: [
    { pattern: /^Xin chào/i, penalty: -5, reason: 'Mở đầu generic' },
    { pattern: /^Chào các bạn/i, penalty: -5, reason: 'Mở đầu generic' },
    { pattern: /^Hôm nay chúng tôi/i, penalty: -4, reason: 'Không gây tò mò' },
    { pattern: /^Chào mừng bạn đến/i, penalty: -5, reason: 'Mở đầu generic' },
    { pattern: /^Trong bài viết này/i, penalty: -4, reason: 'Quá formal' },
    { pattern: /^Như các bạn đã biết/i, penalty: -3, reason: 'Giả định không hấp dẫn' },
    { pattern: /^Như đã đề cập/i, penalty: -3, reason: 'Không tự contained' },
    { pattern: /^Tiếp theo phần trước/i, penalty: -4, reason: 'Phụ thuộc context' },
    { pattern: /^Chúng ta sẽ/i, penalty: -2, reason: 'Thiếu hook' },
    { pattern: /^Bài viết này/i, penalty: -3, reason: 'Meta reference' },
  ],
  
  // Channel-specific requirements
  channelRules: {
    facebook: { 
      minHookLength: 10, 
      maxHookLength: 100, 
      requireEmoji: true,
      idealFirstLine: 50, // chars for first line
    },
    instagram: { 
      minHookLength: 5, 
      maxHookLength: 50, 
      requireEmoji: true,
      idealFirstLine: 30,
    },
    linkedin: { 
      minHookLength: 20, 
      maxHookLength: 150, 
      requireEmoji: false,
      idealFirstLine: 80,
    },
    twitter: { 
      minHookLength: 5, 
      maxHookLength: 80, 
      requireEmoji: false,
      idealFirstLine: 60,
    },
    website: { 
      minHookLength: 30, 
      maxHookLength: 200, 
      requireEmoji: false,
      idealFirstLine: 100,
    },
    tiktok: {
      minHookLength: 5,
      maxHookLength: 50,
      requireEmoji: true,
      idealFirstLine: 25,
    },
    youtube: {
      minHookLength: 10,
      maxHookLength: 100,
      requireEmoji: true,
      idealFirstLine: 60,
    },
    zalo_oa: {
      minHookLength: 10,
      maxHookLength: 80,
      requireEmoji: true,
      idealFirstLine: 50,
    },
  },
} as const;

// ================== CTA CRITERIA (8 điểm - ENHANCED) ==================
export const CTA_CRITERIA = {
  // ⛔ CTA BLACKLIST - Các CTA generic bị phạt nặng (max 2 điểm)
  blacklist: [
    { pattern: /liên hệ ngay/i, penalty: -6, reason: 'CTA quá generic, thiếu benefit' },
    { pattern: /xem thêm$/i, penalty: -5, reason: 'CTA vô định hướng' },
    { pattern: /click vào đây/i, penalty: -6, reason: 'CTA spam-style' },
    { pattern: /bấm vào link/i, penalty: -5, reason: 'CTA không có value prop' },
    { pattern: /để lại (thông tin|comment)/i, penalty: -4, reason: 'CTA yêu cầu không rõ benefit' },
    { pattern: /inbox ngay/i, penalty: -4, reason: 'CTA thiếu specificity' },
    { pattern: /theo dõi để/i, penalty: -3, reason: 'CTA yếu cho engagement' },
    { pattern: /nhấn link (dưới )?bio/i, penalty: -3, reason: 'CTA chung chung' },
  ],
  
  // CTA specificity levels (scoring tiers)
  specificityPatterns: {
    vague: {
      patterns: [/liên hệ/i, /xem thêm/i, /click/i, /bấm/i],
      score: 2,
      description: 'CTA quá generic, thiếu benefit rõ ràng',
    },
    moderate: {
      patterns: [/tìm hiểu/i, /đọc bài/i, /xem video/i, /theo dõi/i],
      score: 4,
      description: 'CTA có action nhưng thiếu urgency',
    },
    specific: {
      patterns: [/đăng ký nhận/i, /tải.*miễn phí/i, /lấy ngay/i, /nhận.*ưu đãi/i, /đặt lịch.*tư vấn/i],
      score: 6,
      description: 'CTA cụ thể với benefit rõ ràng',
    },
    compelling: {
      patterns: [/chỉ còn \d+/i, /slot (cuối|còn)/i, /hôm nay.*miễn phí/i, /\d+% (off|giảm)/i, /\d+\+ người đã/i, /số lượng có hạn/i],
      score: 8,
      description: 'CTA có urgency + benefit + social proof',
    },
  },
  
  // CTA journey matching for contextual scoring
  journeyMatch: {
    awareness: ['Tìm hiểu', 'Khám phá', 'Xem thêm', 'Đọc tiếp', 'Theo dõi', 'Đọc bài'],
    consideration: ['So sánh', 'Tải tài liệu', 'Xem case study', 'Đọc review', 'Tham khảo', 'Xem demo'],
    decision: ['Đăng ký', 'Liên hệ', 'Mua ngay', 'Nhận ưu đãi', 'Đặt lịch', 'Booking', 'Order'],
    loyalty: ['Chia sẻ', 'Giới thiệu bạn bè', 'Tham gia cộng đồng', 'Đánh giá', 'Review', 'Tag bạn'],
  },
  
  // CTA placement scoring
  placement: {
    missing: { score: 0, description: 'Không có CTA - thiếu hành động' },
    end_only: { score: 4, description: 'CTA cuối bài - cơ bản' },
    mid_and_end: { score: 6, description: 'Soft CTA giữa + Hard CTA cuối' },
    multiple_strategic: { score: 8, description: 'CTA chiến lược ở nhiều điểm' },
  },
  
  // Strong action verbs (bonus points)
  actionVerbs: [
    'Đăng ký', 'Tải ngay', 'Nhận ngay', 'Lấy miễn phí', 'Đặt lịch',
    'Khám phá', 'Trải nghiệm', 'Sở hữu', 'Bắt đầu', 'Tham gia',
    'Nhận ưu đãi', 'Đặt hàng', 'Mua ngay', 'Đăng nhập', 'Kích hoạt',
  ],
  
  // Example compelling CTAs for refinement prompts
  examples: {
    weak: ['Liên hệ ngay', 'Xem thêm', 'Click vào đây', 'Inbox mình'],
    strong: [
      'Đăng ký nhận ebook miễn phí - chỉ hôm nay',
      'Đặt lịch tư vấn 1-1 (còn 3 slot)',
      'Tải checklist 10 bước - 5000+ người đã dùng',
      'Nhận ưu đãi 30% - hết hạn trong 24h',
      'Xem demo 5 phút - không cần đăng ký',
    ],
  },
} as const;

// ================== READABILITY CRITERIA (7 điểm - MỚI) ==================
export const READABILITY_CRITERIA = {
  // Sentence length (mobile-first)
  sentenceLength: {
    ideal: { min: 10, max: 25 }, // words per sentence
    acceptable: { min: 5, max: 40 },
    penaltyPerLongSentence: -1, // mỗi câu > 40 words
  },
  
  // Paragraph breaks by channel
  paragraphBreaks: {
    facebook: 3,       // Max lines per paragraph
    instagram: 2,
    linkedin: 4,
    twitter: 2,
    website: 5,
    tiktok: 2,
    youtube: 3,
    zalo_oa: 3,
    default: 4,
  },
  
  // White space ratio targets
  whiteSpaceRatio: {
    social: 0.3,       // 30% line breaks for social
    website: 0.2,      // 20% for website/blog
    threshold: 0.15,   // Minimum acceptable
  },
  
  // Scanability elements (bonus points)
  scanabilityBonus: {
    hasBullets: 1,        // -, •, ●
    hasEmojiBullets: 1,   // Emoji as bullets
    hasBoldKeywords: 1,   // **text** or formatting
    hasNumberedList: 1,   // 1. 2. 3.
    hasShortParagraphs: 1, // Most paragraphs < 3 lines
  },
  
  // Reading level (Vietnamese)
  complexity: {
    simple: { avgSyllables: 2, score: 7 },      // Dễ đọc
    moderate: { avgSyllables: 3, score: 5 },    // Trung bình
    complex: { avgSyllables: 4, score: 3 },     // Phức tạp
  },
} as const;

// ================== CONTENT-TYPE SPECIFIC CRITERIA ==================

// Multichannel-specific criteria
export const MULTICHANNEL_CRITERIA = {
  // Cross-channel consistency
  consistency: {
    coreMesageMatch: {
      required: true,
      score: 5,
      description: 'Same core message across channels',
    },
    toneConsistency: {
      required: true,
      score: 3,
      description: 'Tone không đột ngột thay đổi giữa kênh',
    },
    brandMentionConsistent: {
      required: false,
      score: 2,
      description: 'Brand mention nhất quán',
    },
  },
  
  // Channel differentiation (không copy y nguyên)
  differentiation: {
    noDirectCopy: {
      required: true,
      penalty: -10,
      description: 'Không copy y nguyên giữa các kênh',
    },
    formatAdapted: {
      required: true,
      score: 3,
      description: 'Format đúng cho từng kênh',
    },
    lengthCompliant: {
      required: true,
      score: 2,
      description: 'Đúng độ dài khuyến nghị',
    },
  },
  
  // Channel length guidelines
  lengthGuidelines: {
    facebook: { min: 100, max: 500, ideal: 250 },
    instagram: { min: 50, max: 300, ideal: 150 },
    linkedin: { min: 150, max: 700, ideal: 400 },
    twitter: { min: 20, max: 280, ideal: 200 },
    website: { min: 300, max: 2000, ideal: 800 },
    tiktok: { min: 30, max: 150, ideal: 80 },
    youtube: { min: 100, max: 500, ideal: 250 },
    zalo_oa: { min: 50, max: 300, ideal: 150 },
    email: { min: 100, max: 800, ideal: 300 },
    google_maps: { min: 50, max: 400, ideal: 150 },
  },
} as const;

// Script-specific criteria
export const SCRIPT_CRITERIA = {
  // Opening hook (first 3 seconds)
  openingHook: {
    visualHook: {
      required: true,
      score: 5,
      description: 'Có mô tả visual attention-grab trong 3 giây đầu',
    },
    dialogueHook: {
      required: true,
      score: 5,
      description: 'Lời thoại đầu gây tò mò',
    },
    immediateValue: {
      required: false,
      score: 3,
      description: 'Nêu value ngay từ đầu',
    },
  },
  
  // Character consistency
  characterVoice: {
    pronounConsistent: {
      required: true,
      penalty: -8,
      description: 'Đại từ nhất quán (tôi/mình/em/anh...)',
    },
    toneConsistent: {
      required: true,
      penalty: -5,
      description: 'Giọng nhân vật không đổi',
    },
    speechPatternConsistent: {
      required: true,
      penalty: -5,
      description: 'Kiểu nói đặc trưng nhất quán',
    },
  },
  
  // Scene flow
  sceneFlow: {
    logicalProgression: {
      required: true,
      score: 3,
      description: 'Các cảnh nối tiếp logic',
    },
    paceAppropriate: {
      required: true,
      score: 2,
      description: 'Nhịp độ phù hợp với thời lượng',
    },
    climaxPresent: {
      required: true,
      score: 3,
      description: 'Có điểm climax/cao trào',
    },
    clearCTA: {
      required: true,
      score: 2,
      description: 'CTA rõ ràng ở cuối',
    },
  },
  
  // Script structure by duration
  durationStructure: {
    '15s': { scenes: 2, maxDialogue: 40, paceWords: 'fast' },
    '30s': { scenes: 3, maxDialogue: 80, paceWords: 'medium' },
    '60s': { scenes: 5, maxDialogue: 160, paceWords: 'medium' },
    '90s': { scenes: 6, maxDialogue: 240, paceWords: 'varied' },
    '3min': { scenes: 10, maxDialogue: 400, paceWords: 'varied' },
  },
} as const;

// Carousel-specific criteria
export const CAROUSEL_CRITERIA = {
  // Slide structure
  slideStructure: {
    hookSlide: {
      required: true,
      score: 5,
      description: 'Slide 1 là hook mạnh',
    },
    logicalFlow: {
      required: true,
      score: 4,
      description: 'Slides có flow logic',
    },
    ctaSlide: {
      required: true,
      score: 3,
      description: 'Slide cuối có CTA',
    },
  },
  
  // Text per slide
  textGuidelines: {
    minPerSlide: 10,   // chars
    maxPerSlide: 100,  // chars
    idealPerSlide: 50,
  },
  
  // Visual consistency
  visualConsistency: {
    styleMatch: {
      required: true,
      score: 3,
      description: 'Visual style nhất quán',
    },
    brandElements: {
      required: true,
      score: 2,
      description: 'Brand elements có mặt',
    },
  },
} as const;

// ================== REFINEMENT STRATEGY ==================
export const REFINEMENT_STRATEGY = {
  // Score tiers determine refinement approach
  tiers: {
    high: { min: 80, max: 100, maxTries: 0, focus: 'none' },
    medium_high: { min: 70, max: 79, maxTries: 1, focus: 'minor_polish' },
    medium: { min: 60, max: 69, maxTries: 2, focus: 'targeted_fix' },
    low: { min: 0, max: 59, maxTries: 2, focus: 'major_rewrite' },
  },
  
  // Focused refinement prompts by category
  focusPrompts: {
    hook_strength: {
      prompt: 'TẬP TRUNG: Viết lại 2 dòng đầu với pattern Number + Emotion + Curiosity Gap. KHÔNG bắt đầu bằng "Xin chào" hay "Hôm nay".',
      examples: [
        '"3 sai lầm khiến 90% người mới thất bại..."',
        '"Tôi đã mất 2 năm để nhận ra điều này..."',
        '"Bạn có biết 87% khách hàng..."',
      ],
    },
    channel_fit: {
      prompt: 'TẬP TRUNG: Điều chỉnh độ dài, format, emoji theo đúng quy cách kênh. Đảm bảo mỗi kênh có style riêng.',
      examples: [
        'Instagram: ngắn gọn, nhiều emoji, hashtags cuối',
        'LinkedIn: professional, không emoji quá nhiều, longer form',
        'Facebook: conversational, emoji vừa phải, CTA rõ',
      ],
    },
    cta_quality: {
      prompt: 'TẬP TRUNG: Viết lại CTA cụ thể hơn với action verb + benefit + urgency. Không dùng CTA generic như "Liên hệ ngay".',
      examples: [
        '"Đăng ký nhận ebook miễn phí - chỉ hôm nay"',
        '"Đặt lịch tư vấn 1-1 (còn 3 slot)"',
        '"Tải checklist 10 bước - 5000+ người đã dùng"',
      ],
    },
    readability: {
      prompt: 'TẬP TRUNG: Chia nhỏ paragraphs (max 3 dòng), thêm line breaks, bold keywords quan trọng. Mỗi câu max 25 từ.',
      examples: [
        'Thêm bullet points cho danh sách',
        'Sử dụng emoji làm bullet: ✅ ❌ 💡 👉',
        'Bold key takeaways: **quan trọng**',
      ],
    },
    compliance: {
      prompt: 'TẬP TRUNG: LOẠI BỎ NGAY các từ cấm và claim vi phạm. Thay thế bằng từ an toàn. Đây là ưu tiên #1.',
      examples: [
        '"Chữa khỏi" → "Hỗ trợ cải thiện"',
        '"Cam kết 100%" → "Nhiều khách hàng đã..."',
        '"Số 1" → "Được nhiều người tin dùng"',
      ],
    },
    brand_voice: {
      prompt: 'TẬP TRUNG: Điều chỉnh tone và style theo brand guidelines. Đảm bảo giọng văn nhất quán.',
      examples: [],
    },
    content_structure: {
      prompt: 'TẬP TRUNG: Cải thiện cấu trúc: Opening > Body > CTA. Đảm bảo flow logic và dễ theo dõi.',
      examples: [],
    },
    engagement_potential: {
      prompt: 'TẬP TRUNG: Thêm yếu tố viral: câu hỏi, số liệu shocking, emotional triggers. Làm nội dung đáng share.',
      examples: [],
    },
  },
} as const;

// ================== HELPER FUNCTIONS ==================

/**
 * Analyze hook strength and return score + issues
 */
export function analyzeHook(text: string, channel?: string): { score: number; issues: string[]; strengths: string[] } {
  let score = 0;
  const issues: string[] = [];
  const strengths: string[] = [];
  
  const firstLine = text.split('\n')[0] || text.slice(0, 100);
  
  // Check positive patterns
  for (const [name, config] of Object.entries(HOOK_CRITERIA.patterns)) {
    if (config.regex.test(firstLine)) {
      score += config.score;
      strengths.push(config.description);
    }
  }
  
  // Check anti-patterns
  for (const antiPattern of HOOK_CRITERIA.antiPatterns) {
    if (antiPattern.pattern.test(firstLine)) {
      score += antiPattern.penalty;
      issues.push(antiPattern.reason);
    }
  }
  
  // Check channel-specific rules
  if (channel && HOOK_CRITERIA.channelRules[channel as keyof typeof HOOK_CRITERIA.channelRules]) {
    const rules = HOOK_CRITERIA.channelRules[channel as keyof typeof HOOK_CRITERIA.channelRules];
    if (firstLine.length < rules.minHookLength) {
      score -= 2;
      issues.push(`Hook quá ngắn cho ${channel}`);
    }
    if (firstLine.length > rules.maxHookLength) {
      score -= 2;
      issues.push(`Hook quá dài cho ${channel}`);
    }
  }
  
  // Normalize score to 0-18
  return { 
    score: Math.max(0, Math.min(18, score + 9)), // Base 9, range 0-18
    issues, 
    strengths 
  };
}

/**
 * Analyze CTA quality and return score + issues
 */
export function analyzeCTA(text: string, journeyStage?: string): { score: number; issues: string[]; strengths: string[] } {
  let score = 0;
  const issues: string[] = [];
  const strengths: string[] = [];
  let blacklistHit = false;
  
  // ⛔ BLACKLIST CHECK FIRST - Heavy penalty for generic CTAs
  for (const blacklistItem of CTA_CRITERIA.blacklist) {
    if (blacklistItem.pattern.test(text)) {
      score += blacklistItem.penalty;
      issues.push(`CTA blacklist: ${blacklistItem.reason}`);
      blacklistHit = true;
    }
  }
  
  // If blacklist hit, cap score at 2 max
  if (blacklistHit) {
    return {
      score: Math.max(0, Math.min(2, score + 8)), // Base 8 + penalties, capped at 2
      issues,
      strengths,
    };
  }
  
  // Check CTA presence and specificity
  let ctaFound = false;
  let highestScore = 0;
  
  for (const [level, config] of Object.entries(CTA_CRITERIA.specificityPatterns)) {
    for (const pattern of config.patterns) {
      if (pattern.test(text)) {
        if (config.score > highestScore) {
          highestScore = config.score;
          ctaFound = true;
          if (config.score >= 6) {
            strengths.push(config.description);
          }
        }
      }
    }
  }
  
  score = highestScore;
  
  if (!ctaFound) {
    issues.push('Không tìm thấy CTA rõ ràng');
    score = 0;
  }
  
  // Bonus for action verbs
  for (const verb of CTA_CRITERIA.actionVerbs) {
    if (text.toLowerCase().includes(verb.toLowerCase())) {
      score += 0.5;
      break;
    }
  }
  
  // Bonus for journey stage matching (if provided)
  if (journeyStage && CTA_CRITERIA.journeyMatch[journeyStage as keyof typeof CTA_CRITERIA.journeyMatch]) {
    const matchingCTAs = CTA_CRITERIA.journeyMatch[journeyStage as keyof typeof CTA_CRITERIA.journeyMatch];
    for (const cta of matchingCTAs) {
      if (text.toLowerCase().includes(cta.toLowerCase())) {
        score += 0.5;
        strengths.push(`CTA phù hợp với journey stage ${journeyStage}`);
        break;
      }
    }
  }
  
  return { 
    score: Math.max(0, Math.min(8, Math.round(score))),
    issues, 
    strengths 
  };
}

/**
 * Analyze readability and return score + issues
 */
export function analyzeReadability(text: string, channel?: string): { score: number; issues: string[]; strengths: string[] } {
  let score = 5; // Base score
  const issues: string[] = [];
  const strengths: string[] = [];
  
  // Check paragraph breaks
  const paragraphs = text.split(/\n\n+/);
  const avgParagraphLines = paragraphs.map(p => p.split('\n').length).reduce((a, b) => a + b, 0) / paragraphs.length;
  
  const maxLines = channel && READABILITY_CRITERIA.paragraphBreaks[channel as keyof typeof READABILITY_CRITERIA.paragraphBreaks]
    ? READABILITY_CRITERIA.paragraphBreaks[channel as keyof typeof READABILITY_CRITERIA.paragraphBreaks]
    : READABILITY_CRITERIA.paragraphBreaks.default;
  
  if (avgParagraphLines <= maxLines) {
    score += 1;
    strengths.push('Paragraphs ngắn gọn, dễ đọc');
  } else {
    issues.push('Paragraphs quá dài, cần chia nhỏ');
    score -= 1;
  }
  
  // Check for scanability elements
  if (/[-•●]\s/.test(text)) {
    score += READABILITY_CRITERIA.scanabilityBonus.hasBullets;
    strengths.push('Có bullet points');
  }
  if (/\*\*[^*]+\*\*/.test(text) || /<b>|<strong>/i.test(text)) {
    score += READABILITY_CRITERIA.scanabilityBonus.hasBoldKeywords;
    strengths.push('Keywords được highlight');
  }
  if (/^\d+\.\s/m.test(text)) {
    score += READABILITY_CRITERIA.scanabilityBonus.hasNumberedList;
    strengths.push('Có numbered list');
  }
  
  // Check sentence length
  const sentences = text.split(/[.!?。]+/).filter(s => s.trim().length > 0);
  const longSentences = sentences.filter(s => s.split(/\s+/).length > READABILITY_CRITERIA.sentenceLength.acceptable.max);
  if (longSentences.length > 0) {
    score += longSentences.length * READABILITY_CRITERIA.sentenceLength.penaltyPerLongSentence;
    issues.push(`${longSentences.length} câu quá dài (>40 từ)`);
  }
  
  return { 
    score: Math.max(0, Math.min(7, score)),
    issues, 
    strengths 
  };
}

/**
 * Get focused refinement prompt based on lowest scoring category
 */
export function getFocusedRefinePrompt(scores: Record<string, number>, maxScores: Record<string, number>): string {
  // Calculate percentage scores
  const percentages = Object.entries(scores).map(([category, score]) => ({
    category,
    percentage: (score / (maxScores[category] || 1)) * 100,
    score,
  }));
  
  // Sort by percentage (lowest first)
  percentages.sort((a, b) => a.percentage - b.percentage);
  
  const lowest = percentages[0];
  const categoryKey = lowest.category.replace(/_/g, '_') as keyof typeof REFINEMENT_STRATEGY.focusPrompts;
  
  if (REFINEMENT_STRATEGY.focusPrompts[categoryKey]) {
    const focus = REFINEMENT_STRATEGY.focusPrompts[categoryKey];
    let prompt = focus.prompt;
    if (focus.examples.length > 0) {
      prompt += '\n\nVí dụ:\n' + focus.examples.map(e => `- ${e}`).join('\n');
    }
    return prompt;
  }
  
  return 'SỬA TẤT CẢ các issues được liệt kê';
}

/**
 * Determine refinement strategy based on score
 */
export function getRefinementStrategy(score: number): { maxTries: number; focus: string } {
  for (const [_, tier] of Object.entries(REFINEMENT_STRATEGY.tiers)) {
    if (score >= tier.min && score <= tier.max) {
      return { maxTries: tier.maxTries, focus: tier.focus };
    }
  }
  return { maxTries: 2, focus: 'major_rewrite' };
}
