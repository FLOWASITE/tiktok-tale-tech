import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { MultiChannelContent, Channel } from '@/types/multichannel';
import { MultiChannelCard } from '@/components/MultiChannelCard';
import { ChannelIcon, getChannelLabel } from '@/components/multichannel/streaming/ChannelIcon';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CreatorProfile } from '@/hooks/useCreatorProfiles';
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
}

const ALL_CHANNELS: Channel[] = [
  'facebook', 'instagram', 'tiktok', 'twitter', 'linkedin',
  'youtube', 'threads', 'telegram', 'zalo_oa', 'website',
  'email', 'google_maps',
];

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

  if (channelGroups.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Không có nội dung nào theo kênh.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {channelGroups.map(({ channel, items }, groupIdx) => {
        const isOpen = !collapsed[channel];
        const stats = getStatusCounts(items);

        return (
          <div key={channel}>
            {groupIdx > 0 && <Separator className="mb-2" />}
            <Collapsible open={isOpen} onOpenChange={() => toggleCollapse(channel)}>
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: groupIdx * 0.05 }}
              >
                {/* Channel Header */}
                <CollapsibleTrigger asChild>
                  <button className="w-full flex items-center gap-3 py-2.5 px-2 rounded-lg hover:bg-muted/50 transition-colors group cursor-pointer">
                    <ChannelIcon channel={channel} size="lg" />
                    <h2 className="text-sm font-semibold text-foreground">
                      {getChannelLabel(channel)}
                    </h2>
                    <Badge variant="secondary" className="text-xs">
                      {items.length}
                    </Badge>

                    {/* Mini stats */}
                    <div className="flex items-center gap-1.5 ml-1">
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
                      "w-4 h-4 ml-auto text-muted-foreground transition-transform",
                      isOpen ? "rotate-0" : "-rotate-90"
                    )} />
                  </button>
                </CollapsibleTrigger>

                {/* Cards Grid */}
                <CollapsibleContent>
                  <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 pt-2 pb-3">
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
