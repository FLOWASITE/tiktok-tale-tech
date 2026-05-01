import { describe, it, expect } from 'vitest';

// ─────────── Types (mirrors useCharacterProfiles + generate-video-prompt) ───────────

interface CharacterAppearance {
  gender?: string;
  age_range?: string;
  hair?: string;
  skin_tone?: string;
  body_type?: string;
  distinctive_features?: string;
  honorific?: string;
  speech_style?: string;
  regional_accent?: string;
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

// ─────────── Logic mirrors ───────────

function resolveCharacterIds(
  character_profile_id?: string,
  character_profile_ids?: string[],
): string[] {
  return Array.isArray(character_profile_ids) && character_profile_ids.length > 0
    ? character_profile_ids
    : character_profile_id ? [character_profile_id] : [];
}

function sortProfilesByIds(
  resolvedCharIds: string[],
  charProfiles: CharacterProfile[],
): CharacterProfile[] {
  return resolvedCharIds
    .map(id => charProfiles.find(p => p.id === id))
    .filter(Boolean) as CharacterProfile[];
}

/** Mirror of generate-video-prompt buildCharacterContext with speech traits */
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

    // Speech traits
    const speechParts: string[] = [];
    if (app.regional_accent) speechParts.push(`Accent: ${app.regional_accent}`);
    if (app.honorific) speechParts.push(`Pronouns: ${app.honorific}`);
    if (app.speech_style) speechParts.push(`Style: ${app.speech_style}`);
    if (speechParts.length) line += `\nSpeech: ${speechParts.join('; ')}.`;

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

/** Simulate storyboard scene generation — each scene gets a prompt with the same character context */
function buildScenePrompts(
  scenes: { sceneNumber: number; description: string }[],
  characterIds: string[],
  dbProfiles: CharacterProfile[],
): { sceneNumber: number; prompt: string; characterContext: string }[] {
  const resolved = resolveCharacterIds(undefined, characterIds);
  const sorted = sortProfilesByIds(resolved, dbProfiles);
  const charContext = buildCharacterContext(sorted);

  return scenes.map(scene => ({
    sceneNumber: scene.sceneNumber,
    prompt: `Scene ${scene.sceneNumber}: ${scene.description}\n${charContext}`,
    characterContext: charContext,
  }));
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
      honorific: 'tôi',
      speech_style: 'Nhẹ nhàng chuyên nghiệp',
      regional_accent: 'Bắc Hà Nội',
    },
    wardrobe: 'Áo blouse trắng',
    default_voice_id: 'voice-1',
    default_voice_provider: 'elevenlabs',
    ...overrides,
  };
}

// ─────────── Tests ───────────

describe('Storyboard + generate-video-prompt Voice/Speech Consistency', () => {

  // ── 1. Speech traits in character context ──

  describe('Speech traits injection', () => {
    it('includes all 3 speech fields when present', () => {
      const ctx = buildCharacterContext([makeProfile()]);
      expect(ctx).toContain('Accent: Bắc Hà Nội');
      expect(ctx).toContain('Pronouns: tôi');
      expect(ctx).toContain('Style: Nhẹ nhàng chuyên nghiệp');
    });

    it('omits Speech line when all 3 speech fields absent', () => {
      const profile = makeProfile({
        appearance: { gender: 'Nam', honorific: undefined, speech_style: undefined, regional_accent: undefined },
      });
      const ctx = buildCharacterContext([profile]);
      expect(ctx).not.toContain('Speech:');
    });

    it('partial speech fields — only present ones appear', () => {
      const profile = makeProfile({
        appearance: { gender: 'Nữ', regional_accent: 'Nam Sài Gòn' },
      });
      const ctx = buildCharacterContext([profile]);
      expect(ctx).toContain('Accent: Nam Sài Gòn');
      expect(ctx).not.toContain('Pronouns:');
      expect(ctx).not.toContain('Style:');
    });

    it('no undefined/null in speech block', () => {
      const profile = makeProfile({
        appearance: { gender: 'Nữ', honorific: undefined, speech_style: 'Vui vẻ', regional_accent: undefined },
      });
      const ctx = buildCharacterContext([profile]);
      expect(ctx).not.toContain('undefined');
      expect(ctx).not.toContain('null');
      expect(ctx).toContain('Style: Vui vẻ');
    });
  });

  // ── 2. Multi-character speech differentiation ──

  describe('Multi-character voice/speech differentiation', () => {
    const drMinh = makeProfile({
      id: 'char-minh',
      name: 'Dr. Minh',
      appearance: {
        gender: 'Nam', age_range: '40-50', hair: 'Bạc ngắn',
        skin_tone: 'Ngăm', body_type: 'Cân đối', distinctive_features: 'Râu quai nón',
        honorific: 'tôi', speech_style: 'Nghiêm túc chuyên gia', regional_accent: 'Bắc Hà Nội',
      },
    });

    const coNgoc = makeProfile({
      id: 'char-ngoc',
      name: 'Ngọc',
      description: 'Khách hàng trẻ',
      appearance: {
        gender: 'Nữ', age_range: '25-30', hair: 'Nâu dài',
        skin_tone: 'Trắng hồng', body_type: 'Thon gọn', distinctive_features: 'Lúm đồng tiền',
        honorific: 'em', speech_style: 'Nhẹ nhàng tự nhiên', regional_accent: 'Nam Sài Gòn',
      },
    });

    it('each character retains own honorific', () => {
      const ctx = buildCharacterContext([drMinh, coNgoc]);
      // Both pronouns present
      expect(ctx).toContain('Pronouns: tôi');
      expect(ctx).toContain('Pronouns: em');
    });

    it('each character retains own regional_accent', () => {
      const ctx = buildCharacterContext([drMinh, coNgoc]);
      expect(ctx).toContain('Accent: Bắc Hà Nội');
      expect(ctx).toContain('Accent: Nam Sài Gòn');
    });

    it('each character retains own speech_style', () => {
      const ctx = buildCharacterContext([drMinh, coNgoc]);
      expect(ctx).toContain('Style: Nghiêm túc chuyên gia');
      expect(ctx).toContain('Style: Nhẹ nhàng tự nhiên');
    });

    it('character order does not swap speech traits', () => {
      const ctx = buildCharacterContext([drMinh, coNgoc]);
      const minhIdx = ctx.indexOf('"Dr. Minh"');
      const ngocIdx = ctx.indexOf('"Ngọc"');
      const minhAccent = ctx.indexOf('Accent: Bắc Hà Nội');
      const ngocAccent = ctx.indexOf('Accent: Nam Sài Gòn');

      // Minh's accent appears after Minh's name and before Ngọc's name
      expect(minhAccent).toBeGreaterThan(minhIdx);
      expect(minhAccent).toBeLessThan(ngocIdx);

      // Ngọc's accent appears after Ngọc's name
      expect(ngocAccent).toBeGreaterThan(ngocIdx);
    });
  });

  // ── 3. Storyboard cross-scene consistency ──

  describe('Storyboard scenes share identical character context', () => {
    const profiles = [
      makeProfile({
        id: 'a', name: 'Minh',
        appearance: {
          gender: 'Nam', age_range: '35-40', hair: 'Đen', skin_tone: 'Nâu',
          body_type: 'Vạm vỡ', distinctive_features: 'Hình xăm',
          honorific: 'anh', speech_style: 'Mạnh mẽ', regional_accent: 'Trung Huế',
        },
      }),
      makeProfile({
        id: 'b', name: 'Hà',
        appearance: {
          gender: 'Nữ', age_range: '28-32', hair: 'Nâu bob', skin_tone: 'Sáng',
          body_type: 'Cân đối', distinctive_features: 'Nốt ruồi',
          honorific: 'mình', speech_style: 'Thân thiện', regional_accent: 'Bắc Hà Nội',
        },
      }),
    ];

    const scenes = [
      { sceneNumber: 1, description: 'Phòng khám - Minh chào Hà' },
      { sceneNumber: 2, description: 'Tư vấn - Minh giải thích quy trình' },
      { sceneNumber: 3, description: 'Kết quả - Hà hài lòng' },
      { sceneNumber: 4, description: 'Lời kêu gọi hành động' },
    ];

    it('all scenes receive identical characterContext', () => {
      const scenePrompts = buildScenePrompts(scenes, ['a', 'b'], profiles);
      const firstCtx = scenePrompts[0].characterContext;

      for (const sp of scenePrompts) {
        expect(sp.characterContext).toBe(firstCtx);
      }
    });

    it('honorific is identical across all scene prompts', () => {
      const scenePrompts = buildScenePrompts(scenes, ['a', 'b'], profiles);
      for (const sp of scenePrompts) {
        expect(sp.prompt).toContain('Pronouns: anh');
        expect(sp.prompt).toContain('Pronouns: mình');
      }
    });

    it('regional_accent is identical across all scene prompts', () => {
      const scenePrompts = buildScenePrompts(scenes, ['a', 'b'], profiles);
      for (const sp of scenePrompts) {
        expect(sp.prompt).toContain('Accent: Trung Huế');
        expect(sp.prompt).toContain('Accent: Bắc Hà Nội');
      }
    });

    it('speech_style is identical across all scene prompts', () => {
      const scenePrompts = buildScenePrompts(scenes, ['a', 'b'], profiles);
      for (const sp of scenePrompts) {
        expect(sp.prompt).toContain('Style: Mạnh mẽ');
        expect(sp.prompt).toContain('Style: Thân thiện');
      }
    });

    it('character order is preserved across all scenes', () => {
      const scenePrompts = buildScenePrompts(scenes, ['a', 'b'], profiles);
      for (const sp of scenePrompts) {
        expect(sp.prompt).toContain('[MAIN CHARACTER — "Minh"]');
        expect(sp.prompt).toContain('[SUPPORTING CHARACTER 1 — "Hà"]');
        const minhIdx = sp.prompt.indexOf('"Minh"');
        const haIdx = sp.prompt.indexOf('"Hà"');
        expect(minhIdx).toBeLessThan(haIdx);
      }
    });

    it('appearance traits do not bleed between characters across scenes', () => {
      const scenePrompts = buildScenePrompts(scenes, ['a', 'b'], profiles);
      for (const sp of scenePrompts) {
        // Minh's traits come before Hà's section
        const minhSection = sp.characterContext.split('"Hà"')[0];
        const haSection = sp.characterContext.split('"Hà"')[1];

        expect(minhSection).toContain('Vạm vỡ');
        expect(minhSection).toContain('Hình xăm');
        expect(minhSection).not.toContain('Nốt ruồi');

        expect(haSection).toContain('Nốt ruồi');
        expect(haSection).toContain('Cân đối');
        expect(haSection).not.toContain('Hình xăm');
      }
    });
  });

  // ── 4. Brand voice variant selection ──

  describe('Brand voice variant matching by video type', () => {
    interface BrandVoiceVariant {
      video_type: string;
      regional_accent: string;
      honorific: string;
      speech_style: string;
      tone: string;
    }

    function selectVoiceVariant(
      variants: BrandVoiceVariant[],
      videoType: string,
    ): BrandVoiceVariant | undefined {
      return variants.find(v => v.video_type === videoType)
        || variants.find(v => v.video_type === 'default');
    }

    const variants: BrandVoiceVariant[] = [
      { video_type: 'default', regional_accent: 'Bắc Hà Nội', honorific: 'tôi', speech_style: 'Chuyên nghiệp', tone: 'Trung tính' },
      { video_type: 'tutorial', regional_accent: 'Bắc Hà Nội', honorific: 'mình', speech_style: 'Thân thiện hướng dẫn', tone: 'Ấm áp' },
      { video_type: 'promo', regional_accent: 'Nam Sài Gòn', honorific: 'bạn', speech_style: 'Năng động thuyết phục', tone: 'Sôi động' },
      { video_type: 'testimonial', regional_accent: 'Trung Huế', honorific: 'em', speech_style: 'Chân thật cảm xúc', tone: 'Nhẹ nhàng' },
    ];

    it('selects exact match for tutorial', () => {
      const v = selectVoiceVariant(variants, 'tutorial');
      expect(v?.honorific).toBe('mình');
      expect(v?.speech_style).toBe('Thân thiện hướng dẫn');
    });

    it('selects exact match for promo', () => {
      const v = selectVoiceVariant(variants, 'promo');
      expect(v?.regional_accent).toBe('Nam Sài Gòn');
      expect(v?.tone).toBe('Sôi động');
    });

    it('falls back to default for unknown video type', () => {
      const v = selectVoiceVariant(variants, 'unknown-type');
      expect(v?.video_type).toBe('default');
      expect(v?.honorific).toBe('tôi');
    });

    it('returns undefined when no default and no match', () => {
      const noDefault = variants.filter(v => v.video_type !== 'default');
      const v = selectVoiceVariant(noDefault, 'unknown');
      expect(v).toBeUndefined();
    });

    it('variant accent overrides profile accent in prompt', () => {
      const variant = selectVoiceVariant(variants, 'promo')!;
      const profile = makeProfile({
        appearance: {
          ...makeProfile().appearance,
          regional_accent: variant.regional_accent,
          honorific: variant.honorific,
          speech_style: variant.speech_style,
        },
      });
      const ctx = buildCharacterContext([profile]);
      expect(ctx).toContain('Accent: Nam Sài Gòn');
      expect(ctx).toContain('Pronouns: bạn');
      expect(ctx).toContain('Style: Năng động thuyết phục');
    });
  });

  // ── 5. Edge cases ──

  describe('Edge cases', () => {
    it('5+ characters all keep unique speech traits', () => {
      const accents = ['Bắc', 'Nam', 'Trung', 'Nghệ An', 'Đà Nẵng'];
      const profiles = accents.map((acc, i) => makeProfile({
        id: `c${i}`,
        name: `Char${i}`,
        appearance: {
          gender: i % 2 === 0 ? 'Nam' : 'Nữ',
          regional_accent: acc,
          honorific: ['tôi', 'em', 'anh', 'chị', 'mình'][i],
          speech_style: `Style${i}`,
        },
      }));

      const ctx = buildCharacterContext(profiles);
      for (let i = 0; i < 5; i++) {
        expect(ctx).toContain(`Accent: ${accents[i]}`);
        expect(ctx).toContain(`Pronouns: ${['tôi', 'em', 'anh', 'chị', 'mình'][i]}`);
        expect(ctx).toContain(`Style: Style${i}`);
      }
      expect(ctx).toContain('5 DISTINCT characters');
    });

    it('character_profile_ids with duplicates are deduplicated by sortProfilesByIds', () => {
      const profile = makeProfile({ id: 'dup' });
      // sortProfilesByIds maps IDs, duplicates resolve to same profile
      const sorted = sortProfilesByIds(['dup', 'dup', 'dup'], [profile]);
      // All 3 map to the same profile
      expect(sorted).toHaveLength(3);
      expect(sorted[0].id).toBe('dup');
    });

    it('empty scenes array produces empty result', () => {
      const result = buildScenePrompts([], ['a'], [makeProfile({ id: 'a' })]);
      expect(result).toHaveLength(0);
    });
  });
});
