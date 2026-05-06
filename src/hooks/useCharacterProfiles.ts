import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

export interface CharacterAppearance {
  gender?: string;
  age_range?: string;
  hair?: string;
  skin_tone?: string;
  body_type?: string;
  distinctive_features?: string;
  /** Xưng hô mặc định (VD: "tôi", "mình", "em", "chị") */
  honorific?: string;
  /** Phong cách thoại (VD: "Nhẹ nhàng thuyết phục", "Năng động trẻ trung") */
  speech_style?: string;
  /** Giọng vùng miền (VD: "Bắc Hà Nội", "Nam Sài Gòn", "Trung Huế") */
  regional_accent?: string;
}

export type ReferenceImageLabel = 'front' | 'side' | 'full-body' | 'close-up' | 'outfit';

export interface ReferenceImage {
  url: string;
  label: ReferenceImageLabel;
}

export type CharacterDefaultRole = 'main' | 'supporting';

export interface CharacterProfile {
  id: string;
  organization_id: string;
  name: string;
  description: string;
  appearance: CharacterAppearance;
  wardrobe: string | null;
  reference_image_url: string | null;
  reference_images: ReferenceImage[];
  default_voice_id: string | null;
  default_voice_provider: string | null;
  brand_template_id: string | null;
  default_role: CharacterDefaultRole;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CharacterProfileInput {
  name: string;
  description: string;
  appearance?: CharacterAppearance;
  wardrobe?: string;
  reference_image_url?: string;
  reference_images?: ReferenceImage[];
  default_voice_id?: string;
  default_voice_provider?: string;
  brand_template_id?: string | null;
  default_role?: CharacterDefaultRole;
}

export function useCharacterProfiles() {
  const { currentOrganization } = useOrganizationContext();
  const orgId = currentOrganization?.id;
  const queryClient = useQueryClient();
  const queryKey = ['character-profiles', orgId];

  const { data: profiles = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('character_profiles')
        .select('*')
        .eq('organization_id', orgId)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as CharacterProfile[];
    },
    enabled: !!orgId,
  });

  const createProfile = useMutation({
    mutationFn: async (input: CharacterProfileInput) => {
      if (!orgId) throw new Error('No organization');
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('character_profiles')
        .insert({
          organization_id: orgId,
          name: input.name,
          description: input.description,
          appearance: (input.appearance ?? {}) as any,
          wardrobe: input.wardrobe ?? null,
          reference_image_url: input.reference_image_url ?? null,
          reference_images: (input.reference_images ?? []) as any,
          brand_template_id: input.brand_template_id ?? null,
          default_voice_id: input.default_voice_id ?? null,
          default_voice_provider: input.default_voice_provider ?? null,
          default_role: input.default_role ?? 'supporting',
          created_by: user?.id ?? null,
        } as any)
        .select()
        .single();
      if (error) throw mapCharacterError(error);
      return data as unknown as CharacterProfile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Đã tạo nhân vật');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateProfile = useMutation({
    mutationFn: async ({ id, ...input }: CharacterProfileInput & { id: string }) => {
      const updateData: Record<string, any> = {};
      if (input.name !== undefined) updateData.name = input.name;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.appearance !== undefined) updateData.appearance = input.appearance as any;
      if (input.wardrobe !== undefined) updateData.wardrobe = input.wardrobe;
      if (input.reference_image_url !== undefined) updateData.reference_image_url = input.reference_image_url;
      if (input.reference_images !== undefined) updateData.reference_images = input.reference_images as any;
      if (input.default_voice_id !== undefined) updateData.default_voice_id = input.default_voice_id;
      if (input.default_voice_provider !== undefined) updateData.default_voice_provider = input.default_voice_provider;
      if (input.brand_template_id !== undefined) updateData.brand_template_id = input.brand_template_id;
      if (input.default_role !== undefined) updateData.default_role = input.default_role;

      const { data, error } = await supabase
        .from('character_profiles')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      if (error) throw mapCharacterError(error);
      return data as unknown as CharacterProfile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Đã cập nhật nhân vật');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteProfile = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('character_profiles').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Đã xóa nhân vật');
    },
    onError: (e: Error) => toast.error(`Lỗi: ${e.message}`),
  });

  return { profiles, isLoading, createProfile, updateProfile, deleteProfile };
}

/** Build a character block string for prompt injection */
export function buildCharacterBlock(profile: CharacterProfile): string {
  const app = profile.appearance as CharacterAppearance;
  const parts = [`[CHARACTER CONSISTENCY — "${profile.name}"]`];

  const traits: string[] = [];
  if (app.gender) traits.push(app.gender);
  if (app.age_range) traits.push(`age ${app.age_range}`);
  if (app.hair) traits.push(`${app.hair} hair`);
  if (app.skin_tone) traits.push(`${app.skin_tone} skin`);
  if (app.body_type) traits.push(app.body_type);
  if (traits.length) parts.push(`Appearance: ${traits.join(', ')}.`);

  if (profile.description) parts.push(`Details: ${profile.description}`);
  if (profile.wardrobe) parts.push(`Wardrobe: ${profile.wardrobe}.`);
  if (app.distinctive_features) parts.push(`Distinctive: ${app.distinctive_features}.`);

  // Voice & speech personality
  const voiceTraits: string[] = [];
  if (app.regional_accent) voiceTraits.push(`Accent: ${app.regional_accent}`);
  if (app.honorific) voiceTraits.push(`Xưng hô: ${app.honorific}`);
  if (app.speech_style) voiceTraits.push(`Style: ${app.speech_style}`);
  if (voiceTraits.length) parts.push(`Speech: ${voiceTraits.join(', ')}.`);

  parts.push('IMPORTANT: Maintain this EXACT character appearance consistently across ALL scenes. Same face, hair, clothing, body proportions.');

  return parts.join('\n');
}

/** Find existing main character for a brand (excluding a given id) */
export function findMainCharacterForBrand(
  profiles: CharacterProfile[],
  brandId: string | null | undefined,
  excludeId?: string,
): CharacterProfile | null {
  if (!brandId) return null;
  return (
    profiles.find(
      (p) =>
        p.brand_template_id === brandId &&
        p.default_role === 'main' &&
        p.id !== excludeId,
    ) ?? null
  );
}

/** Map Postgres unique-violation on uniq_main_character_per_brand → friendly VN message */
function mapCharacterError(error: { code?: string; message?: string }): Error {
  const msg = error?.message ?? '';
  if (
    error?.code === '23505' &&
    (msg.includes('uniq_main_character_per_brand') || msg.includes('main_character'))
  ) {
    return new Error(
      'Brand này đã có 1 nhân vật chính. Vui lòng chuyển nhân vật cũ sang "Vai phụ" trước khi đặt nhân vật mới làm chính.',
    );
  }
  return new Error(msg || 'Có lỗi xảy ra');
}
