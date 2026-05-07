import { useState, useMemo } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { 
  Eye, 
  Trash2, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown,
  Clock,
  User,
  Film,
  MoreHorizontal,
  FileText
} from 'lucide-react';
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
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  Script, 
  VIDEO_TYPE_LABELS, 
  CHARACTER_TYPE_LABELS, 
  DURATION_LABELS,
  VideoType,
  CharacterType,
  Duration
} from '@/types/script';
import { useCreatorProfiles } from '@/hooks/useCreatorProfiles';
import { CreatorCell } from '@/components/CreatorCell';
import { ScriptMediaBadges } from '@/components/video/ScriptMediaBadges';
import type { ScriptMediaStatus } from '@/hooks/useScriptsMediaStatus';

type SortField = 'title' | 'created_at' | 'duration' | 'video_type';
type SortDirection = 'asc' | 'desc';

const videoTypeColors: Record<VideoType, string> = {
  // Educational
  expert_share: 'bg-blue-500/20 text-blue-700 dark:text-blue-400',
  tutorial_howto: 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-400',
  analyze_explain: 'bg-violet-500/20 text-violet-700 dark:text-violet-400',
  listicle: 'bg-teal-500/20 text-teal-700 dark:text-teal-400',
  // Engagement
  warning_mistake: 'bg-red-500/20 text-red-700 dark:text-red-400',
  quick_qa: 'bg-green-500/20 text-green-700 dark:text-green-400',
  myth_busting: 'bg-orange-500/20 text-orange-700 dark:text-orange-400',
  before_after: 'bg-pink-500/20 text-pink-700 dark:text-pink-400',
  // Entertainment
  story_pov: 'bg-purple-500/20 text-purple-700 dark:text-purple-400',
  day_in_life: 'bg-amber-500/20 text-amber-700 dark:text-amber-400',
  behind_scenes: 'bg-slate-500/20 text-slate-700 dark:text-slate-400',
  reaction: 'bg-lime-500/20 text-lime-700 dark:text-lime-400',
  // Commercial
  product_review: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400',
  case_study: 'bg-indigo-500/20 text-indigo-700 dark:text-indigo-400',
  transformation: 'bg-fuchsia-500/20 text-fuchsia-700 dark:text-fuchsia-400',
};

const characterTypeColors: Record<CharacterType, string> = {
  // Professional
  the_virtuoso: 'bg-blue-500/20 text-blue-700 dark:text-blue-400',
  the_bellwether: 'bg-purple-500/20 text-purple-700 dark:text-purple-400',
  the_coach: 'bg-green-500/20 text-green-700 dark:text-green-400',
  // Creative
  the_performer: 'bg-pink-500/20 text-pink-700 dark:text-pink-400',
  the_storyteller: 'bg-amber-500/20 text-amber-700 dark:text-amber-400',
  the_iconoclast: 'bg-red-500/20 text-red-700 dark:text-red-400',
  // Technical
  the_technophile: 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-400',
  the_analyst: 'bg-indigo-500/20 text-indigo-700 dark:text-indigo-400',
  // Passionate
  the_enthusiast: 'bg-rose-500/20 text-rose-700 dark:text-rose-400',
  the_maker: 'bg-orange-500/20 text-orange-700 dark:text-orange-400',
  // Neutral
  neutral_presenter: 'bg-slate-500/20 text-slate-700 dark:text-slate-400',
};

interface ScriptListViewProps {
  scripts: Script[];
  onView: (script: Script) => void;
  onDelete: (id: string) => void;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  mediaStatusMap?: Map<string, ScriptMediaStatus>;
}

export function ScriptListView({
  scripts,
  onView,
  onDelete,
  selectedIds,
  onSelectionChange,
  mediaStatusMap,
}: ScriptListViewProps) {
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [deleteScript, setDeleteScript] = useState<Script | null>(null);

  // Fetch creator profiles
  const userIds = useMemo(() => scripts.map(s => s.user_id), [scripts]);
  const { profiles: creatorProfiles, isLoading: isLoadingProfiles } = useCreatorProfiles(userIds);

  const sortedScripts = useMemo(() => {
    return [...scripts].sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'title':
          comparison = a.title.localeCompare(b.title, 'vi');
          break;
        case 'created_at':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'duration':
          comparison = a.duration - b.duration;
          break;
        case 'video_type':
          comparison = a.video_type.localeCompare(b.video_type);
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [scripts, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 ml-1 opacity-50" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="w-4 h-4 ml-1" /> 
      : <ArrowDown className="w-4 h-4 ml-1" />;
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === scripts.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(scripts.map(s => s.id));
    }
  };

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter(i => i !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const handleConfirmDelete = () => {
    if (deleteScript) {
      onDelete(deleteScript.id);
      setDeleteScript(null);
    }
  };

  if (scripts.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground">Không có kịch bản nào</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="rounded-lg border border-border/50 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedIds.length === scripts.length && scripts.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 -ml-3 font-semibold"
                  onClick={() => handleSort('title')}
                >
                  Tiêu đề
                  {getSortIcon('title')}
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 -ml-3 font-semibold"
                  onClick={() => handleSort('video_type')}
                >
                  Loại video
                  {getSortIcon('video_type')}
                </Button>
              </TableHead>
              <TableHead>Nhân vật</TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 -ml-3 font-semibold"
                  onClick={() => handleSort('duration')}
                >
                  Thời lượng
                  {getSortIcon('duration')}
                </Button>
              </TableHead>
              <TableHead>Người tạo</TableHead>
              <TableHead>Video</TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 -ml-3 font-semibold"
                  onClick={() => handleSort('created_at')}
                >
                  Ngày tạo
                  {getSortIcon('created_at')}
                </Button>
              </TableHead>
              <TableHead className="w-20 text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedScripts.map((script) => (
              <TableRow 
                key={script.id} 
                className="group hover:bg-muted/20 cursor-pointer"
                onClick={() => onView(script)}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedIds.includes(script.id)}
                    onCheckedChange={() => toggleSelect(script.id)}
                  />
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <p className="font-medium line-clamp-1 group-hover:text-primary transition-colors">
                      {script.title}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {script.topic}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge 
                    variant="secondary" 
                    className={`${videoTypeColors[script.video_type as VideoType]} border-0 font-normal`}
                  >
                    <Film className="w-3 h-3 mr-1" />
                    {VIDEO_TYPE_LABELS[script.video_type as VideoType]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge 
                    variant="secondary" 
                    className={`${characterTypeColors[script.character_type as CharacterType]} border-0 font-normal`}
                  >
                    <User className="w-3 h-3 mr-1" />
                    {CHARACTER_TYPE_LABELS[script.character_type as CharacterType]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center gap-1 text-sm">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                    {script.duration}s
                  </span>
                </TableCell>
                <TableCell>
                  <CreatorCell 
                    profile={script.user_id ? creatorProfiles[script.user_id] : undefined}
                    isLoading={isLoadingProfiles}
                  />
                </TableCell>
                <TableCell>
                  <ScriptMediaBadges status={mediaStatusMap?.get(script.id)} size="xs" />
                </TableCell>
                <TableCell>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(script.created_at), { 
                          addSuffix: true, 
                          locale: vi 
                        })}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      {format(new Date(script.created_at), 'dd/MM/yyyy HH:mm', { locale: vi })}
                    </TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onView(script)}>
                        <Eye className="w-4 h-4 mr-2" />
                        Xem chi tiết
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="text-destructive focus:text-destructive"
                        onClick={() => setDeleteScript(script)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Xóa
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteScript} onOpenChange={() => setDeleteScript(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa kịch bản</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa kịch bản "{deleteScript?.title}"? 
              Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}
