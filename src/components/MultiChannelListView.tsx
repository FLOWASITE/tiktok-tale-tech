import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Eye, Trash2, Calendar, Tag, ChevronDown, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
  MultiChannelContent, 
  ContentStatus, 
  Channel, 
  CONTENT_STATUSES,
} from '@/types/multichannel';

type SortField = 'title' | 'created_at' | 'completed_channels';
type SortDirection = 'asc' | 'desc';

const statusColors: Record<ContentStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  review: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400',
  approved: 'bg-blue-500/20 text-blue-700 dark:text-blue-400',
  published: 'bg-green-500/20 text-green-700 dark:text-green-400',
};

const statusDots: Record<ContentStatus, string> = {
  draft: 'bg-muted-foreground',
  review: 'bg-yellow-500',
  approved: 'bg-blue-500',
  published: 'bg-green-500',
};

const channelLabels: Record<Channel, string> = {
  website: 'Website',
  facebook: 'Facebook',
  instagram: 'Instagram',
  twitter: 'Twitter',
  google_maps: 'Google Maps',
  linkedin: 'LinkedIn',
  email: 'Email',
  youtube: 'YouTube',
  zalo_oa: 'Zalo OA',
  telegram: 'Telegram',
};

interface MultiChannelListViewProps {
  contents: MultiChannelContent[];
  selectedIds: Set<string>;
  onToggleSelection: (id: string) => void;
  onView: (content: MultiChannelContent) => void;
  onDelete: (id: string) => void;
  onChannelStatusChange?: (contentId: string, channel: Channel, status: ContentStatus) => Promise<unknown>;
}

// Helper function to get status summary
const getStatusSummary = (content: MultiChannelContent) => {
  const channelStatuses = content.channel_statuses || {};
  const channels = content.selected_channels;
  
  const summary: Record<ContentStatus, number> = {
    draft: 0,
    review: 0,
    approved: 0,
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
      className={`flex items-center gap-1 hover:text-foreground transition-colors ${className}`}
    >
      {label}
      {isActive ? (
        direction === 'asc' ? (
          <ArrowUp className="w-3.5 h-3.5" />
        ) : (
          <ArrowDown className="w-3.5 h-3.5" />
        )
      ) : (
        <ArrowUpDown className="w-3.5 h-3.5 opacity-50" />
      )}
    </button>
  );
};

export function MultiChannelListView({
  contents,
  selectedIds,
  onToggleSelection,
  onView,
  onDelete,
  onChannelStatusChange,
}: MultiChannelListViewProps) {
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
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
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [contents, sortField, sortDirection]);

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40px]"></TableHead>
            <TableHead className="min-w-[200px]">
              <SortableHeader
                label="Tiêu đề"
                field="title"
                currentField={sortField}
                direction={sortDirection}
                onSort={handleSort}
              />
            </TableHead>
            <TableHead className="min-w-[150px]">Thương hiệu</TableHead>
            <TableHead className="min-w-[200px]">Kênh</TableHead>
            <TableHead className="min-w-[180px]">
              <SortableHeader
                label="Trạng thái kênh"
                field="completed_channels"
                currentField={sortField}
                direction={sortDirection}
                onSort={handleSort}
              />
            </TableHead>
            <TableHead className="min-w-[120px]">
              <SortableHeader
                label="Ngày tạo"
                field="created_at"
                currentField={sortField}
                direction={sortDirection}
                onSort={handleSort}
              />
            </TableHead>
            <TableHead className="w-[100px] text-right">Thao tác</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedContents.map((content) => {
            const statusSummary = getStatusSummary(content);
            const channelStatuses = content.channel_statuses || {};
            const completedCount = getCompletedCount(content);
            const totalChannels = content.selected_channels.length;
            
            return (
              <TableRow key={content.id} className="group">
                <TableCell>
                  <Checkbox
                    checked={selectedIds.has(content.id)}
                    onCheckedChange={() => onToggleSelection(content.id)}
                    className="h-4 w-4"
                  />
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <button
                      onClick={() => onView(content)}
                      className="font-medium text-left hover:text-primary transition-colors line-clamp-1"
                    >
                      {content.title}
                    </button>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {content.topic}
                    </p>
                    {content.tags && content.tags.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap">
                        <Tag className="w-3 h-3 text-muted-foreground" />
                        {content.tags.slice(0, 2).map((tag, i) => (
                          <Badge key={i} variant="outline" className="text-[10px] px-1 py-0">
                            {tag}
                          </Badge>
                        ))}
                        {content.tags.length > 2 && (
                          <span className="text-[10px] text-muted-foreground">
                            +{content.tags.length - 2}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm">{content.brand_name}</span>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {content.selected_channels.slice(0, 3).map((channel) => (
                      <Badge key={channel} variant="secondary" className="text-[10px] px-1.5 py-0">
                        {channelLabels[channel] || channel}
                      </Badge>
                    ))}
                    {content.selected_channels.length > 3 && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        +{content.selected_channels.length - 3}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-2 hover:opacity-80 transition-opacity text-left">
                        {/* Completed count badge */}
                        <Badge 
                          variant="outline" 
                          className={`text-[10px] ${completedCount === totalChannels ? 'bg-green-500/20 text-green-700 dark:text-green-400' : ''}`}
                        >
                          {completedCount}/{totalChannels} đã đăng
                        </Badge>
                        {/* Status summary dots */}
                        <div className="flex items-center gap-1">
                          {CONTENT_STATUSES.map((status) => {
                            const count = statusSummary[status.value];
                            if (count === 0) return null;
                            return (
                              <div 
                                key={status.value}
                                className="flex items-center gap-0.5"
                                title={`${count} ${status.label}`}
                              >
                                <span className={`w-2 h-2 rounded-full ${statusDots[status.value]}`} />
                                <span className="text-[10px] text-muted-foreground">{count}</span>
                              </div>
                            );
                          })}
                        </div>
                        <ChevronDown className="w-3 h-3 text-muted-foreground" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="bg-popover z-50 w-64">
                      <DropdownMenuLabel className="text-xs">Trạng thái từng kênh</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {content.selected_channels.map((channel) => {
                        const currentStatus = channelStatuses[channel] || 'draft';
                        return (
                          <DropdownMenu key={channel}>
                            <DropdownMenuTrigger asChild>
                              <div className="flex items-center justify-between px-2 py-1.5 hover:bg-accent rounded-sm cursor-pointer">
                                <span className="text-sm">{channelLabels[channel]}</span>
                                <div className="flex items-center gap-1">
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
                                    <span className="text-xs text-muted-foreground ml-auto">✓</span>
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
                <TableCell>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(content.created_at), 'dd/MM/yyyy', { locale: vi })}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => onView(content)}
                      title="Xem chi tiết"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          title="Xóa"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
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
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
          {contents.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                Không có nội dung nào
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
