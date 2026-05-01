import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VideoGenerationRequest } from '@/types/videoGeneration';
import { CharacterProfile, CharacterAppearance, buildCharacterBlock } from '@/hooks/useCharacterProfiles';

// ─────────── Helpers ───────────

function makeProfile(overrides: Partial<CharacterProfile> = {}): CharacterProfile {
  return {
    id: 'char-1',
    organization_id: 'org-1',
    name: 'Dr. Minh',
    description: 'Bác sĩ thẩm mỹ 15 năm kinh nghiệm',
    appearance: {
      gender: 'Nam',
      age_range: '35-45',
      hair: 'Đen ngắn',
      skin_tone: 'Trắng sáng',
      body_type: 'Cân đối',
      distinctive_features: 'Đeo kính gọng vàng',
    },
    wardrobe: 'Áo blouse trắng, quần tây đen',
    reference_image_url: null,
    reference_images: [],
    default_voice_id: 'voice-1',
    default_voice_provider: 'elevenlabs',
    brand_template_id: 'brand-1',
    created_by: 'user-1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

// ─────────── Tests ───────────

describe('Multi-Character Consistency', () => {
  describe('VideoGenerationRequest type includes character fields', () => {
    it('should accept single character_profile_id', () => {
      const req: VideoGenerationRequest = {
        provider: 'geminigen',
        prompt: 'Test prompt',
        character_profile_id: 'char-1',
      };
      expect(req.character_profile_id).toBe('char-1');
    });

    it('should accept character_profile_ids array', () => {
      const req: VideoGenerationRequest = {
        provider: 'geminigen',
        prompt: 'Test prompt',
        character_profile_ids: ['char-1', 'char-2'],
      };
      expect(req.character_profile_ids).toHaveLength(2);
    });

    it('should allow both fields simultaneously for backward compat', () => {
      const req: VideoGenerationRequest = {
        provider: 'geminigen',
        prompt: 'Test prompt',
        character_profile_id: 'char-1',
        character_profile_ids: ['char-1', 'char-2'],
      };
      expect(req.character_profile_id).toBe('char-1');
      expect(req.character_profile_ids).toEqual(['char-1', 'char-2']);
    });
  });

  describe('buildCharacterBlock', () => {
    it('should include all 6 appearance fields', () => {
      const profile = makeProfile();
      const block = buildCharacterBlock(profile);
      expect(block).toContain('Nam');
      expect(block).toContain('age 35-45');
      expect(block).toContain('Đen ngắn hair');
      expect(block).toContain('Trắng sáng skin');
      expect(block).toContain('Cân đối');
      expect(block).toContain('Đeo kính gọng vàng');
    });

    it('should include wardrobe and description', () => {
      const profile = makeProfile();
      const block = buildCharacterBlock(profile);
      expect(block).toContain('Áo blouse trắng');
      expect(block).toContain('Bác sĩ thẩm mỹ');
    });

    it('should include character name in header', () => {
      const profile = makeProfile({ name: 'Ngọc Hà' });
      const block = buildCharacterBlock(profile);
      expect(block).toContain('"Ngọc Hà"');
    });

    it('should handle missing optional fields gracefully', () => {
      const profile = makeProfile({
        appearance: { gender: 'Nữ' },
        wardrobe: null,
        description: '',
      });
      const block = buildCharacterBlock(profile);
      expect(block).toContain('Nữ');
      expect(block).not.toContain('undefined');
      expect(block).not.toContain('null');
    });

    it('should always include consistency instruction', () => {
      const block = buildCharacterBlock(makeProfile());
      expect(block).toContain('IMPORTANT');
      expect(block).toContain('EXACT');
    });
  });

  describe('Character role ordering logic', () => {
    it('first ID in array is MAIN CHARACTER, rest are SUPPORTING', () => {
      const ids = ['char-main', 'char-support-1', 'char-support-2'];
      // Simulate the edge function logic
      const roles = ids.map((id, i) =>
        i === 0 ? 'MAIN CHARACTER' : `SUPPORTING CHARACTER ${i}`
      );
      expect(roles[0]).toBe('MAIN CHARACTER');
      expect(roles[1]).toBe('SUPPORTING CHARACTER 1');
      expect(roles[2]).toBe('SUPPORTING CHARACTER 2');
    });

    it('Vietnamese labels for generate-script', () => {
      const ids = ['char-main', 'char-support'];
      const roles = ids.map((id, i) =>
        i === 0 ? 'NHÂN VẬT CHÍNH' : `NHÂN VẬT PHỤ ${i}`
      );
      expect(roles[0]).toBe('NHÂN VẬT CHÍNH');
      expect(roles[1]).toBe('NHÂN VẬT PHỤ 1');
    });

    it('resolvedCharIds prefers array over single ID', () => {
      // Mirror edge function logic
      const character_profile_id = 'single-id';
      const character_profile_ids = ['id-1', 'id-2'];

      const resolved = Array.isArray(character_profile_ids) && character_profile_ids.length > 0
        ? character_profile_ids
        : character_profile_id ? [character_profile_id] : [];

      expect(resolved).toEqual(['id-1', 'id-2']);
    });

    it('falls back to single ID when array is empty', () => {
      const character_profile_id = 'single-id';
      const character_profile_ids: string[] = [];

      const resolved = Array.isArray(character_profile_ids) && character_profile_ids.length > 0
        ? character_profile_ids
        : character_profile_id ? [character_profile_id] : [];

      expect(resolved).toEqual(['single-id']);
    });

    it('returns empty when both are absent', () => {
      const character_profile_id = undefined;
      const character_profile_ids = undefined;

      const resolved = Array.isArray(character_profile_ids) && character_profile_ids.length > 0
        ? character_profile_ids
        : character_profile_id ? [character_profile_id] : [];

      expect(resolved).toEqual([]);
    });
  });

  describe('Character appearance trait extraction parity', () => {
    // Mirrors the exact logic used in all 3 edge functions
    function extractTraitsEN(app: CharacterAppearance): string[] {
      const traits: string[] = [];
      if (app.gender) traits.push(app.gender);
      if (app.age_range) traits.push(`age ${app.age_range}`);
      if (app.hair) traits.push(`${app.hair} hair`);
      if (app.skin_tone) traits.push(`${app.skin_tone} skin`);
      if (app.body_type) traits.push(app.body_type);
      if (app.distinctive_features) traits.push(app.distinctive_features);
      return traits;
    }

    function extractTraitsVN(app: CharacterAppearance): string[] {
      const traits: string[] = [];
      if (app.gender) traits.push(app.gender);
      if (app.age_range) traits.push(`tuổi ${app.age_range}`);
      if (app.hair) traits.push(`tóc ${app.hair}`);
      if (app.skin_tone) traits.push(`da ${app.skin_tone}`);
      if (app.body_type) traits.push(app.body_type);
      if (app.distinctive_features) traits.push(app.distinctive_features);
      return traits;
    }

    const fullAppearance: CharacterAppearance = {
      gender: 'Nữ',
      age_range: '25-35',
      hair: 'Nâu dài',
      skin_tone: 'Nâu ấm',
      body_type: 'Thon gọn',
      distinctive_features: 'Nốt ruồi bên trái má',
    };

    it('EN extraction includes all 6 fields', () => {
      const traits = extractTraitsEN(fullAppearance);
      expect(traits).toHaveLength(6);
      expect(traits).toContain('Nữ');
      expect(traits).toContain('age 25-35');
      expect(traits).toContain('Nâu dài hair');
      expect(traits).toContain('Nâu ấm skin');
      expect(traits).toContain('Thon gọn');
      expect(traits).toContain('Nốt ruồi bên trái má');
    });

    it('VN extraction includes all 6 fields', () => {
      const traits = extractTraitsVN(fullAppearance);
      expect(traits).toHaveLength(6);
      expect(traits).toContain('Nữ');
      expect(traits).toContain('tuổi 25-35');
      expect(traits).toContain('tóc Nâu dài');
      expect(traits).toContain('da Nâu ấm');
      expect(traits).toContain('Thon gọn');
    });

    it('EN and VN have same field count for same input', () => {
      expect(extractTraitsEN(fullAppearance).length)
        .toBe(extractTraitsVN(fullAppearance).length);
    });

    it('partial appearance does not produce undefined entries', () => {
      const partial: CharacterAppearance = { gender: 'Nam', hair: 'Đen' };
      const traitsEN = extractTraitsEN(partial);
      const traitsVN = extractTraitsVN(partial);
      expect(traitsEN.every(t => t !== undefined && t !== 'undefined')).toBe(true);
      expect(traitsVN.every(t => t !== undefined && t !== 'undefined')).toBe(true);
      expect(traitsEN).toHaveLength(2);
      expect(traitsVN).toHaveLength(2);
    });
  });

  describe('Multi-character distinction block', () => {
    it('adds distinction warning when multiple characters', () => {
      const sorted = [makeProfile({ id: 'a' }), makeProfile({ id: 'b', name: 'Hà' })];
      // Mirror edge function logic
      const charBlocks: string[] = [];
      if (sorted.length > 1) {
        charBlocks.push(
          `[CHARACTER DISTINCTION] There are ${sorted.length} distinct characters. Each must have their own unique appearance as described above. Never merge or swap features between characters.`
        );
      }
      expect(charBlocks).toHaveLength(1);
      expect(charBlocks[0]).toContain('2 distinct characters');
      expect(charBlocks[0]).toContain('Never merge');
    });

    it('does NOT add distinction for single character', () => {
      const sorted = [makeProfile()];
      const charBlocks: string[] = [];
      if (sorted.length > 1) {
        charBlocks.push('[CHARACTER DISTINCTION]...');
      }
      expect(charBlocks).toHaveLength(0);
    });
  });
});
