const TONE_OF_VOICE_VALUES = ['expert', 'calm', 'confident', 'friendly', 'analytical', 'serious', 'inspirational'] as const;
const FORMALITY_LEVEL_VALUES = ['formal', 'semi_formal', 'casual', 'friendly'] as const;

export type ToneOfVoiceValue = typeof TONE_OF_VOICE_VALUES[number];
export type FormalityLevelValue = typeof FORMALITY_LEVEL_VALUES[number];

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

/** Brand positioning là free text — giữ nguyên câu AI extract, chỉ trim + clamp 280 char. */
export function normalizeBrandPositioning(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 280);
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
      continue;
    }
    // Multi-match: 1 label AI có thể trigger nhiều bucket (vd "Chuyên nghiệp" → expert + serious)
    if (includesAny(text, ['chuyen gia', 'chuyen nghiep', 'professional', 'expert', 'authoritative', 'uy tin', 'tham quyen', 'chuyen sau'])) {
      normalized.add('expert');
    }
    if (includesAny(text, ['diem tinh', 'calm', 'am ap', 'nhe nhang', 'an tam', 'reassuring', 'soothing', 'tan tam', 'cham soc', 'thau hieu', 'dong cam'])) {
      normalized.add('calm');
    }
    if (includesAny(text, ['tu tin', 'confident', 'dut khoat', 'manh me', 'assertive', 'quyet doan'])) {
      normalized.add('confident');
    }
    if (includesAny(text, ['than thien', 'gan gui', 'friendly', 'than mat', 'tro chuyen', 'conversational', 'vui ve', 'ban oi'])) {
      normalized.add('friendly');
    }
    if (includesAny(text, ['phan tich', 'analytical', 'logic', 'du lieu', 'khoa hoc', 'giao duc', 'educational', 'chi tiet'])) {
      normalized.add('analytical');
    }
    if (includesAny(text, ['nghiem tuc', 'serious', 'trang trong', 'formal', 'chuan muc'])) {
      normalized.add('serious');
    }
    if (includesAny(text, ['truyen cam hung', 'inspirational', 'tich cuc', 'aspirational', 'sang tao', 'dam me'])) {
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
  if (includesAny(text, ['friendly', 'than thien', 'tu nhien', 'thoai mai'])) return 'friendly';
  if (includesAny(text, ['casual', 'gan gui', 'than mat', 'minh', 'ban oi'])) return 'casual';
  return 'semi_formal';
}

export function normalizeBrandVoiceSuggestion<T extends { brand_positioning?: unknown; tone_of_voice?: unknown; formality_level?: unknown }>(suggestion: T): T {
  let tones = normalizeToneOfVoice(suggestion.tone_of_voice);
  const formality = normalizeFormalityLevel(suggestion.formality_level);
  // Fallback: nếu tone rỗng nhưng có formality → seed 1 tone tương ứng để UI không trống
  if (tones.length === 0 && formality) {
    if (formality === 'formal') tones = ['serious', 'expert'];
    else if (formality === 'semi_formal') tones = ['expert'];
    else if (formality === 'casual') tones = ['friendly'];
    else if (formality === 'friendly') tones = ['friendly'];
  }
  return {
    ...suggestion,
    brand_positioning: normalizeBrandPositioning(suggestion.brand_positioning),
    tone_of_voice: tones,
    formality_level: formality,
  } as T;
}