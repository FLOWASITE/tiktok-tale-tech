import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Star, Filter, Grid, List, Trash2, ExternalLink, Copy, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSwipeFiles } from '@/hooks/useSwipeFiles';
import { SwipeFileCard } from './SwipeFileCard';
import { AddSwipeFileDialog } from './AddSwipeFileDialog';
import { SwipeFileQuickView } from './SwipeFileQuickView';
import { AD_PLATFORMS } from '@/types/adCopy';
import { PERFORMANCE_TIERS } from '@/types/swipeFile';
import type { SwipeFile } from '@/types/swipeFile';
import { cn } from '@/lib/utils';

interface SwipeFileLibraryProps {
  onSelectForInspiration?: (swipeFile: SwipeFile) => void;
}

export function SwipeFileLibrary({ onSelectForInspiration }: SwipeFileLibraryProps) {
  const { swipeFiles, isLoading, toggleFavorite, deleteSwipeFile } = useSwipeFiles();
  
  // States
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  
  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [quickViewFile, setQuickViewFile] = useState<SwipeFile | null>(null);

  // Filter swipe files
  const filteredFiles = useMemo(() => {
    return swipeFiles.filter(file => {
      const matchesSearch = 
        file.headline?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        file.primary_text?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        file.competitor_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        file.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesPlatform = platformFilter === 'all' || file.platform === platformFilter;
      const matchesTier = tierFilter === 'all' || file.performance_tier === tierFilter;
      const matchesFavorites = !showFavoritesOnly || file.is_favorite;
      
      return matchesSearch && matchesPlatform && matchesTier && matchesFavorites;
    });
  }, [swipeFiles, searchQuery, platformFilter, tierFilter, showFavoritesOnly]);

  const handleDelete = (id: string) => {
    if (confirm('Bạn có chắc muốn xóa swipe file này?')) {
      deleteSwipeFile(id);
    }
  };

  const handleUseAsInspiration = (file: SwipeFile) => {
    if (onSelectForInspiration) {
      onSelectForInspiration(file);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header & Stats */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Swipe File Library
          </h3>
          <p className="text-sm text-muted-foreground">
            {swipeFiles.length} ads • {swipeFiles.filter(f => f.is_favorite).length} yêu thích
          </p>
        </div>
        
        <Button onClick={() => setAddDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Thêm Swipe File
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo headline, nội dung, tag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <Select value={platformFilter} onValueChange={setPlatformFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Platform" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả platform</SelectItem>
            {AD_PLATFORMS.map(platform => (
              <SelectItem key={platform.value} value={platform.value}>
                {platform.icon} {platform.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select value={tierFilter} onValueChange={setTierFilter}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Tier" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả tier</SelectItem>
            {PERFORMANCE_TIERS.map(tier => (
              <SelectItem key={tier.value} value={tier.value}>
                {tier.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Button
          variant={showFavoritesOnly ? "default" : "outline"}
          size="sm"
          onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
          className="gap-1"
        >
          <Star className={cn("h-4 w-4", showFavoritesOnly && "fill-current")} />
          Yêu thích
        </Button>
        
        <div className="flex items-center border rounded-md">
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('grid')}
            className="rounded-r-none"
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
            className="rounded-l-none"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {isLoading ? (
          <div className={cn(
            viewMode === 'grid'
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
              : "space-y-3"
          )}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))}
          </div>
        ) : filteredFiles.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-12 text-center"
          >
            <div className="p-4 rounded-full bg-muted mb-4">
              <Sparkles className="h-8 w-8 text-muted-foreground" />
            </div>
            <h4 className="font-semibold mb-2">
              {swipeFiles.length === 0 ? 'Chưa có swipe file nào' : 'Không tìm thấy kết quả'}
            </h4>
            <p className="text-sm text-muted-foreground mb-4 max-w-md">
              {swipeFiles.length === 0
                ? 'Bắt đầu thu thập các ads hiệu quả để làm nguồn cảm hứng'
                : 'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm'}
            </p>
            {swipeFiles.length === 0 && (
              <Button onClick={() => setAddDialogOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Thêm Swipe File đầu tiên
              </Button>
            )}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={cn(
              viewMode === 'grid'
                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                : "space-y-3"
            )}
          >
            {filteredFiles.map((file, index) => (
              <motion.div
                key={file.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <SwipeFileCard
                  file={file}
                  viewMode={viewMode}
                  onView={() => setQuickViewFile(file)}
                  onToggleFavorite={() => toggleFavorite(file.id)}
                  onDelete={() => handleDelete(file.id)}
                  onUseAsInspiration={onSelectForInspiration ? () => handleUseAsInspiration(file) : undefined}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dialogs */}
      <AddSwipeFileDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
      />
      
      <SwipeFileQuickView
        file={quickViewFile}
        onClose={() => setQuickViewFile(null)}
        onUseAsInspiration={onSelectForInspiration ? () => {
          if (quickViewFile) {
            handleUseAsInspiration(quickViewFile);
            setQuickViewFile(null);
          }
        } : undefined}
      />
    </div>
  );
}
