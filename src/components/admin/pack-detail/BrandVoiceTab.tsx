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
  BookOpen,
  Layers,
  Check,
  X,
  AlertTriangle,
} from 'lucide-react';

interface BrandVoiceTabProps {
  brandVoice: Record<string, unknown>;
}

// Helper to safely convert value to array
const toArray = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.filter(v => typeof v === 'string');
  if (typeof value === 'string' && value.trim()) return [value];
  return [];
};

const toStr = (value: unknown): string =>
  typeof value === 'string' ? value : '';

export function BrandVoiceTab({ brandVoice }: BrandVoiceTabProps) {
  const tones = toArray(brandVoice?.tone_of_voice);
  const languageStyles = toArray(brandVoice?.language_style);
  const ctaStyles = toArray(brandVoice?.preferred_cta_styles);
  const principles = toArray(brandVoice?.content_principles);
  const voiceDos = toArray(brandVoice?.voice_dos);
  const voiceDonts = toArray(brandVoice?.voice_donts);
  const toneMustAvoid = toArray(brandVoice?.tone_must_avoid);
  const subsectors = toArray(brandVoice?.industry_subsectors);
  const industryDefinition = toStr(brandVoice?.industry_definition);
  
  const formality = toStr(brandVoice?.formality_level);
  const allowEmoji = Boolean(brandVoice?.allow_emoji);
  const emojiPolicy = toStr(brandVoice?.emoji_policy);
  const ctaPolicy = toStr(brandVoice?.cta_policy);

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
      {/* Industry Definition */}
      {industryDefinition && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              Định nghĩa ngành
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed whitespace-pre-line text-foreground/90">
              {industryDefinition}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Industry Subsectors */}
      {subsectors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              Phân ngành ({subsectors.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {subsectors.map((s, i) => (
                <Badge key={i} variant="outline" className="text-sm py-1.5 px-3">
                  {s}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
            {formality ? (
              <Badge className={`text-sm py-2 px-4 ${getFormalityColor(formality)}`}>
                {formality}
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
                <Badge variant={allowEmoji ? 'default' : 'destructive'}>
                  {allowEmoji ? '✅ Cho phép' : '❌ Không cho phép'}
                </Badge>
              </div>
              {emojiPolicy && (
                <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                  {emojiPolicy}
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
              {ctaPolicy && (
                <Badge className={`text-sm py-2 px-4 ${getCtaPolicyColor(ctaPolicy)}`}>
                  {ctaPolicy.toUpperCase()}
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
