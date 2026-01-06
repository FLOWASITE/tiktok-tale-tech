import { memo } from 'react';
import { Star, ExternalLink, Trash2, Copy, Eye, MoreHorizontal } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AD_PLATFORMS } from '@/types/adCopy';
import { PERFORMANCE_TIERS } from '@/types/swipeFile';
import type { SwipeFile } from '@/types/swipeFile';
import { cn } from '@/lib/utils';

interface SwipeFileCardProps {
  file: SwipeFile;
  viewMode: 'grid' | 'list';
  onView: () => void;
  onToggleFavorite: () => void;
  onDelete: () => void;
  onUseAsInspiration?: () => void;
}

export const SwipeFileCard = memo(function SwipeFileCard({
  file,
  viewMode,
  onView,
  onToggleFavorite,
  onDelete,
  onUseAsInspiration,
}: SwipeFileCardProps) {
  const platform = AD_PLATFORMS.find(p => p.value === file.platform);
  const tier = PERFORMANCE_TIERS.find(t => t.value === file.performance_tier);

  if (viewMode === 'list') {
    return (
      <Card className="group hover:shadow-md transition-all">
        <CardContent className="p-4 flex items-center gap-4">
          {/* Thumbnail */}
          {file.screenshot_url && (
            <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
              <img
                src={file.screenshot_url}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
          )}
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{platform?.icon}</span>
              <span className="font-medium truncate">{file.headline || 'Không có headline'}</span>
              {file.is_favorite && <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />}
            </div>
            <p className="text-sm text-muted-foreground line-clamp-1">{file.primary_text}</p>
            <div className="flex items-center gap-2 mt-2">
              {tier && (
                <Badge variant="outline" className={cn("text-xs", tier.color)}>
                  {tier.label}
                </Badge>
              )}
              {file.competitor_name && (
                <Badge variant="secondary" className="text-xs">
                  {file.competitor_name}
                </Badge>
              )}
              {file.tags?.slice(0, 2).map(tag => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" onClick={onView}>
              <Eye className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onToggleFavorite}>
              <Star className={cn("h-4 w-4", file.is_favorite && "fill-yellow-400 text-yellow-400")} />
            </Button>
            {onUseAsInspiration && (
              <Button variant="ghost" size="icon" onClick={onUseAsInspiration}>
                <Copy className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={onDelete} className="text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Grid view
  return (
    <Card className="group overflow-hidden hover:shadow-lg transition-all">
      {/* Image/Thumbnail */}
      <div className="relative aspect-[4/3] bg-muted">
        {file.screenshot_url ? (
          <img
            src={file.screenshot_url}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">
            {platform?.icon || '📄'}
          </div>
        )}
        
        {/* Overlay badges */}
        <div className="absolute top-2 left-2 flex items-center gap-1">
          {tier && (
            <Badge className={cn("text-xs font-semibold", tier.bgColor, tier.color)}>
              {tier.label}
            </Badge>
          )}
        </div>
        
        <div className="absolute top-2 right-2 flex items-center gap-1">
          <Button
            variant="secondary"
            size="icon"
            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={onToggleFavorite}
          >
            <Star className={cn("h-4 w-4", file.is_favorite && "fill-yellow-400 text-yellow-400")} />
          </Button>
        </div>
        
        {/* View overlay on hover */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <Button variant="secondary" size="sm" onClick={onView}>
            <Eye className="h-4 w-4 mr-1" />
            Xem
          </Button>
          {onUseAsInspiration && (
            <Button variant="default" size="sm" onClick={onUseAsInspiration}>
              <Copy className="h-4 w-4 mr-1" />
              Dùng
            </Button>
          )}
        </div>
      </div>
      
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span>{platform?.icon}</span>
              <span className="text-sm font-medium truncate">
                {file.headline || 'Không có headline'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2">
              {file.primary_text || 'Không có nội dung'}
            </p>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onView}>
                <Eye className="h-4 w-4 mr-2" />
                Xem chi tiết
              </DropdownMenuItem>
              {file.source_url && (
                <DropdownMenuItem asChild>
                  <a href={file.source_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Xem nguồn
                  </a>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Xóa
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {/* Tags */}
        {file.tags && file.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {file.tags.slice(0, 3).map(tag => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {file.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{file.tags.length - 3}
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
});
