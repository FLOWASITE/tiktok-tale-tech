import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, Send, Calendar } from 'lucide-react';
import { MultiChannelContent, Channel } from '@/types/multichannel';
import { MultiChannelCard } from '@/components/MultiChannelCard';
import { ChannelIcon, getChannelLabel } from '@/components/multichannel/streaming/ChannelIcon';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CreatorProfile } from '@/hooks/useCreatorProfiles';
import { SocialConnection, SocialPlatform } from '@/hooks/useSocialConnections';
import { CHANNEL_COLORS } from '@/utils/channelColors';
import { cn } from '@/lib/utils';

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

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggleCollapse = (ch: string) => {
    setCollapsed(prev => ({ ...prev, [ch]: !prev[ch] }));
  };

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

  return (
    <div className="space-y-3">
      {channelGroups.map(({ channel, items }, groupIdx) => {
        const isOpen = !collapsed[channel];
        const stats = getStatusCounts(items);
        const connection = getConnection(channel);
        const colors = CHANNEL_COLORS[channel];
        const eligibleCount = getEligibleCount(items, channel);

        return (
          <div key={channel}>
            {groupIdx > 0 && <Separator className="mb-3" />}
            <Collapsible open={isOpen} onOpenChange={() => toggleCollapse(channel)}>
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: groupIdx * 0.05 }}
              >
                {/* Channel Header with brand color */}
                <div className={cn(
                  "rounded-xl border-l-4 overflow-hidden",
                  colors?.border || 'border-border',
                )}>
                  <CollapsibleTrigger asChild>
                    <button className={cn(
                      "w-full flex items-center gap-3 py-3 px-4 transition-colors group cursor-pointer",
                      colors?.bg || 'bg-muted/50',
                      "hover:opacity-90",
                    )}>
                      {/* Channel icon */}
                      <div className="flex-shrink-0">
                        <ChannelIcon channel={channel} size="lg" />
                      </div>

                      {/* Channel name + connection info */}
                      <div className="flex flex-col items-start gap-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <h2 className={cn("text-sm font-bold", colors?.text || 'text-foreground')}>
                            {getChannelLabel(channel)}
                          </h2>
                          <Badge variant="secondary" className="text-xs font-medium">
                            {items.length}
                          </Badge>
                        </div>

                        {/* Connection info */}
                        <div className="flex items-center gap-1.5">
                          {connection ? (
                            <>
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
                            </>
                          ) : CHANNEL_TO_PLATFORM[channel] ? (
                            <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              Chưa kết nối
                            </span>
                          ) : null}
                        </div>
                      </div>

                      {/* Mini stats */}
                      <div className="hidden sm:flex items-center gap-1.5 ml-auto mr-2">
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

                      <ChevronDown className={cn(
                        "w-4 h-4 text-muted-foreground transition-transform flex-shrink-0",
                        isOpen ? "rotate-0" : "-rotate-90"
                      )} />
                    </button>
                  </CollapsibleTrigger>

                  {/* Action buttons row — below header, inside the colored container */}
                  {isOpen && eligibleCount > 0 && connection && (
                    <div className="flex items-center gap-2 px-4 pb-2 pt-0.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1.5"
                        onClick={(e) => { e.stopPropagation(); }}
                      >
                        <Send className="w-3 h-3" />
                        Đăng tất cả ({eligibleCount})
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs gap-1.5"
                        onClick={(e) => { e.stopPropagation(); }}
                      >
                        <Calendar className="w-3 h-3" />
                        Lên lịch
                      </Button>
                    </div>
                  )}
                </div>

                {/* Cards Grid */}
                <CollapsibleContent>
                  <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 pt-3 pb-3">
                    {items.map((content, index) => (
                      <div key={content.id} className="relative">
                        <div className="absolute top-2 left-2 z-20">
                          <Checkbox
                            checked={selectedIds.has(content.id)}
                            onCheckedChange={() => toggleSelection(content.id)}
                            className="h-4 w-4 bg-background/90 backdrop-blur border-border shadow-sm"
                          />
                        </div>
                        <MultiChannelCard
                          content={content}
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
                </CollapsibleContent>
              </motion.div>
            </Collapsible>
          </div>
        );
      })}
    </div>
  );
}
