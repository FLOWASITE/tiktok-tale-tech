import { describe, it, expect } from 'vitest';

// ─────────── Types (mirror edge function) ───────────

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
  name: string;
  description: string;
  appearance: CharacterAppearance;
  wardrobe: string | null;
  default_voice_id: string | null;
  default_voice_provider: string | null;
}

// ─────────── Logic mirrors (from generate-video-prompt/index.ts lines 109-151) ───────────

/** Resolve character IDs — array takes priority over single ID */
function resolveCharacterIds(
  character_profile_id?: string,
  character_profile_ids?: string[],
): string[] {
  return Array.isArray(character_profile_ids) && character_profile_ids.length > 0
    ? character_profile_ids
    : character_profile_id ? [character_profile_id] : [];
}

/** Sort profiles to match requested order (preserving vai chính/phụ) */
function sortProfilesByIds(
  resolvedCharIds: string[],
  charProfiles: CharacterProfile[],
): CharacterProfile[] {
  return resolvedCharIds
    .map(id => charProfiles.find(p => p.id === id))
    .filter(Boolean) as CharacterProfile[];
}

/** Build character context block — exact mirror of edge function lines 124-150 */
function buildCharacterContext(sorted: CharacterProfile[]): string {
  if (sorted.length === 0) return '';

  const blocks: string[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const cp = sorted[i];
    const role = i === 0 ? 'MAIN CHARACTER' : `SUPPORTING CHARACTER ${i}`;
    const app = (cp.appearance || {}) as Record<string, string>;
    const traits: string[] = [];
    if (app.gender) traits.push(app.gender);
    if (app.age_range) traits.push(`age ${app.age_range}`);
    if (app.hair) traits.push(`${app.hair} hair`);
    if (app.skin_tone) traits.push(`${app.skin_tone} skin`);
    if (app.body_type) traits.push(app.body_type);
    if (app.distinctive_features) traits.push(app.distinctive_features);

    let line = `[${role} — "${cp.name}"]`;
    if (traits.length) line += `\nAppearance: ${traits.join(', ')}.`;
    if (cp.description) line += `\nDetails: ${cp.description}`;
    if (cp.wardrobe) line += `\nWardrobe: ${cp.wardrobe}.`;
    if (cp.default_voice_id) line += `\nVoice: ${cp.default_voice_id} (${cp.default_voice_provider || 'default'}) — lip sync must match this voice.`;
    line += `\nIMPORTANT: Describe "${cp.name}" with EXACT appearance above in the generated prompt.`;
    blocks.push(line);
  }

  let ctx = '\n' + blocks.join('\n');
  if (sorted.length > 1) {
    ctx += `\nIMPORTANT: There are ${sorted.length} DISTINCT characters. Never merge or swap their features.`;
  }
  ctx += '\nCRITICAL: The generated prompt MUST describe each character\'s appearance precisely so the video maintains character consistency across scenes.';
  return ctx;
}

// ─────────── Helpers ───────────

function makeProfile(overrides: Partial<CharacterProfile> = {}): CharacterProfile {
  return {
    id: 'char-1',
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
    default_voice_id: 'voice-1',
    default_voice_provider: 'elevenlabs',
    ...overrides,
  };
}

const FULL_APPEARANCE: CharacterAppearance = {
  gender: 'Nữ',
  age_range: '25-30',
  hair: 'Nâu dài xoăn nhẹ',
  skin_tone: 'Trắng hồng',
  body_type: 'Thon gọn',
  distinctive_features: 'Nốt ruồi dưới mắt trái, lúm đồng tiền',
};

const APPEARANCE_FIELDS: (keyof CharacterAppearance)[] = [
  'gender', 'age_range', 'hair', 'skin_tone', 'body_type', 'distinctive_features',
];

// ─────────── Tests ───────────

describe('generate-video-prompt Character E2E', () => {

  // ── 1. ID Resolution ──

  describe('resolveCharacterIds', () => {
    it('prefers array over single ID', () => {
      expect(resolveCharacterIds('single', ['a', 'b'])).toEqual(['a', 'b']);
    });

    it('falls back to single ID when array empty', () => {
      expect(resolveCharacterIds('single', [])).toEqual(['single']);
    });

    it('falls back to single ID when array undefined', () => {
      expect(resolveCharacterIds('single', undefined)).toEqual(['single']);
    });

    it('returns empty when both absent', () => {
      expect(resolveCharacterIds(undefined, undefined)).toEqual([]);
    });
  });

  // ── 2. Profile ordering ──

  describe('sortProfilesByIds preserves requested order', () => {
    it('reorders DB results to match resolvedCharIds', () => {
      const profiles = [
        makeProfile({ id: 'B', name: 'Hà' }),
        makeProfile({ id: 'A', name: 'Minh' }),
        makeProfile({ id: 'C', name: 'Lan' }),
      ];
      const sorted = sortProfilesByIds(['A', 'C', 'B'], profiles);
      expect(sorted.map(p => p.id)).toEqual(['A', 'C', 'B']);
    });

    it('skips IDs not found in DB (deleted profile)', () => {
      const profiles = [makeProfile({ id: 'A' }), makeProfile({ id: 'C' })];
      const sorted = sortProfilesByIds(['A', 'B-deleted', 'C'], profiles);
      expect(sorted.map(p => p.id)).toEqual(['A', 'C']);
    });

    it('first element is always MAIN CHARACTER', () => {
      const sorted = sortProfilesByIds(
        ['main', 'sub1', 'sub2'],
        ['main', 'sub1', 'sub2'].map(id => makeProfile({ id, name: id })),
      );
      expect(sorted[0].id).toBe('main');
    });
  });

  // ── 3. All 6 appearance fields present in context ──

  describe('buildCharacterContext includes all 6 appearance fields', () => {
    it('single character with full appearance → all 6 traits in output', () => {
      const profile = makeProfile({ appearance: FULL_APPEARANCE });
      const ctx = buildCharacterContext([profile]);

      // Verify each field maps to the expected format
      expect(ctx).toContain('Nữ');                     // gender
      expect(ctx).toContain('age 25-30');               // age_range
      expect(ctx).toContain('Nâu dài xoăn nhẹ hair');  // hair
      expect(ctx).toContain('Trắng hồng skin');        // skin_tone
      expect(ctx).toContain('Thon gọn');                // body_type
      expect(ctx).toContain('Nốt ruồi dưới mắt trái'); // distinctive_features
    });

    it('multi-character → each character has all 6 traits', () => {
      const char1 = makeProfile({
        id: 'a', name: 'Minh',
        appearance: {
          gender: 'Nam', age_range: '40-50', hair: 'Bạc ngắn',
          skin_tone: 'Ngăm', body_type: 'Mập', distinctive_features: 'Sẹo trên trán',
        },
      });
      const char2 = makeProfile({
        id: 'b', name: 'Hà',
        appearance: FULL_APPEARANCE,
      });
      const ctx = buildCharacterContext([char1, char2]);

      // char1 traits
      expect(ctx).toContain('Nam');
      expect(ctx).toContain('age 40-50');
      expect(ctx).toContain('Bạc ngắn hair');
      expect(ctx).toContain('Ngăm skin');
      expect(ctx).toContain('Mập');
      expect(ctx).toContain('Sẹo trên trán');

      // char2 traits
      expect(ctx).toContain('Nữ');
      expect(ctx).toContain('age 25-30');
      expect(ctx).toContain('Nâu dài xoăn nhẹ hair');
      expect(ctx).toContain('Trắng hồng skin');
      expect(ctx).toContain('Thon gọn');
      expect(ctx).toContain('Nốt ruồi dưới mắt trái');
    });

    it('missing fields do NOT produce undefined/null in output', () => {
      const partial = makeProfile({
        appearance: { gender: 'Nữ', hair: 'Đen' },
        wardrobe: null,
        description: '',
        default_voice_id: null,
      });
      const ctx = buildCharacterContext([partial]);
      expect(ctx).not.toContain('undefined');
      expect(ctx).not.toContain('null');
      expect(ctx).toContain('Nữ');
      expect(ctx).toContain('Đen hair');
    });

    it('empty appearance → no Appearance line but still has IMPORTANT instruction', () => {
      const empty = makeProfile({ appearance: {} });
      const ctx = buildCharacterContext([empty]);
      expect(ctx).not.toContain('Appearance:');
      expect(ctx).toContain('IMPORTANT');
      expect(ctx).toContain('EXACT');
    });
  });

  // ── 4. Role labels ──

  describe('role labels in context block', () => {
    it('first character is MAIN CHARACTER', () => {
      const ctx = buildCharacterContext([makeProfile({ name: 'Chính' })]);
      expect(ctx).toContain('[MAIN CHARACTER — "Chính"]');
    });

    it('subsequent characters are SUPPORTING CHARACTER N', () => {
      const profiles = [
        makeProfile({ id: 'a', name: 'A' }),
        makeProfile({ id: 'b', name: 'B' }),
        makeProfile({ id: 'c', name: 'C' }),
      ];
      const ctx = buildCharacterContext(profiles);
      expect(ctx).toContain('[MAIN CHARACTER — "A"]');
      expect(ctx).toContain('[SUPPORTING CHARACTER 1 — "B"]');
      expect(ctx).toContain('[SUPPORTING CHARACTER 2 — "C"]');
    });
  });

  // ── 5. Multi-character distinction warning ──

  describe('distinction warning', () => {
    it('added for 2+ characters', () => {
      const profiles = [makeProfile({ id: 'a' }), makeProfile({ id: 'b' })];
      const ctx = buildCharacterContext(profiles);
      expect(ctx).toContain('2 DISTINCT characters');
      expect(ctx).toContain('Never merge or swap');
    });

    it('NOT added for single character', () => {
      const ctx = buildCharacterContext([makeProfile()]);
      expect(ctx).not.toContain('DISTINCT characters');
    });

    it('count matches actual number of characters', () => {
      const profiles = Array.from({ length: 4 }, (_, i) =>
        makeProfile({ id: `c${i}`, name: `Char${i}` }),
      );
      const ctx = buildCharacterContext(profiles);
      expect(ctx).toContain('4 DISTINCT characters');
    });
  });

  // ── 6. Wardrobe and voice in context ──

  describe('wardrobe and voice injection', () => {
    it('includes wardrobe when present', () => {
      const ctx = buildCharacterContext([makeProfile({ wardrobe: 'Váy đỏ dài, giày cao gót' })]);
      expect(ctx).toContain('Wardrobe: Váy đỏ dài, giày cao gót.');
    });

    it('includes voice + lip-sync instruction', () => {
      const ctx = buildCharacterContext([makeProfile({
        default_voice_id: 'voice-xyz',
        default_voice_provider: 'elevenlabs',
      })]);
      expect(ctx).toContain('Voice: voice-xyz (elevenlabs)');
      expect(ctx).toContain('lip sync must match');
    });

    it('voice provider defaults to "default" when null', () => {
      const ctx = buildCharacterContext([makeProfile({
        default_voice_id: 'v1',
        default_voice_provider: null,
      })]);
      expect(ctx).toContain('Voice: v1 (default)');
    });

    it('no voice line when default_voice_id is null', () => {
      const ctx = buildCharacterContext([makeProfile({ default_voice_id: null })]);
      expect(ctx).not.toContain('Voice:');
    });
  });

  // ── 7. CRITICAL consistency instruction always present ──

  describe('consistency instruction', () => {
    it('always ends with CRITICAL instruction', () => {
      const ctx = buildCharacterContext([makeProfile()]);
      expect(ctx).toContain('CRITICAL');
      expect(ctx).toContain('character consistency across scenes');
    });
  });

  // ── 8. Full pipeline simulation ──

  describe('full pipeline: resolve → sort → build context', () => {
    it('end-to-end produces correct context for 3 characters', () => {
      const dbProfiles = [
        makeProfile({ id: 'c', name: 'Lan', appearance: { gender: 'Nữ', age_range: '20-25', hair: 'Vàng', skin_tone: 'Trắng', body_type: 'Cao', distinctive_features: 'Tàn nhang' } }),
        makeProfile({ id: 'a', name: 'Minh', appearance: { gender: 'Nam', age_range: '35-40', hair: 'Đen', skin_tone: 'Nâu', body_type: 'Vạm vỡ', distinctive_features: 'Hình xăm cánh tay' } }),
        makeProfile({ id: 'b', name: 'Hà', appearance: { gender: 'Nữ', age_range: '30-35', hair: 'Nâu bob', skin_tone: 'Sáng', body_type: 'Cân đối', distinctive_features: 'Nốt ruồi' } }),
      ];

      // User selected order: a (main), b, c
      const resolved = resolveCharacterIds(undefined, ['a', 'b', 'c']);
      const sorted = sortProfilesByIds(resolved, dbProfiles);
      const ctx = buildCharacterContext(sorted);

      // Verify order
      expect(sorted.map(p => p.id)).toEqual(['a', 'b', 'c']);

      // Verify vai chính
      expect(ctx).toContain('[MAIN CHARACTER — "Minh"]');
      expect(ctx).toContain('[SUPPORTING CHARACTER 1 — "Hà"]');
      expect(ctx).toContain('[SUPPORTING CHARACTER 2 — "Lan"]');

      // Verify all 6 fields for main character
      expect(ctx).toContain('Nam');
      expect(ctx).toContain('age 35-40');
      expect(ctx).toContain('Đen hair');
      expect(ctx).toContain('Nâu skin');
      expect(ctx).toContain('Vạm vỡ');
      expect(ctx).toContain('Hình xăm cánh tay');

      // Distinction warning
      expect(ctx).toContain('3 DISTINCT characters');
    });
  });
});
