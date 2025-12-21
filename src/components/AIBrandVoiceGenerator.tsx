import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Loader2, Wand2, Check, X } from 'lucide-react';
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
  reasoning: string;
}

interface AIBrandVoiceGeneratorProps {
  currentIndustry?: string[];
  onApply: (suggestions: Partial<BrandVoiceSuggestions>) => void;
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

export function AIBrandVoiceGenerator({ currentIndustry, onApply }: AIBrandVoiceGeneratorProps) {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<BrandVoiceSuggestions | null>(null);

  const handleGenerate = async () => {
    if (!description.trim()) {
      toast.error('Vui lòng nhập mô tả sản phẩm/dịch vụ');
      return;
    }

    setLoading(true);
    setSuggestions(null);

    try {
      const { data, error } = await supabase.functions.invoke('generate-brand-voice', {
        body: {
          description: description.trim(),
          industry: currentIndustry?.join(', '),
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
      setDescription('');
    }
  };

  const handleReset = () => {
    setSuggestions(null);
    setDescription('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="gap-2">
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
          {/* Input Section */}
          <div className="space-y-2">
            <Label htmlFor="description">
              Mô tả sản phẩm/dịch vụ của bạn
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="VD: Dịch vụ kế toán trọn gói cho doanh nghiệp nhỏ và vừa, chuyên về hỗ trợ thuế và tư vấn tài chính. Đối tượng khách hàng chính là startup và SME tại Việt Nam..."
              rows={4}
              className="resize-none"
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Mô tả chi tiết sẽ giúp AI đưa ra gợi ý chính xác hơn
            </p>
          </div>

          <Button 
            onClick={handleGenerate} 
            disabled={loading || !description.trim()}
            className="w-full gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Đang phân tích...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Tạo đề xuất Brand Voice
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
