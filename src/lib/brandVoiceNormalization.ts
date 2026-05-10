const BRAND_POSITIONING_VALUES = ['business', 'expert', 'agency', 'consultant'] as const;
const TONE_OF_VOICE_VALUES = ['expert', 'calm', 'confident', 'friendly', 'analytical', 'serious', 'inspirational'] as const;
const FORMALITY_LEVEL_VALUES = ['formal', 'semi_formal', 'casual', 'friendly'] as const;

export type BrandPositioningValue = typeof BRAND_POSITIONING_VALUES[number];
export type ToneOfVoiceValue = typeof TONE_OF_VOICE_VALUES[number];
export type FormalityLevelValue = typeof FORMALITY_LEVEL_VALUES[number];

export const BRAND_POSITIONING_LABELS: Record<BrandPositioningValue, string> = {
  business: 'Doanh nghiệp',
  expert: 'Chuyên gia',
  agency: 'Agency',
  consultant: 'Tư vấn',
};

export const TONE_OF_VOICE_LABELS: Record<ToneOfVoiceValue, string> = {
  expert: 'Chuyên gia',
  calm: 'Điềm tĩnh',
  confident: 'Tự tin',
  friendly: 'Thân thiện',
  analytical: 'Phân tích',
  serious: 'Nghiêm túc',
  inspirational: 'Truyền cảm hứng',
};

export const FORMALITY_LEVEL_LABELS: Record<FormalityLevelValue, string> = {
  formal: 'Trang trọng',
  semi_formal: 'Bán trang trọng',
  casual: 'Gần gũi',
  friendly: 'Thân thiện',
};

const normalizeText = (value: unknown) =>
  typeof value === 'string'
    ? value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[-_]+/g, ' ')
    : '';

const includesAny = (text: string, needles: string[]) => needles.some((needle) => text.includes(needle));

export function normalizeBrandPositioning(value: unknown): BrandPositioningValue | null {
  const text = normalizeText(value);
  if (!text) return null;
  if ((BRAND_POSITIONING_VALUES as readonly string[]).includes(text.replace(/\s+/g, '_'))) {
    return text.replace(/\s+/g, '_') as BrandPositioningValue;
  }
  if (includesAny(text, ['agency', 'dai ly', 'marketing house', 'studio', 'production house'])) return 'agency';
  if (includesAny(text, ['tu van', 'consultant', 'co van', 'advisor', 'chien luoc gia'])) return 'consultant';
  if (includesAny(text, ['chuyen gia', 'expert', 'bac si', 'doctor', 'clinic', 'phong kham', 'tham my vien'])) return 'expert';
  return 'business';
}

export function normalizeToneOfVoice(value: unknown): ToneOfVoiceValue[] {
  const rawValues = Array.isArray(value) ? value : typeof value === 'string' ? [value] : [];
  const normalized = new Set<ToneOfVoiceValue>();

  for (const raw of rawValues) {
    const text = normalizeText(raw);
    if (!text) continue;
    const direct = text.replace(/\s+/g, '_');
    if ((TONE_OF_VOICE_VALUES as readonly string[]).includes(direct)) {
      normalized.add(direct as ToneOfVoiceValue);
    } else if (includesAny(text, ['chuyen gia', 'chuyen nghiep', 'professional', 'expert', 'authoritative', 'uy tin', 'tham quyen'])) {
      normalized.add('expert');
    } else if (includesAny(text, ['diem tinh', 'calm', 'am ap', 'nhe nhang', 'an tam', 'reassuring', 'soothing'])) {
      normalized.add('calm');
    } else if (includesAny(text, ['tu tin', 'confident', 'dut khoat', 'manh me', 'assertive'])) {
      normalized.add('confident');
    } else if (includesAny(text, ['than thien', 'gan gui', 'friendly', 'than mat', 'tro chuyen', 'conversational', 'vui ve'])) {
      normalized.add('friendly');
    } else if (includesAny(text, ['phan tich', 'analytical', 'logic', 'du lieu', 'khoa hoc', 'giao duc', 'educational'])) {
      normalized.add('analytical');
    } else if (includesAny(text, ['nghiem tuc', 'serious', 'trang trong', 'formal', 'chuan muc'])) {
      normalized.add('serious');
    } else if (includesAny(text, ['truyen cam hung', 'inspirational', 'tich cuc', 'aspirational'])) {
      normalized.add('inspirational');
    }
  }

  return Array.from(normalized).slice(0, 3);
}

export function normalizeFormalityLevel(value: unknown): FormalityLevelValue | null {
  const text = normalizeText(value);
  if (!text) return null;
  const direct = text.replace(/\s+/g, '_');
  if ((FORMALITY_LEVEL_VALUES as readonly string[]).includes(direct)) return direct as FormalityLevelValue;
  if (includesAny(text, ['formal', 'trang trong', 'quy khach', 'kinh gui'])) return 'formal';
  if (includesAny(text, ['neutral', 'semi formal', 'semi_formal', 'ban trang trong', 'trung tinh', 'chuan muc'])) return 'semi_formal';
  if (includesAny(text, ['casual', 'gan gui', 'than mat', 'minh', 'ban oi'])) return 'casual';
  if (includesAny(text, ['friendly', 'than thien', 'tu nhien', 'thoai mai'])) return 'friendly';
  return 'semi_formal';
}

export function normalizeBrandVoiceSuggestion<T extends { brand_positioning?: unknown; tone_of_voice?: unknown; formality_level?: unknown }>(suggestion: T): T {
  return {
    ...suggestion,
    brand_positioning: normalizeBrandPositioning(suggestion.brand_positioning),
    tone_of_voice: normalizeToneOfVoice(suggestion.tone_of_voice),
    formality_level: normalizeFormalityLevel(suggestion.formality_level),
  };
}