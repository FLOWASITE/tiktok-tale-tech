import { describe, it, expect } from 'vitest';
import { mergeBrandVoiceWithPack } from '../mergeBrandVoiceWithPack';

const emptyState = { brandPositioning: '', toneOfVoice: [] as string[], formalityLevel: '' };

const importedSuggestion = {
  brand_positioning: 'Phòng khám thẩm mỹ cao cấp dành cho phụ nữ thành đạt 30+',
  tone_of_voice: ['Chuyên nghiệp', 'Tận tâm'],
  formality_level: 'Trang trọng',
};

const packData = {
  brandPositioning: 'Default pack positioning',
  brandVoice: {
    tone_of_voice: ['friendly'],
    formality_level: 'casual',
  },
};

describe('mergeBrandVoiceWithPack — regression: import KHÔNG bị ghi đè', () => {
  it('giữ nguyên positioning/tone/formality từ import khi chọn industry pack', () => {
    const r = mergeBrandVoiceWithPack(emptyState, importedSuggestion, packData);

    expect(r.brandPositioning).toBe(importedSuggestion.brand_positioning);
    expect(r.source.brandPositioning).toBe('imported');

    expect(r.toneOfVoice.length).toBeGreaterThan(0);
    expect(r.toneOfVoice).toEqual(expect.arrayContaining(['expert']));
    expect(r.source.toneOfVoice).toBe('imported');

    expect(r.formalityLevel).toBe('formal');
    expect(r.source.formalityLevel).toBe('imported');
  });

  it('không overwrite ngay cả khi state đã có giá trị (chuyển step rồi quay lại + chọn pack)', () => {
    const populated = {
      brandPositioning: 'User edited positioning',
      toneOfVoice: ['confident'],
      formalityLevel: 'semi_formal',
    };
    const r = mergeBrandVoiceWithPack(populated, importedSuggestion, packData);
    // import ưu tiên cao nhất → vẫn override state cũ bằng import (không phải pack)
    expect(r.source.brandPositioning).toBe('imported');
    expect(r.source.toneOfVoice).toBe('imported');
    expect(r.source.formalityLevel).toBe('imported');
    expect(r.brandPositioning).toBe(importedSuggestion.brand_positioning);
  });

  it('fallback về pack khi không có import và state rỗng', () => {
    const r = mergeBrandVoiceWithPack(emptyState, null, packData);
    expect(r.brandPositioning).toBe(packData.brandPositioning);
    expect(r.source.brandPositioning).toBe('pack');
    expect(r.toneOfVoice).toEqual(['friendly']);
    expect(r.source.toneOfVoice).toBe('pack');
    expect(r.formalityLevel).toBe('casual');
    expect(r.source.formalityLevel).toBe('pack');
  });

  it('giữ state hiện tại khi không có import và không có pack defaults (chuyển step không reset)', () => {
    const populated = {
      brandPositioning: 'Manually typed',
      toneOfVoice: ['analytical'],
      formalityLevel: 'formal',
    };
    const r = mergeBrandVoiceWithPack(populated, null, { brandPositioning: null, brandVoice: null });
    expect(r.brandPositioning).toBe('Manually typed');
    expect(r.toneOfVoice).toEqual(['analytical']);
    expect(r.formalityLevel).toBe('formal');
    expect(r.source.brandPositioning).toBe('state');
    expect(r.source.toneOfVoice).toBe('state');
    expect(r.source.formalityLevel).toBe('state');
  });

  it('import partial: chỉ có positioning → tone/formality lấy từ pack', () => {
    const partial = { brand_positioning: 'Chỉ có positioning thôi' };
    const r = mergeBrandVoiceWithPack(emptyState, partial, packData);
    expect(r.source.brandPositioning).toBe('imported');
    expect(r.source.toneOfVoice).toBe('pack');
    expect(r.source.formalityLevel).toBe('pack');
  });

  it('chuyển step nhiều lần với cùng input → kết quả idempotent', () => {
    const r1 = mergeBrandVoiceWithPack(emptyState, importedSuggestion, packData);
    const stateAfter = {
      brandPositioning: r1.brandPositioning,
      toneOfVoice: r1.toneOfVoice as string[],
      formalityLevel: r1.formalityLevel as string,
    };
    const r2 = mergeBrandVoiceWithPack(stateAfter, importedSuggestion, packData);
    expect(r2.brandPositioning).toBe(r1.brandPositioning);
    expect(r2.toneOfVoice).toEqual(r1.toneOfVoice);
    expect(r2.formalityLevel).toBe(r1.formalityLevel);
  });
});
