import { useMemo, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  CheckCircle2, 
  MessageSquare, 
  Sparkles, 
  Ban, 
  Settings2,
  Building2,
  Palette,
  FileText,
  Smile,
  AlertTriangle,
  Info,
  ShieldCheck,
  Lock,
  Hash,
  Quote,
  MousePointerClick,
  Leaf
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { BrandTemplate } from '@/hooks/useBrandTemplates';
import { Channel } from '@/types/multichannel';
import { useIndustryMemory, IndustryMemory } from '@/hooks/useIndustryMemory';

interface BrandAppliedInfoProps {
  template: BrandTemplate;
  selectedChannels?: Channel[];
  industry?: string;
}

export function BrandAppliedInfo({ template, selectedChannels = [], industry }: BrandAppliedInfoProps) {
  const { fetchIndustryMemory } = useIndustryMemory();
  const [industryMemory, setIndustryMemory] = useState<IndustryMemory | null>(null);
  const [loadingMemory, setLoadingMemory] = useState(false);

  // Fetch Industry Memory when template has industry_template_id
  useEffect(() => {
    const templateWithIndustry = template as BrandTemplate & { industry_template_id?: string };
    if (templateWithIndustry.industry_template_id) {
      setLoadingMemory(true);
      fetchIndustryMemory(templateWithIndustry.industry_template_id)
        .then(setIndustryMemory)
        .finally(() => setLoadingMemory(false));
    } else {
      setIndustryMemory(null);
    }
  }, [(template as BrandTemplate & { industry_template_id?: string }).industry_template_id]);

  const formalityLabels: Record<string, string> = {
    formal: 'Trang trọng',
    casual: 'Thân thiện',
    neutral: 'Trung tính',
    professional: 'Chuyên nghiệp',
  };

  // Check which channels have overrides
  const channelOverrides = useMemo(() => {
    if (!template.channel_overrides || !selectedChannels.length) return [];
    const overrideKeys = Object.keys(template.channel_overrides);
    return selectedChannels.filter(channel => overrideKeys.includes(channel));
  }, [template.channel_overrides, selectedChannels]);

  // Check for missing important brand info
  const warnings = useMemo(() => {
    const issues: string[] = [];
    if (!template.tone_of_voice?.length) {
      issues.push('Chưa cấu hình Tone of Voice');
    }
    if (!template.brand_positioning) {
      issues.push('Chưa có Brand Positioning');
    }
    const templateWithIndustry = template as BrandTemplate & { industry_template_id?: string };
    if (!templateWithIndustry.industry_template_id) {
      issues.push('Chưa liên kết Industry Rules');
    }
    return issues;
  }, [template]);

  // Determine industry to use
  const effectiveIndustry = industry || template.industry?.join(', ') || null;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          Thông tin Brand sẽ áp dụng
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="flex items-start gap-2 p-2 rounded-md bg-amber-500/10 border border-amber-500/20">
            <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
            <div className="space-y-0.5">
              {warnings.map((warning, i) => (
                <p key={i} className="text-xs text-amber-600 dark:text-amber-400">{warning}</p>
              ))}
            </div>
          </div>
        )}

        {/* Brand Name & Color */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {template.primary_color && (
              <div 
                className="w-5 h-5 rounded-full ring-2 ring-border/50 shadow-sm"
                style={{ backgroundColor: template.primary_color }}
              />
            )}
            {template.logo_url && (
              <img 
                src={template.logo_url} 
                alt="Logo" 
                className="w-5 h-5 rounded object-contain"
              />
            )}
            <span className="font-medium">{template.brand_name}</span>
          </div>
          {template.is_default && (
            <Badge variant="secondary" className="text-xs">Mặc định</Badge>
          )}
        </div>

        <Separator className="bg-border/50" />

        {/* Industry Memory Section - LOCKED */}
        {industryMemory && (
          <TooltipProvider>
            <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="font-medium text-xs text-blue-700 dark:text-blue-300">
                  Industry Rules: {industryMemory.name}
                </span>
                <Badge variant="outline" className="text-[10px] border-blue-300 text-blue-600">
                  v{industryMemory.version}
                </Badge>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-blue-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <div className="space-y-1 text-xs">
                      <p className="font-medium">🔒 Industry Rules (Quy tắc ngành)</p>
                      <p className="text-muted-foreground">
                        Target: {industryMemory.target_audience}
                      </p>
                      {industryMemory.compliance_rules.length > 0 && (
                        <p>✅ {industryMemory.compliance_rules.length} quy tắc tuân thủ</p>
                      )}
                      {industryMemory.forbidden_terms.length > 0 && (
                        <p className="text-destructive">⛔ {industryMemory.forbidden_terms.length} từ cấm ngành</p>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </div>
              
              {/* Locked Compliance Rules */}
              {industryMemory.compliance_rules.length > 0 && (
                <div className="mt-2 space-y-1">
                  {industryMemory.compliance_rules.slice(0, 2).map((rule, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400">
                      <Lock className="h-3 w-3 shrink-0" />
                      <span className="line-clamp-1">{rule}</span>
                    </div>
                  ))}
                  {industryMemory.compliance_rules.length > 2 && (
                    <p className="text-[10px] text-blue-500 pl-4">
                      +{industryMemory.compliance_rules.length - 2} quy tắc khác
                    </p>
                  )}
                </div>
              )}
              
              {/* Forbidden Terms */}
              {industryMemory.forbidden_terms.length > 0 && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-destructive">
                  <Ban className="h-3 w-3 shrink-0" />
                  <span>
                    {industryMemory.forbidden_terms.slice(0, 3).join(', ')}
                    {industryMemory.forbidden_terms.length > 3 && ` +${industryMemory.forbidden_terms.length - 3}`}
                  </span>
                </div>
              )}
            </div>
          </TooltipProvider>
        )}

        {loadingMemory && (
          <div className="p-2 bg-muted/30 rounded-lg animate-pulse">
            <div className="h-4 w-32 bg-muted rounded" />
          </div>
        )}

        {/* Info Grid */}
        <div className="grid gap-3">
          {/* Industry */}
          {effectiveIndustry && !industryMemory && (
            <div className="flex items-start gap-2">
              <Building2 className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Ngành nghề</p>
                <p className="text-sm">{effectiveIndustry}</p>
              </div>
            </div>
          )}

          {/* Brand Positioning */}
          {template.brand_positioning && (
            <div className="flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Định vị thương hiệu</p>
                <p className="text-sm line-clamp-2">{template.brand_positioning}</p>
              </div>
            </div>
          )}

          {/* Tone of Voice */}
          {template.tone_of_voice && template.tone_of_voice.length > 0 && (
            <div className="flex items-start gap-2">
              <MessageSquare className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Tone of Voice</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {template.tone_of_voice.map((tone) => (
                    <Badge key={tone} variant="secondary" className="text-xs">
                      {tone}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Formality & Language Style */}
          <div className="grid grid-cols-2 gap-3">
            {template.formality_level && (
              <div className="flex items-start gap-2">
                <FileText className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Mức trang trọng</p>
                  <p className="text-sm">{formalityLabels[template.formality_level] || template.formality_level}</p>
                </div>
              </div>
            )}

            {template.language_style && template.language_style.length > 0 && (
              <div className="flex items-start gap-2">
                <Palette className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Phong cách</p>
                  <p className="text-sm">{template.language_style.slice(0, 2).join(', ')}</p>
                </div>
              </div>
            )}
          </div>

          {/* Preferred & Forbidden Words */}
          <div className="grid grid-cols-2 gap-3">
            {template.preferred_words && template.preferred_words.length > 0 && (
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Từ ưu tiên</p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">
                    {template.preferred_words.slice(0, 3).join(', ')}
                    {template.preferred_words.length > 3 && ` +${template.preferred_words.length - 3}`}
                  </p>
                </div>
              </div>
            )}

            {template.forbidden_words && template.forbidden_words.length > 0 && (
              <div className="flex items-start gap-2">
                <Ban className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Từ cấm</p>
                  <p className="text-xs text-destructive">
                    {template.forbidden_words.slice(0, 3).join(', ')}
                    {template.forbidden_words.length > 3 && ` +${template.forbidden_words.length - 3}`}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Emoji */}
          <div className="flex items-center gap-2">
            <Smile className="w-4 h-4 text-muted-foreground shrink-0" />
            <p className="text-xs text-muted-foreground">Emoji:</p>
            <Badge variant={template.allow_emoji !== false ? 'secondary' : 'outline'} className="text-xs">
              {template.allow_emoji !== false ? 'Có sử dụng 😀' : 'Không sử dụng'}
            </Badge>
          </div>

          {/* Brand Social Assets Section */}
          {(template.brand_hashtags?.length || template.signature_phrases?.length || template.cta_templates?.length || template.evergreen_themes?.length) && (
            <div className="pt-2 border-t border-border/50 space-y-3">
              <p className="text-xs font-medium text-primary flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Content Guidelines (tự động áp dụng)
              </p>

              {/* Brand Hashtags */}
              {template.brand_hashtags && template.brand_hashtags.length > 0 && (
                <div className="flex items-start gap-2">
                  <Hash className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Brand Hashtags</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {template.brand_hashtags.slice(0, 4).map((tag, i) => (
                        <Badge key={i} variant="secondary" className="text-[10px] bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                          #{tag.replace(/^#/, '')}
                        </Badge>
                      ))}
                      {template.brand_hashtags.length > 4 && (
                        <span className="text-[10px] text-muted-foreground">+{template.brand_hashtags.length - 4}</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Signature Phrases */}
              {template.signature_phrases && template.signature_phrases.length > 0 && (
                <div className="flex items-start gap-2">
                  <Quote className="w-4 h-4 text-purple-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Signature Phrases</p>
                    <p className="text-xs text-purple-600 dark:text-purple-400 italic mt-0.5">
                      "{template.signature_phrases[0]}"
                      {template.signature_phrases.length > 1 && (
                        <span className="text-muted-foreground not-italic"> +{template.signature_phrases.length - 1}</span>
                      )}
                    </p>
                  </div>
                </div>
              )}

              {/* CTA Templates */}
              {template.cta_templates && template.cta_templates.length > 0 && (
                <div className="flex items-start gap-2">
                  <MousePointerClick className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">CTA Templates ({template.cta_templates.length})</p>
                    <p className="text-xs text-orange-600 dark:text-orange-400 mt-0.5">
                      {template.cta_templates[0]}
                    </p>
                  </div>
                </div>
              )}

              {/* Evergreen Themes */}
              {template.evergreen_themes && template.evergreen_themes.length > 0 && (
                <div className="flex items-start gap-2">
                  <Leaf className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Evergreen Themes</p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                      {template.evergreen_themes.slice(0, 2).join(', ')}
                      {template.evergreen_themes.length > 2 && ` +${template.evergreen_themes.length - 2}`}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Channel Overrides */}
          {channelOverrides.length > 0 && (
            <div className="flex items-start gap-2 pt-2 border-t border-border/50">
              <Settings2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Kênh có settings riêng</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {channelOverrides.map((channel) => (
                    <Badge key={channel} variant="outline" className="text-xs border-primary/50 text-primary capitalize">
                      {channel.replace('_', ' ')}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Compliance Rules */}
          {template.compliance_rules && template.compliance_rules.length > 0 && (
            <div className="flex items-start gap-2 pt-2 border-t border-border/50">
              <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Quy tắc tuân thủ ({template.compliance_rules.length})</p>
                <ul className="text-xs text-muted-foreground mt-1 space-y-0.5">
                  {template.compliance_rules.slice(0, 2).map((rule, i) => (
                    <li key={i} className="line-clamp-1">• {rule}</li>
                  ))}
                  {template.compliance_rules.length > 2 && (
                    <li className="text-primary">+{template.compliance_rules.length - 2} quy tắc khác</li>
                  )}
                </ul>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}