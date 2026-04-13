import { useMemo, useState, useCallback } from 'react';
import { Send, Calendar, ArrowDownUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { MultiChannelContent, Channel } from '@/types/multichannel';
import { SocialPostCard } from '@/components/multichannel/SocialPostCard';
import { ChannelIcon, getChannelLabel } from '@/components/multichannel/streaming/ChannelIcon';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreatorProfile } from '@/hooks/useCreatorProfiles';
import { SocialConnection, SocialPlatform } from '@/hooks/useSocialConnections';
import { CHANNEL_COLORS } from '@/utils/channelColors';
import { cn } from '@/lib/utils';

const ITEMS_PER_PAGE = 12;

type SortMode = 'newest' | 'oldest' | 'month_group';

function sortItems(items: MultiChannelContent[], mode: SortMode): MultiChannelContent[] {
  const sorted = [...items].sort((a, b) => {
    const da = new Date(a.created_at || 0).getTime();
    const db = new Date(b.created_at || 0).getTime();
    return mode === 'oldest' ? da - db : db - da;
  });
  return sorted;
}

function groupByMonth(items: MultiChannelContent[]): { label: string; key: string; items: MultiChannelContent[] }[] {
  const sorted = sortItems(items, 'newest');
  const map = new Map<string, MultiChannelContent[]>();
  for (const item of sorted) {
    const date = new Date(item.created_at || 0);
    const key = `${date.getFullYear()}-${String(date.getMonth()).padStart(2, '0')}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return Array.from(map.entries()).map(([key, items]) => {
    const date = new Date(items[0].created_at || 0);
    const label = format(date, "'Tháng' M, yyyy", { locale: vi });
    return { label, key, items };
  });
}

interface ChannelGroupViewProps {
  contents: MultiChannelContent[];
  onView: (content: MultiChannelContent) => void;
  onDelete: (id: string) => void;
  selectedIds: Set<string>;
  toggleSelection: (id: string) => void;
  creatorProfiles: Record<string, CreatorProfile>;
  isLoadingProfiles: boolean;
  brandLogoMap: Record<string, string>;
  geoScoresMap?: Record<string, { overall_score: number }> | null;
  onScheduleComplete?: () => void;
  socialConnections?: SocialConnection[];
}

const ALL_CHANNELS: Channel[] = [
  'facebook', 'instagram', 'tiktok', 'twitter', 'linkedin',
  'youtube', 'threads', 'telegram', 'zalo_oa', 'website',
  'email', 'google_maps',
];

const CHANNEL_TO_PLATFORM: Partial<Record<Channel, SocialPlatform>> = {
  facebook: 'facebook',
  instagram: 'instagram',
  tiktok: 'tiktok',
  twitter: 'twitter',
  linkedin: 'linkedin',
  youtube: 'youtube',
  threads: 'threads',
  zalo_oa: 'zalo_oa',
  website: 'website',
};

function getStatusCounts(items: MultiChannelContent[]) {
  let draft = 0, approved = 0, published = 0;
  for (const item of items) {
    const s = item.status;
    if (s === 'published') published++;
    else if (s === 'approved') approved++;
    else draft++;
  }
  return { draft, approved, published };
}

function getEligibleCount(items: MultiChannelContent[], channel: Channel) {
  return items.filter(item => {
    if (item.status !== 'approved') return false;
    const statuses = item.channel_statuses as Record<string, string> | null;
    if (statuses?.[channel] === 'published') return false;
    return true;
  }).length;
}

export function ChannelGroupView({
  contents,
  onView,
  onDelete,
  selectedIds,
  toggleSelection,
  creatorProfiles,
  isLoadingProfiles,
  brandLogoMap,
  geoScoresMap,
  onScheduleComplete,
  socialConnections,
}: ChannelGroupViewProps) {
  const [sortBy, setSortBy] = useState<SortMode>('newest');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState<Record<string, number>>({});

  const getPage = useCallback((channel: string) => currentPage[channel] || 1, [currentPage]);
  const setPage = useCallback((channel: string, page: number) => {
    setCurrentPage(prev => ({ ...prev, [channel]: page }));
  }, []);

  const channelGroups = useMemo(() => {
    const groups: { channel: Channel; items: MultiChannelContent[] }[] = [];
    for (const ch of ALL_CHANNELS) {
      const items = contents.filter(c => c.selected_channels?.includes(ch));
      if (items.length > 0) {
        groups.push({ channel: ch, items });
      }
    }
    groups.sort((a, b) => b.items.length - a.items.length);
    return groups;
  }, [contents]);

  const getConnection = (channel: Channel): SocialConnection | undefined => {
    const platform = CHANNEL_TO_PLATFORM[channel];
    if (!platform || !socialConnections) return undefined;
    return socialConnections.find(c => c.platform === platform && c.is_active);
  };

  if (channelGroups.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Không có nội dung nào theo kênh.
      </div>
    );
  }

  const defaultChannel = channelGroups[0].channel;

  return (
    <Tabs defaultValue={defaultChannel} className="w-full">
      {/* Tab bar — scrollable horizontally */}
      <TabsList className="h-auto w-full justify-start gap-1 bg-transparent p-0 overflow-x-auto flex-nowrap scrollbar-none">
        {channelGroups.map(({ channel, items }) => {
          const colors = CHANNEL_COLORS[channel];
          return (
            <TabsTrigger
              key={channel}
              value={channel}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-all shrink-0",
                "data-[state=inactive]:bg-muted/40 data-[state=inactive]:border-transparent data-[state=inactive]:text-muted-foreground",
                "data-[state=active]:shadow-sm",
                colors?.bg && `data-[state=active]:${colors.bg}`,
                colors?.text && `data-[state=active]:${colors.text}`,
                colors?.border && `data-[state=active]:${colors.border}`,
              )}
              style={{
                // Use inline styles for active state brand colors since dynamic Tailwind classes don't work
              }}
            >
              <ChannelIcon channel={channel} size="sm" />
              <span className="hidden sm:inline">{getChannelLabel(channel)}</span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 min-w-[1.25rem] justify-center">
                {items.length}
              </Badge>
            </TabsTrigger>
          );
        })}
      </TabsList>

      {/* Tab content for each channel */}
      {channelGroups.map(({ channel, items }) => {
        const stats = getStatusCounts(items);
        const connection = getConnection(channel);
        const colors = CHANNEL_COLORS[channel];
        const eligibleCount = getEligibleCount(items, channel);

        return (
          <TabsContent key={channel} value={channel} className="mt-3">
            {/* Channel info header */}
            <div className={cn(
              "rounded-xl border-l-4 p-3 mb-4",
              colors?.border || 'border-border',
              colors?.bg || 'bg-muted/50',
            )}>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                {/* Left: connection info + stats */}
                <div className="flex items-center gap-3 min-w-0">
                  <ChannelIcon channel={channel} size="lg" />
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className={cn("text-sm font-bold", colors?.text || 'text-foreground')}>
                        {getChannelLabel(channel)}
                      </h2>
                      {/* Connection status */}
                      {connection ? (
                        <div className="flex items-center gap-1.5">
                          {connection.platform_avatar_url && (
                            <Avatar className="h-4 w-4">
                              <AvatarImage src={connection.platform_avatar_url} />
                              <AvatarFallback className="text-[8px]">
                                {connection.platform_display_name?.[0] || '?'}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <span className="text-[11px] text-muted-foreground truncate max-w-[120px]">
                            {connection.platform_username
                              ? `@${connection.platform_username}`
                              : connection.platform_display_name || 'Đã kết nối'}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Đã kết nối
                          </span>
                        </div>
                      ) : CHANNEL_TO_PLATFORM[channel] ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          Chưa kết nối
                        </span>
                      ) : null}
                    </div>

                    {/* Mini stats */}
                    <div className="flex items-center gap-1.5">
                      {stats.published > 0 && (
                        <Badge variant="default" className="text-[10px] px-1.5 py-0 h-4 bg-emerald-500/15 text-emerald-600 border-0">
                          {stats.published} đã đăng
                        </Badge>
                      )}
                      {stats.approved > 0 && (
                        <Badge variant="default" className="text-[10px] px-1.5 py-0 h-4 bg-blue-500/15 text-blue-600 border-0">
                          {stats.approved} duyệt
                        </Badge>
                      )}
                      {stats.draft > 0 && (
                        <Badge variant="default" className="text-[10px] px-1.5 py-0 h-4 bg-muted text-muted-foreground border-0">
                          {stats.draft} nháp
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: sort + action buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Select value={sortBy} onValueChange={(v) => { setSortBy(v as SortMode); setSelectedMonth('all'); setCurrentPage({}); }}>
                    <SelectTrigger className="h-7 w-auto min-w-[130px] text-xs gap-1.5 border-border">
                      <ArrowDownUp className="w-3 h-3 shrink-0" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Mới nhất</SelectItem>
                      <SelectItem value="oldest">Cũ nhất</SelectItem>
                      <SelectItem value="month_group">Theo tháng</SelectItem>
                    </SelectContent>
                  </Select>

                  {sortBy === 'month_group' && (() => {
                    const months = groupByMonth(items);
                    return months.length > 1 ? (
                      <Select value={selectedMonth} onValueChange={(key) => {
                        setSelectedMonth(key);
                        if (key !== 'all') {
                          setTimeout(() => {
                            document.getElementById(`month-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }, 50);
                        }
                      }}>
                        <SelectTrigger className="h-7 w-auto min-w-[140px] text-xs gap-1.5 border-border">
                          <Calendar className="w-3 h-3 shrink-0" />
                          <SelectValue placeholder="Chọn tháng" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tất cả tháng</SelectItem>
                          {months.map((g) => (
                            <SelectItem key={g.key} value={g.key}>{g.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : null;
                  })()}

                  {eligibleCount > 0 && connection && (
                    <>
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5">
                        <Send className="w-3 h-3" />
                        Đăng tất cả ({eligibleCount})
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs gap-1.5">
                        <Calendar className="w-3 h-3" />
                        Lên lịch
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Cards Grid — with sort/group */}
            {sortBy === 'month_group' ? (
              <div className="space-y-6">
                {groupByMonth(items).map((group) => (
                  <div key={group.key} id={`month-${group.key}`} className="scroll-mt-20">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-px flex-1 bg-border" />
                      <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
                        {group.label} ({group.items.length} bài)
                      </span>
                      <div className="h-px flex-1 bg-border" />
                    </div>
                    <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                      {group.items.map((content, index) => (
                        <div key={content.id} className="relative">
                          <div className="absolute top-2 left-2 z-20">
                            <Checkbox
                              checked={selectedIds.has(content.id)}
                              onCheckedChange={() => toggleSelection(content.id)}
                              className="h-4 w-4 bg-background/90 backdrop-blur border-border shadow-sm"
                            />
                          </div>
                          <SocialPostCard
                            content={content}
                            activeChannel={channel}
                            onView={onView}
                            onDelete={onDelete}
                            onScheduleComplete={onScheduleComplete}
                            creatorProfile={content.user_id ? creatorProfiles[content.user_id] : undefined}
                            isLoadingProfile={isLoadingProfiles}
                            index={index}
                            brandLogoUrl={content.brand_template_id ? brandLogoMap[content.brand_template_id] : undefined}
                            geoScore={geoScoresMap?.[content.id]?.overall_score ?? null}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (() => {
              const sorted = sortItems(items, sortBy);
              const page = getPage(channel);
              const totalPages = Math.ceil(sorted.length / ITEMS_PER_PAGE);
              const paged = sorted.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

              return (
                <>
                  <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                    {paged.map((content, index) => (
                      <div key={content.id} className="relative">
                        <div className="absolute top-2 left-2 z-20">
                          <Checkbox
                            checked={selectedIds.has(content.id)}
                            onCheckedChange={() => toggleSelection(content.id)}
                            className="h-4 w-4 bg-background/90 backdrop-blur border-border shadow-sm"
                          />
                        </div>
                        <SocialPostCard
                          content={content}
                          activeChannel={channel}
                          onView={onView}
                          onDelete={onDelete}
                          onScheduleComplete={onScheduleComplete}
                          creatorProfile={content.user_id ? creatorProfiles[content.user_id] : undefined}
                          isLoadingProfile={isLoadingProfiles}
                          index={(page - 1) * ITEMS_PER_PAGE + index}
                          brandLogoUrl={content.brand_template_id ? brandLogoMap[content.brand_template_id] : undefined}
                          geoScore={geoScoresMap?.[content.id]?.overall_score ?? null}
                        />
                      </div>
                    ))}
                  </div>

                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-1 mt-6">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        disabled={page <= 1}
                        onClick={() => setPage(channel, page - 1)}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                        <Button
                          key={p}
                          variant={p === page ? 'default' : 'outline'}
                          size="icon"
                          className="h-8 w-8 text-xs"
                          onClick={() => setPage(channel, p)}
                        >
                          {p}
                        </Button>
                      ))}
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        disabled={page >= totalPages}
                        onClick={() => setPage(channel, page + 1)}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </>
              );
            })()}
          </TabsContent>
        );
      })}
    </Tabs>
  );
}
