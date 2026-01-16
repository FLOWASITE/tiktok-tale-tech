/**
 * PackLinkedSourcesPanel - Display and manage regulation sources linked to an Industry Pack
 */

import { 
  Globe, 
  Play, 
  RefreshCw, 
  CheckCircle2, 
  ExternalLink,
  Loader2,
  Zap,
  AlertCircle,
  Target,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import type { PackRegulationSource } from '@/hooks/usePackRegulationSources';

interface PackLinkedSourcesPanelProps {
  sources: PackRegulationSource[];
  isLoading: boolean;
  isCrawling: boolean;
  isCrawlingAll: boolean;
  crawlingTarget: { mode: 'single'; sourceId: string } | { mode: 'all' } | null;
  getCrawlingSourceName: () => string | null;
  onTriggerCrawl: (options: { source_id?: string; crawl_all?: boolean }) => void;
  onRefresh: () => void;
  isSourceCrawling: (sourceId: string) => boolean;
}

// Source domain badge info
const getSourceBadge = (sourceUrl: string): { label: string; className: string; icon: string } => {
  if (sourceUrl.includes('vbpl.vn')) {
    return { 
      label: 'VBPL', 
      className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
      icon: '⭐'
    };
  }
  if (sourceUrl.includes('luatvietnam.vn')) {
    return { 
      label: 'LuậtVN', 
      className: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30',
      icon: '📘'
    };
  }
  if (sourceUrl.includes('vanban.chinhphu.vn') || sourceUrl.includes('chinhphu.vn')) {
    return { 
      label: 'Chính phủ', 
      className: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
      icon: '🏛️'
    };
  }
  if (sourceUrl.includes('thuvienphapluat.vn')) {
    return { 
      label: 'TVPL', 
      className: 'bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30',
      icon: '📚'
    };
  }
  return { 
    label: 'Khác', 
    className: 'bg-muted text-muted-foreground border-border',
    icon: '🌐'
  };
};

const getJurisdictionFlag = (jurisdiction: string) => {
  const flags: Record<string, string> = {
    'VN': '🇻🇳',
    'US': '🇺🇸',
    'EU': '🇪🇺',
    'SG': '🇸🇬',
    'JP': '🇯🇵',
  };
  return flags[jurisdiction] || '🌐';
};

export function PackLinkedSourcesPanel({
  sources,
  isLoading,
  isCrawling,
  isCrawlingAll,
  crawlingTarget,
  getCrawlingSourceName,
  onTriggerCrawl,
  onRefresh,
  isSourceCrawling,
}: PackLinkedSourcesPanelProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (sources.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Globe className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground text-center mb-2">
            Chưa có nguồn crawl nào được liên kết với Industry Pack này
          </p>
          <p className="text-xs text-muted-foreground text-center">
            Truy cập <a href="/admin/knowledge-graph" className="text-primary hover:underline">
              Knowledge Graph Admin
            </a> để thêm nguồn và chọn Industry Pack làm target
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {sources.length} nguồn crawl được liên kết
          </p>
          {crawlingTarget && (
            <div className="flex items-center gap-2 mt-1 text-sm text-blue-600 dark:text-blue-400">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Đang crawl: <strong>{getCrawlingSourceName()}</strong></span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            Làm mới
          </Button>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => onTriggerCrawl({ crawl_all: true })}
                  disabled={isCrawling || sources.filter(s => s.is_active).length === 0}
                >
                  {isCrawlingAll ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Zap className="h-4 w-4 mr-1" />
                  )}
                  Crawl tất cả
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Crawl tất cả nguồn đang hoạt động</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Sources grid */}
      <div className="grid gap-3">
        {sources.map((source) => {
          const sourceBadge = getSourceBadge(source.source_url);
          const isCrawlingThis = isSourceCrawling(source.id);
          
          return (
            <Card key={source.id} className={!source.is_active ? 'opacity-60' : ''}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-2">
                    {/* Header */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className={sourceBadge.className}>
                        {sourceBadge.icon} {sourceBadge.label}
                      </Badge>
                      <Badge variant="outline" className="font-mono">
                        {getJurisdictionFlag(source.jurisdiction)} {source.jurisdiction}
                      </Badge>
                      {source.is_active ? (
                        <Badge variant="secondary" className="bg-green-500/10 text-green-700 dark:text-green-400">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Hoạt động
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-muted">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Tắt
                        </Badge>
                      )}
                    </div>
                    
                    {/* Name */}
                    <h4 className="font-medium">{source.source_name}</h4>
                    
                    {/* Meta */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                      {source.last_crawled_at && (
                        <span>
                          Crawl lần cuối: {formatDistanceToNow(new Date(source.last_crawled_at), { 
                            addSuffix: true, 
                            locale: vi 
                          })}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Target className="h-3 w-3" />
                        {source.target_industry_pack_ids.length} packs
                      </span>
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="icon"
                            asChild
                          >
                            <a href={source.source_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Mở nguồn</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => onTriggerCrawl({ source_id: source.id })}
                      disabled={isCrawling || !source.is_active}
                    >
                      {isCrawlingThis ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Link to full admin */}
      <p className="text-xs text-muted-foreground text-center pt-2">
        Quản lý nâng cao tại{' '}
        <a href="/admin/knowledge-graph" className="text-primary hover:underline">
          Knowledge Graph Admin →
        </a>
      </p>
    </div>
  );
}
