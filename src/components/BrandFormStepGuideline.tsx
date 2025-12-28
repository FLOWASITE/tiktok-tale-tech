import { useState, useEffect, useRef } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ChannelOverrides } from '@/components/ChannelSettingsEditor';
import { MarkdownToolbar } from '@/components/MarkdownToolbar';
import { 
  Wand2, 
  Loader2, 
  Sparkles, 
  Check, 
  X, 
  Building2, 
  Palette, 
  Megaphone, 
  Globe,
  AlertCircle,
  RefreshCw,
  Plus,
  Trash2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BrandFormStepGuidelineProps {
  // Brand Identity (Step 1)
  brandName: string;
  industries: string[];
  brandTemplateId?: string;
  
  // Visual (Step 2)
  primaryColor: string;
  hasLogo: boolean;
  
  // Brand Voice (Step 3)
  brandPositioning: string;
  toneOfVoice: string[];
  formalityLevel: string;
  languageStyle: string[];
  preferredWords: string[];
  forbiddenWords: string[];
  allowEmoji: boolean;
  
  // Channels (Step 4)
  channelOverrides: ChannelOverrides;
  
  // Guideline state
  brandGuideline: string;
  setBrandGuideline: (value: string) => void;
  guidelineExampleGood: string;
  setGuidelineExampleGood: (value: string) => void;
  guidelineExampleBad: string;
  setGuidelineExampleBad: (value: string) => void;
  guidelineKeyPrinciples: string[];
  setGuidelineKeyPrinciples: (value: string[]) => void;
}

const DEFAULT_GUIDELINE = 'Viết content chuyên nghiệp, thân thiện và dễ hiểu.';

export function BrandFormStepGuideline({
  brandName,
  industries,
  brandTemplateId,
  primaryColor,
  hasLogo,
  brandPositioning,
  toneOfVoice,
  formalityLevel,
  languageStyle,
  preferredWords,
  forbiddenWords,
  allowEmoji,
  channelOverrides,
  brandGuideline,
  setBrandGuideline,
  guidelineExampleGood,
  setGuidelineExampleGood,
  guidelineExampleBad,
  setGuidelineExampleBad,
  guidelineKeyPrinciples,
  setGuidelineKeyPrinciples,
}: BrandFormStepGuidelineProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [newPrinciple, setNewPrinciple] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const isGuidelineEmpty = !brandGuideline.trim() || brandGuideline === DEFAULT_GUIDELINE;
  const activeChannels = Object.keys(channelOverrides).filter(k => channelOverrides[k]?.enabled);
  
  // Auto-suggest generation when step loads and guideline is empty
  useEffect(() => {
    if (isGuidelineEmpty && !hasGenerated) {
      // Just set a flag, don't auto-generate
    }
  }, [isGuidelineEmpty, hasGenerated]);

  const handleGenerateGuideline = async () => {
    if (!brandName.trim()) {
      toast.error('Cần có tên brand để tạo guideline');
      return;
    }

    setIsGenerating(true);
    setGuidelineExampleGood('');
    setGuidelineExampleBad('');
    setGuidelineKeyPrinciples([]);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-brand-guideline', {
        body: {
          brand_name: brandName.trim(),
          brand_template_id: brandTemplateId,
          industry: industries,
          primary_color: primaryColor,
          has_logo: hasLogo,
          tone_of_voice: toneOfVoice,
          formality_level: formalityLevel,
          brand_positioning: brandPositioning,
          language_style: languageStyle,
          preferred_words: preferredWords,
          forbidden_words: forbiddenWords,
          allow_emoji: allowEmoji,
          channel_overrides: channelOverrides,
        },
      });

      if (error) throw error;

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      if (data?.guideline) {
        setBrandGuideline(data.guideline);
        setGuidelineExampleGood(data.example_good || '');
        setGuidelineExampleBad(data.example_bad || '');
        setGuidelineKeyPrinciples(data.key_principles || []);
        setHasGenerated(true);
        toast.success('Đã tạo Brand Guideline với AI!');
      }
    } catch (error) {
      console.error('Error generating guideline:', error);
      toast.error('Không thể tạo guideline. Vui lòng thử lại.');
    } finally {
      setIsGenerating(false);
    }
  };

  const addPrinciple = () => {
    if (newPrinciple.trim()) {
      setGuidelineKeyPrinciples([...guidelineKeyPrinciples, newPrinciple.trim()]);
      setNewPrinciple('');
    }
  };

  const removePrinciple = (index: number) => {
    setGuidelineKeyPrinciples(guidelineKeyPrinciples.filter((_, i) => i !== index));
  };

  const updatePrinciple = (index: number, value: string) => {
    const updated = [...guidelineKeyPrinciples];
    updated[index] = value;
    setGuidelineKeyPrinciples(updated);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-200">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Identity Summary */}
        <Card className="border-primary/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                <Building2 className="w-3.5 h-3.5 text-primary" />
              </div>
              <span className="text-xs font-medium">Nhận dạng</span>
            </div>
            <p className="text-sm font-semibold truncate">{brandName || 'Chưa có'}</p>
            <p className="text-xs text-muted-foreground truncate">
              {industries.length > 0 ? industries.join(', ') : 'Chưa chọn ngành'}
            </p>
          </CardContent>
        </Card>

        {/* Visual Summary */}
        <Card className="border-primary/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                <Palette className="w-3.5 h-3.5 text-primary" />
              </div>
              <span className="text-xs font-medium">Hình ảnh</span>
            </div>
            <div className="flex items-center gap-2">
              <div 
                className="w-5 h-5 rounded border"
                style={{ backgroundColor: primaryColor }}
              />
              <span className="text-xs">{primaryColor}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {hasLogo ? '✓ Có logo' : '✗ Không logo'}
            </p>
          </CardContent>
        </Card>

        {/* Voice Summary */}
        <Card className="border-primary/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                <Megaphone className="w-3.5 h-3.5 text-primary" />
              </div>
              <span className="text-xs font-medium">Brand Voice</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {toneOfVoice.slice(0, 2).map((tone, idx) => (
                <Badge key={idx} variant="secondary" className="text-[10px] px-1.5 py-0">
                  {tone}
                </Badge>
              ))}
              {toneOfVoice.length > 2 && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  +{toneOfVoice.length - 2}
                </Badge>
              )}
              {toneOfVoice.length === 0 && (
                <span className="text-xs text-muted-foreground">Chưa thiết lập</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {formalityLevel || 'Chưa chọn formality'}
            </p>
          </CardContent>
        </Card>

        {/* Channels Summary */}
        <Card className="border-primary/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                <Globe className="w-3.5 h-3.5 text-primary" />
              </div>
              <span className="text-xs font-medium">Kênh</span>
            </div>
            <p className="text-sm font-semibold">{activeChannels.length} kênh</p>
            <p className="text-xs text-muted-foreground truncate">
              {activeChannels.length > 0 ? activeChannels.slice(0, 3).join(', ') : 'Chưa cấu hình'}
              {activeChannels.length > 3 && `...`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* AI Generation Section */}
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">AI Tạo Brand Guideline</h3>
                <p className="text-sm text-muted-foreground">
                  Tổng hợp tất cả thông tin để tạo hướng dẫn viết content
                </p>
              </div>
            </div>
            <Button
              type="button"
              onClick={handleGenerateGuideline}
              disabled={isGenerating || !brandName.trim()}
              className="gap-2 w-full sm:w-auto"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Đang tạo...
                </>
              ) : hasGenerated ? (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Tạo lại
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  Tạo Guideline
                </>
              )}
            </Button>
          </div>

          {isGuidelineEmpty && !isGenerating && (
            <Alert className="bg-amber-500/10 border-amber-500/30">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-700 dark:text-amber-400">
                Bạn chưa có Brand Guideline. Nhấn nút <strong>"Tạo Guideline"</strong> để AI tạo tự động dựa trên thông tin bạn đã nhập.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Guideline Editor with Markdown Toolbar */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="brandGuideline" className="text-base font-medium">
            Brand Guideline
          </Label>
          {!isGuidelineEmpty && (
            <Badge variant="outline" className="text-xs">
              {brandGuideline.length} ký tự
            </Badge>
          )}
        </div>
        <MarkdownToolbar
          textareaRef={textareaRef}
          value={brandGuideline}
          onChange={setBrandGuideline}
          disabled={isGenerating}
        />
        <Textarea
          ref={textareaRef}
          id="brandGuideline"
          value={brandGuideline}
          onChange={(e) => setBrandGuideline(e.target.value)}
          placeholder="Mô tả phong cách viết, nguyên tắc, và hướng dẫn cụ thể cho việc tạo nội dung...

Hỗ trợ Markdown:
**in đậm**, *in nghiêng*, `code`
# Heading 1, ## Heading 2
- Danh sách"
          rows={10}
          className="resize-none text-sm font-mono"
        />
      </div>

      {/* Structured Sections */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Key Principles */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-primary" />
              <Label className="font-medium">Nguyên tắc chính</Label>
            </div>
            <div className="space-y-2">
              {guidelineKeyPrinciples.map((principle, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    value={principle}
                    onChange={(e) => updatePrinciple(idx, e.target.value)}
                    className="text-sm"
                    placeholder="Nguyên tắc..."
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 h-9 w-9 text-muted-foreground hover:text-destructive"
                    onClick={() => removePrinciple(idx)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <Input
                  value={newPrinciple}
                  onChange={(e) => setNewPrinciple(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addPrinciple())}
                  className="text-sm"
                  placeholder="Thêm nguyên tắc mới..."
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0 h-9 w-9"
                  onClick={addPrinciple}
                  disabled={!newPrinciple.trim()}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Examples */}
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-600" />
                <Label className="font-medium text-green-700 dark:text-green-400">Ví dụ đúng</Label>
              </div>
              <Textarea
                value={guidelineExampleGood}
                onChange={(e) => setGuidelineExampleGood(e.target.value)}
                placeholder="Ví dụ content đúng chuẩn brand..."
                rows={3}
                className="text-sm resize-none bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-900"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <X className="w-4 h-4 text-red-600" />
                <Label className="font-medium text-red-700 dark:text-red-400">Ví dụ sai (tránh)</Label>
              </div>
              <Textarea
                value={guidelineExampleBad}
                onChange={(e) => setGuidelineExampleBad(e.target.value)}
                placeholder="Ví dụ content không nên dùng..."
                rows={3}
                className="text-sm resize-none bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-900"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}