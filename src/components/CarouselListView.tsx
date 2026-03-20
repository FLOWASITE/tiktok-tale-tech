import { useState, useMemo } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { 
  Eye, 
  Trash2, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown,
  MoreHorizontal,
  Images,
  Layers,
  Palette
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
import { Carousel, Platform, AITool } from '@/types/carousel';
import { useCreatorProfiles } from '@/hooks/useCreatorProfiles';
import { CreatorCell } from '@/components/CreatorCell';

type SortField = 'title' | 'created_at' | 'slide_count' | 'platform';
type SortDirection = 'asc' | 'desc';

const platformLabels: Record<Platform, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  linkedin: 'LinkedIn',
};

const platformColors: Record<Platform, string> = {
  facebook: 'bg-blue-500/20 text-blue-700 dark:text-blue-400',
  instagram: 'bg-pink-500/20 text-pink-700 dark:text-pink-400',
  tiktok: 'bg-pink-500/20 text-pink-700 dark:text-pink-400',
  linkedin: 'bg-sky-500/20 text-sky-700 dark:text-sky-400',
};

const aiToolLabels: Record<AITool, string> = {
  ideogram: 'Ideogram',
  midjourney: 'Midjourney',
  dalle: 'DALL·E',
  leonardo: 'Leonardo',
};

const aiToolColors: Record<AITool, string> = {
  ideogram: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400',
  midjourney: 'bg-purple-500/20 text-purple-700 dark:text-purple-400',
  dalle: 'bg-sky-500/20 text-sky-700 dark:text-sky-400',
  leonardo: 'bg-amber-500/20 text-amber-700 dark:text-amber-400',
};

interface CarouselListViewProps {
  carousels: Carousel[];
  onView: (carousel: Carousel) => void;
  onDelete: (id: string) => void;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

export function CarouselListView({
  carousels,
  onView,
  onDelete,
  selectedIds,
  onSelectionChange,
}: CarouselListViewProps) {
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [deleteCarousel, setDeleteCarousel] = useState<Carousel | null>(null);

  // Fetch creator profiles
  const userIds = useMemo(() => carousels.map(c => c.user_id), [carousels]);
  const { profiles: creatorProfiles, isLoading: isLoadingProfiles } = useCreatorProfiles(userIds);

  const sortedCarousels = useMemo(() => {
    return [...carousels].sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'title':
          comparison = a.title.localeCompare(b.title, 'vi');
          break;
        case 'created_at':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'slide_count':
          comparison = a.slide_count - b.slide_count;
          break;
        case 'platform':
          comparison = a.platform.localeCompare(b.platform);
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [carousels, sortField, sortDirection]);

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
    if (selectedIds.length === carousels.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(carousels.map(c => c.id));
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
    if (deleteCarousel) {
      onDelete(deleteCarousel.id);
      setDeleteCarousel(null);
    }
  };

  if (carousels.length === 0) {
    return (
      <div className="text-center py-12">
        <Images className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground">Không có carousel nào</p>
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
                  checked={selectedIds.length === carousels.length && carousels.length > 0}
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
                  onClick={() => handleSort('platform')}
                >
                  Platform
                  {getSortIcon('platform')}
                </Button>
              </TableHead>
              <TableHead>AI Tool</TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 -ml-3 font-semibold"
                  onClick={() => handleSort('slide_count')}
                >
                  Slides
                  {getSortIcon('slide_count')}
                </Button>
              </TableHead>
              <TableHead>Brand</TableHead>
              <TableHead>Người tạo</TableHead>
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
            {sortedCarousels.map((carousel) => (
              <TableRow 
                key={carousel.id} 
                className="group hover:bg-muted/20 cursor-pointer"
                onClick={() => onView(carousel)}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedIds.includes(carousel.id)}
                    onCheckedChange={() => toggleSelect(carousel.id)}
                  />
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <p className="font-medium line-clamp-1 group-hover:text-primary transition-colors">
                      {carousel.title}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {carousel.topic}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge 
                    variant="secondary" 
                    className={`${platformColors[carousel.platform]} border-0 font-normal`}
                  >
                    {platformLabels[carousel.platform]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge 
                    variant="secondary" 
                    className={`${aiToolColors[carousel.ai_tool]} border-0 font-normal`}
                  >
                    <Palette className="w-3 h-3 mr-1" />
                    {aiToolLabels[carousel.ai_tool]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center gap-1 text-sm">
                    <Layers className="w-3.5 h-3.5 text-muted-foreground" />
                    {carousel.slide_count}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground line-clamp-1">
                    {carousel.brand_name}
                  </span>
                </TableCell>
                <TableCell>
                  <CreatorCell 
                    profile={carousel.user_id ? creatorProfiles[carousel.user_id] : undefined}
                    isLoading={isLoadingProfiles}
                  />
                </TableCell>
                <TableCell>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(carousel.created_at), { 
                          addSuffix: true, 
                          locale: vi 
                        })}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      {format(new Date(carousel.created_at), 'dd/MM/yyyy HH:mm', { locale: vi })}
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
                      <DropdownMenuItem onClick={() => onView(carousel)}>
                        <Eye className="w-4 h-4 mr-2" />
                        Xem chi tiết
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="text-destructive focus:text-destructive"
                        onClick={() => setDeleteCarousel(carousel)}
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
      <AlertDialog open={!!deleteCarousel} onOpenChange={() => setDeleteCarousel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa carousel</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa carousel "{deleteCarousel?.title}"? 
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
