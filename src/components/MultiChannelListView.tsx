import { useState, useMemo } from 'react';
import { format, formatDistanceToNow, differenceInHours } from 'date-fns';
import { vi } from 'date-fns/locale';
import { 
  Eye, 
  Trash2, 
  Calendar, 
  Tag, 
  ChevronDown, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown,
  Clock,
  Target,
  GraduationCap,
  MessageCircle,
  Award,
  Zap,
  MoreHorizontal,
  CalendarClock,
  AlertCircle,
  CheckCircle2,
  ImageIcon,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  MultiChannelContent, 
  ContentStatus, 
  Channel, 
  ContentGoal,
  CONTENT_STATUSES,
  CONTENT_GOALS,
} from '@/types/multichannel';
import { useCreatorProfiles } from '@/hooks/useCreatorProfiles';
import { CreatorCell } from '@/components/CreatorCell';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

type SortField = 'title' | 'created_at' | 'completed_channels' | 'priority';
type SortDirection = 'asc' | 'desc';

const statusColors: Record<ContentStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  review: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400',
  approved: 'bg-blue-500/20 text-blue-700 dark:text-blue-400',
  partially_published: 'bg-teal-500/20 text-teal-700 dark:text-teal-400',
  published: 'bg-green-500/20 text-green-700 dark:text-green-400',
};

const statusDots: Record<ContentStatus, string> = {
  draft: 'bg-muted-foreground',
  review: 'bg-yellow-500',
  approved: 'bg-blue-500',
  partially_published: 'bg-teal-500',
  published: 'bg-green-500',
};

const priorityConfig: Record<string, { label: string; color: string; icon: typeof AlertCircle }> = {
  high: { label: 'Cao', color: 'text-red-500', icon: AlertCircle },
  normal: { label: 'Bình thường', color: 'text-muted-foreground', icon: Clock },
  low: { label: 'Thấp', color: 'text-blue-500', icon: Clock },
};

const goalIcons: Record<ContentGoal, typeof Target> = {
  education: GraduationCap,
  awareness: Eye,
  engagement: MessageCircle,
  expertise: Award,
  conversion: Target,
};

const channelLabels: Record<Channel, string> = {
  website: 'Web',
  facebook: 'FB',
  instagram: 'IG',
  twitter: 'X',
  google_maps: 'GMaps',
  linkedin: 'LI',
  email: 'Email',
  youtube: 'YT',
  zalo_oa: 'Zalo',
  telegram: 'TG',
  tiktok: 'TT',
  threads: 'TH',
};

const channelColors: Record<Channel, string> = {
  website: 'bg-blue-500/20 text-blue-700 dark:text-blue-400',
  facebook: 'bg-indigo-500/20 text-indigo-700 dark:text-indigo-400',
  instagram: 'bg-pink-500/20 text-pink-700 dark:text-pink-400',
  twitter: 'bg-slate-500/20 text-slate-700 dark:text-slate-400',
  google_maps: 'bg-green-500/20 text-green-700 dark:text-green-400',
  linkedin: 'bg-sky-500/20 text-sky-700 dark:text-sky-400',
  email: 'bg-amber-500/20 text-amber-700 dark:text-amber-400',
  youtube: 'bg-red-500/20 text-red-700 dark:text-red-400',
  zalo_oa: 'bg-blue-500/20 text-blue-700 dark:text-blue-400',
  telegram: 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-400',
  tiktok: 'bg-pink-500/20 text-pink-700 dark:text-pink-400',
  threads: 'bg-slate-500/20 text-slate-700 dark:text-slate-400',
};

interface MultiChannelListViewProps {
  contents: MultiChannelContent[];
  selectedIds: Set<string>;
  onToggleSelection: (id: string) => void;
  onView: (content: MultiChannelContent) => void;
  onDelete: (id: string) => void;
  onChannelStatusChange?: (contentId: string, channel: Channel, status: ContentStatus) => Promise<unknown>;
  priorityFilter?: string;
  onPriorityFilterChange?: (priority: string) => void;
}

// Helper function to get status summary
const getStatusSummary = (content: MultiChannelContent) => {
  const channelStatuses = content.channel_statuses || {};
  const channels = content.selected_channels;
  
  const summary: Record<ContentStatus, number> = {
    draft: 0,
    review: 0,
    approved: 0,
    partially_published: 0,
    published: 0,
  };

  channels.forEach(channel => {
    const status = channelStatuses[channel] || 'draft';
    summary[status]++;
  });

  return summary;
};

// Helper function to count completed channels (published)
const getCompletedCount = (content: MultiChannelContent) => {
  const channelStatuses = content.channel_statuses || {};
  return content.selected_channels.filter(ch => channelStatuses[ch] === 'published').length;
};

// Get priority order for sorting
const getPriorityOrder = (priority: string | null | undefined) => {
  switch (priority) {
    case 'high': return 3;
    case 'normal': return 2;
    case 'low': return 1;
    default: return 2;
  }
};

// Sortable header component
const SortableHeader = ({ 
  label, 
  field, 
  currentField, 
  direction, 
  onSort,
  className = ''
}: { 
  label: string; 
  field: SortField; 
  currentField: SortField | null;
  direction: SortDirection;
  onSort: (field: SortField) => void;
  className?: string;
}) => {
  const isActive = currentField === field;
  
  return (
    <button
      onClick={() => onSort(field)}
      className={`flex items-center gap-1 hover:text-foreground transition-colors font-medium ${className}`}
    >
      {label}
      {isActive ? (
        direction === 'asc' ? (
          <ArrowUp className="w-3.5 h-3.5 text-primary" />
        ) : (
          <ArrowDown className="w-3.5 h-3.5 text-primary" />
        )
      ) : (
        <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />
      )}
    </button>
  );
};

// Helper: get first thumbnail from channel_images
const getFirstThumbnail = (content: MultiChannelContent): string | null => {
  const channelImages = content.channel_images as Record<string, string[]> | null | undefined;
  if (!channelImages) return null;
  for (const channel of Object.keys(channelImages)) {
    const images = channelImages[channel];
    if (images && images.length > 0) return images[0];
  }
  return null;
};

// Helper: check if channel has image
const channelHasImage = (content: MultiChannelContent, channel: string): boolean => {
  const channelImages = content.channel_images as Record<string, string[]> | null | undefined;
  if (!channelImages) return false;
  const images = channelImages[channel];
  return !!(images && images.length > 0);
};

// Helper: get critique score color
const getCritiqueColor = (score: number) => {
  if (score >= 80) return 'bg-green-500/20 text-green-700 dark:text-green-400';
  if (score >= 60) return 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400';
  return 'bg-red-500/20 text-red-700 dark:text-red-400';
};

export function MultiChannelListView({
  contents,
  selectedIds,
  onToggleSelection,
  onView,
  onDelete,
  onChannelStatusChange,
  priorityFilter = 'all',
  onPriorityFilterChange,
}: MultiChannelListViewProps) {
  const [sortField, setSortField] = useState<SortField | null>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Fetch creator profiles
  const userIds = useMemo(() => contents.map(c => c.user_id), [contents]);
  const { profiles: creatorProfiles, isLoading: isLoadingProfiles } = useCreatorProfiles(userIds);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection(field === 'created_at' ? 'desc' : 'asc');
    }
  };

  const sortedContents = useMemo(() => {
    if (!sortField) return contents;

    return [...contents].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'title':
          comparison = a.title.localeCompare(b.title, 'vi');
          break;
        case 'created_at':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'completed_channels':
          comparison = getCompletedCount(a) - getCompletedCount(b);
          break;
        case 'priority':
          comparison = getPriorityOrder(a.priority) - getPriorityOrder(b.priority);
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [contents, sortField, sortDirection]);

  return (
    <TooltipProvider>
      <div className="space-y-3">
        {/* Quick Priority Filter */}
        {onPriorityFilterChange && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Lọc nhanh:</span>
            <div className="flex items-center gap-1">
              <Button
                variant={priorityFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs"
                onClick={() => onPriorityFilterChange('all')}
              >
                Tất cả
              </Button>
              <Button
                variant={priorityFilter === 'high' ? 'default' : 'outline'}
                size="sm"
                className={`h-7 text-xs gap-1 ${priorityFilter === 'high' ? '' : 'text-red-500 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950'}`}
                onClick={() => onPriorityFilterChange('high')}
              >
                <AlertCircle className="w-3 h-3" />
                Cao
              </Button>
              <Button
                variant={priorityFilter === 'normal' ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => onPriorityFilterChange('normal')}
              >
                <Clock className="w-3 h-3" />
                Bình thường
              </Button>
              <Button
                variant={priorityFilter === 'low' ? 'default' : 'outline'}
                size="sm"
                className={`h-7 text-xs gap-1 ${priorityFilter === 'low' ? '' : 'text-blue-500 border-blue-200 hover:bg-blue-50 dark:border-blue-800 dark:hover:bg-blue-950'}`}
                onClick={() => onPriorityFilterChange('low')}
              >
                <Clock className="w-3 h-3" />
                Thấp
              </Button>
            </div>
          </div>
        )}

        <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="w-[40px]"></TableHead>
              <TableHead className="min-w-[280px]">
                <SortableHeader
                  label="Nội dung"
                  field="title"
                  currentField={sortField}
                  direction={sortDirection}
                  onSort={handleSort}
                />
              </TableHead>
              <TableHead className="w-[100px]">
                <SortableHeader
                  label="Ưu tiên"
                  field="priority"
                  currentField={sortField}
                  direction={sortDirection}
                  onSort={handleSort}
                />
              </TableHead>
              <TableHead className="min-w-[200px]">Kênh phân phối</TableHead>
              <TableHead className="min-w-[200px]">
                <SortableHeader
                  label="Tiến độ"
                  field="completed_channels"
                  currentField={sortField}
                  direction={sortDirection}
                  onSort={handleSort}
                />
              </TableHead>
              <TableHead>Người tạo</TableHead>
              <TableHead className="min-w-[130px]">
                <SortableHeader
                  label="Thời gian"
                  field="created_at"
                  currentField={sortField}
                  direction={sortDirection}
                  onSort={handleSort}
                />
              </TableHead>
              <TableHead className="w-[80px] text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedContents.map((content, index) => {
              const statusSummary = getStatusSummary(content);
              const channelStatuses = content.channel_statuses || {};
              const completedCount = getCompletedCount(content);
              const totalChannels = content.selected_channels.length;
              const progressPercent = totalChannels > 0 ? (completedCount / totalChannels) * 100 : 0;
              const priority = content.priority || 'normal';
              const priorityInfo = priorityConfig[priority] || priorityConfig.normal;
              const PriorityIcon = priorityInfo.icon;
              const goalInfo = CONTENT_GOALS.find(g => g.value === content.content_goal);
              const GoalIcon = goalInfo ? goalIcons[content.content_goal] : Target;
              const isOverdue = content.deadline && new Date(content.deadline) < new Date() && completedCount < totalChannels;
              const isNearDeadline = content.deadline && !isOverdue && differenceInHours(new Date(content.deadline), new Date()) <= 48 && completedCount < totalChannels;
              const thumbnail = getFirstThumbnail(content);
              const critiqueScore = (content as any).critique_score as number | undefined;
              const isSelected = selectedIds.has(content.id);
              
              return (
                <TableRow 
                  key={content.id} 
                  className={`group transition-all border-l-2 ${
                    isSelected 
                      ? 'border-l-primary bg-primary/5' 
                      : 'border-l-transparent hover:border-l-primary/50 hover:bg-muted/50'
                  } ${index % 2 === 1 ? 'bg-muted/20' : ''}`}
                >
                  <TableCell className="py-3">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => onToggleSelection(content.id)}
                      className="h-4 w-4"
                    />
                  </TableCell>
                  
                  {/* Content Info with Thumbnail */}
                  <TableCell className="py-3">
                    <div className="flex items-start gap-3">
                      {/* Thumbnail or Goal Icon */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          {thumbnail ? (
                            <div className="flex-shrink-0 w-8 h-8 rounded-md overflow-hidden shadow-sm border border-border/50">
                              <img 
                                src={thumbnail} 
                                alt="" 
                                className="w-full h-full object-cover"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                              />
                            </div>
                          ) : (
                            <div 
                              className="flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center"
                              style={{ backgroundColor: content.primary_color ? `${content.primary_color}20` : 'hsl(var(--muted))' }}
                            >
                              <GoalIcon 
                                className="w-4 h-4" 
                                style={{ color: content.primary_color || 'hsl(var(--muted-foreground))' }}
                              />
                            </div>
                          )}
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{goalInfo?.label || 'Mục tiêu'}: {goalInfo?.description}</p>
                        </TooltipContent>
                      </Tooltip>
                      
                      <div className="flex-1 min-w-0 space-y-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => onView(content)}
                              className="font-semibold text-left hover:underline transition-colors line-clamp-1 text-sm"
                            >
                              {content.title}
                            </button>
                          </TooltipTrigger>
                          {content.topic && (
                            <TooltipContent side="bottom" className="max-w-xs">
                              <p className="text-xs">{content.topic}</p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="line-clamp-1 max-w-[200px]">{content.topic}</span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge variant="outline" className="text-xs px-1.5 py-0 font-normal">
                            {content.brand_name}
                          </Badge>
                          {content.tags && content.tags.slice(0, 2).map((tag, i) => (
                            <Badge key={i} variant="secondary" className="text-xs px-1.5 py-0 font-normal">
                              <Tag className="w-2.5 h-2.5 mr-0.5" />
                              {tag}
                            </Badge>
                          ))}
                          {content.tags && content.tags.length > 2 && (
                            <span className="text-[10px] text-muted-foreground">+{content.tags.length - 2}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  
                  {/* Priority */}
                  <TableCell className="py-3">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className={`flex items-center gap-1.5 ${priorityInfo.color}`}>
                          <PriorityIcon className="w-4 h-4" />
                          <span className="text-xs font-medium">{priorityInfo.label}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>Mức độ ưu tiên: {priorityInfo.label}</TooltipContent>
                    </Tooltip>
                  </TableCell>
                  
                  {/* Channels with image dots */}
                  <TableCell className="py-3">
                    <div className="flex flex-wrap gap-1">
                      {content.selected_channels.map((channel) => {
                        const status = channelStatuses[channel] || 'draft';
                        const isPublished = status === 'published';
                        const hasImage = channelHasImage(content, channel);
                        return (
                          <Tooltip key={channel}>
                            <TooltipTrigger asChild>
                              <Badge 
                                variant="outline" 
                                className={`text-xs px-1.5 py-0.5 gap-1 ${channelColors[channel]} ${isPublished ? 'ring-1 ring-green-500/50' : ''}`}
                              >
                                {isPublished && <CheckCircle2 className="w-2.5 h-2.5" />}
                                {channelLabels[channel]}
                                {hasImage && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-violet-500 inline-block" />
                                )}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{channel}: {CONTENT_STATUSES.find(s => s.value === status)?.label || 'Nháp'}
                              {hasImage ? ' • Có ảnh' : ' • Chưa có ảnh'}</p>
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </div>
                  </TableCell>
                  
                  {/* Progress with critique score */}
                  <TableCell className="py-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="w-full text-left hover:opacity-80 transition-opacity space-y-1.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              {completedCount === totalChannels ? (
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                              ) : (
                                <Zap className="w-4 h-4 text-muted-foreground" />
                              )}
                              <span className={`text-sm font-medium ${completedCount === totalChannels ? 'text-green-600 dark:text-green-400' : ''}`}>
                                {completedCount}/{totalChannels} kênh
                              </span>
                              {critiqueScore !== undefined && critiqueScore !== null && (
                                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ml-1 ${getCritiqueColor(critiqueScore)}`}>
                                  {critiqueScore}đ
                                </Badge>
                              )}
                            </div>
                            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                          </div>
                          <Progress value={progressPercent} className="h-1.5" />
                          <div className="flex gap-1.5">
                            {CONTENT_STATUSES.map((status) => {
                              const count = statusSummary[status.value];
                              if (count === 0) return null;
                              return (
                                <div key={status.value} className="flex items-center gap-0.5">
                                  <span className={`w-1.5 h-1.5 rounded-full ${statusDots[status.value]}`} />
                                  <span className="text-[10px] text-muted-foreground">{count}</span>
                                </div>
                              );
                            })}
                          </div>
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="bg-popover z-50 w-72">
                        <DropdownMenuLabel className="flex items-center gap-2">
                          <span>Trạng thái từng kênh</span>
                          <Badge variant="outline" className="text-[10px]">
                            {completedCount}/{totalChannels} hoàn thành
                          </Badge>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {content.selected_channels.map((channel) => {
                          const currentStatus = channelStatuses[channel] || 'draft';
                          return (
                            <DropdownMenu key={channel}>
                              <DropdownMenuTrigger asChild>
                                <div className="flex items-center justify-between px-2 py-2 hover:bg-accent rounded-sm cursor-pointer">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className={`${channelColors[channel]} text-xs`}>
                                      {channelLabels[channel]}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <Badge 
                                      variant="outline"
                                      className={`${statusColors[currentStatus]} text-[10px]`}
                                    >
                                      {CONTENT_STATUSES.find(s => s.value === currentStatus)?.label || 'Nháp'}
                                    </Badge>
                                    <ChevronDown className="w-3 h-3" />
                                  </div>
                                </div>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent side="right" className="bg-popover z-[60]">
                                {CONTENT_STATUSES.map((status) => (
                                  <DropdownMenuItem
                                    key={status.value}
                                    onClick={() => onChannelStatusChange?.(content.id, channel, status.value)}
                                    className="cursor-pointer"
                                  >
                                    <Badge 
                                      variant="outline"
                                      className={`${statusColors[status.value]} text-[10px] mr-2`}
                                    >
                                      {status.label}
                                    </Badge>
                                    {currentStatus === status.value && (
                                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500 ml-auto" />
                                    )}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          );
                        })}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                  {/* Creator */}
                  <TableCell className="py-3">
                    <CreatorCell 
                      profile={content.user_id ? creatorProfiles[content.user_id] : undefined}
                      isLoading={isLoadingProfiles}
                    />
                  </TableCell>
                  
                  {/* Date & Deadline with badges */}
                  <TableCell className="py-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{format(new Date(content.created_at), 'dd/MM/yyyy', { locale: vi })}</span>
                      </div>
                      {content.deadline && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1.5">
                              <div className={`flex items-center gap-1 text-xs ${isOverdue ? 'text-red-500' : isNearDeadline ? 'text-yellow-600 dark:text-yellow-400' : 'text-muted-foreground'}`}>
                                <CalendarClock className="w-3.5 h-3.5" />
                                <span>{formatDistanceToNow(new Date(content.deadline), { addSuffix: true, locale: vi })}</span>
                              </div>
                              {isOverdue && (
                                <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4">
                                  Trễ hạn
                                </Badge>
                              )}
                              {isNearDeadline && (
                                <Badge className="text-[10px] px-1.5 py-0 h-4 bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700">
                                  Sắp đến hạn
                                </Badge>
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Deadline: {format(new Date(content.deadline), 'dd/MM/yyyy HH:mm', { locale: vi })}</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </TableCell>
                  
                  {/* Actions */}
                  <TableCell className="py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-all duration-200"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-popover">
                        <DropdownMenuItem onClick={() => onView(content)} className="cursor-pointer">
                          <Eye className="w-4 h-4 mr-2" />
                          Xem chi tiết
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem 
                              onSelect={(e) => e.preventDefault()}
                              className="cursor-pointer text-destructive focus:text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Xóa
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
                              <AlertDialogDescription>
                                Bạn có chắc muốn xóa nội dung "{content.title}"? Hành động này không thể hoàn tác.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Hủy</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => onDelete(content.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Xóa
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
            {contents.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-16 text-muted-foreground">
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="flex flex-col items-center gap-3"
                  >
                    <motion.div
                      animate={{ y: [0, -6, 0] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                      className="relative"
                    >
                      <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl scale-150" />
                      <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 border border-border/50 flex items-center justify-center">
                        <Zap className="w-8 h-8 text-primary" />
                      </div>
                    </motion.div>
                    <p className="font-semibold text-foreground">Chưa có nội dung nào</p>
                    <p className="text-sm max-w-[250px]">Tạo nội dung đa kênh mới để bắt đầu quản lý</p>
                    <Button asChild className="gap-2 mt-1">
                      <Link to="/multichannel/create">
                        <Plus className="w-4 h-4" />
                        Tạo nội dung mới
                      </Link>
                    </Button>
                  </motion.div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        </div>
      </div>
    </TooltipProvider>
  );
}
