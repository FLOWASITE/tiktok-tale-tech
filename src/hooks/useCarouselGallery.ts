import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

export type ImageSource = 'carousel' | 'multichannel' | 'video' | 'video_render';
export type MediaType = 'image' | 'video';
export type SortBy = 'newest' | 'oldest';

export interface GalleryImage {
  id: string;
  imageUrl: string; // for video: thumbnail_url (fallback first frame placeholder)
  carouselId: string;
  carouselTitle: string;
  slideNumber: number;
  version: number;
  isSelected: boolean;
  createdAt: string;
  source: ImageSource;
  mediaType: MediaType;
  videoUrl?: string;
  durationSeconds?: number;
  aspectRatio?: string;
  channel?: string;
  createdByName?: string;
  createdByEmail?: string;
  createdByAvatar?: string;
  createdByUserId?: string;
  isOrgMember?: boolean;
  brandName?: string;
  brandLogoUrl?: string;
}

export interface ContentFolder {
  id: string;
  title: string;
  source: ImageSource;
  mediaType: MediaType;
  thumbnailUrls: string[];
  imageCount: number;
  videoCount: number;
  latestDate: string;
  createdByName?: string;
  createdByAvatar?: string;
  createdByUserId?: string;
  isOrgMember?: boolean;
  brandName?: string;
  brandLogoUrl?: string;
  channel?: string;
}

export function useCarouselGallery() {
  const { currentOrganization } = useOrganizationContext();
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [carouselFilter, setCarouselFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('newest');
  const [creatorFilter, setCreatorFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  const orgId = currentOrganization?.id;

  const fetchImages = useCallback(async () => {
    if (!orgId) {
      setImages([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [carouselRes, channelRes, videoGenRes, videoRenderRes] = await Promise.all([
        supabase
          .from('carousel_images')
          .select('id, image_url, carousel_id, slide_number, version, is_selected, created_at, created_by, carousels(title, brand_name, user_id)')
          .eq('organization_id', orgId)
          .order('created_at', { ascending: false }),
        supabase
          .from('channel_image_history')
          .select('id, image_url, content_id, channel, version, is_selected, created_at, created_by, multi_channel_contents(title, brand_template_id, user_id)')
          .eq('organization_id', orgId)
          .order('created_at', { ascending: false }),
        supabase
          .from('video_generations')
          .select('id, video_url, thumbnail_url, prompt, duration_seconds, aspect_ratio, status, script_id, storyboard_id, scene_number, created_at, user_id, scripts:script_id(title)')
          .eq('organization_id', orgId)
          .eq('status', 'completed')
          .not('video_url', 'is', null)
          .order('created_at', { ascending: false }),
        supabase
          .from('video_render_jobs')
          .select('id, output_url, thumbnail_url, aspect_ratio, duration_seconds, status, script_id, storyboard_id, created_at, user_id, scripts:script_id(title)')
          .eq('organization_id', orgId)
          .eq('status', 'completed')
          .not('output_url', 'is', null)
          .order('created_at', { ascending: false }),
      ]);

      if (carouselRes.error) throw carouselRes.error;
      if (channelRes.error) throw channelRes.error;
      if (videoGenRes.error) console.warn('video_generations fetch error:', videoGenRes.error);
      if (videoRenderRes.error) console.warn('video_render_jobs fetch error:', videoRenderRes.error);

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
      (videoGenRes.data || []).forEach((row: any) => { if (row.user_id) userIds.add(row.user_id); });
      (videoRenderRes.data || []).forEach((row: any) => { if (row.user_id) userIds.add(row.user_id); });

      const [profilesRes, brandsRes, membersRes] = await Promise.all([
        userIds.size > 0
          ? supabase.from('profiles').select('id, full_name, email, avatar_url').in('id', Array.from(userIds))
          : Promise.resolve({ data: [], error: null }),
        brandTemplateIds.size > 0
          ? supabase.from('brand_templates').select('id, brand_name, logo_url').in('id', Array.from(brandTemplateIds))
          : Promise.resolve({ data: [], error: null }),
        supabase.from('organization_members').select('user_id').eq('organization_id', orgId),
      ]);

      const profileMap = new Map<string, { name?: string; email?: string; avatar?: string }>();
      (profilesRes.data || []).forEach((p: any) => {
        profileMap.set(p.id, { name: p.full_name, email: p.email, avatar: p.avatar_url });
      });

      const brandMap = new Map<string, { name?: string; logoUrl?: string }>();
      (brandsRes.data || []).forEach((b: any) => {
        brandMap.set(b.id, { name: b.brand_name, logoUrl: b.logo_url });
      });

      const orgMemberIds = new Set<string>(
        (membersRes.data || []).map((m: any) => m.user_id)
      );

      const carouselImages: GalleryImage[] = (carouselRes.data || []).map((row: any) => {
        const userId = row.created_by;
        const profile = userId ? profileMap.get(userId) : undefined;
        const isMember = userId ? orgMemberIds.has(userId) : true;
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
          mediaType: 'image' as MediaType,
          channel: 'carousel',
          createdByName: profile?.name,
          createdByEmail: profile?.email,
          createdByAvatar: profile?.avatar,
          createdByUserId: userId,
          isOrgMember: isMember,
          brandName: row.carousels?.brand_name || undefined,
        };
      });

      const channelImages: GalleryImage[] = (channelRes.data || []).map((row: any) => {
        const userId = row.created_by;
        const profile = userId ? profileMap.get(userId) : undefined;
        const isMember = userId ? orgMemberIds.has(userId) : true;
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
          mediaType: 'image' as MediaType,
          channel: row.channel,
          createdByName: profile?.name,
          createdByEmail: profile?.email,
          createdByAvatar: profile?.avatar,
          createdByUserId: userId,
          isOrgMember: isMember,
          brandName: brand?.name,
          brandLogoUrl: brand?.logoUrl,
        };
      });

      const videoClips: GalleryImage[] = (videoGenRes.data || []).map((row: any) => {
        const userId = row.user_id;
        const profile = userId ? profileMap.get(userId) : undefined;
        const isMember = userId ? orgMemberIds.has(userId) : true;
        const folderId = row.script_id || row.storyboard_id || row.id;
        const folderTitle = row.scripts?.title || (row.storyboard_id ? 'Storyboard clip' : 'Quick clip');
        return {
          id: row.id,
          imageUrl: row.thumbnail_url || row.video_url,
          videoUrl: row.video_url,
          carouselId: folderId,
          carouselTitle: folderTitle,
          slideNumber: row.scene_number || 1,
          version: 1,
          isSelected: false,
          createdAt: row.created_at,
          source: 'video' as ImageSource,
          mediaType: 'video' as MediaType,
          durationSeconds: row.duration_seconds,
          aspectRatio: row.aspect_ratio,
          channel: 'video',
          createdByName: profile?.name,
          createdByEmail: profile?.email,
          createdByAvatar: profile?.avatar,
          createdByUserId: userId,
          isOrgMember: isMember,
        };
      });

      const videoRenders: GalleryImage[] = (videoRenderRes.data || []).map((row: any) => {
        const userId = row.user_id;
        const profile = userId ? profileMap.get(userId) : undefined;
        const isMember = userId ? orgMemberIds.has(userId) : true;
        const folderId = row.script_id || row.storyboard_id || row.id;
        const folderTitle = row.scripts?.title || 'Final video';
        return {
          id: row.id,
          imageUrl: row.thumbnail_url || row.output_url,
          videoUrl: row.output_url,
          carouselId: folderId,
          carouselTitle: folderTitle,
          slideNumber: 1,
          version: 1,
          isSelected: false,
          createdAt: row.created_at,
          source: 'video_render' as ImageSource,
          mediaType: 'video' as MediaType,
          durationSeconds: row.duration_seconds ? Number(row.duration_seconds) : undefined,
          aspectRatio: row.aspect_ratio,
          channel: 'video',
          createdByName: profile?.name,
          createdByEmail: profile?.email,
          createdByAvatar: profile?.avatar,
          createdByUserId: userId,
          isOrgMember: isMember,
        };
      });

      const all = [...carouselImages, ...channelImages, ...videoClips, ...videoRenders].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setImages(all);
    } catch (err) {
      console.error('Failed to fetch gallery images:', err);
      toast.error('Không thể tải gallery');
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  // Realtime: refetch khi có ảnh/video mới trong org
  useEffect(() => {
    if (!orgId) return;
    const channel = supabase
      .channel(`gallery-realtime-${orgId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'carousel_images', filter: `organization_id=eq.${orgId}` }, () => fetchImages())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'channel_image_history', filter: `organization_id=eq.${orgId}` }, () => fetchImages())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'video_generations', filter: `organization_id=eq.${orgId}` }, () => fetchImages())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'video_render_jobs', filter: `organization_id=eq.${orgId}` }, () => fetchImages())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [orgId, fetchImages]);

  // Refetch khi tab focus lại (user tạo ảnh/video ở tab khác xong quay về)
  useEffect(() => {
    const onFocus = () => fetchImages();
    const onVisible = () => { if (document.visibilityState === 'visible') fetchImages(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [fetchImages]);

  // Group images into content folders
  const contentFolders = useMemo<ContentFolder[]>(() => {
    const folderMap = new Map<string, GalleryImage[]>();
    images.forEach(img => {
      const existing = folderMap.get(img.carouselId);
      if (existing) {
        existing.push(img);
      } else {
        folderMap.set(img.carouselId, [img]);
      }
    });

    const folders: ContentFolder[] = [];
    folderMap.forEach((imgs, id) => {
      const first = imgs[0];
      // Collect up to 4 unique thumbnail URLs
      const thumbnailUrls = imgs.slice(0, 4).map(i => i.imageUrl);
      const latestDate = imgs.reduce((max, i) =>
        new Date(i.createdAt).getTime() > new Date(max).getTime() ? i.createdAt : max,
        imgs[0].createdAt
      );

      const videoCount = imgs.filter(i => i.mediaType === 'video').length;
      folders.push({
        id,
        title: first.carouselTitle,
        source: first.source,
        mediaType: first.mediaType,
        thumbnailUrls,
        imageCount: imgs.length,
        videoCount,
        latestDate,
        createdByName: first.createdByName,
        createdByAvatar: first.createdByAvatar,
        createdByUserId: first.createdByUserId,
        isOrgMember: first.isOrgMember,
        brandName: first.brandName,
        brandLogoUrl: first.brandLogoUrl,
        channel: first.channel,
      });
    });

    return folders;
  }, [images]);

  // Apply filters to folders (for folder-level view)
  const filteredFolders = useMemo(() => {
    let result = contentFolders;
    if (sourceFilter !== 'all') {
      if (sourceFilter === 'video') result = result.filter(f => f.mediaType === 'video');
      else result = result.filter(f => f.source === sourceFilter);
    }
    if (channelFilter !== 'all') {
      result = result.filter(f => f.channel === channelFilter);
    }
    if (creatorFilter !== 'all') {
      result = result.filter(f => f.createdByName === creatorFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(f => f.title.toLowerCase().includes(q));
    }
    // Sort
    switch (sortBy) {
      case 'oldest':
        result = [...result].sort((a, b) => new Date(a.latestDate).getTime() - new Date(b.latestDate).getTime());
        break;
      case 'newest':
      default:
        result = [...result].sort((a, b) => new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime());
        break;
    }
    return result;
  }, [contentFolders, sourceFilter, channelFilter, creatorFilter, searchQuery, sortBy]);

  // Images filtered for inside-folder view
  const folderImages = useMemo(() => {
    if (!selectedFolderId) return [];
    let result = images.filter(img => img.carouselId === selectedFolderId);
    switch (sortBy) {
      case 'oldest':
        result = [...result].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
      case 'newest':
      default:
        result = [...result].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
    }
    return result;
  }, [images, selectedFolderId, sortBy]);

  const creatorOptions = useMemo(() => {
    const map = new Map<string, { label: string; isOrgMember: boolean }>();
    images.forEach(img => {
      if (img.createdByName) {
        const existing = map.get(img.createdByName);
        if (!existing) {
          map.set(img.createdByName, {
            label: img.isOrgMember === false ? `${img.createdByName} (QTV)` : img.createdByName,
            isOrgMember: img.isOrgMember !== false,
          });
        }
      }
    });
    return Array.from(map.entries())
      .map(([key, val]) => ({ key, label: val.label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [images]);

  // Legacy filteredImages (kept for backward compat but now used only inside folder)
  const filteredImages = useMemo(() => {
    let result = images;
    if (sourceFilter !== 'all') {
      if (sourceFilter === 'video') result = result.filter(img => img.mediaType === 'video');
      else result = result.filter(img => img.source === sourceFilter);
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
    video: images.filter(i => i.mediaType === 'video').length,
  }), [images]);

  const tableForSource = (s: ImageSource): 'carousel_images' | 'channel_image_history' | 'video_generations' | 'video_render_jobs' => {
    switch (s) {
      case 'carousel': return 'carousel_images';
      case 'multichannel': return 'channel_image_history';
      case 'video': return 'video_generations';
      case 'video_render': return 'video_render_jobs';
    }
  };

  const deleteImage = async (imageId: string) => {
    const img = images.find(i => i.id === imageId);
    if (!img) return;
    try {
      const { error } = await supabase.from(tableForSource(img.source)).delete().eq('id', imageId);
      if (error) throw error;
      setImages(prev => prev.filter(i => i.id !== imageId));
      setSelectedIds(prev => { const n = new Set(prev); n.delete(imageId); return n; });
      toast.success(img.mediaType === 'video' ? 'Đã xóa video' : 'Đã xóa ảnh');
    } catch (err) {
      console.error('Failed to delete media:', err);
      toast.error('Không thể xóa');
    }
  };

  const bulkDelete = useCallback(async (ids: string[]) => {
    if (!ids.length) return;
    const groups: Record<string, string[]> = {
      carousel_images: [], channel_image_history: [], video_generations: [], video_render_jobs: [],
    };
    ids.forEach(id => {
      const img = images.find(i => i.id === id);
      if (!img) return;
      groups[tableForSource(img.source)].push(id);
    });
    try {
      const ops = Object.entries(groups)
        .filter(([, arr]) => arr.length)
        .map(([table, arr]) => supabase.from(table as any).delete().in('id', arr).select());
      const results = await Promise.all(ops);
      for (const r of results) {
        if ((r as any).error) throw (r as any).error;
      }
      setImages(prev => prev.filter(i => !ids.includes(i.id)));
      setSelectedIds(new Set());
      toast.success(`Đã xóa ${ids.length} mục`);
    } catch (err) {
      console.error('Failed to bulk delete:', err);
      toast.error('Không thể xóa hàng loạt');
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
    const target = selectedFolderId ? folderImages : filteredImages;
    setSelectedIds(new Set(target.map(i => i.id)));
  }, [filteredImages, folderImages, selectedFolderId]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // Get image IDs for a folder (for bulk select at folder level)
  const getImageIdsForFolder = useCallback((folderId: string) => {
    return images.filter(img => img.carouselId === folderId).map(img => img.id);
  }, [images]);

  // Get selected folder info
  const selectedFolder = useMemo(() => {
    if (!selectedFolderId) return null;
    return contentFolders.find(f => f.id === selectedFolderId) || null;
  }, [selectedFolderId, contentFolders]);

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
    // New folder-level exports
    contentFolders: filteredFolders,
    selectedFolderId,
    setSelectedFolderId,
    selectedFolder,
    folderImages,
    getImageIdsForFolder,
  };
}
