import { useMemo } from 'react';
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
  Info
} from 'lucide-react';
import { BrandTemplate } from '@/hooks/useBrandTemplates';
import { Channel } from '@/types/multichannel';

interface BrandAppliedInfoProps {
  template: BrandTemplate;
  selectedChannels?: Channel[];
  industry?: string;
}

export function BrandAppliedInfo({ template, selectedChannels = [], industry }: BrandAppliedInfoProps) {
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

        {/* Info Grid */}
        <div className="grid gap-3">
          {/* Industry */}
          {effectiveIndustry && (
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