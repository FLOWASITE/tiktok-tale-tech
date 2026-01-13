import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
  FileText,
  RefreshCw,
  Eye,
  Pencil,
  Trash2,
  Clock,
  Link,
  ChevronUp,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { cn } from '@/lib/utils';
import type { CrawledNode } from './CrawledNodeCard';
import { getJurisdictionFlag } from './CrawledNodeCard';

interface CrawledNodeMobileCardProps {
  node: CrawledNode;
  isReparsing: boolean;
  onReparse: (nodeId: string) => void;
  onView: (node: CrawledNode) => void;
  onEdit: (node: CrawledNode) => void;
  onDelete: (node: CrawledNode) => void;
  getSourceName: (sourceId: string | null) => string;
}

const getCategoryGradient = (category?: string) => {
  switch (category) {
    case 'tax':
      return 'from-blue-500 to-indigo-500';
    case 'labor':
      return 'from-green-500 to-emerald-500';
    case 'business':
      return 'from-purple-500 to-violet-500';
    case 'insurance':
      return 'from-orange-500 to-amber-500';
    default:
      return 'from-gray-500 to-slate-500';
  }
};

const getQualityColor = (score: number | null | undefined) => {
  if (!score) return 'from-gray-400 to-gray-500';
  if (score >= 70) return 'from-emerald-400 to-emerald-600';
  if (score >= 50) return 'from-amber-400 to-amber-600';
  if (score >= 30) return 'from-orange-400 to-orange-600';
  return 'from-red-400 to-red-600';
};

const getParseStatusDisplay = (status: string | null | undefined) => {
  switch (status) {
    case 'parsed':
      return { icon: CheckCircle2, text: 'Đã parse', color: 'text-emerald-600' };
    case 'parsing':
      return { icon: Loader2, text: 'Đang parse', color: 'text-blue-600' };
    case 'failed':
      return { icon: AlertCircle, text: 'Lỗi', color: 'text-red-600' };
    default:
      return { icon: Clock, text: 'Chờ', color: 'text-muted-foreground' };
  }
};

export const CrawledNodeMobileCard: React.FC<CrawledNodeMobileCardProps> = ({
  node,
  isReparsing,
  onReparse,
  onView,
  onEdit,
  onDelete,
  getSourceName,
}) => {
  // Extract data from node structure
  const category = node.properties?.category;
  const sourceName = getSourceName(node.source_id);
  const parseStatus = getParseStatusDisplay(node.parse_status);
  const ParseIcon = parseStatus.icon;
  const title = node.display_name?.vi || node.display_name?.en || node.node_key;
  // Handle description: could be object {vi, en} or direct string
  const rawDescription = node.description;
  const description = typeof rawDescription === 'string' 
    ? rawDescription 
    : (rawDescription?.vi || rawDescription?.en || null);
  const jurisdiction = node.properties?.jurisdiction;

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <div className="relative overflow-hidden rounded-xl border bg-card shadow-sm active:scale-[0.98] transition-transform cursor-pointer">
          {/* Gradient bar */}
          <div className={cn(
            'h-1.5 w-full bg-gradient-to-r',
            getCategoryGradient(category as string | undefined)
          )} />
          
          <div className="p-3">
            {/* Header row */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base shrink-0">
                    {getJurisdictionFlag(jurisdiction as string | undefined)}
                  </span>
                  <h3 className="font-medium text-sm line-clamp-2 leading-tight">
                    {title}
                  </h3>
                </div>
                
                {/* Badges row */}
                <div className="flex items-center gap-1.5 flex-wrap mt-2">
                  {category && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {String(category)}
                    </Badge>
                  )}
                  {sourceName && sourceName !== 'Unknown' && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {sourceName}
                    </Badge>
                  )}
                  <span className={cn('flex items-center gap-0.5 text-[10px]', parseStatus.color)}>
                    <ParseIcon className={cn('h-3 w-3', isReparsing && 'animate-spin')} />
                    {isReparsing ? 'Đang parse...' : parseStatus.text}
                  </span>
                </div>
              </div>
              
              {/* Quality score badge */}
              {node.content_quality_score !== null && node.content_quality_score !== undefined && (
                <div className={cn(
                  'shrink-0 w-9 h-9 rounded-lg bg-gradient-to-br flex items-center justify-center',
                  getQualityColor(node.content_quality_score)
                )}>
                  <span className="text-white font-bold text-xs">
                    {Math.round(node.content_quality_score)}
                  </span>
                </div>
              )}
            </div>
            
            {/* Swipe hint */}
            <div className="flex items-center justify-center gap-1 mt-3 text-[10px] text-muted-foreground animate-pulse">
              <ChevronUp className="h-3 w-3" />
              Vuốt lên để xem
            </div>
          </div>
        </div>
      </DrawerTrigger>
      
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="pb-2">
          <div className="flex items-start gap-3">
            <div className={cn(
              'shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center',
              getQualityColor(node.content_quality_score)
            )}>
              <span className="text-white font-bold text-sm">
                {node.content_quality_score ? Math.round(node.content_quality_score) : '?'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <DrawerTitle className="text-left text-base leading-tight line-clamp-2">
                {title}
              </DrawerTitle>
              <div className="flex items-center gap-1.5 flex-wrap mt-2">
                {category && (
                  <Badge variant="secondary" className="text-xs">
                    {String(category)}
                  </Badge>
                )}
                {sourceName && sourceName !== 'Unknown' && (
                  <Badge variant="outline" className="text-xs">
                    {sourceName}
                  </Badge>
                )}
                <span className={cn('flex items-center gap-1 text-xs', parseStatus.color)}>
                  <ParseIcon className={cn('h-3.5 w-3.5', isReparsing && 'animate-spin')} />
                  {isReparsing ? 'Đang parse...' : parseStatus.text}
                </span>
              </div>
            </div>
          </div>
        </DrawerHeader>
        
        <div className="px-4 pb-4 space-y-4 overflow-y-auto">
          {/* Metadata grid */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-muted/50 p-3">
              <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                <Clock className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">Thời gian</span>
              </div>
              <p className="text-sm">
                {formatDistanceToNow(new Date(node.created_at), {
                  addSuffix: true,
                  locale: vi,
                })}
              </p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                <Link className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">Nguồn</span>
              </div>
              <p className="text-sm truncate">
                {sourceName || 'N/A'}
              </p>
            </div>
          </div>
          
          {/* Description */}
          {description && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                Mô tả
              </h4>
              <p className="text-sm text-foreground/80 line-clamp-3">
                {description}
              </p>
            </div>
          )}
          
          {/* Node key */}
          <div>
            <h4 className="text-xs font-medium text-muted-foreground mb-1.5">
              🔑 Node Key
            </h4>
            <p className="text-xs font-mono bg-muted/50 p-2 rounded break-all">
              {node.node_key}
            </p>
          </div>
        </div>
        
        <DrawerFooter className="pt-2 pb-6">
          <div className="grid grid-cols-4 gap-2">
            <DrawerClose asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onReparse(node.id)}
                disabled={isReparsing}
                className="flex-col h-auto py-2 gap-1"
              >
                <RefreshCw className={cn('h-4 w-4', isReparsing && 'animate-spin')} />
                <span className="text-[10px]">Parse</span>
              </Button>
            </DrawerClose>
            
            {node.full_text && (
              <DrawerClose asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(node)}
                  className="flex-col h-auto py-2 gap-1"
                >
                  <Pencil className="h-4 w-4" />
                  <span className="text-[10px]">Sửa</span>
                </Button>
              </DrawerClose>
            )}
            
            <DrawerClose asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onView(node)}
                className="flex-col h-auto py-2 gap-1"
              >
                <Eye className="h-4 w-4" />
                <span className="text-[10px]">Xem</span>
              </Button>
            </DrawerClose>
            
            <DrawerClose asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDelete(node)}
                className="flex-col h-auto py-2 gap-1 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
                <span className="text-[10px]">Xóa</span>
              </Button>
            </DrawerClose>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};
