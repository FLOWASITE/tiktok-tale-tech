import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { Check, X, Copy, AlertTriangle, CheckCircle, Info, FlaskConical, Plus, Shield, TrendingUp, Pencil, ClipboardCopy } from 'lucide-react';
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
  CTA_BUTTONS,
  getPlatformLabel
} from '@/types/adCopy';
import { ABTestSetupDialog, ABTestCard, ABTestResultsView } from './ab-testing';
import { PerformanceDashboard } from './performance';
import { PolicyChecker } from './PolicyChecker';
import { PredictionPanel } from './prediction/PredictionPanel';
import { AdCopyExportMenu } from './AdCopyExportMenu';
import { EditVariationForm } from './EditVariationForm';
import { 
  FacebookFeedMockup, 
  FacebookStoryMockup, 
  InstagramFeedMockup, 
  InstagramStoryMockup, 
  InstagramReelsMockup 
} from './AdCopyMockups';
import { GoogleRSAMockup, GoogleDisplayMockup } from './GoogleAdsMockups';
import { TikTokAdMockup } from './TikTokMockup';
import { LinkedInSponsoredMockup } from './LinkedInMockup';

interface AdCopyViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  adCopy: AdCopy | null;
  isLoading?: boolean;
}

export function AdCopyViewer({ open, onOpenChange, adCopy, isLoading = false }: AdCopyViewerProps) {
  const { toggleVariationApproval, updateVariation } = useAdCopies();
  const { abTests, updateStatus, deleteTest } = useAdCopyABTests(adCopy?.id || '');
  const [activeTab, setActiveTab] = useState(adCopy?.variations?.[0]?.variation_label || 'A');
  const [mainTab, setMainTab] = useState<'variations' | 'ab-tests' | 'performance' | 'policy' | 'prediction'>('variations');
  const [showABTestSetup, setShowABTestSetup] = useState(false);
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
  const [editingVariationId, setEditingVariationId] = useState<string | null>(null);
  
  const platformConfig = adCopy ? getPlatformConfig(adCopy.platform) : null;
  const objectiveConfig = adCopy ? getObjectiveConfig(adCopy.objective) : null;
  const funnelConfig = adCopy ? getFunnelStageConfig(adCopy.funnel_stage) : null;
  const statusConfig = adCopy ? getStatusConfig(adCopy.status) : null;
  const charLimits = adCopy ? getCharLimits(adCopy.platform) : { primary_text: { max: 125 }, headline: { max: 40 }, description: { max: 30 } };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Đã copy ${label}`);
  };

  // Copy all variations to clipboard
  const copyAllVariations = () => {
    if (!adCopy?.variations?.length) return;
    
    const formatted = adCopy.variations.map((v) => {
      const lines = [
        `=== VARIATION ${v.variation_label} ===`,
        '',
      ];
      
      // Platform-specific formatting
      if (adCopy.platform === 'google_rsa') {
        lines.push('HEADLINES:');
        v.headlines?.forEach((h, i) => lines.push(`${i + 1}. ${h}`));
        lines.push('', 'DESCRIPTIONS:');
        v.descriptions?.forEach((d, i) => lines.push(`${i + 1}. ${d}`));
      } else if (adCopy.platform === 'google_display') {
        lines.push('SHORT HEADLINES:');
        v.headlines?.forEach((h, i) => lines.push(`${i + 1}. ${h}`));
        lines.push('', `LONG HEADLINE: ${v.headline || ''}`);
        lines.push('', 'DESCRIPTIONS:');
        v.descriptions?.forEach((d, i) => lines.push(`${i + 1}. ${d}`));
      } else {
        // Meta, TikTok, LinkedIn, Zalo
        lines.push(`PRIMARY TEXT: ${v.primary_text || ''}`);
        lines.push(`HEADLINE: ${v.headline || ''}`);
        if (v.description) lines.push(`DESCRIPTION: ${v.description}`);
        lines.push(`CTA: ${v.cta_button || ''}`);
      }
      
      lines.push('', `Approved: ${v.is_approved ? 'Yes' : 'No'}`);
      lines.push('');
      return lines.join('\n');
    }).join('\n');
    
    navigator.clipboard.writeText(formatted);
    toast.success(`Đã copy ${adCopy.variations.length} variations!`);
  };

  const handleApprove = (variation: AdCopyVariation) => {
    toggleVariationApproval({ variationId: variation.id, isApproved: !variation.is_approved });
  };

  // Handle apply suggestion from PolicyChecker
  const handleApplySuggestion = (variationId: string, field: string, value: string) => {
    const fieldMap: Record<string, 'primary_text' | 'headline' | 'description'> = {
      'primary_text': 'primary_text',
      'headline': 'headline',
      'description': 'description',
    };
    
    const dbField = fieldMap[field];
    if (!dbField) {
      toast.error('Không thể áp dụng cho field này');
      return;
    }
    
    updateVariation({ 
      variationId, 
      updates: { [dbField]: value } 
    });
    toast.success(`Đã áp dụng gợi ý cho ${field}`);
  };

  // Handle save variation edit
  const handleSaveVariation = (variationId: string, updates: Partial<AdCopyVariation>) => {
    updateVariation({ variationId, updates });
    toast.success('Đã cập nhật variation');
    setEditingVariationId(null);
  };

  // Get brand info for mockups
  const brandName = adCopy.brand_template?.brand_name || 'Brand';
  const logoUrl = (adCopy.brand_template as { logo_url?: string })?.logo_url || undefined;

  // Render Facebook/Instagram mockups with fields
  const renderFacebookFeedVariation = (variation: AdCopyVariation) => (
    <div className="space-y-4">
      <FacebookFeedMockup variation={variation} brandName={brandName} logoUrl={logoUrl} />
      {renderMetaFields(variation)}
    </div>
  );

  const renderFacebookStoryVariation = (variation: AdCopyVariation) => (
    <div className="space-y-4">
      <FacebookStoryMockup variation={variation} brandName={brandName} logoUrl={logoUrl} />
      {renderMetaFields(variation)}
    </div>
  );

  const renderInstagramFeedVariation = (variation: AdCopyVariation) => (
    <div className="space-y-4">
      <InstagramFeedMockup variation={variation} brandName={brandName} logoUrl={logoUrl} />
      {renderMetaFields(variation)}
    </div>
  );

  const renderInstagramStoryVariation = (variation: AdCopyVariation) => (
    <div className="space-y-4">
      <InstagramStoryMockup variation={variation} brandName={brandName} logoUrl={logoUrl} />
      {renderMetaFields(variation)}
    </div>
  );

  const renderInstagramReelsVariation = (variation: AdCopyVariation) => (
    <div className="space-y-4">
      <InstagramReelsMockup variation={variation} brandName={brandName} logoUrl={logoUrl} />
      {renderMetaFields(variation)}
    </div>
  );

  // Extract common fields rendering
  const renderMetaFields = (variation: AdCopyVariation) => (
    <div className="space-y-4 pt-4 border-t">
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

  // Helper to determine which render function to use
  const getPlatformRenderer = (platform: string) => {
    switch (platform) {
      case 'facebook_feed':
      case 'meta_feed':
        return renderFacebookFeedVariation;
      case 'facebook_story':
      case 'meta_story':
        return renderFacebookStoryVariation;
      case 'instagram_feed':
        return renderInstagramFeedVariation;
      case 'instagram_story':
        return renderInstagramStoryVariation;
      case 'instagram_reels':
      case 'meta_reels':
        return renderInstagramReelsVariation;
      default:
        return null;
    }
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
    <div className="space-y-6">
      {/* Google RSA Mockup */}
      <GoogleRSAMockup variation={variation} brandName={brandName} logoUrl={logoUrl} />
      
      {/* Headlines */}
      <div className="pt-4 border-t">
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

  const renderGoogleDisplayVariation = (variation: AdCopyVariation) => (
    <div className="space-y-6">
      {/* Google Display Mockup */}
      <GoogleDisplayMockup variation={variation} brandName={brandName} logoUrl={logoUrl} />
      
      {/* Short Headlines */}
      <div className="pt-4 border-t">
        <div className="flex items-center justify-between mb-2">
          <Label>Short Headlines ({variation.headlines?.length || 0}/5)</Label>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => copyToClipboard(variation.headlines?.join('\n') || '', 'Short Headlines')}
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
                headline.length > 25 ? "border-destructive" : "border-border"
              )}>
                {headline}
              </div>
              <span className={cn(
                "text-xs font-mono",
                headline.length > 25 ? "text-destructive" : "text-muted-foreground"
              )}>
                {headline.length}/25
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Long Headline */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <Label>Long Headline</Label>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6"
            onClick={() => copyToClipboard(variation.headline || '', 'Long Headline')}
          >
            <Copy className="h-3 w-3" />
          </Button>
        </div>
        <div className={cn(
          "p-3 rounded-lg bg-muted/50 border text-sm font-medium",
          (variation.headline?.length || 0) > 90 ? "border-destructive" : "border-border"
        )}>
          {variation.headline || '-'}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className={cn(
            "text-xs font-mono",
            (variation.headline?.length || 0) > 90 ? "text-destructive" : "text-muted-foreground"
          )}>
            {variation.headline?.length || 0}/90
          </span>
        </div>
      </div>

      {/* Descriptions */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label>Descriptions ({variation.descriptions?.length || 0}/5)</Label>
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
    <div className="space-y-6">
      {/* TikTok Premium Mockup */}
      <TikTokAdMockup variation={variation} brandName={brandName} logoUrl={logoUrl} />

      {/* Fields */}
      <div className="pt-4 border-t">
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
    <div className="space-y-6">
      {/* LinkedIn Premium Mockup */}
      <LinkedInSponsoredMockup variation={variation} brandName={brandName} logoUrl={logoUrl} />

      {/* Fields */}
      <div className="pt-4 border-t">
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

  // Loading skeleton
  if (isLoading || !adCopy) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="space-y-4 p-2">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <Skeleton className="h-8 w-3/4" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-6 w-16" />
            </div>
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">{platformConfig?.icon}</span>
            {adCopy.title}
            <Badge variant="outline" className="ml-2 text-xs">
              {getPlatformLabel(adCopy.platform)}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Meta info */}
        <div className="flex flex-wrap gap-2 mb-4">
          {statusConfig && (
            <Badge variant="outline" className={cn(statusConfig.color, statusConfig.bgColor)}>
              {statusConfig.label}
            </Badge>
          )}
          {objectiveConfig && (
            <Badge variant="secondary">
              {objectiveConfig.icon} {objectiveConfig.label}
            </Badge>
          )}
          {funnelConfig && (
            <Badge variant="secondary" className={funnelConfig.color.replace('bg-', 'text-')}>
              {funnelConfig.label}
            </Badge>
          )}
          {adCopy.brand_template && (
            <Badge variant="outline">{adCopy.brand_template.brand_name}</Badge>
          )}
        </div>

        {/* Main Tabs: Variations / A/B Tests */}
        <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as typeof mainTab)}>
          <div className="flex items-center justify-between mb-2">
            <TabsList className="grid grid-cols-5 w-fit">
              <TabsTrigger value="variations">Variations</TabsTrigger>
              <TabsTrigger value="ab-tests" className="gap-1">
                <FlaskConical className="h-4 w-4" />
                A/B Tests
                {abTests.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{abTests.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="prediction" className="gap-1">
                <TrendingUp className="h-4 w-4" />
                Dự đoán
              </TabsTrigger>
              <TabsTrigger value="policy" className="gap-1">
                <Shield className="h-4 w-4" />
                Policy
              </TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyAllVariations}
                    className="gap-1"
                  >
                    <ClipboardCopy className="h-4 w-4" />
                    Copy tất cả
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Copy tất cả variations vào clipboard</TooltipContent>
              </Tooltip>
              <AdCopyExportMenu adCopy={adCopy} />
            </div>
          </div>

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
                          {editingVariationId !== variation.id && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingVariationId(variation.id)}
                              className="gap-1"
                            >
                              <Pencil className="h-4 w-4" />
                              Sửa
                            </Button>
                          )}
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
                      {editingVariationId === variation.id ? (
                        <EditVariationForm
                          variation={variation}
                          charLimits={charLimits}
                          onSave={(updates) => handleSaveVariation(variation.id, updates)}
                          onCancel={() => setEditingVariationId(null)}
                        />
                      ) : (
                        <>
                          {(() => {
                            const platformRenderer = getPlatformRenderer(adCopy.platform);
                            if (platformRenderer) {
                              return platformRenderer(variation);
                            }
                            // Fallback to existing platform-specific renderers
                            if (adCopy.platform === 'google_rsa') return renderGoogleRSAVariation(variation);
                            if (adCopy.platform === 'google_display') return renderGoogleDisplayVariation(variation);
                            if (adCopy.platform === 'tiktok') return renderTikTokVariation(variation);
                            if (adCopy.platform === 'zalo_oa' || adCopy.platform === 'zalo_message' || adCopy.platform === 'zalo_article') return renderZaloVariation(variation);
                            if (adCopy.platform === 'linkedin') return renderLinkedInVariation(variation);
                            return renderMetaVariation(variation);
                          })()}
                          {renderPolicyWarnings(variation.policy_warnings)}
                        </>
                      )}
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
              organizationId={adCopy.organization_id || undefined}
              variations={adCopy.variations || []}
            />
          </TabsContent>

          {/* Prediction Tab */}
          <TabsContent value="prediction" className="mt-4">
            <PredictionPanel 
              adCopy={adCopy} 
              selectedVariation={adCopy.variations?.find(v => v.variation_label === activeTab)}
            />
          </TabsContent>

          {/* Policy Tab */}
          <TabsContent value="policy" className="mt-4">
            <PolicyChecker adCopy={adCopy} onApplySuggestion={handleApplySuggestion} />
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
