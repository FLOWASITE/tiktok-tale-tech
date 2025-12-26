import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  FileText, 
  Video, 
  Image, 
  ExternalLink,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

interface ContentLink {
  id: string;
  contentId: string;
  contentType: 'multichannel' | 'script' | 'carousel';
  contentTitle: string | null;
  contentStatus: string | null;
  createdAt: string;
}

interface TopicLinkedContentsProps {
  topicHistoryId: string;
  onViewContent?: (contentId: string, contentType: string) => void;
}

const contentTypeConfig = {
  multichannel: {
    label: 'Multi-channel',
    icon: FileText,
    color: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  },
  script: {
    label: 'Script',
    icon: Video,
    color: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  },
  carousel: {
    label: 'Carousel',
    icon: Image,
    color: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  },
};

const statusColors: Record<string, string> = {
  draft: 'bg-slate-500/10 text-slate-600',
  pending_review: 'bg-amber-500/10 text-amber-600',
  approved: 'bg-emerald-500/10 text-emerald-600',
  published: 'bg-emerald-600/10 text-emerald-700',
  rejected: 'bg-red-500/10 text-red-600',
};

export function TopicLinkedContents({ topicHistoryId, onViewContent }: TopicLinkedContentsProps) {
  const [links, setLinks] = useState<ContentLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    async function fetchLinks() {
      try {
        const { data, error } = await supabase
          .from('topic_content_links')
          .select('*')
          .eq('topic_history_id', topicHistoryId)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        setLinks((data || []).map(item => ({
          id: item.id,
          contentId: item.content_id,
          contentType: item.content_type as 'multichannel' | 'script' | 'carousel',
          contentTitle: item.content_title,
          contentStatus: item.content_status,
          createdAt: item.created_at,
        })));
      } catch (err) {
        console.error('Error fetching topic content links:', err);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchLinks();
  }, [topicHistoryId]);

  if (isLoading || links.length === 0) {
    return null;
  }

  const visibleLinks = isExpanded ? links : links.slice(0, 2);
  const hasMore = links.length > 2;

  return (
    <div className="mt-3 pt-3 border-t border-dashed">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-muted-foreground">
          Nội dung đã tạo ({links.length})
        </span>
        {hasMore && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <>
                Thu gọn <ChevronUp className="h-3 w-3 ml-1" />
              </>
            ) : (
              <>
                Xem thêm <ChevronDown className="h-3 w-3 ml-1" />
              </>
            )}
          </Button>
        )}
      </div>
      
      <div className="space-y-1.5">
        {visibleLinks.map(link => {
          const config = contentTypeConfig[link.contentType];
          const Icon = config.icon;
          
          return (
            <div
              key={link.id}
              className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Badge 
                  variant="outline" 
                  className={cn('shrink-0 text-[10px] px-1.5 py-0', config.color)}
                >
                  <Icon className="h-3 w-3 mr-1" />
                  {config.label}
                </Badge>
                
                <span className="text-xs truncate">
                  {link.contentTitle || 'Chưa có tiêu đề'}
                </span>
              </div>
              
              <div className="flex items-center gap-1.5 shrink-0">
                {link.contentStatus && (
                  <Badge 
                    variant="secondary" 
                    className={cn('text-[10px] px-1.5 py-0', statusColors[link.contentStatus] || '')}
                  >
                    {link.contentStatus === 'draft' ? 'Nháp' : 
                     link.contentStatus === 'pending_review' ? 'Chờ duyệt' :
                     link.contentStatus === 'approved' ? 'Đã duyệt' :
                     link.contentStatus === 'published' ? 'Đã đăng' :
                     link.contentStatus === 'rejected' ? 'Từ chối' : link.contentStatus}
                  </Badge>
                )}
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(link.createdAt), 'dd/MM', { locale: vi })}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      {format(new Date(link.createdAt), 'dd/MM/yyyy HH:mm', { locale: vi })}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                {onViewContent && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => onViewContent(link.contentId, link.contentType)}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Xem nội dung</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
