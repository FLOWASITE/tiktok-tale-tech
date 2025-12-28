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
                    <h1 className="text-lg font-bold mt-4 mb-2 first:mt-0 text-foreground border-b border-border pb-2">{children}</h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-base font-semibold mt-4 mb-2 text-primary flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-sm font-medium mt-3 mb-1.5 text-foreground">{children}</h3>
                  ),
                  p: ({ children }) => (
                    <p className="mb-3 text-sm leading-relaxed text-foreground/90">{children}</p>
                  ),
                  ul: ({ children }) => (
                    <ul className="mb-3 space-y-2 pl-0 list-none">{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="mb-3 space-y-2 pl-0 list-none counter-reset-item">{children}</ol>
                  ),
                  li: ({ children, ...props }) => {
                    const parent = (props as any).node?.parentNode?.tagName;
                    const isOrdered = parent === 'ol';
                    return (
                      <li className="text-sm flex items-start gap-2.5 pl-1">
                        {isOrdered ? (
                          <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-medium flex items-center justify-center shrink-0 mt-0.5">
                            •
                          </span>
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0 mt-2" />
                        )}
                        <span className="flex-1">{children}</span>
                      </li>
                    );
                  },
                  strong: ({ children }) => (
                    <strong className="font-semibold text-foreground">{children}</strong>
                  ),
                  em: ({ children }) => (
                    <em className="italic text-muted-foreground">{children}</em>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-3 border-primary bg-primary/5 pl-4 pr-3 py-2 my-3 rounded-r-lg">
                      {children}
                    </blockquote>
                  ),
                  code: ({ children }) => (
                    <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-primary">
                      {children}
                    </code>
                  ),
                  hr: () => (
                    <hr className="my-4 border-border" />
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

      {/* Sample Texts */}
      {template.sample_texts && Object.keys(template.sample_texts).length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              Văn bản mẫu theo kênh
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(template.sample_texts).map(([channel, text]) => (
              text && (
                <div key={channel} className="p-3 rounded-lg bg-muted/50 border border-border/50">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {channel.replace('_', ' ')}
                  </span>
                  <p className="text-sm mt-1 whitespace-pre-wrap">{text}</p>
                </div>
              )
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
