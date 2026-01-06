import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Star, ExternalLink, Copy, X } from 'lucide-react';
import { AD_PLATFORMS } from '@/types/adCopy';
import { PERFORMANCE_TIERS, SWIPE_FILE_TAGS } from '@/types/swipeFile';
import type { SwipeFile } from '@/types/swipeFile';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { toast } from 'sonner';

interface SwipeFileQuickViewProps {
  file: SwipeFile | null;
  onClose: () => void;
  onUseAsInspiration?: () => void;
}

export function SwipeFileQuickView({ file, onClose, onUseAsInspiration }: SwipeFileQuickViewProps) {
  if (!file) return null;
  
  const platform = AD_PLATFORMS.find(p => p.value === file.platform);
  const tier = PERFORMANCE_TIERS.find(t => t.value === file.performance_tier);

  const copyToClipboard = (text: string | null, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success(`Đã copy ${label}`);
  };

  return (
    <Dialog open={!!file} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">{platform?.icon}</span>
            {platform?.label} Swipe File
            {file.is_favorite && <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />}
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Left: Image */}
            <div className="space-y-4">
              {file.screenshot_url ? (
                <div className="rounded-lg overflow-hidden border bg-muted aspect-[4/3]">
                  <img
                    src={file.screenshot_url}
                    alt="Ad screenshot"
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                <div className="rounded-lg border bg-muted aspect-[4/3] flex items-center justify-center text-6xl">
                  {platform?.icon || '📄'}
                </div>
              )}
              
              {/* Metadata */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {tier && (
                    <Badge className={cn(tier.bgColor, tier.color)}>
                      {tier.label} - {tier.description}
                    </Badge>
                  )}
                  {file.competitor_name && (
                    <Badge variant="secondary">
                      Đối thủ: {file.competitor_name}
                    </Badge>
                  )}
                </div>
                
                <p className="text-sm text-muted-foreground">
                  Thêm vào {format(new Date(file.created_at), 'dd/MM/yyyy HH:mm', { locale: vi })}
                </p>
                
                {file.source_url && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={file.source_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Xem nguồn gốc
                    </a>
                  </Button>
                )}
              </div>
            </div>
            
            {/* Right: Content */}
            <div className="space-y-4">
              {/* Headline */}
              {file.headline && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-muted-foreground">Headline</label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(file.headline, 'headline')}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="font-semibold">{file.headline}</p>
                </div>
              )}
              
              <Separator />
              
              {/* Primary Text */}
              {file.primary_text && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-muted-foreground">Primary Text</label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(file.primary_text, 'primary text')}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{file.primary_text}</p>
                </div>
              )}
              
              {/* Description */}
              {file.description && (
                <>
                  <Separator />
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-muted-foreground">Description</label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(file.description, 'description')}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="text-sm">{file.description}</p>
                  </div>
                </>
              )}
              
              {/* CTA */}
              {file.cta_button && (
                <>
                  <Separator />
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-muted-foreground">CTA Button</label>
                    <Badge variant="outline">{file.cta_button}</Badge>
                  </div>
                </>
              )}
              
              {/* Tags */}
              {file.tags && file.tags.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Tags & Techniques</label>
                    <div className="flex flex-wrap gap-1">
                      {file.tags.map(tagValue => {
                        const tag = SWIPE_FILE_TAGS.find(t => t.value === tagValue);
                        return (
                          <Badge key={tagValue} variant="secondary">
                            {tag?.label || tagValue}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
              
              {/* Notes */}
              {file.notes && (
                <>
                  <Separator />
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-muted-foreground">Ghi chú</label>
                    <p className="text-sm text-muted-foreground italic">{file.notes}</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </ScrollArea>
        
        {/* Footer Actions */}
        {onUseAsInspiration && (
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Đóng
            </Button>
            <Button onClick={onUseAsInspiration} className="gap-2">
              <Copy className="h-4 w-4" />
              Dùng làm cảm hứng
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
