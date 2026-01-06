import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Check, X, Copy, AlertTriangle, CheckCircle, Info, FlaskConical, Plus, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAdCopies } from '@/hooks/useAdCopies';
import { useAdCopyABTests } from '@/hooks/useAdCopyABTests';
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
import { ABTestSetupDialog, ABTestCard, ABTestResultsView } from './ab-testing';
import { PerformanceDashboard } from './performance';
import { PolicyChecker } from './PolicyChecker';

interface AdCopyViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  adCopy: AdCopy;
}

export function AdCopyViewer({ open, onOpenChange, adCopy }: AdCopyViewerProps) {
  const { toggleVariationApproval } = useAdCopies();
  const { abTests, updateStatus, deleteTest } = useAdCopyABTests(adCopy.id);
  const [activeTab, setActiveTab] = useState(adCopy.variations?.[0]?.variation_label || 'A');
  const [mainTab, setMainTab] = useState<'variations' | 'ab-tests' | 'performance' | 'policy'>('variations');
  const [showABTestSetup, setShowABTestSetup] = useState(false);
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
  
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

  const renderTikTokVariation = (variation: AdCopyVariation) => (
    <div className="space-y-4">
      {/* TikTok Preview Mockup */}
      <div className="bg-black rounded-xl p-4 text-white max-w-[280px] mx-auto aspect-[9/16] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        <div className="absolute bottom-4 left-4 right-12 z-10">
          <p className="text-sm mb-2">{variation.primary_text || 'Primary text...'}</p>
          <p className="font-bold text-xs">{variation.headline || 'Headline...'}</p>
        </div>
        <div className="absolute right-3 bottom-20 flex flex-col items-center gap-4 text-white">
          <div className="text-center">
            <div className="w-8 h-8 rounded-full bg-white/20" />
            <span className="text-[10px]">❤️</span>
          </div>
          <div className="text-center">
            <div className="w-8 h-8 rounded-full bg-white/20" />
            <span className="text-[10px]">💬</span>
          </div>
          <div className="text-center">
            <div className="w-8 h-8 rounded-full bg-white/20" />
            <span className="text-[10px]">↗️</span>
          </div>
        </div>
      </div>

      {/* Fields */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <Label>Primary Text (Overlay)</Label>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(variation.primary_text || '', 'Primary Text')}>
            <Copy className="h-3 w-3" />
          </Button>
        </div>
        <div className="p-3 rounded-lg bg-muted/50 border border-border text-sm">{variation.primary_text || '-'}</div>
        {renderCharCounter(variation.primary_text, 'primary_text')}
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <Label>Headline</Label>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(variation.headline || '', 'Headline')}>
            <Copy className="h-3 w-3" />
          </Button>
        </div>
        <div className="p-3 rounded-lg bg-muted/50 border border-border text-sm font-medium">{variation.headline || '-'}</div>
        {renderCharCounter(variation.headline, 'headline')}
      </div>

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

  const renderZaloVariation = (variation: AdCopyVariation) => (
    <div className="space-y-4">
      {/* Zalo Preview Mockup */}
      <div className="bg-background rounded-xl border max-w-[320px] mx-auto overflow-hidden">
        <div className="bg-[#0068ff] text-white p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-lg">💬</div>
          <div>
            <p className="font-medium text-sm">Zalo Official Account</p>
            <p className="text-xs opacity-80">Được tài trợ</p>
          </div>
        </div>
        <div className="p-4 space-y-3">
          <p className="text-sm">{variation.primary_text || 'Primary text...'}</p>
          <div className="bg-muted rounded-lg p-3">
            <p className="font-medium text-sm">{variation.headline || 'Headline...'}</p>
            <p className="text-xs text-muted-foreground mt-1">{variation.description || 'Description...'}</p>
          </div>
          <Button size="sm" className="w-full bg-[#0068ff] hover:bg-[#0055dd]">
            {CTA_BUTTONS.find(c => c.value === variation.cta_button)?.label || 'Tìm hiểu thêm'}
          </Button>
        </div>
      </div>

      {/* Fields */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <Label>Primary Text</Label>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(variation.primary_text || '', 'Primary Text')}>
            <Copy className="h-3 w-3" />
          </Button>
        </div>
        <div className="p-3 rounded-lg bg-muted/50 border border-border text-sm">{variation.primary_text || '-'}</div>
        {renderCharCounter(variation.primary_text, 'primary_text')}
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <Label>Headline</Label>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(variation.headline || '', 'Headline')}>
            <Copy className="h-3 w-3" />
          </Button>
        </div>
        <div className="p-3 rounded-lg bg-muted/50 border border-border text-sm font-medium">{variation.headline || '-'}</div>
        {renderCharCounter(variation.headline, 'headline')}
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <Label>Description</Label>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(variation.description || '', 'Description')}>
            <Copy className="h-3 w-3" />
          </Button>
        </div>
        <div className="p-3 rounded-lg bg-muted/50 border border-border text-sm">{variation.description || '-'}</div>
        {renderCharCounter(variation.description, 'description')}
      </div>

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

  const renderLinkedInVariation = (variation: AdCopyVariation) => (
    <div className="space-y-4">
      {/* LinkedIn Preview Mockup */}
      <div className="bg-background rounded-xl border max-w-[400px] mx-auto overflow-hidden">
        <div className="p-4 flex items-center gap-3 border-b">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-xl">💼</div>
          <div className="flex-1">
            <p className="font-medium text-sm">Company Name</p>
            <p className="text-xs text-muted-foreground">Được tài trợ</p>
          </div>
        </div>
        <div className="p-4">
          <p className="text-sm mb-3">{variation.primary_text || 'Primary text...'}</p>
        </div>
        <div className="aspect-video bg-muted flex items-center justify-center text-4xl">🖼️</div>
        <div className="p-4 border-t">
          <p className="font-medium">{variation.headline || 'Headline...'}</p>
          <p className="text-sm text-muted-foreground mt-1">{variation.description || 'Description...'}</p>
        </div>
        <div className="px-4 pb-4">
          <Button size="sm" variant="outline" className="font-medium">
            {CTA_BUTTONS.find(c => c.value === variation.cta_button)?.label || 'Learn more'}
          </Button>
        </div>
      </div>

      {/* Fields */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <Label>Primary Text (Intro)</Label>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(variation.primary_text || '', 'Primary Text')}>
            <Copy className="h-3 w-3" />
          </Button>
        </div>
        <div className="p-3 rounded-lg bg-muted/50 border border-border text-sm">{variation.primary_text || '-'}</div>
        {renderCharCounter(variation.primary_text, 'primary_text')}
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <Label>Headline</Label>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(variation.headline || '', 'Headline')}>
            <Copy className="h-3 w-3" />
          </Button>
        </div>
        <div className="p-3 rounded-lg bg-muted/50 border border-border text-sm font-medium">{variation.headline || '-'}</div>
        {renderCharCounter(variation.headline, 'headline')}
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <Label>Description</Label>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(variation.description || '', 'Description')}>
            <Copy className="h-3 w-3" />
          </Button>
        </div>
        <div className="p-3 rounded-lg bg-muted/50 border border-border text-sm">{variation.description || '-'}</div>
        {renderCharCounter(variation.description, 'description')}
      </div>

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

        {/* Main Tabs: Variations / A/B Tests */}
        <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as 'variations' | 'ab-tests' | 'performance' | 'policy')}>
          <TabsList className="grid grid-cols-4 w-fit">
            <TabsTrigger value="variations">Variations</TabsTrigger>
            <TabsTrigger value="ab-tests" className="gap-1">
              <FlaskConical className="h-4 w-4" />
              A/B Tests
              {abTests.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{abTests.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="policy" className="gap-1">
              <Shield className="h-4 w-4" />
              Policy
            </TabsTrigger>
          </TabsList>

          {/* Variations Tab */}
          <TabsContent value="variations" className="mt-4">
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
                        : adCopy.platform === 'tiktok'
                        ? renderTikTokVariation(variation)
                        : adCopy.platform === 'zalo'
                        ? renderZaloVariation(variation)
                        : adCopy.platform === 'linkedin'
                        ? renderLinkedInVariation(variation)
                        : renderMetaVariation(variation)
                      }
                      {renderPolicyWarnings(variation.policy_warnings)}
                    </CardContent>
                  </Card>
                </TabsContent>
              ))}
            </Tabs>
          </TabsContent>

          {/* A/B Tests Tab */}
          <TabsContent value="ab-tests" className="mt-4 space-y-4">
            {selectedTestId ? (
              <div className="space-y-4">
                <Button variant="ghost" size="sm" onClick={() => setSelectedTestId(null)}>
                  ← Quay lại danh sách
                </Button>
                <ABTestResultsView
                  testId={selectedTestId}
                  variations={adCopy.variations || []}
                />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">A/B Tests ({abTests.length})</h4>
                  <Button size="sm" onClick={() => setShowABTestSetup(true)} disabled={!adCopy.variations || adCopy.variations.length < 2}>
                    <Plus className="h-4 w-4 mr-1" /> Tạo A/B Test
                  </Button>
                </div>

                {abTests.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <FlaskConical className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>Chưa có A/B test nào</p>
                    <p className="text-sm mt-1">Tạo test để so sánh hiệu quả các variations</p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {abTests.map((test) => (
                      <ABTestCard
                        key={test.id}
                        test={test}
                        onView={() => setSelectedTestId(test.id)}
                        onStart={() => updateStatus.mutate({ testId: test.id, status: 'running' })}
                        onPause={() => updateStatus.mutate({ testId: test.id, status: 'paused' })}
                        onDelete={() => deleteTest.mutate(test.id)}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="mt-4">
            <PerformanceDashboard 
              adCopyId={adCopy.id} 
              variations={adCopy.variations || []}
            />
          </TabsContent>

          {/* Policy Tab */}
          <TabsContent value="policy" className="mt-4">
            <PolicyChecker adCopy={adCopy} />
          </TabsContent>
        </Tabs>
      </DialogContent>

      {/* A/B Test Setup Dialog */}
      <ABTestSetupDialog
        open={showABTestSetup}
        onOpenChange={setShowABTestSetup}
        adCopyId={adCopy.id}
        variations={adCopy.variations || []}
      />
    </Dialog>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <span className="text-sm font-medium text-muted-foreground">{children}</span>;
}
