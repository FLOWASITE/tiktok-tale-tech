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
}

export type ReferenceImageLabel = 'front' | 'side' | 'full-body' | 'close-up' | 'outfit';

export interface ReferenceImage {
  url: string;
  label: ReferenceImageLabel;
}

export interface CharacterProfile {
  id: string;
  organization_id: string;
  name: string;
  description: string;
  appearance: CharacterAppearance;
  wardrobe: string | null;
  reference_image_url: string | null;
  reference_images: ReferenceImage[];
  brand_template_id: string | null;
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
  brand_template_id?: string | null;
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
          brand_template_id: input.brand_template_id ?? null,
          created_by: user?.id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as CharacterProfile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Đã tạo nhân vật');
    },
    onError: (e: Error) => toast.error(`Lỗi: ${e.message}`),
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
      if (input.brand_template_id !== undefined) updateData.brand_template_id = input.brand_template_id;

      const { data, error } = await supabase
        .from('character_profiles')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as CharacterProfile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Đã cập nhật nhân vật');
    },
    onError: (e: Error) => toast.error(`Lỗi: ${e.message}`),
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

  parts.push('IMPORTANT: Maintain this EXACT character appearance consistently across ALL scenes. Same face, hair, clothing, body proportions.');

  return parts.join('\n');
}
