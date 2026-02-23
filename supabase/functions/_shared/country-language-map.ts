/**
 * Country-Language Mapping Utility
 * Centralized mapping for multi-country support across all Edge Functions.
 * 
 * Usage:
 *   import { getLanguageConfig, getOutputLanguage } from "../_shared/country-language-map.ts";
 *   const lang = getOutputLanguage(brand.country_code); // 'vi' | 'th' | 'en' | ...
 *   const config = getLanguageConfig(lang);
 */

// ============================================
// TYPES
// ============================================

export interface LanguageConfig {
  /** ISO language code (vi, th, en, ...) */
  code: string;
  /** Native language name */
  nativeName: string;
  /** English language name */
  englishName: string;
  /** Timezone offset from UTC in hours */
  timezoneOffsetHours: number;
  /** Timezone display name */
  timezoneName: string;
  /** Day-of-week names in native language */
  dayNames: string[];
  /** Month names in native language */
  monthNames: string[];
  /** Date format template: {dayOfWeek}, {day} {month} {year} */
  dateTemplate: string;
  /** Token estimation ratio (chars per token) - varies by script */
  tokenCharRatio: number;
  /** Whether the language uses spaces between words */
  usesWordSpaces: boolean;
  /** Recommended Google Font family for text overlay */
  recommendedFont: string;
  /** Content expert persona for AI prompts */
  expertPersona: string;
  /** Truncation indicator text */
  truncationText: string;
  /** Summary prefix for conversation history */
  summaryPrefix: string;
}

export interface CountryConfig {
  /** ISO country code (VN, TH, US, ...) */
  code: string;
  /** Country name in native language */
  nativeName: string;
  /** Country name in English */
  englishName: string;
  /** Flag emoji */
  flag: string;
  /** Primary language code */
  primaryLanguage: string;
  /** Currency code */
  currencyCode: string;
  /** Currency symbol */
  currencySymbol: string;
  /** Primary social channels for this market */
  primaryChannels: string[];
  /** Channels NOT commonly used */
  uncommonChannels: string[];
}

// ============================================
// LANGUAGE CONFIGURATIONS
// ============================================

export const LANGUAGE_CONFIGS: Record<string, LanguageConfig> = {
  vi: {
    code: 'vi',
    nativeName: 'Tiếng Việt',
    englishName: 'Vietnamese',
    timezoneOffsetHours: 7,
    timezoneName: 'Vietnam (UTC+7)',
    dayNames: ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'],
    monthNames: ['tháng 1', 'tháng 2', 'tháng 3', 'tháng 4', 'tháng 5', 'tháng 6', 'tháng 7', 'tháng 8', 'tháng 9', 'tháng 10', 'tháng 11', 'tháng 12'],
    dateTemplate: '{dayOfWeek}, ngày {day} {month} năm {year}',
    tokenCharRatio: 2.0,
    usesWordSpaces: true,
    recommendedFont: 'Be Vietnam Pro',
    expertPersona: 'chuyên gia content marketing hàng đầu Việt Nam',
    truncationText: '...[nội dung được lược bỏ]...',
    summaryPrefix: 'Tóm tắt cuộc trò chuyện trước đó',
  },
  th: {
    code: 'th',
    nativeName: 'ภาษาไทย',
    englishName: 'Thai',
    timezoneOffsetHours: 7,
    timezoneName: 'Thailand (UTC+7)',
    dayNames: ['วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์'],
    monthNames: ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'],
    dateTemplate: '{dayOfWeek}ที่ {day} {month} {year}',
    tokenCharRatio: 1.5, // Thai script is denser
    usesWordSpaces: false, // Thai doesn't use spaces between words
    recommendedFont: 'Sarabun',
    expertPersona: 'ผู้เชี่ยวชาญด้าน Content Marketing ชั้นนำของประเทศไทย',
    truncationText: '...[เนื้อหาถูกตัดออก]...',
    summaryPrefix: 'สรุปการสนทนาก่อนหน้า',
  },
  en: {
    code: 'en',
    nativeName: 'English',
    englishName: 'English',
    timezoneOffsetHours: 0,
    timezoneName: 'UTC',
    dayNames: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    monthNames: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    dateTemplate: '{dayOfWeek}, {month} {day}, {year}',
    tokenCharRatio: 4.0,
    usesWordSpaces: true,
    recommendedFont: 'Inter',
    expertPersona: 'top content marketing expert',
    truncationText: '...[content truncated]...',
    summaryPrefix: 'Summary of previous conversation',
  },
  ja: {
    code: 'ja',
    nativeName: '日本語',
    englishName: 'Japanese',
    timezoneOffsetHours: 9,
    timezoneName: 'Japan (UTC+9)',
    dayNames: ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'],
    monthNames: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
    dateTemplate: '{year}年{month}{day}日 ({dayOfWeek})',
    tokenCharRatio: 1.5,
    usesWordSpaces: false,
    recommendedFont: 'Noto Sans JP',
    expertPersona: '日本のトップコンテンツマーケティング専門家',
    truncationText: '...[省略]...',
    summaryPrefix: '以前の会話の要約',
  },
  ko: {
    code: 'ko',
    nativeName: '한국어',
    englishName: 'Korean',
    timezoneOffsetHours: 9,
    timezoneName: 'Korea (UTC+9)',
    dayNames: ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'],
    monthNames: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
    dateTemplate: '{year}년 {month} {day}일 {dayOfWeek}',
    tokenCharRatio: 1.8,
    usesWordSpaces: true,
    recommendedFont: 'Noto Sans KR',
    expertPersona: '한국 최고의 콘텐츠 마케팅 전문가',
    truncationText: '...[내용 생략]...',
    summaryPrefix: '이전 대화 요약',
  },
  zh: {
    code: 'zh',
    nativeName: '中文',
    englishName: 'Chinese',
    timezoneOffsetHours: 8,
    timezoneName: 'China (UTC+8)',
    dayNames: ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'],
    monthNames: ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'],
    dateTemplate: '{year}年{month}{day}日 {dayOfWeek}',
    tokenCharRatio: 1.5,
    usesWordSpaces: false,
    recommendedFont: 'Noto Sans SC',
    expertPersona: '中国顶级内容营销专家',
    truncationText: '...[内容已省略]...',
    summaryPrefix: '之前对话摘要',
  },
  id: {
    code: 'id',
    nativeName: 'Bahasa Indonesia',
    englishName: 'Indonesian',
    timezoneOffsetHours: 7,
    timezoneName: 'Indonesia (UTC+7)',
    dayNames: ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'],
    monthNames: ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'],
    dateTemplate: '{dayOfWeek}, {day} {month} {year}',
    tokenCharRatio: 4.0,
    usesWordSpaces: true,
    recommendedFont: 'Inter',
    expertPersona: 'pakar content marketing terkemuka di Indonesia',
    truncationText: '...[konten dipotong]...',
    summaryPrefix: 'Ringkasan percakapan sebelumnya',
  },
  ms: {
    code: 'ms',
    nativeName: 'Bahasa Melayu',
    englishName: 'Malay',
    timezoneOffsetHours: 8,
    timezoneName: 'Malaysia (UTC+8)',
    dayNames: ['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu'],
    monthNames: ['Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun', 'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember'],
    dateTemplate: '{dayOfWeek}, {day} {month} {year}',
    tokenCharRatio: 4.0,
    usesWordSpaces: true,
    recommendedFont: 'Inter',
    expertPersona: 'pakar pemasaran kandungan terkemuka di Malaysia',
    truncationText: '...[kandungan dipotong]...',
    summaryPrefix: 'Ringkasan perbualan sebelumnya',
  },
};

// Default fallback
const DEFAULT_LANGUAGE = 'en';

// ============================================
// COUNTRY CONFIGURATIONS
// ============================================

export const COUNTRY_CONFIGS: Record<string, CountryConfig> = {
  VN: {
    code: 'VN', nativeName: 'Việt Nam', englishName: 'Vietnam', flag: '🇻🇳',
    primaryLanguage: 'vi', currencyCode: 'VND', currencySymbol: '₫',
    primaryChannels: ['facebook', 'zalo_oa', 'tiktok', 'instagram', 'youtube'],
    uncommonChannels: ['twitter', 'threads'],
  },
  TH: {
    code: 'TH', nativeName: 'ประเทศไทย', englishName: 'Thailand', flag: '🇹🇭',
    primaryLanguage: 'th', currencyCode: 'THB', currencySymbol: '฿',
    primaryChannels: ['facebook', 'line', 'tiktok', 'instagram', 'youtube'],
    uncommonChannels: ['zalo_oa', 'threads'],
  },
  US: {
    code: 'US', nativeName: 'United States', englishName: 'United States', flag: '🇺🇸',
    primaryLanguage: 'en', currencyCode: 'USD', currencySymbol: '$',
    primaryChannels: ['instagram', 'tiktok', 'youtube', 'twitter', 'linkedin', 'facebook'],
    uncommonChannels: ['zalo_oa', 'line'],
  },
  SG: {
    code: 'SG', nativeName: 'Singapore', englishName: 'Singapore', flag: '🇸🇬',
    primaryLanguage: 'en', currencyCode: 'SGD', currencySymbol: 'S$',
    primaryChannels: ['instagram', 'facebook', 'linkedin', 'tiktok', 'youtube'],
    uncommonChannels: ['zalo_oa'],
  },
  ID: {
    code: 'ID', nativeName: 'Indonesia', englishName: 'Indonesia', flag: '🇮🇩',
    primaryLanguage: 'id', currencyCode: 'IDR', currencySymbol: 'Rp',
    primaryChannels: ['instagram', 'tiktok', 'youtube', 'facebook', 'twitter'],
    uncommonChannels: ['zalo_oa', 'line'],
  },
  MY: {
    code: 'MY', nativeName: 'Malaysia', englishName: 'Malaysia', flag: '🇲🇾',
    primaryLanguage: 'ms', currencyCode: 'MYR', currencySymbol: 'RM',
    primaryChannels: ['instagram', 'tiktok', 'facebook', 'youtube', 'twitter'],
    uncommonChannels: ['zalo_oa'],
  },
  PH: {
    code: 'PH', nativeName: 'Philippines', englishName: 'Philippines', flag: '🇵🇭',
    primaryLanguage: 'en', currencyCode: 'PHP', currencySymbol: '₱',
    primaryChannels: ['facebook', 'instagram', 'tiktok', 'youtube', 'twitter'],
    uncommonChannels: ['zalo_oa', 'line'],
  },
  JP: {
    code: 'JP', nativeName: '日本', englishName: 'Japan', flag: '🇯🇵',
    primaryLanguage: 'ja', currencyCode: 'JPY', currencySymbol: '¥',
    primaryChannels: ['twitter', 'instagram', 'youtube', 'line', 'tiktok'],
    uncommonChannels: ['facebook', 'zalo_oa'],
  },
  KR: {
    code: 'KR', nativeName: '대한민국', englishName: 'South Korea', flag: '🇰🇷',
    primaryLanguage: 'ko', currencyCode: 'KRW', currencySymbol: '₩',
    primaryChannels: ['instagram', 'youtube', 'tiktok', 'twitter'],
    uncommonChannels: ['facebook', 'zalo_oa', 'line'],
  },
  EU: {
    code: 'EU', nativeName: 'European Union', englishName: 'European Union', flag: '🇪🇺',
    primaryLanguage: 'en', currencyCode: 'EUR', currencySymbol: '€',
    primaryChannels: ['instagram', 'linkedin', 'tiktok', 'youtube', 'twitter', 'facebook'],
    uncommonChannels: ['zalo_oa', 'line'],
  },
  GLOBAL: {
    code: 'GLOBAL', nativeName: 'Global', englishName: 'Global', flag: '🌐',
    primaryLanguage: 'en', currencyCode: 'USD', currencySymbol: '$',
    primaryChannels: ['instagram', 'facebook', 'tiktok', 'youtube', 'linkedin', 'twitter'],
    uncommonChannels: ['zalo_oa', 'line'],
  },
};

// ============================================
// PUBLIC API
// ============================================

/**
 * Get language code from country code
 * @param countryCode - ISO country code (VN, TH, US, ...)
 * @returns ISO language code (vi, th, en, ...)
 */
export function getOutputLanguage(countryCode: string | null | undefined): string {
  if (!countryCode) return 'vi'; // Default to Vietnamese for backward compatibility
  const country = COUNTRY_CONFIGS[countryCode.toUpperCase()];
  return country?.primaryLanguage || DEFAULT_LANGUAGE;
}

/**
 * Get full language configuration
 * @param languageCode - ISO language code (vi, th, en, ...)
 */
export function getLanguageConfig(languageCode: string | null | undefined): LanguageConfig {
  if (!languageCode) return LANGUAGE_CONFIGS['vi'];
  return LANGUAGE_CONFIGS[languageCode] || LANGUAGE_CONFIGS[DEFAULT_LANGUAGE];
}

/**
 * Get country configuration
 * @param countryCode - ISO country code
 */
export function getCountryConfig(countryCode: string | null | undefined): CountryConfig {
  if (!countryCode) return COUNTRY_CONFIGS['VN'];
  return COUNTRY_CONFIGS[countryCode.toUpperCase()] || COUNTRY_CONFIGS['GLOBAL'];
}

/**
 * Build localized date context section for AI prompts
 * Replaces the hardcoded Vietnamese date context
 */
export function buildLocalizedDateContext(languageCode: string): string {
  const lang = getLanguageConfig(languageCode);
  const now = new Date();
  const offset = lang.timezoneOffsetHours * 60 * 60 * 1000;
  const localTime = new Date(now.getTime() + offset);
  
  const dayOfWeek = lang.dayNames[localTime.getUTCDay()];
  const month = lang.monthNames[localTime.getUTCMonth()];
  const year = localTime.getUTCFullYear();
  const day = localTime.getUTCDate();
  const dateISO = localTime.toISOString().split('T')[0];
  
  const formattedDate = lang.dateTemplate
    .replace('{dayOfWeek}', dayOfWeek)
    .replace('{day}', String(day))
    .replace('{month}', month)
    .replace('{year}', String(year));
  
  return `## 📅 CURRENT DATE/TIME
- **Date:** ${formattedDate} (${dateISO})
- **Timezone:** ${lang.timezoneName}

⚠️ IMPORTANT: Use year ${year} in all content. DO NOT use previous years (${year - 1} or earlier).
`;
}

/**
 * Estimate token count with multi-language support
 * Replaces the Vietnamese-only estimateTokenCount
 */
export function estimateTokenCountMultiLang(text: string, languageCode?: string): number {
  if (!text) return 0;
  
  const lang = getLanguageConfig(languageCode);
  
  // Detect script patterns for more accurate estimation
  const cjkPattern = /[\u3000-\u9FFF\uF900-\uFAFF]/g;
  const thaiPattern = /[\u0E00-\u0E7F]/g;
  const vietnamesePattern = /[\u00C0-\u024F\u1E00-\u1EFF]/g;
  const koreanPattern = /[\uAC00-\uD7AF\u1100-\u11FF]/g;
  
  const cjkChars = (text.match(cjkPattern) || []).length;
  const thaiChars = (text.match(thaiPattern) || []).length;
  const viChars = (text.match(vietnamesePattern) || []).length;
  const koChars = (text.match(koreanPattern) || []).length;
  
  // Code blocks
  const codeBlocks = text.match(/```[\s\S]*?```/g) || [];
  const codeLength = codeBlocks.reduce((sum, block) => sum + block.length, 0);
  
  // Remaining text
  const specialChars = cjkChars + thaiChars + viChars + koChars;
  const normalLength = text.length - specialChars - codeLength;
  
  const tokens = Math.ceil(
    (cjkChars / 1.5) +       // CJK: ~1.5 chars per token
    (thaiChars / 1.5) +       // Thai: ~1.5 chars per token
    (viChars / 2.0) +         // Vietnamese: ~2 chars per token
    (koChars / 1.8) +         // Korean: ~1.8 chars per token
    (codeLength / 3.5) +      // Code: ~3.5 chars per token
    (normalLength / 4.0)      // English/Latin: ~4 chars per token
  );
  
  return Math.max(1, tokens);
}

/**
 * Get the AI expert persona description for a given language
 * Used in system prompts instead of hardcoded Vietnamese persona
 */
export function getExpertPersona(languageCode: string, domain: string = 'content marketing'): string {
  const lang = getLanguageConfig(languageCode);
  // Return the native-language expert persona
  return lang.expertPersona;
}

/**
 * Get localized prompt labels for common UI/prompt elements
 * Returns labels in the target language for use in AI prompts
 */
export function getLocalizedPromptLabels(languageCode: string): Record<string, string> {
  const labels: Record<string, Record<string, string>> = {
    vi: {
      wordUnit: 'từ',
      charUnit: 'ký tự',
      mandatory: 'BẮT BUỘC',
      forbidden: 'CẤM',
      coreRules: 'NGUYÊN TẮC LÕI',
      channelSettings: 'CÀI ĐẶT KÊNH',
      brandContext: 'THÔNG TIN THƯƠNG HIỆU',
      objective: 'MỤC TIÊU',
      finalCheck: 'KIỂM TRA CUỐI',
      countWords: 'ĐẾM TỪ TỪNG KÊNH',
      belowMin: 'DƯỚI min_length?',
      writeMore: 'VIẾT THÊM ngay',
      aboveMax: 'VƯỢT max_length?',
      trim: 'RÚT GỌN nhưng giữ giá trị',
      noOutput: 'KHÔNG OUTPUT nếu chưa đạt min_length',
      audience: 'Đối tượng',
      business: 'doanh nghiệp',
      consumer: 'người tiêu dùng',
      both: 'cả doanh nghiệp và người tiêu dùng',
    },
    th: {
      wordUnit: 'คำ',
      charUnit: 'ตัวอักษร',
      mandatory: 'บังคับ',
      forbidden: 'ห้าม',
      coreRules: 'หลักการสำคัญ',
      channelSettings: 'การตั้งค่าช่องทาง',
      brandContext: 'ข้อมูลแบรนด์',
      objective: 'เป้าหมาย',
      finalCheck: 'ตรวจสอบสุดท้าย',
      countWords: 'นับคำแต่ละช่องทาง',
      belowMin: 'ต่ำกว่าขั้นต่ำ?',
      writeMore: 'เขียนเพิ่มทันที',
      aboveMax: 'เกินขีดสูงสุด?',
      trim: 'ตัดให้สั้นลงแต่รักษาคุณค่า',
      noOutput: 'ห้ามส่งผลลัพธ์หากยังไม่ถึงขั้นต่ำ',
      audience: 'กลุ่มเป้าหมาย',
      business: 'ธุรกิจ',
      consumer: 'ผู้บริโภค',
      both: 'ทั้งธุรกิจและผู้บริโภค',
    },
    en: {
      wordUnit: 'words',
      charUnit: 'characters',
      mandatory: 'MANDATORY',
      forbidden: 'FORBIDDEN',
      coreRules: 'CORE RULES',
      channelSettings: 'CHANNEL SETTINGS',
      brandContext: 'BRAND CONTEXT',
      objective: 'OBJECTIVE',
      finalCheck: 'FINAL CHECK',
      countWords: 'COUNT WORDS PER CHANNEL',
      belowMin: 'Below min_length?',
      writeMore: 'WRITE MORE immediately',
      aboveMax: 'Above max_length?',
      trim: 'TRIM while keeping value',
      noOutput: 'DO NOT OUTPUT if below min_length',
      audience: 'Audience',
      business: 'businesses',
      consumer: 'consumers',
      both: 'both businesses and consumers',
    },
  };
  
  return labels[languageCode] || labels['en'];
}

/**
 * Get localized goal descriptions for content generation
 */
export function getLocalizedGoalDescriptions(languageCode: string): Record<string, string> {
  const goals: Record<string, Record<string, string>> = {
    vi: {
      education: "Giáo dục - Chia sẻ kiến thức chuyên sâu, hướng dẫn thực hành. Tone: Chuyên gia, rõ ràng, có giá trị.",
      awareness: "Nhận diện - Tăng nhận biết thương hiệu. Tone: Ấn tượng, đáng nhớ, consistent brand voice.",
      engagement: "Tương tác - Khuyến khích bình luận, chia sẻ. Tone: Gần gũi, đặt câu hỏi, tạo tranh luận.",
      expertise: "Xây chuyên gia - Thể hiện chuyên môn sâu. Tone: Chuyên nghiệp, có insight, data-driven.",
      conversion: "Chuyển đổi - Thúc đẩy hành động. Tone: Thuyết phục, urgency nhẹ, clear CTA.",
    },
    th: {
      education: "ให้ความรู้ - แบ่งปันความรู้เชิงลึก, แนวทางปฏิบัติ. Tone: ผู้เชี่ยวชาญ, ชัดเจน, มีคุณค่า.",
      awareness: "สร้างการรับรู้ - เพิ่มการรับรู้แบรนด์. Tone: น่าประทับใจ, น่าจดจำ, สอดคล้องกับ brand voice.",
      engagement: "สร้างการมีส่วนร่วม - กระตุ้นการแสดงความคิดเห็น, แชร์. Tone: เป็นกันเอง, ตั้งคำถาม, สร้างการถกเถียง.",
      expertise: "สร้างความเชี่ยวชาญ - แสดงความเชี่ยวชาญเชิงลึก. Tone: มืออาชีพ, มี insight, ขับเคลื่อนด้วยข้อมูล.",
      conversion: "เปลี่ยนเป็นลูกค้า - กระตุ้นการดำเนินการ. Tone: โน้มน้าว, urgency เบาๆ, CTA ชัดเจน.",
    },
    en: {
      education: "Education - Share in-depth knowledge, practical guidance. Tone: Expert, clear, valuable.",
      awareness: "Awareness - Increase brand recognition. Tone: Impressive, memorable, consistent brand voice.",
      engagement: "Engagement - Encourage comments, shares. Tone: Approachable, ask questions, spark discussion.",
      expertise: "Expertise - Demonstrate deep expertise. Tone: Professional, insightful, data-driven.",
      conversion: "Conversion - Drive action. Tone: Persuasive, soft urgency, clear CTA.",
    },
  };
  
  return goals[languageCode] || goals['en'];
}

/**
 * Get localized content angle descriptions
 */
export function getLocalizedAngleDescriptions(languageCode: string): Record<string, string> {
  const angles: Record<string, Record<string, string>> = {
    vi: {
      educational: "Kiến thức - Focus chia sẻ tips, hướng dẫn, thông tin hữu ích. Tone giáo dục, có giá trị thực.",
      storytelling: "Kể chuyện - Narrative flow, cảm xúc, câu chuyện thực. Tạo kết nối cảm xúc với người đọc.",
      promotional: "Quảng cáo - CTA mạnh, urgency, ưu đãi rõ ràng. Thúc đẩy hành động ngay.",
      social_proof: "Social Proof - Đánh giá, testimonial, case study. Tăng độ tin cậy qua bằng chứng thực.",
      behind_the_scenes: "Hậu trường - Quy trình, đội ngũ, behind-the-scenes. Tạo kết nối gần gũi, authentic.",
      qa_faq: "Q&A - Giải đáp thắc mắc, FAQ phổ biến. Giúp người đọc hiểu rõ, giải quyết objections.",
    },
    th: {
      educational: "ให้ความรู้ - แชร์เคล็ดลับ, แนวทาง, ข้อมูลที่เป็นประโยชน์. Tone การศึกษา, มีคุณค่าจริง.",
      storytelling: "เล่าเรื่อง - เรื่องราว, อารมณ์, เรื่องจริง. สร้างการเชื่อมต่อทางอารมณ์กับผู้อ่าน.",
      promotional: "โปรโมท - CTA แรง, urgency, ข้อเสนอชัดเจน. กระตุ้นการดำเนินการทันที.",
      social_proof: "Social Proof - รีวิว, testimonial, case study. เพิ่มความน่าเชื่อถือผ่านหลักฐานจริง.",
      behind_the_scenes: "เบื้องหลัง - กระบวนการ, ทีมงาน, behind-the-scenes. สร้างการเชื่อมต่อที่เป็นมิตร.",
      qa_faq: "ถาม-ตอบ - ตอบข้อสงสัย, FAQ ยอดนิยม. ช่วยผู้อ่านเข้าใจและแก้ไข objections.",
    },
    en: {
      educational: "Educational - Share tips, guides, useful info. Educational tone, real value.",
      storytelling: "Storytelling - Narrative flow, emotions, real stories. Create emotional connection.",
      promotional: "Promotional - Strong CTA, urgency, clear offers. Drive immediate action.",
      social_proof: "Social Proof - Reviews, testimonials, case studies. Build credibility through evidence.",
      behind_the_scenes: "Behind the Scenes - Process, team, BTS content. Create authentic connection.",
      qa_faq: "Q&A - Answer questions, popular FAQs. Help readers understand and resolve objections.",
    },
  };
  
  return angles[languageCode] || angles['en'];
}
