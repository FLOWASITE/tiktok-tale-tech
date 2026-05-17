// Lightweight heuristic to detect meaningless or too-generic campaign names
// before we spend an AI call. Mirrors logic in
// supabase/functions/clarify-campaign-intent/index.ts (isLikelyGibberish).

export type NameQualityStatus = 'ok' | 'generic' | 'gibberish';

export interface NameQualityResult {
  status: NameQualityStatus;
  reason?: string;
}

const BLACKLIST = [
  'test', 'testing', 'asdf', 'qwerty', 'qwer', 'abcd', 'abc',
  'untitled', 'no name', 'noname', 'demo',
  'new campaign', 'campaign 1', 'campaign 2', 'campaign 3',
  'chiến dịch mới', 'chiến dịch 1', 'chiến dịch 2', 'chiến dịch 3',
  'chien dich', 'tên chiến dịch', 'ten chien dich',
];

const GENERIC_TOKENS = new Set([
  'chiến', 'dịch', 'campaign', 'marketing', 'quảng', 'cáo', 'ads',
  'content', 'nội', 'dung', 'post', 'bài', 'viết', 'plan', 'kế', 'hoạch',
  'the', 'a', 'an', 'of', 'for', 'with', 'and', 'cho', 'và', 'của',
]);

export function analyzeCampaignName(name: string): NameQualityResult {
  const raw = (name || '').trim();
  if (!raw) return { status: 'ok' }; // empty handled separately

  const lower = raw.toLowerCase();

  // 1. Blacklist match
  if (BLACKLIST.some(b => lower === b || lower.startsWith(b + ' ') || lower.endsWith(' ' + b))) {
    return { status: 'gibberish', reason: 'Tên placeholder/mẫu, không mô tả chiến dịch.' };
  }

  // 2. Repeated character runs (aaaa, xxxx, 1111)
  if (/(.)\1{3,}/.test(lower)) {
    return { status: 'gibberish', reason: 'Tên chứa ký tự lặp bất thường.' };
  }

  // 3. Same token repeated (test test test)
  const tokens = lower.split(/\s+/).filter(Boolean);
  if (tokens.length >= 2) {
    const uniq = new Set(tokens);
    if (uniq.size === 1) {
      return { status: 'gibberish', reason: 'Tên chỉ lặp một từ.' };
    }
  }

  // 4. Letter ratio (Unicode-aware) — too few real letters → gibberish
  const letterMatches = raw.match(/\p{L}/gu) || [];
  const letterRatio = letterMatches.length / raw.length;
  if (raw.length >= 6 && letterRatio < 0.45) {
    return { status: 'gibberish', reason: 'Tên có quá ít chữ cái có nghĩa.' };
  }
  if (letterMatches.length < 4) {
    return { status: 'gibberish', reason: 'Tên quá ngắn hoặc không có chữ cái.' };
  }

  // 5. Vowel/consonant balance — pure consonant strings (kkkkk, bcdfgh) are gibberish
  if (raw.length >= 6) {
    const lettersOnly = letterMatches.join('').toLowerCase();
    const vowels = (lettersOnly.match(/[aeiouáàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵ]/g) || []).length;
    const vowelRatio = vowels / lettersOnly.length;
    if (vowelRatio < 0.15 || vowelRatio > 0.85) {
      return { status: 'gibberish', reason: 'Tên có cấu trúc không tự nhiên.' };
    }
  }

  // 6. Generic-only: all tokens are stopwords/generic marketing words
  const meaningfulTokens = tokens.filter(t => {
    const clean = t.replace(/[^\p{L}\p{N}]/gu, '');
    return clean.length >= 2 && !GENERIC_TOKENS.has(clean);
  });
  if (meaningfulTokens.length === 0) {
    return { status: 'generic', reason: 'Tên chỉ chứa từ chung chung, thiếu sản phẩm/đối tượng/thời điểm.' };
  }
  if (raw.length < 8 && meaningfulTokens.length < 2) {
    return { status: 'generic', reason: 'Tên quá ngắn, nên thêm sản phẩm hoặc thời điểm.' };
  }

  return { status: 'ok' };
}
