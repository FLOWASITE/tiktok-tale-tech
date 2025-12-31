import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  Mic2,
  Plus,
  X,
  Info,
  Smile,
  Settings2,
  Megaphone,
  Hash,
  MessageSquareQuote
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Brand Voice Constants
export const BRAND_POSITIONING_OPTIONS = [
  { value: 'business', label: 'Doanh nghiệp' },
  { value: 'expert', label: 'Chuyên gia' },
  { value: 'agency', label: 'Agency' },
  { value: 'consultant', label: 'Tư vấn' },
];

export const TONE_OF_VOICE_OPTIONS = [
  { value: 'expert', label: 'Chuyên gia', suggestEmoji: false },
  { value: 'calm', label: 'Điềm tĩnh', suggestEmoji: false },
  { value: 'confident', label: 'Tự tin', suggestEmoji: false },
  { value: 'friendly', label: 'Thân thiện', suggestEmoji: true },
  { value: 'analytical', label: 'Phân tích', suggestEmoji: false },
  { value: 'serious', label: 'Nghiêm túc', suggestEmoji: false },
  { value: 'inspirational', label: 'Truyền cảm hứng', suggestEmoji: true },
];

export const FORMALITY_LEVEL_OPTIONS = [
  { 
    value: 'formal', 
    label: 'Trang trọng',
    hint: 'Ngắn gọn, súc tích • Không từ lóng • Câu cấu trúc chặt chẽ'
  },
  { 
    value: 'semi_formal', 
    label: 'Bán trang trọng',
    hint: 'Rõ ràng, trực tiếp • Có cấu trúc • Không khoa trương'
  },
  { 
    value: 'casual', 
    label: 'Gần gũi',
    hint: 'Cân bằng giữa trang trọng và thân thiện • Linh hoạt theo ngữ cảnh'
  },
  { 
    value: 'friendly', 
    label: 'Thân thiện',
    hint: 'Thoải mái, tự nhiên • Cho phép từ ngữ đời thường • Có thể dùng emoji'
  },
];

interface BrandFormStepDNAProps {
  // Content
  brandHashtags: string[];
  setBrandHashtags: (value: string[]) => void;
  signaturePhrases: string[];
  setSignaturePhrases: (value: string[]) => void;
  ctaTemplates: string[];
  setCtaTemplates: (value: string[]) => void;
  evergreenThemes: string[];
  setEvergreenThemes: (value: string[]) => void;
  
  // Brand Voice
  brandPositioning: string;
  setBrandPositioning: (value: string) => void;
  toneOfVoice: string[];
  setToneOfVoice: (value: string[]) => void;
  formalityLevel: string;
  setFormalityLevel: (value: string) => void;
  languageStyle: string[];
  setLanguageStyle: (value: string[]) => void;
  allowEmoji: boolean;
  setAllowEmoji: (value: boolean) => void;
  preferredWords: string[];
  setPreferredWords: (value: string[]) => void;
  forbiddenWords: string[];
  setForbiddenWords: (value: string[]) => void;
  complianceRules: string[];
  setComplianceRules: (value: string[]) => void;
}

export function BrandFormStepDNA({
  // Content
  brandHashtags, setBrandHashtags,
  signaturePhrases, setSignaturePhrases,
  ctaTemplates, setCtaTemplates,
  evergreenThemes, setEvergreenThemes,
  // Brand Voice
  brandPositioning, setBrandPositioning,
  toneOfVoice, setToneOfVoice,
  formalityLevel, setFormalityLevel,
  languageStyle, setLanguageStyle,
  allowEmoji, setAllowEmoji,
  preferredWords, setPreferredWords,
  forbiddenWords, setForbiddenWords,
  complianceRules, setComplianceRules,
}: BrandFormStepDNAProps) {
  const [activeTab, setActiveTab] = useState('voice');
  
  // Temp inputs
  const [newHashtag, setNewHashtag] = useState('');
  const [newPhrase, setNewPhrase] = useState('');
  const [newCta, setNewCta] = useState('');
  const [newTheme, setNewTheme] = useState('');

  const addToArray = (
    value: string,
    setter: (value: string[]) => void,
    currentArray: string[],
    clearInput: () => void
  ) => {
    if (value.trim() && !currentArray.includes(value.trim())) {
      setter([...currentArray, value.trim()]);
      clearInput();
    }
  };

  const removeFromArray = (
    index: number,
    setter: (value: string[]) => void,
    currentArray: string[]
  ) => {
    setter(currentArray.filter((_, i) => i !== index));
  };

  const toggleTone = (tone: string) => {
    const isSelected = toneOfVoice.includes(tone);
    if (isSelected) {
      setToneOfVoice(toneOfVoice.filter(t => t !== tone));
    } else if (toneOfVoice.length < 3) {
      const newTones = [...toneOfVoice, tone];
      setToneOfVoice(newTones);
      // Auto-enable emoji if tone suggests it
      const option = TONE_OF_VOICE_OPTIONS.find(o => o.value === tone);
      if (option?.suggestEmoji && !allowEmoji) {
        setAllowEmoji(true);
      }
    }
  };

  const handleAddWord = (
    inputId: string, 
    words: string[], 
    setWords: (v: string[]) => void
  ) => {
    const input = document.getElementById(inputId) as HTMLInputElement;
    const value = input?.value.trim();
    if (value && !words.includes(value)) {
      setWords([...words, value]);
      input.value = '';
    }
  };

  const handleRemoveWord = (
    word: string, 
    words: string[], 
    setWords: (v: string[]) => void
  ) => {
    setWords(words.filter(w => w !== word));
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    inputId: string,
    words: string[],
    setWords: (v: string[]) => void
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddWord(inputId, words, setWords);
    }
  };

  const shouldSuggestEmoji = toneOfVoice.some(tone => {
    const option = TONE_OF_VOICE_OPTIONS.find(o => o.value === tone);
    return option?.suggestEmoji === true;
  });

  const currentFormalityHint = FORMALITY_LEVEL_OPTIONS.find(o => o.value === formalityLevel)?.hint;

  // Count items for badges
  const contentCount = brandHashtags.length + signaturePhrases.length + ctaTemplates.length + evergreenThemes.length;
  const voiceCount = toneOfVoice.length + (brandPositioning ? 1 : 0) + (formalityLevel ? 1 : 0);
  const advancedCount = preferredWords.length + forbiddenWords.length + complianceRules.length;

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-200">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
          <Mic2 className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold">Giọng nói & Content</h3>
          <p className="text-sm text-muted-foreground">Định hình cách thương hiệu giao tiếp</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-10">
          <TabsTrigger value="voice" className="gap-1.5 text-xs sm:text-sm">
            <Mic2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Giọng nói</span>
            <span className="sm:hidden">GN</span>
            {voiceCount > 0 && (
              <Badge variant="secondary" className="h-4 px-1 text-[10px]">{voiceCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="content" className="gap-1.5 text-xs sm:text-sm">
            <Megaphone className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Content</span>
            <span className="sm:hidden">CT</span>
            {contentCount > 0 && (
              <Badge variant="secondary" className="h-4 px-1 text-[10px]">{contentCount}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Voice Tab */}
        <TabsContent value="voice" className="mt-4 space-y-4">
          {/* Brand Positioning */}
          <div className="space-y-2">
            <Label className="text-sm">Định vị thương hiệu</Label>
            <Select value={brandPositioning} onValueChange={setBrandPositioning}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Chọn định vị..." />
              </SelectTrigger>
              <SelectContent>
                {BRAND_POSITIONING_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tone of Voice */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">
                Tone of Voice <span className="text-xs text-muted-foreground">(chọn 1-3)</span>
              </Label>
              {shouldSuggestEmoji && (
                <Badge 
                  variant="secondary" 
                  className="text-[10px] h-5 gap-1 bg-amber-500/10 text-amber-600"
                >
                  <Smile className="w-3 h-3" />
                  Gợi ý emoji
                </Badge>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {TONE_OF_VOICE_OPTIONS.map((opt) => {
                const isSelected = toneOfVoice.includes(opt.value);
                const isDisabled = !isSelected && toneOfVoice.length >= 3;

                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => !isDisabled && toggleTone(opt.value)}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-all",
                      "bg-background/50 text-left",
                      isSelected && "border-primary bg-primary/5 ring-1 ring-primary/20",
                      isDisabled && "opacity-50 cursor-not-allowed",
                      !isSelected && !isDisabled && "hover:border-primary/50 hover:bg-muted/50"
                    )}
                  >
                    <Checkbox checked={isSelected} disabled={isDisabled} className="pointer-events-none" />
                    <span className="flex items-center gap-1.5">
                      {opt.label}
                      {opt.suggestEmoji && <Smile className="w-3.5 h-3.5 text-muted-foreground" />}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Formality Level */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Label className="text-sm">Mức trang trọng</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="text-muted-foreground hover:text-foreground">
                      <Info className="w-3.5 h-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-[250px]">
                    <p className="text-xs">Ảnh hưởng đến phong cách viết, từ ngữ và cấu trúc câu.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Select value={formalityLevel} onValueChange={setFormalityLevel}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Chọn mức độ..." />
              </SelectTrigger>
              <SelectContent>
                {FORMALITY_LEVEL_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {currentFormalityHint && (
              <p className="text-xs text-muted-foreground bg-muted/50 px-2.5 py-1.5 rounded-md">
                💡 {currentFormalityHint}
              </p>
            )}
          </div>

          {/* Emoji toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
            <div className="flex items-center gap-2">
              <Smile className="w-4 h-4 text-muted-foreground" />
              <Label htmlFor="allowEmoji" className="text-sm cursor-pointer">Cho phép emoji</Label>
            </div>
            <Checkbox
              id="allowEmoji"
              checked={allowEmoji}
              onCheckedChange={(checked) => setAllowEmoji(checked === true)}
            />
          </div>

          {/* Advanced Settings */}
          <Card className="border-dashed">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Settings2 className="w-4 h-4" />
                Tuỳ chỉnh nâng cao
                {advancedCount > 0 && (
                  <Badge variant="secondary" className="text-[10px] h-4">{advancedCount}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Preferred Words */}
              <div className="space-y-2">
                <Label className="text-sm text-emerald-600">✓ Từ NÊN dùng</Label>
                {preferredWords.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {preferredWords.map(word => (
                      <Badge key={word} variant="secondary" className="gap-1 text-xs bg-emerald-500/10 text-emerald-700">
                        {word}
                        <button type="button" onClick={() => handleRemoveWord(word, preferredWords, setPreferredWords)}>
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Input
                    id="dna-preferred-word"
                    placeholder="Nhập từ và Enter..."
                    className="h-8 text-sm"
                    onKeyDown={(e) => handleKeyDown(e, 'dna-preferred-word', preferredWords, setPreferredWords)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleAddWord('dna-preferred-word', preferredWords, setPreferredWords)}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {/* Forbidden Words */}
              <div className="space-y-2">
                <Label className="text-sm text-destructive">✗ Từ CẤM dùng</Label>
                {forbiddenWords.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {forbiddenWords.map(word => (
                      <Badge key={word} variant="destructive" className="gap-1 text-xs">
                        {word}
                        <button type="button" onClick={() => handleRemoveWord(word, forbiddenWords, setForbiddenWords)}>
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Input
                    id="dna-forbidden-word"
                    placeholder="Nhập từ và Enter..."
                    className="h-8 text-sm"
                    onKeyDown={(e) => handleKeyDown(e, 'dna-forbidden-word', forbiddenWords, setForbiddenWords)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleAddWord('dna-forbidden-word', forbiddenWords, setForbiddenWords)}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Content Tab */}
        <TabsContent value="content" className="mt-4 space-y-4">
          {/* Brand Hashtags */}
          <div className="space-y-2">
            <Label className="text-sm flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5" />
              Brand Hashtags
            </Label>
            <div className="flex gap-2">
              <Input
                value={newHashtag}
                onChange={(e) => setNewHashtag(e.target.value.replace(/^#/, ''))}
                placeholder="#YourBrandHashtag"
                className="text-sm flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const tag = newHashtag.startsWith('#') ? newHashtag : `#${newHashtag}`;
                    addToArray(tag, setBrandHashtags, brandHashtags, () => setNewHashtag(''));
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const tag = newHashtag.startsWith('#') ? newHashtag : `#${newHashtag}`;
                  addToArray(tag, setBrandHashtags, brandHashtags, () => setNewHashtag(''));
                }}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {brandHashtags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {brandHashtags.map((tag, i) => (
                  <Badge key={i} variant="outline" className="gap-1 text-xs text-primary">
                    {tag}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => removeFromArray(i, setBrandHashtags, brandHashtags)} />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Signature Phrases */}
          <div className="space-y-2">
            <Label className="text-sm flex items-center gap-1.5">
              <MessageSquareQuote className="w-3.5 h-3.5" />
              Signature Phrases
            </Label>
            <div className="flex gap-2">
              <Input
                value={newPhrase}
                onChange={(e) => setNewPhrase(e.target.value)}
                placeholder="Câu nói đặc trưng..."
                className="text-sm flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addToArray(newPhrase, setSignaturePhrases, signaturePhrases, () => setNewPhrase(''));
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addToArray(newPhrase, setSignaturePhrases, signaturePhrases, () => setNewPhrase(''))}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {signaturePhrases.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {signaturePhrases.map((phrase, i) => (
                  <Badge key={i} variant="secondary" className="gap-1 text-xs">
                    "{phrase}"
                    <X className="w-3 h-3 cursor-pointer" onClick={() => removeFromArray(i, setSignaturePhrases, signaturePhrases)} />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* CTA Templates */}
          <div className="space-y-2">
            <Label className="text-sm">CTA Templates</Label>
            <div className="flex gap-2">
              <Input
                value={newCta}
                onChange={(e) => setNewCta(e.target.value)}
                placeholder="Đăng ký ngay để nhận ưu đãi..."
                className="text-sm flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addToArray(newCta, setCtaTemplates, ctaTemplates, () => setNewCta(''));
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addToArray(newCta, setCtaTemplates, ctaTemplates, () => setNewCta(''))}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {ctaTemplates.length > 0 && (
              <div className="space-y-1.5">
                {ctaTemplates.map((cta, i) => (
                  <div key={i} className="flex items-center justify-between bg-muted/50 rounded-md px-3 py-1.5 text-xs">
                    <span>{cta}</span>
                    <X className="w-3.5 h-3.5 cursor-pointer" onClick={() => removeFromArray(i, setCtaTemplates, ctaTemplates)} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Evergreen Themes */}
          <div className="space-y-2">
            <Label className="text-sm">Evergreen Themes</Label>
            <div className="flex gap-2">
              <Input
                value={newTheme}
                onChange={(e) => setNewTheme(e.target.value)}
                placeholder="Chủ đề có thể sử dụng quanh năm..."
                className="text-sm flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addToArray(newTheme, setEvergreenThemes, evergreenThemes, () => setNewTheme(''));
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addToArray(newTheme, setEvergreenThemes, evergreenThemes, () => setNewTheme(''))}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {evergreenThemes.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {evergreenThemes.map((theme, i) => (
                  <Badge key={i} variant="outline" className="gap-1 text-xs">
                    {theme}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => removeFromArray(i, setEvergreenThemes, evergreenThemes)} />
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
