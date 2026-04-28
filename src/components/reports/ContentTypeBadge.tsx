import { Badge } from '@/components/ui/badge';
import { FileText, Video, Layers, BookOpen, Megaphone } from 'lucide-react';

export type ContentType = 'multichannel' | 'script' | 'carousel' | 'core' | 'ad_copy';

const CONFIG: Record<ContentType, { label: string; icon: typeof FileText }> = {
  multichannel: { label: 'Multi-channel', icon: Layers },
  script: { label: 'Script', icon: Video },
  carousel: { label: 'Carousel', icon: FileText },
  core: { label: 'Core content', icon: BookOpen },
  ad_copy: { label: 'Ad copy', icon: Megaphone },
};

export function ContentTypeBadge({ type, compact = false }: { type: ContentType; compact?: boolean }) {
  const cfg = CONFIG[type] ?? CONFIG.multichannel;
  const Icon = cfg.icon;
  return (
    <Badge variant="outline" className="gap-1 font-normal">
      <Icon className="h-3 w-3 text-muted-foreground" />
      {!compact && <span className="text-xs">{cfg.label}</span>}
    </Badge>
  );
}

export const CONTENT_TYPE_LABELS = Object.fromEntries(
  Object.entries(CONFIG).map(([k, v]) => [k, v.label]),
) as Record<ContentType, string>;
