import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { 
  ChevronDown, 
  ChevronUp, 
  User, 
  MessageSquare, 
  Sparkles, 
  Ban, 
  CheckCircle2, 
  AlertCircle,
  Settings2,
  Info
} from 'lucide-react';
import { BrandTemplate } from '@/hooks/useBrandTemplates';
import { useState } from 'react';

interface BrandPreviewCardProps {
  template: BrandTemplate;
  defaultOpen?: boolean;
}

export function BrandPreviewCard({ template, defaultOpen = false }: BrandPreviewCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  const channelOverridesCount = useMemo(() => {
    if (!template.channel_overrides) return 0;
    return Object.keys(template.channel_overrides).length;
  }, [template.channel_overrides]);
  
  const hasVoiceProfile = useMemo(() => {
    return (
      (template.tone_of_voice && template.tone_of_voice.length > 0) ||
      (template.language_style && template.language_style.length > 0) ||
      template.formality_level ||
      (template.preferred_words && template.preferred_words.length > 0) ||
      (template.forbidden_words && template.forbidden_words.length > 0)
    );
  }, [template]);

  const formalityLabels: Record<string, string> = {
    formal: 'Trang trọng',
    casual: 'Thân thiện',
    neutral: 'Trung tính',
    professional: 'Chuyên nghiệp',
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="w-full">
        <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/30 hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              {template.primary_color && (
                <div 
                  className="w-3 h-3 rounded-full ring-1 ring-border/50"
                  style={{ backgroundColor: template.primary_color }}
                />
              )}
              <span className="text-sm font-medium">{template.brand_name}</span>
            </div>
            
            {/* Feature badges */}
            <div className="flex items-center gap-1.5">
              {hasVoiceProfile && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5">
                        <MessageSquare className="w-3 h-3 mr-1" />
                        Voice
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>Brand Voice đã cấu hình</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              
              {channelOverridesCount > 0 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Badge variant="outline" className="text-xs px-1.5 py-0 h-5 border-primary/50 text-primary">
                        <Settings2 className="w-3 h-3 mr-1" />
                        {channelOverridesCount} kênh
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      {channelOverridesCount} kênh có settings riêng
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              
              {template.allow_emoji === false && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Badge variant="outline" className="text-xs px-1.5 py-0 h-5">
                        No 😀
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>Không sử dụng emoji</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>
          
          {isOpen ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </CollapsibleTrigger>
      
      <CollapsibleContent>
        <div className="mt-2 p-3 rounded-lg border border-border/50 bg-background space-y-3">
          {/* Brand Positioning */}
          {template.brand_positioning && (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Sparkles className="w-3 h-3" />
                <span>Định vị</span>
              </div>
              <p className="text-sm line-clamp-2">{template.brand_positioning}</p>
            </div>
          )}
          
          {/* Tone of Voice */}
          {template.tone_of_voice && template.tone_of_voice.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <MessageSquare className="w-3 h-3" />
                <span>Tone of Voice</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {template.tone_of_voice.map((tone) => (
                  <Badge key={tone} variant="secondary" className="text-xs">
                    {tone}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          {/* Language Style */}
          {template.language_style && template.language_style.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <User className="w-3 h-3" />
                <span>Phong cách ngôn ngữ</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {template.language_style.map((style) => (
                  <Badge key={style} variant="outline" className="text-xs">
                    {style}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          {/* Formality */}
          {template.formality_level && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Mức độ trang trọng:</span>
              <Badge variant="outline" className="text-xs">
                {formalityLabels[template.formality_level] || template.formality_level}
              </Badge>
            </div>
          )}
          
          {/* Words */}
          <div className="grid grid-cols-2 gap-2">
            {template.preferred_words && template.preferred_words.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-xs text-emerald-500">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Từ ưu tiên</span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {template.preferred_words.slice(0, 5).join(', ')}
                  {template.preferred_words.length > 5 && '...'}
                </p>
              </div>
            )}
            
            {template.forbidden_words && template.forbidden_words.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-xs text-destructive">
                  <Ban className="w-3 h-3" />
                  <span>Từ cấm</span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {template.forbidden_words.slice(0, 5).join(', ')}
                  {template.forbidden_words.length > 5 && '...'}
                </p>
              </div>
            )}
          </div>
          
          {/* Channel Overrides Summary */}
          {channelOverridesCount > 0 && template.channel_overrides && (
            <div className="pt-2 border-t border-border/50">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
                <Settings2 className="w-3 h-3" />
                <span>Channel Settings Override</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {Object.keys(template.channel_overrides).map((channel) => (
                  <Badge key={channel} variant="outline" className="text-xs capitalize">
                    {channel.replace('_', ' ')}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          {/* Compliance Rules */}
          {template.compliance_rules && template.compliance_rules.length > 0 && (
            <div className="pt-2 border-t border-border/50">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
                <AlertCircle className="w-3 h-3" />
                <span>Quy tắc tuân thủ</span>
              </div>
              <ul className="text-xs text-muted-foreground space-y-0.5">
                {template.compliance_rules.slice(0, 3).map((rule, i) => (
                  <li key={i} className="line-clamp-1">• {rule}</li>
                ))}
                {template.compliance_rules.length > 3 && (
                  <li className="text-primary">+{template.compliance_rules.length - 3} quy tắc khác</li>
                )}
              </ul>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
