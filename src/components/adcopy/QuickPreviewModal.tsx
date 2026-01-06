import { memo } from 'react';
import { X, ExternalLink, Target, Layers, Clock, Megaphone } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { StatusTimeline } from './StatusTimeline';
import { 
  type AdCopy,
  type AdCopyVariation,
  getPlatformConfig, 
  getObjectiveConfig,
  getFunnelStageConfig,
  getPlatformLabel,
  CTA_BUTTONS
} from '@/types/adCopy';

interface QuickPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  adCopy: AdCopy | null;
  onViewFull: () => void;
}

export const QuickPreviewModal = memo(function QuickPreviewModal({
  open,
  onOpenChange,
  adCopy,
  onViewFull,
}: QuickPreviewModalProps) {
  if (!adCopy) return null;

  const platformConfig = getPlatformConfig(adCopy.platform);
  const objectiveConfig = getObjectiveConfig(adCopy.objective);
  const funnelConfig = getFunnelStageConfig(adCopy.funnel_stage);
  const firstVariation = adCopy.variations?.[0];

  const handleViewFull = () => {
    onOpenChange(false);
    onViewFull();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-4 pb-3 border-b bg-gradient-to-r from-primary/5 via-transparent to-accent/5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 shrink-0">
                <span className="text-xl">{platformConfig.icon}</span>
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base font-semibold truncate">
                  {adCopy.title}
                </DialogTitle>
                <Badge variant="secondary" className="text-xs mt-1">
                  {getPlatformLabel(adCopy.platform)}
                </Badge>
              </div>
            </div>
          </div>
          
          {/* Status Timeline */}
          <div className="mt-3 pt-3 border-t border-border/50">
            <StatusTimeline currentStatus={adCopy.status} />
          </div>
        </DialogHeader>

        {/* Content */}
        <ScrollArea className="max-h-[400px]">
          <div className="p-4 space-y-4">
            {/* Topic */}
            <div>
              <p className="text-xs text-muted-foreground mb-1">Chủ đề</p>
              <p className="text-sm">{adCopy.topic}</p>
            </div>

            {/* Meta badges */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="gap-1 text-xs">
                <Target className="h-3 w-3" />
                {objectiveConfig.label}
              </Badge>
              <Badge variant="outline" className={cn("gap-1 text-xs", funnelConfig.color.replace('bg-', 'text-'))}>
                <Layers className="h-3 w-3" />
                {funnelConfig.label}
              </Badge>
              {adCopy.campaign && (
                <Badge variant="outline" className="gap-1 text-xs">
                  <Megaphone className="h-3 w-3" />
                  {adCopy.campaign.name}
                </Badge>
              )}
              <Badge variant="outline" className="gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {format(new Date(adCopy.created_at), 'dd/MM/yyyy', { locale: vi })}
              </Badge>
            </div>

            {/* First Variation Preview */}
            {firstVariation && (
              <div className="space-y-3 p-3 rounded-lg bg-muted/50 border border-border">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">
                    Variation {firstVariation.variation_label}
                  </p>
                  {adCopy.variations && adCopy.variations.length > 1 && (
                    <Badge variant="secondary" className="text-xs">
                      +{adCopy.variations.length - 1} khác
                    </Badge>
                  )}
                </div>

                {/* Primary Text */}
                {firstVariation.primary_text && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Primary Text</p>
                    <p className="text-sm line-clamp-3">{firstVariation.primary_text}</p>
                  </div>
                )}

                {/* Headline */}
                {firstVariation.headline && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Headline</p>
                    <p className="text-sm font-medium">{firstVariation.headline}</p>
                  </div>
                )}

                {/* Headlines for Google RSA */}
                {firstVariation.headlines && firstVariation.headlines.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Headlines ({firstVariation.headlines.length})</p>
                    <div className="space-y-1">
                      {firstVariation.headlines.slice(0, 3).map((h, i) => (
                        <p key={i} className="text-sm">{i + 1}. {h}</p>
                      ))}
                      {firstVariation.headlines.length > 3 && (
                        <p className="text-xs text-muted-foreground">
                          +{firstVariation.headlines.length - 3} nữa...
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* CTA */}
                {firstVariation.cta_button && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">CTA</p>
                    <Badge variant="outline" className="text-xs">
                      {CTA_BUTTONS.find(c => c.value === firstVariation.cta_button)?.label || firstVariation.cta_button}
                    </Badge>
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-4 border-t bg-muted/30 flex justify-between items-center">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
          <Button size="sm" onClick={handleViewFull} className="gap-2">
            <ExternalLink className="h-4 w-4" />
            Xem đầy đủ
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
});
