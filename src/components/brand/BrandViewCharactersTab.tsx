import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Sparkles, Users, Film } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import {
  useCharacterProfiles,
  type CharacterProfile,
  type CharacterProfileInput,
} from '@/hooks/useCharacterProfiles';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

import { CharacterCard } from '@/components/characters/CharacterCard';
import { CharacterFilters, type SortKey } from '@/components/characters/CharacterFilters';
import { CharacterFormSheet } from '@/components/characters/CharacterFormSheet';
import { CharacterDetailSheet } from '@/components/characters/CharacterDetailSheet';
import { CharacterBulkBar } from '@/components/characters/CharacterBulkBar';
import { AIBulkGenerateSheet } from '@/components/characters/AIBulkGenerateSheet';
import { calcCompleteness, type CharacterFormValues } from '@/lib/characterSchema';

import type { BrandTemplate } from '@/hooks/useBrandTemplates';

interface Props {
  template: BrandTemplate;
}

/**
 * Character management scoped to a single Brand (rendered as a tab in BrandView).
 * Mirrors logic in CharactersPage but pre-filters profiles by the given brand.
 */
export function BrandViewCharactersTab({ template }: Props) {
  const { profiles, isLoading, createProfile, updateProfile, deleteProfile } = useCharacterProfiles();
  const { currentOrganization } = useOrganizationContext();
  const queryClient = useQueryClient();

  const [query, setQuery] = useState('');
  const [gender, setGender] = useState('');
  const [ageRange, setAgeRange] = useState('');
  const [role, setRole] = useState('');
  const [sort, setSort] = useState<SortKey>('updated');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [editing, setEditing] = useState<CharacterProfile | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<CharacterProfile | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [generatingAvatarFor, setGeneratingAvatarFor] = useState<string | null>(null);
  const [updatingRoleFor, setUpdatingRoleFor] = useState<string | null>(null);

  const handleToggleRole = async (p: CharacterProfile, next: 'main' | 'supporting') => {
    setUpdatingRoleFor(p.id);
    try {
      await updateProfile.mutateAsync({ id: p.id, name: p.name, description: p.description ?? '', default_role: next });
      toast.success(next === 'main' ? `${p.name} → Vai chính` : `${p.name} → Vai phụ`);
    } catch (e: any) {
      toast.error(e?.message || 'Không đổi được vai trò');
    } finally {
      setUpdatingRoleFor(null);
    }
  };

  // Scope all profiles to this brand only
  const brandProfiles = useMemo(
    () => profiles.filter((p) => p.brand_template_id === template.id),
    [profiles, template.id],
  );

  const handleGenerateAvatar = async (p: CharacterProfile) => {
    if (!currentOrganization?.id) return;
    setGeneratingAvatarFor(p.id);
    try {
      const { data, error } = await supabase.functions.invoke('generate-character-image', {
        body: {
          name: p.name,
          appearance: p.appearance ?? {},
          wardrobe: p.wardrobe ?? '',
          description: p.description ?? '',
          view: 'front',
          organization_id: currentOrganization.id,
        },
      });
      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return;
      }
      const url = data?.url;
      if (!url) {
        toast.error('Không nhận được URL ảnh');
        return;
      }
      const existing = Array.isArray(p.reference_images) ? p.reference_images : [];
      const next = existing.some((r) => r.label === 'front')
        ? existing.map((r) => (r.label === 'front' ? { ...r, url } : r))
        : [...existing, { url, label: 'front' as const }];
      await updateProfile.mutateAsync({
        id: p.id,
        name: p.name,
        description: p.description ?? '',
        reference_image_url: url,
        reference_images: next,
      });
      toast.success('Đã tạo ảnh chân dung');
    } catch (e: any) {
      toast.error(e?.message || 'Lỗi khi tạo ảnh');
    } finally {
      setGeneratingAvatarFor(null);
    }
  };

  const searchInputRef = useRef<HTMLDivElement>(null);

  const brandsLite = useMemo(
    () => [{ id: template.id, name: template.brand_name || template.name }],
    [template.id, template.brand_name, template.name],
  );

  const filtered = useMemo(() => {
    let list = brandProfiles.slice();
    if (gender) list = list.filter((p) => (p.appearance as any)?.gender === gender);
    if (ageRange) list = list.filter((p) => (p.appearance as any)?.age_range === ageRange);
    if (role) list = list.filter((p) => (p.default_role ?? 'supporting') === role);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((p) => {
        return (
          p.name.toLowerCase().includes(q) ||
          (p.description ?? '').toLowerCase().includes(q) ||
          (p.wardrobe ?? '').toLowerCase().includes(q) ||
          ((p.appearance as any)?.distinctive_features ?? '').toLowerCase().includes(q)
        );
      });
    }
    if (sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
    else if (sort === 'completeness') list.sort((a, b) => calcCompleteness(b) - calcCompleteness(a));
    else list.sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1));
    return list;
  }, [brandProfiles, gender, ageRange, role, query, sort]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleNew = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const handleEdit = (p: CharacterProfile) => {
    setEditing(p);
    setDetailOpen(false);
    setFormOpen(true);
  };
  const handleClone = (p: CharacterProfile) => {
    setEditing({ ...p, id: '', name: `${p.name} (bản sao)` } as CharacterProfile);
    setDetailOpen(false);
    setFormOpen(true);
  };
  const handleOpenDetail = (p: CharacterProfile) => {
    setDetail(p);
    setDetailOpen(true);
  };
  const handleDelete = async (p: CharacterProfile) => {
    if (!confirm(`Xoá nhân vật "${p.name}"?`)) return;
    await deleteProfile.mutateAsync(p.id);
    setDetailOpen(false);
  };

  const handleSubmitForm = async (values: CharacterFormValues, id?: string) => {
    const payload: CharacterProfileInput = {
      name: values.name,
      description: values.description ?? '',
      appearance: values.appearance as any,
      wardrobe: values.wardrobe ?? '',
      reference_image_url: values.reference_image_url ?? '',
      reference_images: values.reference_images as any,
      default_voice_id: values.default_voice_id ?? '',
      default_voice_provider: values.default_voice_provider ?? '',
      brand_template_id: values.brand_template_id ?? template.id,
      default_role: values.default_role ?? 'supporting',
    };
    if (id) {
      await updateProfile.mutateAsync({ id, ...payload });
    } else {
      await createProfile.mutateAsync(payload);
    }
  };

  const handleBulkDelete = async (ids: string[]) => {
    try {
      for (const id of ids) await deleteProfile.mutateAsync(id);
      setSelectedIds([]);
    } catch (e: any) {
      toast.error(e?.message || 'Xoá thất bại');
    }
  };

  const handleBulkAssignBrand = async (ids: string[], brandId: string | null) => {
    if (!currentOrganization?.id) return;
    try {
      const { error } = await supabase
        .from('character_profiles')
        .update({ brand_template_id: brandId })
        .in('id', ids);
      if (error) throw error;
      toast.success(`Đã cập nhật brand cho ${ids.length} nhân vật`);
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ['character-profiles', currentOrganization.id] });
    } catch (e: any) {
      toast.error(e?.message || 'Lỗi cập nhật brand');
    }
  };

  const isSaving = createProfile.isPending || updateProfile.isPending;

  const existingMainName = useMemo(
    () => brandProfiles.find((p) => p.default_role === 'main')?.name ?? null,
    [brandProfiles],
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-muted-foreground" />
            Nhân vật của brand
          </h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-xl">
            Hồ sơ nhân vật dùng cho Video Studio &amp; Kịch bản — giữ nhất quán ngoại hình, giọng nói.
            Mỗi brand tối đa 1 vai chính.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
            <Link to="/characters">
              <Film className="w-3.5 h-3.5" /> Xem tất cả
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setAiOpen(true)}
            title="AI tạo nhân vật từ Brand"
          >
            <Sparkles className="w-3.5 h-3.5" /> Tạo bằng AI
          </Button>
          <Button size="sm" className="gap-1.5" onClick={handleNew}>
            <Plus className="w-3.5 h-3.5" /> Thêm thủ công
          </Button>
        </div>
      </div>

      {/* Filters (without brand-switch — already scoped) */}
      <div ref={searchInputRef}>
        <CharacterFilters
          query={query}
          onQuery={setQuery}
          gender={gender}
          onGender={setGender}
          ageRange={ageRange}
          onAge={setAgeRange}
          role={role}
          onRole={setRole}
          sort={sort}
          onSort={setSort}
          filterByBrand={false}
          onFilterByBrand={() => {}}
          hasBrand={false}
          totalCount={brandProfiles.length}
          visibleCount={filtered.length}
        />
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[5/4] rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <div className="flex flex-col items-center gap-3 py-14 px-4 text-center">
            <Users className="w-10 h-10 text-muted-foreground/30" />
            <div>
              <p className="text-base font-medium">
                {brandProfiles.length === 0 ? 'Brand này chưa có nhân vật nào' : 'Không tìm thấy nhân vật phù hợp'}
              </p>
              <p className="text-sm text-muted-foreground mt-1 max-w-md">
                {brandProfiles.length === 0
                  ? 'Để AI gợi ý bộ nhân vật phù hợp với brand, hoặc tự tạo thủ công.'
                  : 'Thử bỏ bớt bộ lọc hoặc thay đổi từ khoá tìm kiếm.'}
              </p>
            </div>
            {brandProfiles.length === 0 && (
              <div className="flex gap-2 mt-2">
                <Button size="sm" variant="outline" onClick={() => setAiOpen(true)} className="gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Tạo bằng AI
                </Button>
                <Button size="sm" onClick={handleNew} className="gap-1.5">
                  <Plus className="w-3.5 h-3.5" /> Thêm thủ công
                </Button>
              </div>
            )}
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((p) => (
            <CharacterCard
              key={p.id}
              profile={p}
              brandName={template.brand_name || template.name}
              isCrossBrand={false}
              selected={selectedIds.includes(p.id)}
              onToggleSelect={() => toggleSelect(p.id)}
              onOpen={() => handleOpenDetail(p)}
              onEdit={() => handleEdit(p)}
              onClone={() => handleClone(p)}
              onDelete={() => handleDelete(p)}
              onGenerateAvatar={() => handleGenerateAvatar(p)}
              isGeneratingAvatar={generatingAvatarFor === p.id}
              onToggleRole={(next) => handleToggleRole(p, next)}
              isUpdatingRole={updatingRoleFor === p.id}
            />
          ))}
        </div>
      )}

      <CharacterBulkBar
        selectedIds={selectedIds}
        profiles={brandProfiles}
        brands={brandsLite}
        onClear={() => setSelectedIds([])}
        onBulkDelete={handleBulkDelete}
        onBulkAssignBrand={handleBulkAssignBrand}
      />

      <CharacterFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        editingProfile={editing && editing.id ? editing : null}
        defaultBrandId={template.id}
        brands={brandsLite}
        onSubmit={handleSubmitForm}
        isSaving={isSaving}
        allProfiles={profiles}
      />

      <CharacterDetailSheet
        profile={detail}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        brandName={template.brand_name || template.name}
        onEdit={() => detail && handleEdit(detail)}
        onClone={() => detail && handleClone(detail)}
        onDelete={() => detail && handleDelete(detail)}
      />

      <AIBulkGenerateSheet
        open={aiOpen}
        onOpenChange={setAiOpen}
        brand={{
          id: template.id,
          name: template.brand_name || template.name,
          industry: template.industry?.[0] ?? null,
          tone_of_voice: template.tone_of_voice ?? null,
        }}
        existingNames={brandProfiles.map((p) => p.name)}
        existingMainName={existingMainName}
        onCreateProfile={(input) => createProfile.mutateAsync(input)}
        onUpdateProfile={(input) => updateProfile.mutateAsync(input)}
      />
    </div>
  );
}
