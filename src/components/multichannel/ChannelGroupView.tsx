import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { MultiChannelContent, Channel } from '@/types/multichannel';
import { MultiChannelCard } from '@/components/MultiChannelCard';
import { ChannelIcon, getChannelLabel } from '@/components/multichannel/streaming/ChannelIcon';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { CreatorProfile } from '@/hooks/useCreatorProfiles';

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
}

const ALL_CHANNELS: Channel[] = [
  'facebook', 'instagram', 'tiktok', 'twitter', 'linkedin',
  'youtube', 'threads', 'telegram', 'zalo_oa', 'website',
  'email', 'google_maps',
];

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
}: ChannelGroupViewProps) {
  // Group contents by channel
  const channelGroups = useMemo(() => {
    const groups: { channel: Channel; items: MultiChannelContent[] }[] = [];

    for (const ch of ALL_CHANNELS) {
      const items = contents.filter(c =>
        c.selected_channels?.includes(ch)
      );
      if (items.length > 0) {
        groups.push({ channel: ch, items });
      }
    }

    // Sort by count descending
    groups.sort((a, b) => b.items.length - a.items.length);
    return groups;
  }, [contents]);

  if (channelGroups.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Không có nội dung nào theo kênh.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {channelGroups.map(({ channel, items }) => (
        <motion.section
          key={channel}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Channel Header */}
          <div className="flex items-center gap-3 mb-4">
            <ChannelIcon channel={channel} size="lg" />
            <h2 className="text-base font-semibold text-foreground">
              {getChannelLabel(channel)}
            </h2>
            <Badge variant="secondary" className="text-xs">
              {items.length}
            </Badge>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
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
                  creatorProfile={content.user_id ? creatorProfiles[content.user_id] : undefined}
                  isLoadingProfile={isLoadingProfiles}
                  index={index}
                  brandLogoUrl={content.brand_template_id ? brandLogoMap[content.brand_template_id] : undefined}
                  geoScore={geoScoresMap?.[content.id]?.overall_score ?? null}
                />
              </div>
            ))}
          </div>
        </motion.section>
      ))}
    </div>
  );
}
