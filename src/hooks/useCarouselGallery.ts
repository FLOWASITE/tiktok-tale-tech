import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

export type ImageSource = 'carousel' | 'multichannel';
export type SortBy = 'newest' | 'oldest';

export interface GalleryImage {
  id: string;
  imageUrl: string;
  carouselId: string;
  carouselTitle: string;
  slideNumber: number;
  version: number;
  isSelected: boolean;
  createdAt: string;
  source: ImageSource;
  channel?: string;
  createdByName?: string;
  createdByEmail?: string;
  createdByAvatar?: string;
  brandName?: string;
  brandLogoUrl?: string;
}

export function useCarouselGallery() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [carouselFilter, setCarouselFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('newest');
  const [creatorFilter, setCreatorFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const fetchImages = async () => {
    setLoading(true);
    try {
      const [carouselRes, channelRes] = await Promise.all([
        supabase
          .from('carousel_images')
          .select('id, image_url, carousel_id, slide_number, version, is_selected, created_at, created_by, carousels(title, brand_name, user_id)')
          .order('created_at', { ascending: false }),
        supabase
          .from('channel_image_history')
          .select('id, image_url, content_id, channel, version, is_selected, created_at, created_by, multi_channel_contents(title, brand_template_id, user_id)')
          .order('created_at', { ascending: false }),
      ]);

      if (carouselRes.error) throw carouselRes.error;
      if (channelRes.error) throw channelRes.error;

      // Collect all user IDs and brand_template_ids to batch fetch
      const userIds = new Set<string>();
      const brandTemplateIds = new Set<string>();

      (carouselRes.data || []).forEach((row: any) => {
        if (row.created_by) userIds.add(row.created_by);
        if (row.carousels?.user_id) userIds.add(row.carousels.user_id);
      });
      (channelRes.data || []).forEach((row: any) => {
        if (row.created_by) userIds.add(row.created_by);
        if (row.multi_channel_contents?.user_id) userIds.add(row.multi_channel_contents.user_id);
        if (row.multi_channel_contents?.brand_template_id) brandTemplateIds.add(row.multi_channel_contents.brand_template_id);
      });

      // Batch fetch profiles and brands
      const [profilesRes, brandsRes] = await Promise.all([
        userIds.size > 0
          ? supabase.from('profiles').select('id, full_name, email, avatar_url').in('id', Array.from(userIds))
          : Promise.resolve({ data: [], error: null }),
        brandTemplateIds.size > 0
          ? supabase.from('brand_templates').select('id, brand_name, logo_url').in('id', Array.from(brandTemplateIds))
          : Promise.resolve({ data: [], error: null }),
      ]);

      const profileMap = new Map<string, { name?: string; email?: string; avatar?: string }>();
      (profilesRes.data || []).forEach((p: any) => {
        profileMap.set(p.id, { name: p.full_name, email: p.email, avatar: p.avatar_url });
      });

      const brandMap = new Map<string, { name?: string; logoUrl?: string }>();
      (brandsRes.data || []).forEach((b: any) => {
        brandMap.set(b.id, { name: b.brand_name, logoUrl: b.logo_url });
      });

      const carouselImages: GalleryImage[] = (carouselRes.data || []).map((row: any) => {
        const userId = row.created_by;
        const profile = userId ? profileMap.get(userId) : undefined;
        return {
          id: row.id,
          imageUrl: row.image_url,
          carouselId: row.carousel_id,
          carouselTitle: row.carousels?.title || 'Không rõ',
          slideNumber: row.slide_number,
          version: row.version,
          isSelected: row.is_selected ?? false,
          createdAt: row.created_at,
          source: 'carousel' as ImageSource,
          channel: 'carousel',
          createdByName: profile?.name,
          createdByEmail: profile?.email,
          createdByAvatar: profile?.avatar,
          brandName: row.carousels?.brand_name || undefined,
        };
      });

      const channelImages: GalleryImage[] = (channelRes.data || []).map((row: any) => {
        const userId = row.created_by;
        const profile = userId ? profileMap.get(userId) : undefined;
        const brandId = row.multi_channel_contents?.brand_template_id;
        const brand = brandId ? brandMap.get(brandId) : undefined;
        return {
          id: row.id,
          imageUrl: row.image_url,
          carouselId: row.content_id,
          carouselTitle: row.multi_channel_contents?.title || 'Không rõ',
          slideNumber: row.version || 1,
          version: row.version || 1,
          isSelected: row.is_selected ?? false,
          createdAt: row.created_at,
          source: 'multichannel' as ImageSource,
          channel: row.channel,
          createdByName: profile?.name,
          createdByEmail: profile?.email,
          createdByAvatar: profile?.avatar,
          brandName: brand?.name,
          brandLogoUrl: brand?.logoUrl,
        };
      });

      const all = [...carouselImages, ...channelImages].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setImages(all);
    } catch (err) {
      console.error('Failed to fetch gallery images:', err);
      toast.error('Không thể tải gallery ảnh');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImages();
  }, []);

  const creatorOptions = useMemo(() => {
    const map = new Map<string, string>();
    images.forEach(img => {
      if (img.createdByName) {
        // Use name as both key and label
        map.set(img.createdByName, img.createdByName);
      }
    });
    return Array.from(map.entries())
      .map(([key, label]) => ({ key, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [images]);

  const filteredImages = useMemo(() => {
    let result = images;
    if (sourceFilter !== 'all') {
      result = result.filter(img => img.source === sourceFilter);
    }
    if (channelFilter !== 'all') {
      result = result.filter(img => img.channel === channelFilter);
    }
    if (carouselFilter !== 'all') {
      result = result.filter(img => img.carouselId === carouselFilter);
    }
    if (creatorFilter !== 'all') {
      result = result.filter(img => img.createdByName === creatorFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(img => img.carouselTitle.toLowerCase().includes(q));
    }
    // Sort
    switch (sortBy) {
      case 'oldest':
        result = [...result].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
      case 'newest':
      default:
        break;
    }
    return result;
  }, [images, sourceFilter, channelFilter, carouselFilter, creatorFilter, searchQuery, sortBy]);

  const carouselOptions = useMemo(() => {
    const filtered = sourceFilter !== 'all' ? images.filter(i => i.source === sourceFilter) : images;
    const map = new Map<string, string>();
    filtered.forEach(img => map.set(img.carouselId, img.carouselTitle));
    return Array.from(map.entries()).map(([id, title]) => ({ id, title }));
  }, [images, sourceFilter]);

  const channelOptions = useMemo(() => {
    const channels = new Set<string>();
    images.filter(img => img.source === 'multichannel' && img.channel).forEach(img => channels.add(img.channel!));
    return Array.from(channels).sort();
  }, [images]);

  const sourceCounts = useMemo(() => ({
    all: images.length,
    carousel: images.filter(i => i.source === 'carousel').length,
    multichannel: images.filter(i => i.source === 'multichannel').length,
  }), [images]);

  const deleteImage = async (imageId: string) => {
    const img = images.find(i => i.id === imageId);
    if (!img) return;
    try {
      const table = img.source === 'carousel' ? 'carousel_images' : 'channel_image_history';
      const { error } = await supabase.from(table).delete().eq('id', imageId);
      if (error) throw error;
      setImages(prev => prev.filter(i => i.id !== imageId));
      setSelectedIds(prev => { const n = new Set(prev); n.delete(imageId); return n; });
      toast.success('Đã xóa ảnh');
    } catch (err) {
      console.error('Failed to delete image:', err);
      toast.error('Không thể xóa ảnh');
    }
  };

  const bulkDelete = useCallback(async (ids: string[]) => {
    if (!ids.length) return;
    const carouselIds = ids.filter(id => images.find(i => i.id === id)?.source === 'carousel');
    const channelIds = ids.filter(id => images.find(i => i.id === id)?.source === 'multichannel');
    try {
      const results = await Promise.all([
        ...(carouselIds.length ? [supabase.from('carousel_images').delete().in('id', carouselIds).select()] : []),
        ...(channelIds.length ? [supabase.from('channel_image_history').delete().in('id', channelIds).select()] : []),
      ]);
      for (const r of results) {
        if (r.error) throw r.error;
      }
      setImages(prev => prev.filter(i => !ids.includes(i.id)));
      setSelectedIds(new Set());
      toast.success(`Đã xóa ${ids.length} ảnh`);
    } catch (err) {
      console.error('Failed to bulk delete:', err);
      toast.error('Không thể xóa ảnh hàng loạt');
    }
  }, [images]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(filteredImages.map(i => i.id)));
  }, [filteredImages]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  return {
    images: filteredImages,
    allImages: images,
    loading,
    carouselFilter,
    setCarouselFilter,
    sourceFilter,
    setSourceFilter,
    channelFilter,
    setChannelFilter,
    creatorFilter,
    setCreatorFilter,
    creatorOptions,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    selectedIds,
    toggleSelect,
    selectAll,
    clearSelection,
    carouselOptions,
    channelOptions,
    sourceCounts,
    deleteImage,
    bulkDelete,
    refetch: fetchImages,
  };
}
