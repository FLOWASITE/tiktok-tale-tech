import { 
  Layers, MessageSquare, Edit3, ExternalLink, 
  Palette, Building2, Crown, Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { BrandTemplate } from '@/hooks/useBrandTemplates';
import { ContentPillar } from '@/types/topicDiscovery';

import { Skeleton } from '@/components/ui/skeleton';

interface BrandInfoCardProps {
  brand?: BrandTemplate;
  onChangeBrand: () => void;
  onEditBrand?: () => void;
  className?: string;
  isLoading?: boolean;
}

export function BrandInfoCard({
  brand,
  onChangeBrand,
  onEditBrand,
  className,
  isLoading = false,
}: BrandInfoCardProps) {
  // Loading skeleton state
  if (isLoading) {
    return (
      <Card className={cn('gradient-card overflow-hidden', className)}>
        <div className="h-1 bg-gradient-to-r from-primary/30 via-violet-500/30 to-primary/30 animate-pulse" />
        <CardHeader className="pb-3 pt-4 px-4">
          <div className="flex items-start gap-3">
            <Skeleton className="w-10 h-10 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 px-4 pb-4 space-y-3">
          <div className="space-y-2">
            <Skeleton className="h-3 w-12" />
            <div className="flex gap-1">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-14" />
            <div className="flex gap-1">
              <Skeleton className="h-5 w-14 rounded-full" />
              <Skeleton className="h-5 w-18 rounded-full" />
              <Skeleton className="h-5 w-12 rounded-full" />
            </div>
          </div>
          <Separator className="my-2" />
          <div className="flex gap-2">
            <Skeleton className="h-7 flex-1" />
            <Skeleton className="h-7 w-7" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!brand) {
    return (
      <Card className={cn('gradient-card', className)}>
        <CardContent className="pt-6 pb-4 flex flex-col items-center text-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center">
            <Building2 className="w-6 h-6 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium text-sm">Chưa chọn Brand</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Chọn brand để AI cá nhân hóa gợi ý
            </p>
          </div>
          <Button size="sm" onClick={onChangeBrand} className="gap-1.5 w-full">
            <Sparkles className="w-3.5 h-3.5" />
            Chọn Brand
          </Button>
        </CardContent>
      </Card>
    );
  }

  const contentPillars: ContentPillar[] = (brand.content_pillars as ContentPillar[]) || [];
  const toneOfVoice = Array.isArray(brand.tone_of_voice) ? brand.tone_of_voice : [];

  return (
    <Card className={cn('gradient-card overflow-hidden', className)}>
      {/* Color accent */}
      <div 
        className="h-1 bg-gradient-to-r from-primary via-violet-500 to-primary"
        style={brand.primary_color ? {
          background: `linear-gradient(to right, ${brand.primary_color}, hsl(var(--primary)), ${brand.primary_color})`
        } : undefined}
      />
      
      <CardHeader className="pb-3 pt-4 px-4">
        <div className="flex items-start gap-3">
          <div className="relative">
            <Avatar className="w-10 h-10 rounded-lg border border-border">
              {brand.logo_url ? (
                <AvatarImage src={brand.logo_url} alt={brand.brand_name} />
              ) : null}
              <AvatarFallback className="rounded-lg bg-gradient-to-br from-primary/20 to-violet-500/20 text-primary font-bold">
                {brand.brand_name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {brand.is_default && (
              <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center shadow">
                <Crown className="w-2.5 h-2.5 text-white" />
              </div>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm font-semibold truncate">
              {brand.brand_name}
            </CardTitle>
            {brand.industry && brand.industry.length > 0 && (
              <Badge variant="secondary" className="text-[10px] mt-1">
                {brand.industry[0]}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0 px-4 pb-4 space-y-3">
        {/* Tone of Voice */}
        {toneOfVoice.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <MessageSquare className="w-3 h-3 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Tone</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {toneOfVoice.slice(0, 3).map((tone) => (
                <Badge 
                  key={tone} 
                  variant="outline" 
                  className="text-[10px] px-1.5 py-0 bg-primary/5 border-primary/20"
                >
                  {tone}
                </Badge>
              ))}
              {toneOfVoice.length > 3 && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  +{toneOfVoice.length - 3}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Content Pillars */}
        {contentPillars.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Layers className="w-3 h-3 text-primary" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Pillars</span>
              <Badge variant="secondary" className="text-[9px] h-4 px-1 ml-auto">
                {contentPillars.length}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-1">
              {contentPillars.slice(0, 4).map((pillar, index) => (
                <Badge
                  key={pillar.name || index}
                  variant="outline"
                  className="text-[10px] px-1.5 py-0"
                  style={pillar.color ? { 
                    borderColor: pillar.color, 
                    backgroundColor: `${pillar.color}15` 
                  } : undefined}
                >
                  {pillar.name}
                </Badge>
              ))}
              {contentPillars.length > 4 && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  +{contentPillars.length - 4}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Formality */}
        {brand.formality_level && (
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Palette className="w-3 h-3" />
            <span>{brand.formality_level}</span>
            {brand.allow_emoji && <span>• 😊 Emoji</span>}
          </div>
        )}

        <Separator className="my-2" />

        {/* Actions */}
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onChangeBrand}
            className="flex-1 h-7 text-xs gap-1"
          >
            Đổi Brand
          </Button>
          {onEditBrand && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onEditBrand}
              className="h-7 w-7 p-0"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
