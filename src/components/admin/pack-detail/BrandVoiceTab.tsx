/**
 * BrandVoiceTab - Display brand voice settings for an Industry Pack
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, 
  Smile, 
  MousePointerClick,
  Type,
  Sparkles,
} from 'lucide-react';

interface BrandVoice {
  tone_of_voice?: string[];
  formality_level?: string;
  language_style?: string | string[];
  allow_emoji?: boolean;
  emoji_policy?: string;
  cta_policy?: 'soft' | 'medium' | 'hard' | 'aggressive';
  preferred_cta_styles?: string[];
  content_principles?: string[];
}

interface BrandVoiceTabProps {
  brandVoice: BrandVoice;
}

export function BrandVoiceTab({ brandVoice }: BrandVoiceTabProps) {
  const tones = brandVoice.tone_of_voice || [];
  const languageStyles = Array.isArray(brandVoice.language_style) 
    ? brandVoice.language_style 
    : brandVoice.language_style ? [brandVoice.language_style] : [];
  const ctaStyles = brandVoice.preferred_cta_styles || [];
  const principles = brandVoice.content_principles || [];

  const getCtaPolicyColor = (policy: string) => {
    switch (policy) {
      case 'soft': return 'bg-green-500/10 text-green-600';
      case 'medium': return 'bg-yellow-500/10 text-yellow-600';
      case 'hard': return 'bg-orange-500/10 text-orange-600';
      case 'aggressive': return 'bg-red-500/10 text-red-600';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getFormalityColor = (level: string) => {
    const lower = level?.toLowerCase();
    if (lower?.includes('formal')) return 'bg-blue-500/10 text-blue-600';
    if (lower?.includes('casual') || lower?.includes('informal')) return 'bg-green-500/10 text-green-600';
    return 'bg-muted text-muted-foreground';
  };

  if (!brandVoice || Object.keys(brandVoice).length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">Chưa có cấu hình Brand Voice</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tone of Voice */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Tone of Voice
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tones.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {tones.map((tone, i) => (
                <Badge key={i} variant="secondary" className="text-sm py-1.5 px-3">
                  {tone}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">Không có dữ liệu</p>
          )}
        </CardContent>
      </Card>

      {/* Formality & Style */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Type className="h-4 w-4" />
              Formality Level
            </CardTitle>
          </CardHeader>
          <CardContent>
            {brandVoice.formality_level ? (
              <Badge className={`text-sm py-2 px-4 ${getFormalityColor(brandVoice.formality_level)}`}>
                {brandVoice.formality_level}
              </Badge>
            ) : (
              <p className="text-muted-foreground text-sm">Không xác định</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Language Style
            </CardTitle>
          </CardHeader>
          <CardContent>
            {languageStyles.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {languageStyles.map((style, i) => (
                  <Badge key={i} variant="outline" className="text-sm">
                    {style}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">Không xác định</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Emoji & CTA Policies */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Smile className="h-4 w-4" />
              Emoji Policy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Badge variant={brandVoice.allow_emoji ? 'default' : 'destructive'}>
                  {brandVoice.allow_emoji ? '✅ Cho phép' : '❌ Không cho phép'}
                </Badge>
              </div>
              {brandVoice.emoji_policy && (
                <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                  {brandVoice.emoji_policy}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MousePointerClick className="h-4 w-4" />
              CTA Policy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {brandVoice.cta_policy && (
                <Badge className={`text-sm py-2 px-4 ${getCtaPolicyColor(brandVoice.cta_policy)}`}>
                  {brandVoice.cta_policy.toUpperCase()}
                </Badge>
              )}
              {ctaStyles.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Preferred CTA Styles:</p>
                  <div className="flex flex-wrap gap-1">
                    {ctaStyles.map((style, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {style}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Content Principles */}
      {principles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Content Principles</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {principles.map((principle, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-primary mt-0.5">•</span>
                  <span>{principle}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
