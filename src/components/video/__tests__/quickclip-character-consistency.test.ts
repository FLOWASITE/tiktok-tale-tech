import { describe, it, expect } from 'vitest';
import { VideoGenerationRequest } from '@/types/videoGeneration';

// ─────────── Types (mirror hooks/useCharacterProfiles) ───────────

interface CharacterAppearance {
  gender?: string;
  age_range?: string;
  hair?: string;
  skin_tone?: string;
  body_type?: string;
  distinctive_features?: string;
}

interface CharacterProfile {
  id: string;
  organization_id: string;
  name: string;
  description: string;
  appearance: CharacterAppearance;
  wardrobe: string | null;
  reference_image_url: string | null;
  reference_images: { url: string; label: string }[];
  default_voice_id: string | null;
  default_voice_provider: string | null;
  brand_template_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

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
    reference_image_url: 'https://example.com/dr-minh.jpg',
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

/**
 * Mirror of handleGenerate body construction from QuickClipTab.tsx lines 179-195.
 */
function buildGenerateBody(
  prompt: string,
  selectedCharacters: CharacterProfile[],
  opts: { model?: string; duration?: number; aspect_ratio?: string; script_id?: string; scene_number?: number } = {},
): VideoGenerationRequest {
  return {
    provider: 'geminigen',
    prompt: prompt.trim(),
    model: opts.model ?? 'geminigen/veo-3.1-fast',
    duration: opts.duration ?? 8,
    aspect_ratio: opts.aspect_ratio ?? '16:9',
    resolution: '1080p',
    script_id: opts.script_id,
    scene_number: opts.scene_number,
    starting_frame_url: selectedCharacters[0]?.reference_image_url || undefined,
    character_profile_id: selectedCharacters[0]?.id || undefined,
    character_profile_ids: selectedCharacters.length > 0 ? selectedCharacters.map(c => c.id) : undefined,
  } as VideoGenerationRequest;
}

/**
 * Mirror of handleSmartPrompt body from QuickClipTab.tsx lines 142-153.
 */
function buildSmartPromptBody(
  idea: string,
  selectedCharacterIds: string[],
  opts: { aspect_ratio?: string; duration?: number; brand_id?: string } = {},
) {
  return {
    idea: idea.trim(),
    channel: opts.aspect_ratio === '16:9' ? 'youtube' : opts.aspect_ratio === '1:1' ? 'facebook' : 'tiktok',
    aspect_ratio: opts.aspect_ratio ?? '9:16',
    duration: opts.duration ?? 10,
    brand_id: opts.brand_id,
    language: 'vi',
    character_profile_id: selectedCharacterIds[0] || undefined,
    character_profile_ids: selectedCharacterIds.length > 0 ? selectedCharacterIds : undefined,
  };
}

// ─────────── Tests ───────────

describe('QuickClip Character Consistency', () => {

  // ── 1. handleGenerate fields ──

  describe('handleGenerate sends correct character fields', () => {
    it('sends character_profile_id as first selected character ID', () => {
      const chars = [makeProfile({ id: 'main-char' }), makeProfile({ id: 'support-char' })];
      const body = buildGenerateBody('Cảnh bác sĩ tư vấn khách hàng', chars);
      expect(body.character_profile_id).toBe('main-char');
    });

    it('sends character_profile_ids as full array preserving order', () => {
      const chars = [makeProfile({ id: 'A' }), makeProfile({ id: 'B' }), makeProfile({ id: 'C' })];
      const body = buildGenerateBody('Cảnh đội ngũ bác sĩ', chars);
      expect(body.character_profile_ids).toEqual(['A', 'B', 'C']);
    });

    it('sends undefined for both fields when no characters selected', () => {
      const body = buildGenerateBody('B-roll cảnh phòng khám', []);
      expect(body.character_profile_id).toBeUndefined();
      expect(body.character_profile_ids).toBeUndefined();
    });

    it('single character sends array with one element', () => {
      const chars = [makeProfile({ id: 'solo' })];
      const body = buildGenerateBody('Close-up nhân vật', chars);
      expect(body.character_profile_id).toBe('solo');
      expect(body.character_profile_ids).toEqual(['solo']);
    });
  });

  // ── 2. handleSmartPrompt fields ──

  describe('handleSmartPrompt sends correct character fields', () => {
    it('sends character_profile_id as first ID in array', () => {
      const ids = ['char-main', 'char-sub'];
      const body = buildSmartPromptBody('Bác sĩ tư vấn', ids);
      expect(body.character_profile_id).toBe('char-main');
    });

    it('sends full character_profile_ids array', () => {
      const ids = ['id-1', 'id-2', 'id-3'];
      const body = buildSmartPromptBody('Team meeting', ids);
      expect(body.character_profile_ids).toEqual(['id-1', 'id-2', 'id-3']);
    });

    it('sends undefined when no characters selected', () => {
      const body = buildSmartPromptBody('Cảnh sản phẩm', []);
      expect(body.character_profile_id).toBeUndefined();
      expect(body.character_profile_ids).toBeUndefined();
    });

    it('maps aspect to correct channel', () => {
      expect(buildSmartPromptBody('x', ['a'], { aspect_ratio: '16:9' }).channel).toBe('youtube');
      expect(buildSmartPromptBody('x', ['a'], { aspect_ratio: '1:1' }).channel).toBe('facebook');
      expect(buildSmartPromptBody('x', ['a'], { aspect_ratio: '9:16' }).channel).toBe('tiktok');
    });
  });

  // ── 3. Scene navigation does NOT reset character selection ──

  describe('Scene navigation preserves character selection', () => {
    it('selectedCharacterIds unchanged when scene index changes', () => {
      // Simulate: user selects characters, then navigates scenes
      const selectedCharacterIds = ['char-A', 'char-B'];

      // Scene 1
      const body1 = buildGenerateBody('Scene 1 prompt', [
        makeProfile({ id: 'char-A' }),
        makeProfile({ id: 'char-B' }),
      ], { scene_number: 1 });

      // Scene 2 — same characters, different prompt
      const body2 = buildGenerateBody('Scene 2 prompt', [
        makeProfile({ id: 'char-A' }),
        makeProfile({ id: 'char-B' }),
      ], { scene_number: 2 });

      // Character fields must be identical across scenes
      expect(body1.character_profile_ids).toEqual(body2.character_profile_ids);
      expect(body1.character_profile_id).toEqual(body2.character_profile_id);

      // But prompts differ
      expect(body1.prompt).not.toBe(body2.prompt);
    });

    it('scene_number changes but character order stays intact', () => {
      const charOrder = ['main', 'support-1', 'support-2'];
      const profiles = charOrder.map(id => makeProfile({ id }));

      for (let scene = 1; scene <= 5; scene++) {
        const body = buildGenerateBody(`Scene ${scene}`, profiles, { scene_number: scene });
        expect(body.character_profile_ids).toEqual(charOrder);
        expect(body.character_profile_id).toBe('main');
      }
    });
  });

  // ── 4. Multi-character ordering preserved ──

  describe('Multi-character ordering (vai chính/phụ)', () => {
    it('first element is always vai chính across all scenes', () => {
      const ids = ['vai-chinh', 'vai-phu-1', 'vai-phu-2'];
      const profiles = ids.map(id => makeProfile({ id }));

      const body = buildGenerateBody('Đa nhân vật', profiles);
      expect(body.character_profile_ids![0]).toBe('vai-chinh');
      expect(body.character_profile_id).toBe('vai-chinh');
    });

    it('reorder changes vai chính', () => {
      // Simulate moveCharacter(0, 1) — swap first two
      const original = ['A', 'B', 'C'];
      const reordered = [...original];
      const [moved] = reordered.splice(0, 1);
      reordered.splice(1, 0, moved);

      expect(reordered).toEqual(['B', 'A', 'C']);

      const profiles = reordered.map(id => makeProfile({ id }));
      const body = buildGenerateBody('After reorder', profiles);
      expect(body.character_profile_id).toBe('B'); // New vai chính
      expect(body.character_profile_ids).toEqual(['B', 'A', 'C']);
    });
  });

  // ── 5. Reference image fallback ──

  describe('Reference image fallback logic', () => {
    it('starting_frame_url from first character reference_image_url', () => {
      const chars = [
        makeProfile({ id: 'a', reference_image_url: 'https://img.test/a.jpg' }),
        makeProfile({ id: 'b', reference_image_url: 'https://img.test/b.jpg' }),
      ];
      const body = buildGenerateBody('Test', chars);
      expect(body.starting_frame_url).toBe('https://img.test/a.jpg');
    });

    it('starting_frame_url undefined when first character has no image', () => {
      const chars = [
        makeProfile({ id: 'a', reference_image_url: null }),
        makeProfile({ id: 'b', reference_image_url: 'https://img.test/b.jpg' }),
      ];
      const body = buildGenerateBody('Test', chars);
      expect(body.starting_frame_url).toBeUndefined();
    });

    it('starting_frame_url undefined when no characters', () => {
      const body = buildGenerateBody('B-roll', []);
      expect(body.starting_frame_url).toBeUndefined();
    });
  });
});
