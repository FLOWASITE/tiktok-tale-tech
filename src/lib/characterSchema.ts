import { z } from 'zod';
import type { CharacterProfile, CharacterAppearance, ReferenceImage } from '@/hooks/useCharacterProfiles';

export const REF_LABELS = ['front', 'side', 'full-body', 'close-up', 'outfit'] as const;
export const VOICE_PROVIDERS = ['', 'elevenlabs', 'google', 'openai', 'lovable'] as const;

export const characterSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập tên nhân vật')
    .max(60, 'Tối đa 60 ký tự'),
  description: z.string().trim().max(500, 'Tối đa 500 ký tự').optional().default(''),
  wardrobe: z.string().trim().max(200, 'Tối đa 200 ký tự').optional().default(''),
  appearance: z
    .object({
      gender: z.string().max(40).optional().default(''),
      age_range: z.string().max(40).optional().default(''),
      hair: z.string().max(60).optional().default(''),
      skin_tone: z.string().max(60).optional().default(''),
      body_type: z.string().max(60).optional().default(''),
      distinctive_features: z.string().max(200).optional().default(''),
      honorific: z.string().max(40).optional().default(''),
      speech_style: z.string().max(120).optional().default(''),
      regional_accent: z.string().max(60).optional().default(''),
    })
    .default({}),
  reference_image_url: z
    .string()
    .trim()
    .url('URL ảnh không hợp lệ')
    .or(z.literal(''))
    .optional()
    .default(''),
  reference_images: z
    .array(
      z.object({
        url: z.string().url(),
        label: z.enum(REF_LABELS),
      }),
    )
    .max(5, 'Tối đa 5 ảnh tham chiếu')
    .default([]),
  default_voice_id: z.string().trim().max(100).optional().default(''),
  default_voice_provider: z.string().max(20).optional().default(''),
  brand_template_id: z.string().uuid().nullable().default(null),
  default_role: z.enum(['main', 'supporting']).default('supporting'),
});

export type CharacterFormValues = z.infer<typeof characterSchema>;

export const REF_IMAGE_LABELS: { value: ReferenceImage['label']; label: string }[] = [
  { value: 'front', label: 'Chính diện' },
  { value: 'side', label: 'Nghiêng' },
  { value: 'full-body', label: 'Toàn thân' },
  { value: 'close-up', label: 'Cận mặt' },
  { value: 'outfit', label: 'Trang phục' },
];

export const GENDER_OPTIONS = ['Nam', 'Nữ', 'Phi nhị nguyên'];
export const AGE_OPTIONS = ['18-25', '25-35', '35-45', '45-55', '55+'];
export const HAIR_OPTIONS = ['Đen dài', 'Đen ngắn', 'Nâu', 'Vàng', 'Bạc/Trắng', 'Đỏ', 'Xoăn đen', 'Húi cua'];
export const SKIN_OPTIONS = ['Trắng sáng', 'Ngăm', 'Nâu ấm', 'Da ngâm đậm'];

/** % field đã điền — dùng cho completeness ring */
export function calcCompleteness(p: Partial<CharacterProfile> | CharacterFormValues): number {
  const app = (p.appearance ?? {}) as CharacterAppearance;
  const checks = [
    !!p.name,
    !!p.description,
    !!p.wardrobe,
    !!app.gender,
    !!app.age_range,
    !!app.hair,
    !!app.skin_tone,
    !!app.distinctive_features,
    !!p.reference_image_url || (Array.isArray(p.reference_images) && p.reference_images.length > 0),
    !!p.default_voice_id,
  ];
  const filled = checks.filter(Boolean).length;
  return Math.round((filled / checks.length) * 100);
}

export const EMPTY_CHARACTER_FORM: CharacterFormValues = {
  name: '',
  description: '',
  wardrobe: '',
  appearance: {
    gender: '',
    age_range: '',
    hair: '',
    skin_tone: '',
    body_type: '',
    distinctive_features: '',
    honorific: '',
    speech_style: '',
    regional_accent: '',
  },
  reference_image_url: '',
  reference_images: [],
  default_voice_id: '',
  default_voice_provider: '',
  brand_template_id: null,
  default_role: 'supporting',
};

export function profileToFormValues(p: CharacterProfile): CharacterFormValues {
  return {
    name: p.name ?? '',
    description: p.description ?? '',
    wardrobe: p.wardrobe ?? '',
    appearance: { ...EMPTY_CHARACTER_FORM.appearance, ...(p.appearance ?? {}) },
    reference_image_url: p.reference_image_url ?? '',
    reference_images: Array.isArray(p.reference_images) ? p.reference_images : [],
    default_voice_id: p.default_voice_id ?? '',
    default_voice_provider: p.default_voice_provider ?? '',
    brand_template_id: p.brand_template_id ?? null,
    default_role: (p.default_role as 'main' | 'supporting') ?? 'supporting',
  };
}
