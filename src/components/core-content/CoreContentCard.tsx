import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  FileText,
  MoreVertical,
  Eye,
  CheckCircle,
  Archive,
  Trash2,
  Layers,
  Sparkles,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { ChannelIcon, getChannelLabel } from '@/components/multichannel/streaming/ChannelIcon';
import type { CoreContent } from '@/types/coreContent';

interface CoreContentCardProps {
  coreContent: CoreContent;
  onView?: (id: string) => void;
  onApprove?: (id: string) => void;
  onArchive?: (id: string) => void;
  onDelete?: (id: string) => void;
  onTransform?: (id: string) => void;
  derivedCount?: number;
  derivedChannels?: string[];
  derivedRoles?: string[];
}

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: 'Bản nháp', className: 'bg-slate-500/15 text-slate-600 border-slate-500/30' },
  approved: { label: 'Đã duyệt', className: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30' },
  archived: { label: 'Lưu trữ', className: 'bg-slate-400/15 text-slate-500 border-slate-400/30' },
};

const roleConfig: Record<string, { label: string; className: string }> = {
  seed: { label: 'Seed', className: 'bg-emerald-500/15 text-emerald-600' },
  sprout: { label: 'Sprout', className: 'bg-blue-500/15 text-blue-600' },
  harvest: { label: 'Harvest', className: 'bg-amber-500/15 text-amber-600' },
};

const goalConfig: Record<string, { label: string; className: string }> = {
  awareness: { label: 'Awareness', className: 'bg-purple-500/15 text-purple-600' },
  education: { label: 'Education', className: 'bg-blue-500/15 text-blue-600' },
  expertise: { label: 'Expertise', className: 'bg-indigo-500/15 text-indigo-600' },
  engagement: { label: 'Engagement', className: 'bg-pink-500/15 text-pink-600' },
  conversion: { label: 'Conversion', className: 'bg-orange-500/15 text-orange-600' },
};

export function CoreContentCard({
  coreContent,
  onView,
  onApprove,
  onArchive,
  onDelete,
  onTransform,
  derivedCount = 0,
  derivedChannels = [],
  derivedRoles = [],
}: CoreContentCardProps) {
  const status = statusConfig[coreContent.status] || statusConfig.draft;
  const role = coreContent.content_role ? roleConfig[coreContent.content_role] : null;
  const goal = goalConfig[coreContent.content_goal] || goalConfig.awareness;

  const truncatedContent = coreContent.content?.slice(0, 200) + (coreContent.content?.length > 200 ? '...' : '');

  return (
    <Card className="group hover:shadow-md transition-all duration-200 border-border/50 hover:border-primary/30">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="w-4 h-4 text-primary flex-shrink-0" />
              <h3 className="font-semibold text-foreground truncate">
                {coreContent.title}
              </h3>
            </div>
            <p className="text-sm text-muted-foreground truncate">
              {coreContent.topic}
            </p>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onView?.(coreContent.id)}>
                <Eye className="w-4 h-4 mr-2" />
                Xem chi tiết
              </DropdownMenuItem>
              {coreContent.status === 'approved' && (
                <DropdownMenuItem onClick={() => onTransform?.(coreContent.id)}>
                  <Layers className="w-4 h-4 mr-2" />
                  Transform → Multi-channel
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {coreContent.status === 'draft' && (
                <DropdownMenuItem onClick={() => onApprove?.(coreContent.id)}>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Phê duyệt
                </DropdownMenuItem>
              )}
              {coreContent.status !== 'archived' && (
                <DropdownMenuItem onClick={() => onArchive?.(coreContent.id)}>
                  <Archive className="w-4 h-4 mr-2" />
                  Lưu trữ
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete?.(coreContent.id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Xóa
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Badges row */}
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline" className={cn('text-xs', status.className)}>
            {status.label}
          </Badge>
          <Badge variant="outline" className={cn('text-xs', goal.className)}>
            {goal.label}
          </Badge>
          {role && (
            <Badge variant="outline" className={cn('text-xs', role.className)}>
              {role.label}
            </Badge>
          )}
        </div>

        {/* Content preview */}
        <p className="text-sm text-muted-foreground line-clamp-3">
          {truncatedContent}
        </p>

        {/* Derived Channels Row */}
        {derivedChannels.length > 0 && (
          <TooltipProvider>
            <div className="flex items-center gap-2 pt-2 border-t border-border/50">
              <span className="text-xs text-muted-foreground">Đã transform:</span>
              <div className="flex items-center gap-1">
                {derivedChannels.slice(0, 4).map((channel) => (
                  <Tooltip key={channel}>
                    <TooltipTrigger asChild>
                      <div>
                        <ChannelIcon channel={channel} size="sm" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{getChannelLabel(channel)}</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
                {derivedChannels.length > 4 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        +{derivedChannels.length - 4}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{derivedChannels.slice(4).map(getChannelLabel).join(', ')}</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
              <span className="text-xs text-muted-foreground ml-auto">
                {derivedCount} variant{derivedCount > 1 ? 's' : ''}
              </span>
            </div>
          </TooltipProvider>
        )}

        {/* Stats row */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/50">
          <div className="flex items-center gap-3">
            {coreContent.word_count && (
              <span className="flex items-center gap-1">
                <FileText className="w-3 h-3" />
                {coreContent.word_count} từ
              </span>
            )}
            {coreContent.quality_score && (
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" />
                {coreContent.quality_score}/10
              </span>
            )}
          </div>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatDistanceToNow(new Date(coreContent.created_at), { addSuffix: true, locale: vi })}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
