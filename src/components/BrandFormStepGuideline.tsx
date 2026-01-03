import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ChannelOverrides } from '@/components/ChannelSettingsEditor';
import ReactMarkdown from 'react-markdown';
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
  Eye,
  Edit3
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
  const [isViewMode, setIsViewMode] = useState(false);
  
  const isGuidelineEmpty = !brandGuideline.trim();
  
  // Preprocess guideline text to proper Markdown format
  const formatGuidelineForDisplay = (text: string): string => {
    let formatted = text;
    
    // Replace ".." or ". ." with proper line breaks
    formatted = formatted.replace(/\.\.\s*/g, '.\n\n');
    formatted = formatted.replace(/\.\s*\.\s*/g, '.\n\n');
    
    // Replace "• " or "- " at the start or after newlines with proper bullet points
    formatted = formatted.replace(/•\s*/g, '\n- ');
    formatted = formatted.replace(/\*\s+/g, '\n- ');
    
    // Handle "Tone:", "Xưng hô:", etc. as headers
    formatted = formatted.replace(/\n*(Tone|Xưng hô|Nguyên tắc|Lưu ý|Cấu trúc|Phong cách|Định vị|Giọng điệu|Từ ngữ|Kênh|Mục tiêu):\s*/gi, '\n\n## $1\n');
    
    // Clean up multiple newlines
    formatted = formatted.replace(/\n{3,}/g, '\n\n');
    
    // Ensure bullet points start on new lines
    formatted = formatted.replace(/([.!?])\s*-\s+/g, '$1\n\n- ');
    
    return formatted.trim();
  };
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
        setIsViewMode(true); // Switch to View mode after generation
        toast.success('Đã tạo Brand Guideline với AI!');
      }
    } catch (error) {
      console.error('Error generating guideline:', error);
      toast.error('Không thể tạo guideline. Vui lòng thử lại.');
    } finally {
      setIsGenerating(false);
    }
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

      {/* Guideline Editor */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="brandGuideline" className="text-base font-medium">
            Brand Guideline
          </Label>
          <div className="flex items-center gap-2">
            {!isGuidelineEmpty && (
              <Badge variant="outline" className="text-xs">
                {brandGuideline.length} ký tự
              </Badge>
            )}
            {!isGuidelineEmpty && (
              <div className="flex items-center border rounded-md overflow-hidden">
                <Button
                  type="button"
                  variant={isViewMode ? 'ghost' : 'secondary'}
                  size="sm"
                  className="h-7 px-2 rounded-none"
                  onClick={() => setIsViewMode(false)}
                >
                  <Edit3 className="w-3.5 h-3.5 mr-1" />
                  Sửa
                </Button>
                <Button
                  type="button"
                  variant={isViewMode ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-7 px-2 rounded-none"
                  onClick={() => setIsViewMode(true)}
                >
                  <Eye className="w-3.5 h-3.5 mr-1" />
                  Xem
                </Button>
              </div>
            )}
          </div>
        </div>
        
        {isViewMode && !isGuidelineEmpty ? (
          <div className="relative rounded-xl border bg-gradient-to-br from-background via-muted/10 to-muted/30 shadow-sm overflow-hidden">
            {/* Header decoration */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary/50 via-primary to-primary/50" />
            
            <div className="p-6 sm:p-8 min-h-[320px]">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown
                  components={{
                    h1: ({ children }) => (
                      <h1 className="text-xl font-bold mt-8 mb-4 first:mt-0 pb-3 border-b-2 border-primary/20 text-foreground flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Sparkles className="w-4 h-4 text-primary" />
                        </div>
                        <span>{children}</span>
                      </h1>
                    ),
                    h2: ({ children }) => (
                      <h2 className="text-base font-semibold mt-8 mb-4 text-primary flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                          <Check className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <span>{children}</span>
                      </h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-sm font-semibold mt-6 mb-3 text-foreground/90 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-primary/60" />
                        <span>{children}</span>
                      </h3>
                    ),
                    p: ({ children }) => (
                      <p className="mb-4 text-sm leading-7 text-foreground/80 pl-0">{children}</p>
                    ),
                    ul: ({ children }) => (
                      <ul className="my-4 space-y-3 pl-1">{children}</ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="my-4 space-y-3 pl-1 counter-reset-item">{children}</ol>
                    ),
                    li: ({ children }) => (
                      <li className="flex items-start gap-3 text-sm leading-7 pl-0 group">
                        <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center mt-1 shrink-0 group-hover:bg-primary/20 transition-colors">
                          <Check className="w-3 h-3 text-primary" />
                        </div>
                        <span className="text-foreground/80 flex-1">{children}</span>
                      </li>
                    ),
                    strong: ({ children }) => (
                      <strong className="font-semibold text-foreground bg-primary/5 px-1 rounded">{children}</strong>
                    ),
                    em: ({ children }) => (
                      <em className="italic text-primary/80 not-italic font-medium">{children}</em>
                    ),
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-4 border-primary/40 bg-gradient-to-r from-primary/5 to-transparent pl-5 pr-4 py-4 my-5 rounded-r-xl text-foreground/70 not-italic">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                          <div className="text-sm leading-7">{children}</div>
                        </div>
                      </blockquote>
                    ),
                    code: ({ children }) => (
                      <code className="bg-primary/10 text-primary px-2 py-1 rounded-md text-xs font-mono font-medium">{children}</code>
                    ),
                    hr: () => (
                      <div className="my-6 flex items-center gap-3">
                        <div className="flex-1 h-px bg-border/50" />
                        <div className="w-2 h-2 rounded-full bg-primary/30" />
                        <div className="flex-1 h-px bg-border/50" />
                      </div>
                    ),
                  }}
                >
                  {formatGuidelineForDisplay(brandGuideline)}
                </ReactMarkdown>
              </div>
            </div>
            
            {/* Footer hint */}
            <div className="px-6 py-3 bg-muted/20 border-t border-border/20 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Edit3 className="w-3.5 h-3.5" />
                <span>Nhấn "Sửa" để chỉnh sửa nội dung</span>
              </div>
              <Badge variant="outline" className="text-[10px] bg-background/50">
                Markdown
              </Badge>
            </div>
          </div>
        ) : (
          <Textarea
            id="brandGuideline"
            value={brandGuideline}
            onChange={(e) => setBrandGuideline(e.target.value)}
            placeholder="Mô tả phong cách viết, nguyên tắc, và hướng dẫn cụ thể cho việc tạo nội dung...

Hỗ trợ Markdown:
## Tiêu đề
- Bullet points
**In đậm** và *in nghiêng*
> Trích dẫn"
            rows={12}
            className="resize-none font-mono text-sm leading-relaxed tracking-wide"
            style={{ 
              fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', Monaco, 'Cascadia Code', monospace",
              lineHeight: '1.75'
            }}
          />
        )}
      </div>
      
      {/* AI Guideline Preview */}
      {(guidelineExampleGood || guidelineExampleBad || guidelineKeyPrinciples.length > 0) && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <Sparkles className="w-4 h-4" />
              AI Preview - Chi tiết Guideline
            </div>
            
            {guidelineKeyPrinciples.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Nguyên tắc chính:</p>
                <ul className="text-sm space-y-1.5">
                  {guidelineKeyPrinciples.map((principle, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <span className="text-muted-foreground">{principle}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            <div className="grid sm:grid-cols-2 gap-4">
              {guidelineExampleGood && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-green-600 dark:text-green-400 flex items-center gap-1.5">
                    <Check className="w-4 h-4" /> Ví dụ đúng
                  </p>
                  <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900">
                    <p className="text-sm text-green-800 dark:text-green-300">
                      "{guidelineExampleGood}"
                    </p>
                  </div>
                </div>
              )}
              
              {guidelineExampleBad && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-red-600 dark:text-red-400 flex items-center gap-1.5">
                    <X className="w-4 h-4" /> Ví dụ sai (tránh)
                  </p>
                  <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900">
                    <p className="text-sm text-red-800 dark:text-red-300 line-through">
                      "{guidelineExampleBad}"
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Next Steps Checklist */}
      <Card className="border-dashed border-muted-foreground/30 bg-muted/30">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
              <Check className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="font-medium text-sm">Bước tiếp theo (sau khi lưu)</span>
          </div>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2 text-muted-foreground">
              <Check className="w-4 h-4 text-green-500" />
              <span>Thông tin cơ bản</span>
            </li>
            <li className="flex items-center gap-2 text-muted-foreground">
              <Check className="w-4 h-4 text-green-500" />
              <span>Customer Personas</span>
            </li>
            <li className="flex items-center gap-2 text-muted-foreground">
              <Check className="w-4 h-4 text-green-500" />
              <span>Sản phẩm</span>
            </li>
            <li className="flex items-center gap-2 text-muted-foreground">
              <Check className="w-4 h-4 text-green-500" />
              <span>Giọng nói & Chiến lược</span>
            </li>
            <li className="flex items-center gap-2 text-muted-foreground">
              <Check className="w-4 h-4 text-green-500" />
              <span>Cài đặt kênh</span>
            </li>
            <li className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <div className="w-4 h-4 rounded border-2 border-amber-500" />
              <span className="font-medium">Kết nối mạng xã hội</span>
              <Badge variant="outline" className="text-[10px] ml-1 border-amber-500/50 text-amber-600 dark:text-amber-400">
                Sau khi lưu
              </Badge>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
