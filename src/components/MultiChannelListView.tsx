import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Eye, Trash2, Calendar, Clock, Tag } from 'lucide-react';
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
import { MultiChannelContent, ContentStatus, Channel } from '@/types/multichannel';

const statusColors: Record<ContentStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  review: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400',
  approved: 'bg-blue-500/20 text-blue-700 dark:text-blue-400',
  published: 'bg-green-500/20 text-green-700 dark:text-green-400',
};

const statusLabels: Record<ContentStatus, string> = {
  draft: 'Nháp',
  review: 'Chờ duyệt',
  approved: 'Đã duyệt',
  published: 'Đã đăng',
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
}

export function MultiChannelListView({
  contents,
  selectedIds,
  onToggleSelection,
  onView,
  onDelete,
}: MultiChannelListViewProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40px]"></TableHead>
            <TableHead className="min-w-[200px]">Tiêu đề</TableHead>
            <TableHead className="min-w-[150px]">Thương hiệu</TableHead>
            <TableHead className="min-w-[200px]">Kênh</TableHead>
            <TableHead className="w-[100px]">Trạng thái</TableHead>
            <TableHead className="min-w-[120px]">Ngày tạo</TableHead>
            <TableHead className="w-[100px] text-right">Thao tác</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contents.map((content) => (
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
                <Badge className={`${statusColors[content.status || 'draft']} text-[10px]`}>
                  {statusLabels[content.status || 'draft']}
                </Badge>
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
          ))}
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
