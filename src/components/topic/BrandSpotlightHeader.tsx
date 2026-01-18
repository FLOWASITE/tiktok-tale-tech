import { useState } from 'react';
import { 
  Building2, ChevronDown, Palette, MessageSquare, 
  Layers, Edit3, Sparkles, Crown, ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { BrandTemplate } from '@/hooks/useBrandTemplates';
import { ContentPillar } from '@/types/topicDiscovery';

interface BrandSpotlightHeaderProps {
  selectedBrand?: BrandTemplate;
  onChangeBrand: () => void;
  onEditBrand?: () => void;
  className?: string;
}

export function BrandSpotlightHeader({
  selectedBrand,
  onChangeBrand,
  onEditBrand,
  className,
}: BrandSpotlightHeaderProps) {
  const [showAllPillars, setShowAllPillars] = useState(false);

  // Get content pillars from brand template
  const contentPillars: ContentPillar[] = (selectedBrand?.content_pillars as ContentPillar[]) || [];
  const displayedPillars = showAllPillars ? contentPillars : contentPillars.slice(0, 4);
  const hiddenPillarsCount = contentPillars.length - 4;

  // Parse tone of voice with defensive guard
  const toneOfVoice = Array.isArray(selectedBrand?.tone_of_voice) ? selectedBrand.tone_of_voice : [];

  if (!selectedBrand) {
    // Empty state - prompt to select brand
    return (
      <Card className={cn('gradient-card border-dashed border-2 border-primary/30 overflow-hidden', className)}>
        <CardContent className="py-8">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-violet-500/20 flex items-center justify-center">
                <Building2 className="w-10 h-10 text-primary/50" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
                <Crown className="w-4 h-4 text-white" />
              </div>
            </div>
            
            <div className="space-y-2 max-w-md">
              <h3 className="text-lg font-semibold text-foreground">
                Chọn Brand để cá nhân hóa gợi ý
              </h3>
              <p className="text-sm text-muted-foreground">
                AI sẽ tạo gợi ý phù hợp với định vị, tone of voice và content pillars của Brand bạn chọn.
              </p>
            </div>

            <Button onClick={onChangeBrand} className="gap-2 mt-2">
              <Sparkles className="w-4 h-4" />
              Chọn Brand
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(
      'relative overflow-hidden transition-all duration-300',
      'gradient-card border-border/50 hover:border-primary/30',
      className
    )}>
      {/* Brand color accent */}
      <div 
        className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary via-violet-500 to-primary"
        style={selectedBrand.primary_color ? {
          background: `linear-gradient(to right, ${selectedBrand.primary_color}, hsl(var(--primary)), ${selectedBrand.primary_color})`
        } : undefined}
      />

      <CardContent className="pt-6 pb-4">
        <div className="flex flex-col md:flex-row md:items-start gap-4">
          {/* Brand Avatar & Name */}
          <div className="flex items-start gap-4 flex-1">
            <div className="relative">
              <Avatar className="w-16 h-16 rounded-xl border-2 border-background shadow-lg">
                {selectedBrand.logo_url ? (
                  <AvatarImage src={selectedBrand.logo_url} alt={selectedBrand.brand_name} />
                ) : null}
                <AvatarFallback className="rounded-xl bg-gradient-to-br from-primary to-violet-500 text-primary-foreground text-lg font-bold">
                  {selectedBrand.brand_name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {selectedBrand.is_default && (
                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center shadow">
                  <Crown className="w-3 h-3 text-white" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-bold text-foreground truncate">
                  {selectedBrand.brand_name}
                </h2>
                {selectedBrand.industry && selectedBrand.industry.length > 0 && (
                  <Badge variant="secondary" className="text-xs shrink-0">
                    {selectedBrand.industry[0]}
                  </Badge>
                )}
              </div>

              {/* Brand Positioning */}
              {selectedBrand.brand_positioning && (
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                  {selectedBrand.brand_positioning}
                </p>
              )}

              {/* Tone of Voice Tags */}
              {toneOfVoice.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <MessageSquare className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  {toneOfVoice.slice(0, 4).map((tone) => (
                    <Badge 
                      key={tone} 
                      variant="outline" 
                      className="text-[10px] px-2 py-0.5 bg-primary/5 border-primary/20"
                    >
                      {tone}
                    </Badge>
                  ))}
                  {toneOfVoice.length > 4 && (
                    <Badge variant="outline" className="text-[10px] px-2 py-0.5">
                      +{toneOfVoice.length - 4}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={onChangeBrand} className="gap-1.5">
              <ChevronDown className="w-4 h-4" />
              Đổi Brand
            </Button>
            {onEditBrand && (
              <Button variant="ghost" size="sm" onClick={onEditBrand} className="gap-1.5">
                <Edit3 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Content Pillars Section */}
        {contentPillars.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border/50">
            <div className="flex items-center gap-2 mb-2">
              <Layers className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Content Pillars</span>
              <Badge variant="secondary" className="text-[10px]">
                {contentPillars.length}
              </Badge>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {displayedPillars.map((pillar, index) => (
                <Badge
                  key={pillar.name || index}
                  variant="outline"
                  className="px-3 py-1.5 text-xs bg-muted/50 border-muted-foreground/20 hover:bg-primary/10 hover:border-primary/30 cursor-pointer transition-colors"
                  style={pillar.color ? { borderColor: pillar.color, backgroundColor: `${pillar.color}15` } : undefined}
                >
                  {pillar.name}
                </Badge>
              ))}
              {hiddenPillarsCount > 0 && !showAllPillars && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAllPillars(true)}
                  className="h-7 px-2 text-xs text-muted-foreground"
                >
                  +{hiddenPillarsCount} pillars khác
                </Button>
              )}
              {showAllPillars && contentPillars.length > 4 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAllPillars(false)}
                  className="h-7 px-2 text-xs text-muted-foreground"
                >
                  Thu gọn
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Quick Stats Row */}
        <div className="mt-4 pt-3 border-t border-border/30 flex items-center gap-6 text-xs text-muted-foreground">
          {selectedBrand.formality_level && (
            <div className="flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5" />
              <span>{selectedBrand.formality_level}</span>
            </div>
          )}
          {selectedBrand.allow_emoji !== null && (
            <div className="flex items-center gap-1.5">
              <span>{selectedBrand.allow_emoji ? '😊 Cho phép emoji' : '✗ Không emoji'}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
