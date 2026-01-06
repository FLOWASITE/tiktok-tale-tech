import { useState } from 'react';
import { Plus, Building2, ExternalLink, Trash2, Edit2, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useCompetitors } from '@/hooks/useCompetitors';
import { useSwipeFiles } from '@/hooks/useSwipeFiles';
import { AddCompetitorDialog } from './AddCompetitorDialog';
import type { CompetitorProfile } from '@/types/competitor';

interface CompetitorListPanelProps {
  onSelectCompetitor?: (competitor: CompetitorProfile) => void;
}

export function CompetitorListPanel({ onSelectCompetitor }: CompetitorListPanelProps) {
  const { competitors, isLoading, deleteCompetitor } = useCompetitors();
  const { swipeFiles } = useSwipeFiles();
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  // Count swipe files per competitor
  const getSwipeFileCount = (competitorName: string) => {
    return swipeFiles.filter(f => f.competitor_name === competitorName).length;
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Bạn có chắc muốn xóa đối thủ "${name}"?`)) {
      deleteCompetitor(id);
    }
  };

  const openMetaAdLibrary = (competitor: CompetitorProfile) => {
    const searchTerm = encodeURIComponent(competitor.competitor_name);
    window.open(`https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=VN&q=${searchTerm}`, '_blank');
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Đối thủ
            </CardTitle>
            <Button size="sm" variant="ghost" onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {competitors.length === 0 ? (
            <div className="text-center py-4 text-sm text-muted-foreground">
              <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Chưa có đối thủ nào</p>
              <Button
                variant="link"
                size="sm"
                onClick={() => setAddDialogOpen(true)}
                className="mt-1"
              >
                Thêm đối thủ đầu tiên
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {competitors.map(competitor => {
                const swipeCount = getSwipeFileCount(competitor.competitor_name);
                return (
                  <div
                    key={competitor.id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors group"
                  >
                    <div
                      className="flex-1 cursor-pointer"
                      onClick={() => onSelectCompetitor?.(competitor)}
                    >
                      <div className="font-medium text-sm">{competitor.competitor_name}</div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {competitor.industry && (
                          <span>{competitor.industry}</span>
                        )}
                        {swipeCount > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {swipeCount} swipe files
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openMetaAdLibrary(competitor)}>
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Xem Meta Ad Library
                        </DropdownMenuItem>
                        {competitor.website_url && (
                          <DropdownMenuItem asChild>
                            <a href={competitor.website_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Xem website
                            </a>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDelete(competitor.id, competitor.competitor_name)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Xóa
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
      
      <AddCompetitorDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
      />
    </>
  );
}
