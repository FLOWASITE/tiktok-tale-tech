import { useEffect, useRef } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { FORMALITY_LEVEL_LABELS, TONE_OF_VOICE_LABELS } from '@/lib/brandVoiceNormalization';
import { Textarea } from '@/components/ui/textarea';

// Brand Voice Constants (legacy — giữ export cho nơi khác dùng)
export const BRAND_POSITIONING_OPTIONS = [
  { value: 'business', label: 'Doanh nghiệp' },
  { value: 'expert', label: 'Chuyên gia' },
  { value: 'agency', label: 'Agency' },
  { value: 'consultant', label: 'Tư vấn' },
];

export const TONE_OF_VOICE_OPTIONS = [
  { value: 'expert', label: TONE_OF_VOICE_LABELS.expert, suggestEmoji: false },
  { value: 'calm', label: TONE_OF_VOICE_LABELS.calm, suggestEmoji: false },
  { value: 'confident', label: TONE_OF_VOICE_LABELS.confident, suggestEmoji: false },
  { value: 'friendly', label: TONE_OF_VOICE_LABELS.friendly, suggestEmoji: true },
  { value: 'analytical', label: TONE_OF_VOICE_LABELS.analytical, suggestEmoji: false },
  { value: 'serious', label: TONE_OF_VOICE_LABELS.serious, suggestEmoji: false },
  { value: 'inspirational', label: TONE_OF_VOICE_LABELS.inspirational, suggestEmoji: true },
];

export const FORMALITY_LEVEL_OPTIONS = [
  { 
    value: 'formal', 
    label: FORMALITY_LEVEL_LABELS.formal,
    hint: 'Ngắn gọn, súc tích • Không từ lóng • Câu cấu trúc chặt chẽ'
  },
  { 
    value: 'semi_formal', 
    label: FORMALITY_LEVEL_LABELS.semi_formal,
    hint: 'Rõ ràng, trực tiếp • Có cấu trúc • Không khoa trương'
  },
  { 
    value: 'casual', 
    label: FORMALITY_LEVEL_LABELS.casual,
    hint: 'Cân bằng giữa trang trọng và thân thiện • Linh hoạt theo ngữ cảnh'
  },
  { 
    value: 'friendly', 
    label: FORMALITY_LEVEL_LABELS.friendly,
    hint: 'Thoải mái, tự nhiên • Cho phép từ ngữ đời thường • Có thể dùng emoji'
  },
];

interface BrandFormStepDNAProps {
  
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

// Alias map cho tone cũ → enum chuẩn (data legacy hoặc AI label chưa normalize)
const TONE_ALIASES: Record<string, string> = {
  professional: 'expert',
  authoritative: 'expert',
  trustworthy: 'expert',
  empathetic: 'calm',
  educational: 'analytical',
  conversational: 'friendly',
  playful: 'friendly',
};
const normalizeToneValue = (t: string): string => TONE_ALIASES[t?.toLowerCase?.()] || t;

// Alias map cho formality cũ → enum chuẩn
const FORMALITY_ALIASES: Record<string, string> = {
  neutral: 'semi_formal',
  professional: 'semi_formal',
  formal_enough: 'semi_formal',
};
const normalizeFormalityValue = (f: string): string => FORMALITY_ALIASES[f?.toLowerCase?.()] || f;

export function BrandFormStepDNA({
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
  // Defensive guards: avoid calling array methods on non-array values + normalize legacy tone aliases
  const safeToneOfVoice = (Array.isArray(toneOfVoice) ? toneOfVoice : []).map(normalizeToneValue);
  const safeFormalityLevel = normalizeFormalityValue(formalityLevel || '');
  const safeLanguageStyle = Array.isArray(languageStyle) ? languageStyle : [];
  const safePreferredWords = Array.isArray(preferredWords) ? preferredWords : [];
  const safeForbiddenWords = Array.isArray(forbiddenWords) ? forbiddenWords : [];
  const safeComplianceRules = Array.isArray(complianceRules) ? complianceRules : [];

  // Keep a ref of latest tones to avoid StrictMode/double-invoke edge cases
  const toneRef = useRef<string[]>(safeToneOfVoice);
  useEffect(() => {
    toneRef.current = safeToneOfVoice;
  }, [safeToneOfVoice]);

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
    const normalized = (tone || '').trim();
    if (!normalized) return;

    const prevArr = Array.isArray(toneRef.current) ? toneRef.current : [];
    const isSelected = prevArr.includes(normalized);

    const next = isSelected
      ? prevArr.filter((t) => t !== normalized)
      : prevArr.length < 3
        ? [...prevArr, normalized]
        : prevArr;

    // If nothing changes (hit max 3), do nothing
    if (next === prevArr) return;

    setToneOfVoice(next);

    // Auto-enable emoji if tone suggests it
    const option = TONE_OF_VOICE_OPTIONS.find((o) => o.value === normalized);
    if (!isSelected && option?.suggestEmoji && !allowEmoji) {
      setAllowEmoji(true);
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

  const shouldSuggestEmoji = safeToneOfVoice.some(tone => {
    const option = TONE_OF_VOICE_OPTIONS.find(o => o.value === tone);
    return option?.suggestEmoji === true;
  });

  const currentFormalityHint = FORMALITY_LEVEL_OPTIONS.find(o => o.value === safeFormalityLevel)?.hint;

  // Count items for badges
  const voiceCount = safeToneOfVoice.length + (brandPositioning ? 1 : 0) + (formalityLevel ? 1 : 0);
  const advancedCount = safePreferredWords.length + safeForbiddenWords.length + safeComplianceRules.length;

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-200">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
          <Mic2 className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold">Giọng nói</h3>
          <p className="text-sm text-muted-foreground">Thiết lập Brand Voice & DNA</p>
        </div>
      </div>

      <div className="space-y-4">
          {/* Brand Positioning — free-text 1-2 câu */}
          <div className="space-y-2">
            <Label className="text-sm">Định vị thương hiệu</Label>
            <Textarea
              value={brandPositioning}
              onChange={(e) => setBrandPositioning(e.target.value.slice(0, 280))}
              placeholder="VD: TAF là công ty tư vấn kiểm toán dành cho doanh nghiệp tại Việt Nam, giúp xử lý nhanh các vấn đề thuế – kế toán."
              className="min-h-[72px] text-sm resize-none"
              maxLength={280}
            />
            <p className="text-[11px] text-muted-foreground text-right tabular-nums">
              {brandPositioning.length}/280
            </p>
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
                const isSelected = safeToneOfVoice.includes(opt.value);
                const isDisabled = !isSelected && safeToneOfVoice.length >= 3;

                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!isDisabled) toggleTone(opt.value);
                    }}
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
            <Select value={safeFormalityLevel} onValueChange={setFormalityLevel}>
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
                {safePreferredWords.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {safePreferredWords.map(word => (
                      <Badge key={word} variant="secondary" className="gap-1 text-xs bg-emerald-500/10 text-emerald-700">
                        {word}
                        <button type="button" onClick={() => handleRemoveWord(word, safePreferredWords, setPreferredWords)}>
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
                    onKeyDown={(e) => handleKeyDown(e, 'dna-preferred-word', safePreferredWords, setPreferredWords)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleAddWord('dna-preferred-word', safePreferredWords, setPreferredWords)}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {/* Forbidden Words */}
              <div className="space-y-2">
                <Label className="text-sm text-destructive">✗ Từ CẤM dùng</Label>
                {safeForbiddenWords.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {safeForbiddenWords.map(word => (
                      <Badge key={word} variant="destructive" className="gap-1 text-xs">
                        {word}
                        <button type="button" onClick={() => handleRemoveWord(word, safeForbiddenWords, setForbiddenWords)}>
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
                    onKeyDown={(e) => handleKeyDown(e, 'dna-forbidden-word', safeForbiddenWords, setForbiddenWords)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleAddWord('dna-forbidden-word', safeForbiddenWords, setForbiddenWords)}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
