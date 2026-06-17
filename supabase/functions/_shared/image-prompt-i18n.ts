// ============================================
// Image Prompt Pipeline — i18n strings
// Localized structured-layout & critical text for non-VN brands
// ============================================

export type PromptLang = 'vi' | 'en' | 'th';

export interface StructuredLayoutStrings {
  layoutHeader: string;
  topZone: { title: string; rules: string[] };
  midZone: { title: string; rules: string[] };
  bottomZoneWithContact: { title: string; rules: string[] };
  bottomZoneNoContact: { title: string; rules: string[] };
  ctaSection: { title: string; rules: string[]; example: string };
  colorFontRules: { title: string; rules: string[] };
  fontMustSupport: string; // e.g. "Vietnamese diacritics" / "Thai script"
}

const STRINGS: Record<PromptLang, StructuredLayoutStrings> = {
  vi: {
    layoutHeader: '## BỐ CỤC ẢNH SOCIAL GRAPHIC (BẮT BUỘC):',
    topZone: {
      title: '### VÙNG TRÊN (20% trên cùng):',
      rules: [
        'TIÊU ĐỀ: Chữ lớn, đậm (Bold), nổi bật, gây tò mò',
        'Font: Sans-serif đậm, PHẢI hỗ trợ tiếng Việt có dấu đầy đủ',
        'Màu: Trắng hoặc màu sáng trên nền tối, hoặc màu đậm trên nền sáng',
        'Tiêu đề lấy từ nội dung chính hoặc hook message',
      ],
    },
    midZone: {
      title: '### VÙNG GIỮA:',
      rules: [
        'Hình ảnh chính / visual concept minh họa cho nội dung',
        'Để trống không gian thở, không chèn quá nhiều element',
        'Visual phải liên quan trực tiếp đến chủ đề bài viết',
      ],
    },
    bottomZoneWithContact: {
      title: '### VÙNG DƯỚI (20-30% dưới cùng):',
      rules: [
        'THÔNG TIN LIÊN HỆ với emojis tương ứng',
        'Màu chữ: Trắng hoặc sáng, dễ đọc trên nền tối',
        'Font size nhỏ hơn tiêu đề nhưng vẫn rõ ràng',
      ],
    },
    bottomZoneNoContact: {
      title: '### VÙNG DƯỚI (20% dưới cùng):',
      rules: [
        'CTA (Call-to-Action) nổi bật',
        'Dạng button hoặc banner',
        'CTA phù hợp với nội dung bài viết',
      ],
    },
    ctaSection: {
      title: '### CTA (Call-to-Action):',
      rules: [
        'Đặt ngay dưới hoặc bên cạnh thông tin liên hệ',
        'Dạng button hoặc banner nổi bật',
      ],
      example: 'Ví dụ: "Liên hệ ngay để được tư vấn" hoặc CTA phù hợp nội dung',
    },
    colorFontRules: {
      title: '### QUY TẮC MÀU SẮC VÀ FONT CHỮ:',
      rules: [
        'Thông tin liên hệ: Màu trắng hoặc sáng trên nền tối',
        'Phân biệt rõ ràng giữa tiêu đề (lớn, đậm), nội dung, và CTA (nổi bật)',
      ],
    },
    fontMustSupport: 'PHẢI hỗ trợ tiếng Việt có dấu (ă, â, đ, ê, ô, ơ, ư)',
  },
  en: {
    layoutHeader: '## SOCIAL GRAPHIC LAYOUT (REQUIRED):',
    topZone: {
      title: '### TOP ZONE (top 20%):',
      rules: [
        'HEADLINE: Large, bold, attention-grabbing, curiosity-inducing',
        'Font: Bold sans-serif with strong legibility',
        'Color: White or light on dark backgrounds, or dark on light backgrounds',
        'Headline derived from main content or hook message',
      ],
    },
    midZone: {
      title: '### MIDDLE ZONE:',
      rules: [
        'Main visual / concept illustrating the content',
        'Leave breathing room, do not crowd with elements',
        'Visual must directly relate to the article topic',
      ],
    },
    bottomZoneWithContact: {
      title: '### BOTTOM ZONE (bottom 20-30%):',
      rules: [
        'CONTACT INFORMATION with appropriate icons',
        'Text color: white or light, readable on dark background',
        'Font size smaller than headline but still clear',
      ],
    },
    bottomZoneNoContact: {
      title: '### BOTTOM ZONE (bottom 20%):',
      rules: [
        'Prominent CTA (Call-to-Action)',
        'Button or banner style',
        'CTA appropriate to the article content',
      ],
    },
    ctaSection: {
      title: '### CTA (Call-to-Action):',
      rules: [
        'Placed below or beside the contact information',
        'Prominent button or banner style',
      ],
      example: 'Example: "Get in touch today" or a CTA matching the content',
    },
    colorFontRules: {
      title: '### COLOR & TYPOGRAPHY RULES:',
      rules: [
        'Contact info: white or light color on dark background',
        'Clear hierarchy between headline (large, bold), body, and CTA (prominent)',
      ],
    },
    fontMustSupport: 'must support full Latin character set',
  },
  th: {
    layoutHeader: '## เลย์เอาต์ Social Graphic (บังคับ):',
    topZone: {
      title: '### โซนบน (20% ด้านบน):',
      rules: [
        'หัวเรื่อง: ตัวอักษรใหญ่ หนา โดดเด่น สร้างความสงสัย',
        'ฟอนต์: Sans-serif หนา รองรับภาษาไทยเต็มรูปแบบ',
        'สี: ขาวหรือสีอ่อนบนพื้นหลังเข้ม หรือสีเข้มบนพื้นหลังอ่อน',
        'หัวเรื่องดึงจากเนื้อหาหลักหรือ hook message',
      ],
    },
    midZone: {
      title: '### โซนกลาง:',
      rules: [
        'ภาพหลัก / แนวคิดภาพประกอบเนื้อหา',
        'เว้นพื้นที่หายใจ ไม่ใส่ element มากเกินไป',
        'ภาพต้องเกี่ยวข้องโดยตรงกับหัวข้อบทความ',
      ],
    },
    bottomZoneWithContact: {
      title: '### โซนล่าง (20-30% ด้านล่าง):',
      rules: [
        'ข้อมูลติดต่อพร้อมไอคอนที่เหมาะสม',
        'สีตัวอักษร: ขาวหรือสีอ่อน อ่านง่ายบนพื้นหลังเข้ม',
        'ขนาดฟอนต์เล็กกว่าหัวเรื่องแต่ยังชัดเจน',
      ],
    },
    bottomZoneNoContact: {
      title: '### โซนล่าง (20% ด้านล่าง):',
      rules: [
        'CTA (Call-to-Action) โดดเด่น',
        'รูปแบบปุ่มหรือแบนเนอร์',
        'CTA เหมาะสมกับเนื้อหาบทความ',
      ],
    },
    ctaSection: {
      title: '### CTA (Call-to-Action):',
      rules: [
        'วางใต้หรือข้างข้อมูลติดต่อ',
        'รูปแบบปุ่มหรือแบนเนอร์ที่โดดเด่น',
      ],
      example: 'ตัวอย่าง: "ติดต่อเราวันนี้" หรือ CTA ที่เหมาะกับเนื้อหา',
    },
    colorFontRules: {
      title: '### กฎสี & ตัวอักษร:',
      rules: [
        'ข้อมูลติดต่อ: สีขาวหรือสีอ่อนบนพื้นหลังเข้ม',
        'แยกลำดับชัดเจนระหว่างหัวเรื่อง (ใหญ่ หนา), เนื้อหา, และ CTA (โดดเด่น)',
      ],
    },
    fontMustSupport: 'ต้องรองรับอักษรไทยเต็มรูปแบบ',
  },
};

export function getPromptLang(countryCode?: string | null): PromptLang {
  if (!countryCode) return 'vi';
  const code = countryCode.toUpperCase();
  if (code === 'VN') return 'vi';
  if (code === 'TH') return 'th';
  // US/SG/MY/PH/EU/GLOBAL/UK/AU/CA → en
  if (['US', 'SG', 'MY', 'PH', 'EU', 'GLOBAL', 'UK', 'GB', 'AU', 'CA', 'NZ', 'IE'].includes(code)) return 'en';
  return 'vi'; // safe default for SEA markets
}

export function getLayoutStrings(lang: PromptLang): StructuredLayoutStrings {
  return STRINGS[lang] || STRINGS.vi;
}
