import { BrandTemplate } from '@/hooks/useBrandTemplates';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Volume2,
  Smile,
  Ban,
  Check,
  X,
  MessageSquare,
  FileText,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import {
  BRAND_POSITIONING_OPTIONS,
  TONE_OF_VOICE_OPTIONS,
  FORMALITY_LEVEL_OPTIONS,
  LANGUAGE_STYLE_OPTIONS,
} from '@/components/BrandVoiceSection';

interface BrandViewVoiceTabProps {
  template: BrandTemplate;
}

export function BrandViewVoiceTab({ template }: BrandViewVoiceTabProps) {
  return (
    <div className="space-y-4">
      {/* Voice Profile */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-primary" />
            Brand Voice Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Positioning */}
          <div>
            <span className="text-sm text-muted-foreground">Định vị thương hiệu</span>
            {template.brand_positioning ? (
              <div className="mt-1">
                <Badge variant="outline" className="text-sm">
                  {BRAND_POSITIONING_OPTIONS.find((o) => o.value === template.brand_positioning)
                    ?.label || template.brand_positioning}
                </Badge>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic mt-1">Chưa chọn</p>
            )}
          </div>

          {/* Tone of Voice */}
          <div>
            <span className="text-sm text-muted-foreground">Tone of Voice</span>
            {template.tone_of_voice && template.tone_of_voice.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {template.tone_of_voice.map((tone) => (
                  <Badge key={tone} variant="secondary">
                    {TONE_OF_VOICE_OPTIONS.find((o) => o.value === tone)?.label || tone}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic mt-1">Chưa chọn</p>
            )}
          </div>

          {/* Formality */}
          <div>
            <span className="text-sm text-muted-foreground">Mức độ trang trọng</span>
            {template.formality_level ? (
              <div className="mt-1">
                <Badge variant="outline">
                  {FORMALITY_LEVEL_OPTIONS.find((o) => o.value === template.formality_level)
                    ?.label || template.formality_level}
                </Badge>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic mt-1">Chưa chọn</p>
            )}
          </div>

          {/* Language Style */}
          <div>
            <span className="text-sm text-muted-foreground">Phong cách ngôn ngữ</span>
            {template.language_style && template.language_style.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {template.language_style.map((style) => (
                  <Badge key={style} variant="secondary">
                    {LANGUAGE_STYLE_OPTIONS.find((o) => o.value === style)?.label || style}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic mt-1">Chưa chọn</p>
            )}
          </div>

          {/* Emoji */}
          <div className="flex items-center gap-2 pt-2">
            {template.allow_emoji !== false ? (
              <Badge variant="outline" className="gap-1 text-green-600 border-green-300">
                <Smile className="w-3 h-3" />
                Cho phép emoji
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1 text-destructive border-destructive/30">
                <Ban className="w-3 h-3" />
                Không emoji
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Keywords */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-green-600">
              <Check className="w-4 h-4" />
              Từ nên dùng
            </CardTitle>
          </CardHeader>
          <CardContent>
            {template.preferred_words && template.preferred_words.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {template.preferred_words.map((word) => (
                  <Badge
                    key={word}
                    variant="outline"
                    className="border-green-300 text-green-700 bg-green-50"
                  >
                    {word}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">Chưa có từ khóa</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-destructive">
              <X className="w-4 h-4" />
              Từ cấm dùng
            </CardTitle>
          </CardHeader>
          <CardContent>
            {template.forbidden_words && template.forbidden_words.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {template.forbidden_words.map((word) => (
                  <Badge
                    key={word}
                    variant="outline"
                    className="border-destructive/30 text-destructive bg-destructive/5"
                  >
                    {word}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">Chưa có từ cấm</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Brand Guideline */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            Brand Writing Guideline
          </CardTitle>
        </CardHeader>
        <CardContent>
          {template.brand_guideline ? (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown
                components={{
                  h1: ({ children }) => (
                    <h1 className="text-lg font-bold mt-4 mb-2 first:mt-0">{children}</h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-base font-semibold mt-3 mb-2 text-primary">{children}</h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-sm font-medium mt-2 mb-1">{children}</h3>
                  ),
                  p: ({ children }) => (
                    <p className="mb-2 text-sm leading-relaxed">{children}</p>
                  ),
                  ul: ({ children }) => (
                    <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>
                  ),
                  li: ({ children }) => <li className="text-sm">{children}</li>,
                  strong: ({ children }) => (
                    <strong className="font-semibold text-foreground">{children}</strong>
                  ),
                  em: ({ children }) => (
                    <em className="italic text-muted-foreground">{children}</em>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-2 border-primary pl-3 my-2 italic text-muted-foreground">
                      {children}
                    </blockquote>
                  ),
                  code: ({ children }) => (
                    <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">
                      {children}
                    </code>
                  ),
                }}
              >
                {template.brand_guideline}
              </ReactMarkdown>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">Chưa có guideline</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
