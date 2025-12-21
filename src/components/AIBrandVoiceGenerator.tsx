import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Loader2, Wand2, Check, X, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';

interface BrandVoiceSuggestions {
  brand_positioning: string;
  tone_of_voice: string[];
  formality_level: string;
  language_style: string[];
  preferred_words: string[];
  forbidden_words: string[];
  allow_emoji: boolean;
  pronoun_suggestion?: string;
  reasoning: string;
}

interface GuidelineResult {
  guideline: string;
  example_good?: string;
  example_bad?: string;
  key_principles?: string[];
}

interface AIBrandVoiceGeneratorProps {
  // Brand Template data - used as context for generating Brand Voice
  brandName?: string;
  brandGuideline?: string;
  currentIndustry?: string[];
  primaryColor?: string;
  brandPositioning?: string;
  toneOfVoice?: string[];
  formalityLevel?: string;
  languageStyle?: string[];
  preferredWords?: string[];
  forbiddenWords?: string[];
  hasLogo?: boolean;
  onApply: (suggestions: Partial<BrandVoiceSuggestions>) => void;
  onGuidelineGenerated?: (result: GuidelineResult) => void;
}

const toneLabels: Record<string, string> = {
  professional: 'Chuyên nghiệp',
  friendly: 'Thân thiện',
  authoritative: 'Uy tín',
  playful: 'Vui vẻ',
  empathetic: 'Đồng cảm',
  inspirational: 'Truyền cảm hứng',
  educational: 'Giáo dục',
  conversational: 'Trò chuyện',
};

const styleLabels: Record<string, string> = {
  simple: 'Đơn giản',
  technical: 'Chuyên môn',
  storytelling: 'Kể chuyện',
  data_driven: 'Dữ liệu',
  emotional: 'Cảm xúc',
  humorous: 'Hài hước',
  direct: 'Trực tiếp',
  poetic: 'Thơ mộng',
};

const formalityLabels: Record<string, string> = {
  formal: 'Trang trọng',
  semi_formal: 'Bán trang trọng',
  casual: 'Thân mật',
  friendly: 'Gần gũi',
};

export function AIBrandVoiceGenerator({ 
  brandName,
  brandGuideline,
  currentIndustry, 
  primaryColor,
  brandPositioning,
  toneOfVoice,
  formalityLevel,
  languageStyle,
  preferredWords,
  forbiddenWords,
  hasLogo,
  onApply,
  onGuidelineGenerated,
}: AIBrandVoiceGeneratorProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<'guideline' | 'voice' | null>(null);
  const [suggestions, setSuggestions] = useState<BrandVoiceSuggestions | null>(null);
  const [generatedGuideline, setGeneratedGuideline] = useState<string | null>(null);

  // Check if guideline exists
  const hasGuideline = !!brandGuideline?.trim();

  const handleGenerate = async () => {
    setLoading(true);
    setSuggestions(null);
    setGeneratedGuideline(null);

    try {
      let effectiveGuideline = brandGuideline?.trim() || '';

      // Step 1: If no guideline, generate one first
      if (!effectiveGuideline) {
        setLoadingStep('guideline');
        
        const { data: guidelineData, error: guidelineError } = await supabase.functions.invoke(
          'generate-brand-guideline',
          {
            body: {
              brand_name: brandName || 'Thương hiệu',
              industry: currentIndustry,
              primary_color: primaryColor,
              has_logo: hasLogo || false,
              tone_of_voice: toneOfVoice,
              formality_level: formalityLevel,
              brand_positioning: brandPositioning,
              language_style: languageStyle,
              preferred_words: preferredWords,
              forbidden_words: forbiddenWords,
            },
          }
        );

        if (guidelineError) throw guidelineError;
        if (guidelineData?.error) throw new Error(guidelineData.error);
        if (!guidelineData?.guideline) throw new Error('Không nhận được Brand Guideline từ AI');

        effectiveGuideline = guidelineData.guideline;
        setGeneratedGuideline(effectiveGuideline);

        // Notify parent about the generated guideline
        if (onGuidelineGenerated) {
          onGuidelineGenerated({
            guideline: effectiveGuideline,
            example_good: guidelineData.example_good,
            example_bad: guidelineData.example_bad,
            key_principles: guidelineData.key_principles,
          });
        }

        toast.success('Đã tạo Brand Guideline!');
      }

      // Step 2: Generate Brand Voice
      setLoadingStep('voice');

      const { data, error } = await supabase.functions.invoke('generate-brand-voice', {
        body: {
          brand_name: brandName,
          brand_guideline: effectiveGuideline,
          industry: currentIndustry,
          primary_color: primaryColor,
          brand_positioning: brandPositioning,
          tone_of_voice: toneOfVoice,
          formality_level: formalityLevel,
          language_style: languageStyle,
          preferred_words: preferredWords,
          forbidden_words: forbiddenWords,
        },
      });

      if (error) throw error;

      if (data?.suggestions) {
        setSuggestions(data.suggestions);
        toast.success('Đã tạo đề xuất Brand Voice!');
      } else if (data?.error) {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error generating brand voice:', error);
      toast.error(error instanceof Error ? error.message : 'Không thể tạo đề xuất');
    } finally {
      setLoading(false);
      setLoadingStep(null);
    }
  };

  const handleApply = () => {
    if (suggestions) {
      onApply({
        brand_positioning: suggestions.brand_positioning,
        tone_of_voice: suggestions.tone_of_voice,
        formality_level: suggestions.formality_level,
        language_style: suggestions.language_style,
        preferred_words: suggestions.preferred_words,
        forbidden_words: suggestions.forbidden_words,
        allow_emoji: suggestions.allow_emoji,
      });
      toast.success('Đã áp dụng Brand Voice!');
      setOpen(false);
      setSuggestions(null);
      setGeneratedGuideline(null);
    }
  };

  const handleReset = () => {
    setSuggestions(null);
    setGeneratedGuideline(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          type="button" 
          variant="outline" 
          size="sm" 
          className="gap-2"
        >
          <Wand2 className="w-4 h-4" />
          AI Gợi ý Brand Voice
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            AI Brand Voice Generator
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Context Summary */}
          <Card className="bg-muted/50">
            <CardContent className="pt-4 space-y-2">
              <p className="text-sm font-medium">Dữ liệu Brand Template hiện tại:</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Tên:</span>{' '}
                  <span className="font-medium">{brandName || 'Chưa đặt'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Ngành:</span>{' '}
                  <span className="font-medium">{currentIndustry?.join(', ') || 'Chưa chọn'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Màu:</span>{' '}
                  <span className="font-medium inline-flex items-center gap-1">
                    {primaryColor && (
                      <span 
                        className="w-3 h-3 rounded-full border border-border" 
                        style={{ backgroundColor: primaryColor }}
                      />
                    )}
                    {primaryColor || 'Chưa chọn'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Guideline:</span>{' '}
                  <span className={`font-medium ${hasGuideline ? 'text-green-600' : 'text-amber-600'}`}>
                    {hasGuideline ? '✓ Đã có' : '✗ Chưa tạo'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Info about auto-flow when no guideline */}
          {!hasGuideline && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
              <Sparkles className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <p className="font-medium">Tự động tạo Guideline</p>
                <p className="text-xs mt-1 opacity-80">
                  Chưa có Brand Guideline? Không sao! AI sẽ tự động tạo Guideline trước, sau đó tạo Brand Voice.
                </p>
              </div>
            </div>
          )}

          {/* Generated Guideline Preview */}
          {generatedGuideline && (
            <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
              <p className="text-xs font-medium text-green-700 dark:text-green-300 mb-1">✓ Guideline đã tạo:</p>
              <p className="text-xs text-green-800 dark:text-green-200 line-clamp-3">{generatedGuideline}</p>
            </div>
          )}

          {/* Generate button */}
          <Button 
            onClick={handleGenerate} 
            disabled={loading}
            className="w-full gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {loadingStep === 'guideline' ? 'Đang tạo Guideline...' : 'Đang tạo Brand Voice...'}
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                {hasGuideline ? 'Tạo Brand Voice từ Guideline' : 'Tạo Guideline + Brand Voice'}
              </>
            )}
          </Button>

          {/* Results Section */}
          {suggestions && (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  Đề xuất Brand Voice
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Positioning */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">🎯 Định vị thương hiệu</p>
                  <p className="text-sm italic">"{suggestions.brand_positioning}"</p>
                </div>

                {/* Tone of Voice */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">🎤 Tone of Voice</p>
                  <div className="flex flex-wrap gap-1.5">
                    {suggestions.tone_of_voice.map((tone) => (
                      <Badge key={tone} variant="secondary" className="text-xs">
                        {toneLabels[tone] || tone}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Formality */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">📋 Mức độ trang trọng</p>
                  <Badge variant="outline">
                    {formalityLabels[suggestions.formality_level] || suggestions.formality_level}
                  </Badge>
                </div>

                {/* Language Style */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">✍️ Phong cách ngôn ngữ</p>
                  <div className="flex flex-wrap gap-1.5">
                    {suggestions.language_style.map((style) => (
                      <Badge key={style} variant="secondary" className="text-xs">
                        {styleLabels[style] || style}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Pronoun Suggestion */}
                {suggestions.pronoun_suggestion && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">🗣️ Cách xưng hô</p>
                    <Badge variant="outline" className="text-xs">
                      {suggestions.pronoun_suggestion}
                    </Badge>
                  </div>
                )}

                {/* Preferred Words */}
                {suggestions.preferred_words.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1.5">✅ Từ nên dùng</p>
                    <div className="flex flex-wrap gap-1">
                      {suggestions.preferred_words.map((word, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 rounded bg-green-500/10 text-green-700 dark:text-green-400">
                          {word}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Forbidden Words */}
                {suggestions.forbidden_words.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1.5">❌ Từ không nên dùng</p>
                    <div className="flex flex-wrap gap-1">
                      {suggestions.forbidden_words.map((word, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 rounded bg-red-500/10 text-red-700 dark:text-red-400">
                          {word}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Emoji */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">😊 Emoji</p>
                  <Badge variant={suggestions.allow_emoji ? 'default' : 'secondary'}>
                    {suggestions.allow_emoji ? 'Nên sử dụng' : 'Không nên sử dụng'}
                  </Badge>
                </div>

                {/* Reasoning */}
                {suggestions.reasoning && (
                  <div className="pt-2 border-t">
                    <p className="text-xs font-medium text-muted-foreground mb-1">💡 Lý do</p>
                    <p className="text-xs text-muted-foreground">{suggestions.reasoning}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {suggestions && (
            <>
              <Button type="button" variant="outline" onClick={handleReset}>
                <X className="w-4 h-4 mr-2" />
                Tạo lại
              </Button>
              <Button type="button" onClick={handleApply}>
                <Check className="w-4 h-4 mr-2" />
                Áp dụng
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
