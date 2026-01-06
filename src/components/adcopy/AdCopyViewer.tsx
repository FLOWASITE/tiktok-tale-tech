import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Check, X, Copy, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAdCopies } from '@/hooks/useAdCopies';
import { 
  type AdCopy, 
  type AdCopyVariation,
  getPlatformConfig, 
  getObjectiveConfig,
  getFunnelStageConfig,
  getStatusConfig,
  getCharLimits,
  CTA_BUTTONS
} from '@/types/adCopy';

interface AdCopyViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  adCopy: AdCopy;
}

export function AdCopyViewer({ open, onOpenChange, adCopy }: AdCopyViewerProps) {
  const { toggleVariationApproval } = useAdCopies();
  const [activeTab, setActiveTab] = useState(adCopy.variations?.[0]?.variation_label || 'A');
  
  const platformConfig = getPlatformConfig(adCopy.platform);
  const objectiveConfig = getObjectiveConfig(adCopy.objective);
  const funnelConfig = getFunnelStageConfig(adCopy.funnel_stage);
  const statusConfig = getStatusConfig(adCopy.status);
  const charLimits = getCharLimits(adCopy.platform);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Đã copy ${label}`);
  };

  const handleApprove = (variation: AdCopyVariation) => {
    toggleVariationApproval({ variationId: variation.id, isApproved: !variation.is_approved });
  };

  const renderCharCounter = (text: string | null, field: 'primary_text' | 'headline' | 'description') => {
    const limit = charLimits[field];
    if (!limit) return null;
    
    const count = text?.length || 0;
    const max = limit.max;
    const ideal = 'ideal' in limit ? limit.ideal : max;
    const percentage = (count / max) * 100;
    
    let color = 'text-green-500';
    let bgColor = 'bg-green-500';
    if (count > max) {
      color = 'text-destructive';
      bgColor = 'bg-destructive';
    } else if (ideal && count > ideal) {
      color = 'text-yellow-500';
      bgColor = 'bg-yellow-500';
    }

    return (
      <div className="flex items-center gap-2 mt-1">
        <Progress value={Math.min(percentage, 100)} className={cn("h-1 flex-1", `[&>div]:${bgColor}`)} />
        <span className={cn("text-xs font-mono", color)}>
          {count}/{max}
        </span>
      </div>
    );
  };

  const renderPolicyWarnings = (warnings: AdCopyVariation['policy_warnings']) => {
    if (!warnings?.length) return null;
    
    const errorCount = warnings.filter(w => w.severity === 'error').length;
    const warningCount = warnings.filter(w => w.severity === 'warning').length;
    const infoCount = warnings.filter(w => w.severity === 'info').length;

    return (
      <div className="mt-4 p-3 rounded-lg bg-muted/50 border border-border">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
          <span className="text-sm font-medium">Policy Check</span>
          <div className="flex gap-1 ml-auto">
            {errorCount > 0 && (
              <Badge variant="destructive" className="text-xs">{errorCount} lỗi</Badge>
            )}
            {warningCount > 0 && (
              <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-700">{warningCount} cảnh báo</Badge>
            )}
            {infoCount > 0 && (
              <Badge variant="secondary" className="text-xs">{infoCount} gợi ý</Badge>
            )}
          </div>
        </div>
        <ul className="space-y-1">
          {warnings.map((w, i) => (
            <li key={i} className="flex items-start gap-2 text-xs">
              {w.severity === 'error' && <X className="h-3 w-3 text-destructive mt-0.5" />}
              {w.severity === 'warning' && <AlertTriangle className="h-3 w-3 text-yellow-500 mt-0.5" />}
              {w.severity === 'info' && <Info className="h-3 w-3 text-blue-500 mt-0.5" />}
              <span className="text-muted-foreground">
                <strong>{w.field}:</strong> {w.message}
              </span>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  const renderMetaVariation = (variation: AdCopyVariation) => (
    <div className="space-y-4">
      {/* Primary Text */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <Label>Primary Text</Label>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6"
            onClick={() => copyToClipboard(variation.primary_text || '', 'Primary Text')}
          >
            <Copy className="h-3 w-3" />
          </Button>
        </div>
        <div className="p-3 rounded-lg bg-muted/50 border border-border text-sm">
          {variation.primary_text || '-'}
        </div>
        {renderCharCounter(variation.primary_text, 'primary_text')}
      </div>

      {/* Headline */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <Label>Headline</Label>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6"
            onClick={() => copyToClipboard(variation.headline || '', 'Headline')}
          >
            <Copy className="h-3 w-3" />
          </Button>
        </div>
        <div className="p-3 rounded-lg bg-muted/50 border border-border text-sm font-medium">
          {variation.headline || '-'}
        </div>
        {renderCharCounter(variation.headline, 'headline')}
      </div>

      {/* Description */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <Label>Link Description</Label>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6"
            onClick={() => copyToClipboard(variation.description || '', 'Description')}
          >
            <Copy className="h-3 w-3" />
          </Button>
        </div>
        <div className="p-3 rounded-lg bg-muted/50 border border-border text-sm">
          {variation.description || '-'}
        </div>
        {renderCharCounter(variation.description, 'description')}
      </div>

      {/* CTA Button */}
      <div>
        <Label>CTA Button</Label>
        <div className="mt-1">
          <Badge variant="outline" className="text-sm">
            {CTA_BUTTONS.find(c => c.value === variation.cta_button)?.label || variation.cta_button}
          </Badge>
        </div>
      </div>
    </div>
  );

  const renderGoogleRSAVariation = (variation: AdCopyVariation) => (
    <div className="space-y-4">
      {/* Headlines */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label>Headlines ({variation.headlines?.length || 0}/15)</Label>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => copyToClipboard(variation.headlines?.join('\n') || '', 'Headlines')}
          >
            <Copy className="h-3 w-3 mr-1" />
            Copy tất cả
          </Button>
        </div>
        <div className="grid gap-2">
          {variation.headlines?.map((headline, i) => (
            <div key={i} className="flex items-center gap-2 group">
              <span className="text-xs text-muted-foreground w-5">{i + 1}.</span>
              <div className={cn(
                "flex-1 p-2 rounded-lg bg-muted/50 border text-sm",
                headline.length > 30 ? "border-destructive" : "border-border"
              )}>
                {headline}
              </div>
              <span className={cn(
                "text-xs font-mono",
                headline.length > 30 ? "text-destructive" : "text-muted-foreground"
              )}>
                {headline.length}/30
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Descriptions */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label>Descriptions ({variation.descriptions?.length || 0}/4)</Label>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => copyToClipboard(variation.descriptions?.join('\n') || '', 'Descriptions')}
          >
            <Copy className="h-3 w-3 mr-1" />
            Copy tất cả
          </Button>
        </div>
        <div className="grid gap-2">
          {variation.descriptions?.map((desc, i) => (
            <div key={i} className="flex items-start gap-2 group">
              <span className="text-xs text-muted-foreground w-5 pt-2">{i + 1}.</span>
              <div className={cn(
                "flex-1 p-2 rounded-lg bg-muted/50 border text-sm",
                desc.length > 90 ? "border-destructive" : "border-border"
              )}>
                {desc}
              </div>
              <span className={cn(
                "text-xs font-mono pt-2",
                desc.length > 90 ? "text-destructive" : "text-muted-foreground"
              )}>
                {desc.length}/90
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">{platformConfig.icon}</span>
            {adCopy.title}
          </DialogTitle>
        </DialogHeader>

        {/* Meta info */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Badge variant="outline" className={cn(statusConfig.color, statusConfig.bgColor)}>
            {statusConfig.label}
          </Badge>
          <Badge variant="secondary">
            {objectiveConfig.icon} {objectiveConfig.label}
          </Badge>
          <Badge variant="secondary" className={funnelConfig.color.replace('bg-', 'text-')}>
            {funnelConfig.label}
          </Badge>
          {adCopy.brand_template && (
            <Badge variant="outline">{adCopy.brand_template.brand_name}</Badge>
          )}
        </div>

        {/* Variations Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid" style={{ gridTemplateColumns: `repeat(${adCopy.variations?.length || 1}, 1fr)` }}>
            {adCopy.variations?.map((v) => (
              <TabsTrigger 
                key={v.variation_label} 
                value={v.variation_label}
                className="gap-2"
              >
                <span>Variation {v.variation_label}</span>
                {v.is_approved && <CheckCircle className="h-3 w-3 text-green-500" />}
              </TabsTrigger>
            ))}
          </TabsList>

          {adCopy.variations?.map((variation) => (
            <TabsContent key={variation.variation_label} value={variation.variation_label} className="mt-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Variation {variation.variation_label}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Button
                        variant={variation.is_approved ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleApprove(variation)}
                        className="gap-1"
                      >
                        {variation.is_approved ? (
                          <>
                            <Check className="h-4 w-4" />
                            Đã duyệt
                          </>
                        ) : (
                          'Duyệt'
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {adCopy.platform === 'google_rsa' 
                    ? renderGoogleRSAVariation(variation)
                    : renderMetaVariation(variation)
                  }
                  {renderPolicyWarnings(variation.policy_warnings)}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <span className="text-sm font-medium text-muted-foreground">{children}</span>;
}
