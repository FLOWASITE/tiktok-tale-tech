import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Video, Download, Trash2, ExternalLink, Clock, AlertCircle } from 'lucide-react';
import { VideoGeneration, VIDEO_PROVIDER_CONFIG, VideoGenerationStatus } from '@/types/videoGeneration';
import { useVideoGeneration } from '@/hooks/useVideoGeneration';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { MediaRetentionNotice } from '@/components/MediaRetentionNotice';

interface VideoGalleryProps {
  scriptId?: string;
  storyboardId?: string;
  sceneNumber?: number;
}

const STATUS_CONFIG: Record<VideoGenerationStatus, {
  label: string;
  variant: 'default' | 'secondary' | 'outline' | 'destructive';
  icon: React.ReactNode;
}> = {
  pending: {
    label: 'Đang chờ',
    variant: 'secondary',
    icon: <Clock className="h-3 w-3" />,
  },
  processing: {
    label: 'Đang tạo',
    variant: 'outline',
    icon: <Loader2 className="h-3 w-3 animate-spin" />,
  },
  completed: {
    label: 'Hoàn thành',
    variant: 'default',
    icon: <Video className="h-3 w-3" />,
  },
  failed: {
    label: 'Lỗi',
    variant: 'destructive',
    icon: <AlertCircle className="h-3 w-3" />,
  },
};

export function VideoGallery({ scriptId, storyboardId, sceneNumber }: VideoGalleryProps) {
  const { generations, loading, fetchGenerations, deleteGeneration, pollJobStatus } = useVideoGeneration();
  const [pollingIds, setPollingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchGenerations(scriptId);
  }, [fetchGenerations, scriptId]);

  // Poll for processing jobs
  useEffect(() => {
    const processingJobs = generations.filter(g => 
      g.status === 'processing' || g.status === 'pending'
    );

    processingJobs.forEach(job => {
      if (!pollingIds.has(job.id)) {
        setPollingIds(prev => new Set(prev).add(job.id));
        
        const poll = async () => {
          const updated = await pollJobStatus(job.id);
          if (updated?.status === 'completed' || updated?.status === 'failed') {
            setPollingIds(prev => {
              const next = new Set(prev);
              next.delete(job.id);
              return next;
            });
          } else {
            // Continue polling every 5 seconds
            setTimeout(poll, 5000);
          }
        };
        
        setTimeout(poll, 5000);
      }
    });
  }, [generations, pollingIds, pollJobStatus]);

  // Filter by scene if specified
  const filteredGenerations = generations.filter(g => {
    if (storyboardId && sceneNumber !== undefined) {
      return g.storyboard_id === storyboardId && g.scene_number === sceneNumber;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (filteredGenerations.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Video className="h-10 w-10 mx-auto mb-3 opacity-50" />
        <p className="text-sm">Chưa có video nào được tạo</p>
        <p className="text-xs mt-1">Sử dụng Video Generator để tạo video mới</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px]">
      <div className="space-y-3 pr-4">
        {filteredGenerations.map((generation) => (
          <VideoCard
            key={generation.id}
            generation={generation}
            onDelete={() => deleteGeneration(generation.id)}
          />
        ))}
      </div>
    </ScrollArea>
  );
}

interface VideoCardProps {
  generation: VideoGeneration;
  onDelete: () => void;
}

function VideoCard({ generation, onDelete }: VideoCardProps) {
  const [deleting, setDeleting] = useState(false);
  const statusConfig = STATUS_CONFIG[generation.status];
  const providerConfig = VIDEO_PROVIDER_CONFIG[generation.provider];

  const handleDelete = async () => {
    setDeleting(true);
    await onDelete();
    setDeleting(false);
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2 pt-3 px-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant={statusConfig.variant} className="text-[10px] gap-1">
                {statusConfig.icon}
                {statusConfig.label}
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                {providerConfig.icon} {providerConfig.label}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2">
              {generation.prompt}
            </p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="px-3 pb-3 pt-0">
        {/* Video Preview */}
        {generation.status === 'completed' && generation.video_url && (
          <div className="relative aspect-video bg-muted rounded-lg overflow-hidden mb-2">
            <video
              src={generation.video_url}
              controls
              className="w-full h-full object-cover"
              poster={generation.thumbnail_url}
            />
          </div>
        )}

        {/* Processing indicator */}
        {generation.status === 'processing' && (
          <div className="aspect-video bg-muted rounded-lg flex items-center justify-center mb-2">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">Đang tạo video...</p>
              {generation.progress > 0 && (
                <p className="text-xs font-medium">{generation.progress}%</p>
              )}
            </div>
          </div>
        )}

        {/* Error message */}
        {generation.status === 'failed' && generation.error_message && (
          <div className="p-2 bg-destructive/10 rounded-lg mb-2">
            <p className="text-xs text-destructive">{generation.error_message}</p>
          </div>
        )}

        {/* Metadata & Actions */}
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>{generation.duration_seconds}s</span>
            <span>•</span>
            <span>{generation.aspect_ratio}</span>
            <span>•</span>
            <span>{generation.resolution}</span>
            {generation.generation_time_ms && (
              <>
                <span>•</span>
                <span>{(generation.generation_time_ms / 1000).toFixed(1)}s</span>
              </>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            {generation.status === 'completed' && generation.video_url && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  asChild
                >
                  <a href={generation.video_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  asChild
                >
                  <a href={generation.video_url} download>
                    <Download className="h-3 w-3" />
                  </a>
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-destructive hover:text-destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Trash2 className="h-3 w-3" />
              )}
            </Button>
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground mt-1">
          {formatDistanceToNow(new Date(generation.created_at), {
            addSuffix: true,
            locale: vi,
          })}
        </p>
      </CardContent>
    </Card>
  );
}
