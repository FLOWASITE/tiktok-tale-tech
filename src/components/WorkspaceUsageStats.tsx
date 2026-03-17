import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useSubscription } from '@/hooks/useSubscription';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { MemberAvatar } from '@/components/MemberAvatar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, Palette, Layers, Wand2 } from 'lucide-react';

interface ContentRow {
  id: string;
  user_id: string | null;
  brand_template_id: string | null;
  selected_channels: string[] | null;
}

interface ProfileRow {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

interface BrandRow {
  id: string;
  brand_name: string;
  logo_url: string | null;
}

interface StatEntry {
  socialPosts: number;
  images: number;
}

export function WorkspaceUsageStats() {
  const { currentOrganization } = useOrganizationContext();
  const { currentPeriod } = useSubscription();
  const orgId = currentOrganization?.id;

  const query = useQuery({
    queryKey: ['workspace_usage_stats', orgId, currentPeriod.start, currentPeriod.end],
    queryFn: async () => {
      // 1. Fetch all contents in this org + period
      const { data: contents } = await supabase
        .from('multi_channel_contents')
        .select('id, user_id, brand_template_id, selected_channels')
        .eq('organization_id', orgId!)
        .gte('created_at', currentPeriod.start)
        .lte('created_at', currentPeriod.end);

      const rows = (contents || []) as ContentRow[];
      const contentIds = rows.map((r) => r.id);

      // 2. Fetch images for these contents
      const { data: imageRows } = contentIds.length > 0
        ? await supabase
            .from('channel_image_history')
            .select('content_id')
            .in('content_id', contentIds)
        : { data: [] };

      // Build a map: content_id → image count
      const imageCountByContent: Record<string, number> = {};
      (imageRows || []).forEach((r: any) => {
        imageCountByContent[r.content_id] = (imageCountByContent[r.content_id] || 0) + 1;
      });

      // 3. Group by user
      const byUser: Record<string, StatEntry> = {};
      const byBrand: Record<string, StatEntry> = {};
      const userIds = new Set<string>();
      const brandIds = new Set<string>();

      rows.forEach((row) => {
        const socialCount = Array.isArray(row.selected_channels) ? row.selected_channels.length : 0;
        const imgCount = imageCountByContent[row.id] || 0;

        if (row.user_id) {
          userIds.add(row.user_id);
          if (!byUser[row.user_id]) byUser[row.user_id] = { socialPosts: 0, images: 0 };
          byUser[row.user_id].socialPosts += socialCount;
          byUser[row.user_id].images += imgCount;
        }

        if (row.brand_template_id) {
          brandIds.add(row.brand_template_id);
          if (!byBrand[row.brand_template_id]) byBrand[row.brand_template_id] = { socialPosts: 0, images: 0 };
          byBrand[row.brand_template_id].socialPosts += socialCount;
          byBrand[row.brand_template_id].images += imgCount;
        }
      });

      // 4. Lookup profiles & brands
      const [profilesRes, brandsRes] = await Promise.all([
        userIds.size > 0
          ? supabase.from('profiles').select('id, full_name, email, avatar_url').in('id', [...userIds])
          : Promise.resolve({ data: [] }),
        brandIds.size > 0
          ? supabase.from('brand_templates').select('id, brand_name, logo_url').in('id', [...brandIds])
          : Promise.resolve({ data: [] }),
      ]);

      const profileMap: Record<string, ProfileRow> = {};
      (profilesRes.data || []).forEach((p: any) => { profileMap[p.id] = p; });

      const brandMap: Record<string, BrandRow> = {};
      (brandsRes.data || []).forEach((b: any) => { brandMap[b.id] = b; });

      return { byUser, byBrand, profileMap, brandMap };
    },
    enabled: !!orgId,
  });

  const sortedUsers = useMemo(() => {
    if (!query.data) return [];
    return Object.entries(query.data.byUser)
      .sort(([, a], [, b]) => (b.socialPosts + b.images) - (a.socialPosts + a.images));
  }, [query.data]);

  const sortedBrands = useMemo(() => {
    if (!query.data) return [];
    return Object.entries(query.data.byBrand)
      .sort(([, a], [, b]) => (b.socialPosts + b.images) - (a.socialPosts + a.images));
  }, [query.data]);

  if (!orgId) return null;

  if (query.isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (sortedUsers.length === 0 && sortedBrands.length === 0) return null;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* By Member */}
      {sortedUsers.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Theo thành viên
            </CardTitle>
            <CardDescription>Thống kê sử dụng trong tháng theo từng người</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {sortedUsers.map(([userId, stats]) => {
              const profile = query.data?.profileMap[userId];
              const name = profile?.full_name || profile?.email?.split('@')[0] || 'Người dùng';
              return (
                <div key={userId} className="flex items-center gap-3">
                  <MemberAvatar
                    avatarUrl={profile?.avatar_url}
                    name={profile?.full_name}
                    email={profile?.email}
                    size="sm"
                    showStatus={false}
                    showTooltip={false}
                  />
                  <span className="text-sm font-medium truncate flex-1 min-w-0" title={name}>
                    {name}
                  </span>
                  <div className="flex items-center gap-3 shrink-0 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1" title="Bài trên Social">
                      <Layers className="h-3.5 w-3.5" />
                      <span className="font-semibold text-foreground">{stats.socialPosts}</span>
                    </span>
                    <span className="flex items-center gap-1" title="Ảnh AI">
                      <Wand2 className="h-3.5 w-3.5" />
                      <span className="font-semibold text-foreground">{stats.images}</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* By Brand */}
      {sortedBrands.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Theo Brand
            </CardTitle>
            <CardDescription>Thống kê sử dụng trong tháng theo từng thương hiệu</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {sortedBrands.map(([brandId, stats]) => {
              const brand = query.data?.brandMap[brandId];
              const name = brand?.brand_name || 'Brand';
              return (
                <div key={brandId} className="flex items-center gap-3">
                  <Avatar className="h-8 w-8 rounded-md border border-border">
                    <AvatarImage src={brand?.logo_url || undefined} className="object-cover" />
                    <AvatarFallback className="rounded-md text-xs bg-primary/10 text-primary font-medium">
                      {name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium truncate flex-1 min-w-0" title={name}>
                    {name}
                  </span>
                  <div className="flex items-center gap-3 shrink-0 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1" title="Bài trên Social">
                      <Layers className="h-3.5 w-3.5" />
                      <span className="font-semibold text-foreground">{stats.socialPosts}</span>
                    </span>
                    <span className="flex items-center gap-1" title="Ảnh AI">
                      <Wand2 className="h-3.5 w-3.5" />
                      <span className="font-semibold text-foreground">{stats.images}</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
