import { useState } from 'react';
import { Eye, Code, Monitor } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ChannelMockupFrame } from '@/components/preview/ChannelMockupFrame';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Channel } from '@/types/multichannel';
import { cn } from '@/lib/utils';

type ViewMode = 'text' | 'mockup';

interface ContentMockupToggleProps {
  channel: Channel;
  content: string;
  brandName: string;
  logoUrl?: string;
  primaryColor?: string;
  isLoading?: boolean;
  className?: string;
}

// Map multichannel Channel to ChannelMockupFrame type
const channelToMockupType: Record<Channel, 'facebook' | 'linkedin' | 'instagram' | 'tiktok' | 'email' | 'twitter' | 'general'> = {
  facebook: 'facebook',
  linkedin: 'linkedin',
  instagram: 'instagram',
  tiktok: 'tiktok',
  email: 'email',
  twitter: 'twitter',
  website: 'general',
  google_maps: 'general',
  youtube: 'general',
  zalo_oa: 'general',
  telegram: 'general',
  threads: 'general',
};

export function ContentMockupToggle({
  channel,
  content,
  brandName,
  logoUrl,
  primaryColor,
  isLoading,
  className,
}: ContentMockupToggleProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('text');
  const mockupType = channelToMockupType[channel];

  return (
    <div className={cn('space-y-3', className)}>
      {/* Toggle Switch */}
      <div className="flex justify-end">
        <ToggleGroup 
          type="single" 
          value={viewMode}
          onValueChange={(value) => value && setViewMode(value as ViewMode)}
          className="bg-muted/50 p-1 rounded-lg"
        >
          <ToggleGroupItem value="text" className="gap-1.5 text-xs px-3">
            <Code className="w-3.5 h-3.5" />
            Text
          </ToggleGroupItem>
          <ToggleGroupItem value="mockup" className="gap-1.5 text-xs px-3">
            <Monitor className="w-3.5 h-3.5" />
            Mockup
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Content Display */}
      {viewMode === 'mockup' ? (
        <div className="flex justify-center p-4 bg-muted/20 rounded-lg border border-border/50">
          <div className="w-full max-w-md">
            <ChannelMockupFrame
              channel={mockupType}
              content={content}
              brandName={brandName}
              logoUrl={logoUrl}
              primaryColor={primaryColor}
              isGenerating={isLoading}
            />
          </div>
        </div>
      ) : (
        <ScrollArea className="h-[400px] rounded-lg border border-border/50 bg-muted/30">
          <div className="p-4">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
                <p>Đang tải...</p>
              </div>
            ) : content ? (
              <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                {content}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                Không có nội dung cho kênh này
              </p>
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
