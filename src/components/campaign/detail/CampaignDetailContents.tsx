import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  FileText, 
  Calendar, 
  Unlink,
  ExternalLink,
  Layers,
  Video,
  Images,
  Loader2
} from 'lucide-react';
import { CampaignContent, CampaignContentType } from '@/types/campaign';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useCampaignDetail } from '@/hooks/useCampaigns';
import { useContentDetails } from '@/hooks/useContentDetails';
import { LinkContentDialog } from '@/components/campaign/content/LinkContentDialog';
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

interface CampaignDetailContentsProps {
  campaignId: string;
  contents: CampaignContent[];
}

const CONTENT_TYPE_CONFIG: Record<CampaignContentType, { label: string; icon: React.ReactNode; color: string }> = {
  multichannel: { 
    label: 'Multichannel', 
    icon: <Layers className="h-4 w-4" />,
    color: 'bg-blue-500/10 text-blue-600'
  },
  script: { 
    label: 'Script', 
    icon: <Video className="h-4 w-4" />,
    color: 'bg-purple-500/10 text-purple-600'
  },
  carousel: { 
    label: 'Carousel', 
    icon: <Images className="h-4 w-4" />,
    color: 'bg-orange-500/10 text-orange-600'
  },
};

export function CampaignDetailContents({ campaignId, contents }: CampaignDetailContentsProps) {
  const { unlinkContent } = useCampaignDetail(campaignId);
  const { data: contentDetailsMap, isLoading: isLoadingDetails } = useContentDetails(contents);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [unlinkId, setUnlinkId] = useState<string | null>(null);

  const handleUnlink = async () => {
    if (unlinkId) {
      await unlinkContent?.(unlinkId);
      setUnlinkId(null);
    }
  };

  const sortedContents = [...contents].sort((a, b) => {
    if (!a.planned_publish_date) return 1;
    if (!b.planned_publish_date) return -1;
    return new Date(a.planned_publish_date).getTime() - new Date(b.planned_publish_date).getTime();
  });

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Nội dung liên kết ({contents.length})
          </CardTitle>
          <Button onClick={() => setIsDialogOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Liên kết nội dung
          </Button>
        </CardHeader>
        <CardContent>
          {sortedContents.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground font-medium mb-2">Chưa có nội dung nào được liên kết</p>
              <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
                💡 <strong>Mẹo:</strong> Liên kết nội dung đã tạo (bài viết đa kênh, kịch bản, carousel) 
                vào chiến dịch để quản lý tập trung và theo dõi tiến độ.
              </p>
              <Button variant="outline" onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Liên kết nội dung đầu tiên
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedContents.map((content) => {
                const typeConfig = CONTENT_TYPE_CONFIG[content.content_type];
                const details = contentDetailsMap?.get(content.content_id);
                
                return (
                  <div 
                    key={content.id}
                    className="flex items-start gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className={cn("p-2 rounded-lg", typeConfig.color)}>
                      {typeConfig.icon}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          {typeConfig.label}
                        </Badge>
                        {isLoadingDetails ? (
                          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                        ) : details?.status && (
                          <Badge 
                            variant="secondary" 
                            className={cn(
                              "text-xs",
                              details.status === 'published' && "bg-green-500/10 text-green-600",
                              details.status === 'draft' && "bg-yellow-500/10 text-yellow-600"
                            )}
                          >
                            {details.status === 'published' ? 'Đã xuất bản' : 
                             details.status === 'draft' ? 'Bản nháp' : details.status}
                          </Badge>
                        )}
                      </div>
                      
                      <p className="font-medium text-sm truncate">
                        {isLoadingDetails ? (
                          <span className="text-muted-foreground">Đang tải...</span>
                        ) : (
                          details?.title || `#${content.content_id.slice(0, 8)}`
                        )}
                      </p>
                      
                      {content.notes && (
                        <p className="text-sm text-muted-foreground truncate mt-1">
                          {content.notes}
                        </p>
                      )}
                      
                      {content.planned_publish_date && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          Dự kiến: {format(new Date(content.planned_publish_date), 'dd/MM/yyyy', { locale: vi })}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 shrink-0">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-8 w-8"
                        asChild
                      >
                        <a 
                          href={`/${content.content_type === 'multichannel' ? 'multichannel' : content.content_type === 'script' ? 'scripts' : 'carousel'}?id=${content.content_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                      
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setUnlinkId(content.id)}
                      >
                        <Unlink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Link Content Dialog */}
      <LinkContentDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        campaignId={campaignId}
      />

      {/* Unlink Confirmation */}
      <AlertDialog open={!!unlinkId} onOpenChange={() => setUnlinkId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hủy liên kết nội dung?</AlertDialogTitle>
            <AlertDialogDescription>
              Nội dung sẽ được gỡ khỏi chiến dịch này. Bạn có thể liên kết lại sau.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUnlink}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Hủy liên kết
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
