import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Target, 
  Lightbulb, 
  Hash, 
  MessageSquareQuote, 
  Megaphone, 
  ChevronDown, 
  Plus, 
  X,
  Sparkles,
  Swords
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface BrandFormStepStrategyProps {
  // Brand Identity
  mission: string;
  setMission: (value: string) => void;
  vision: string;
  setVision: (value: string) => void;
  uniqueValueProposition: string;
  setUniqueValueProposition: (value: string) => void;
  tagline: string;
  setTagline: (value: string) => void;
  
  // Content Strategy
  brandHashtags: string[];
  setBrandHashtags: (value: string[]) => void;
  signaturePhrases: string[];
  setSignaturePhrases: (value: string[]) => void;
  ctaTemplates: string[];
  setCtaTemplates: (value: string[]) => void;
  evergreenThemes: string[];
  setEvergreenThemes: (value: string[]) => void;
  
  // Brand Assets
  secondaryColors: string[];
  setSecondaryColors: (value: string[]) => void;
  imageStyle: string;
  setImageStyle: (value: string) => void;
  
  // Competitor
  mainCompetitors: string[];
  setMainCompetitors: (value: string[]) => void;
  competitiveAdvantages: string[];
  setCompetitiveAdvantages: (value: string[]) => void;
}


const IMAGE_STYLES = [
  { value: 'minimal', label: 'Minimal (Tối giản)' },
  { value: 'vibrant', label: 'Vibrant (Sống động)' },
  { value: 'professional', label: 'Professional (Chuyên nghiệp)' },
  { value: 'playful', label: 'Playful (Vui nhộn)' },
  { value: 'elegant', label: 'Elegant (Thanh lịch)' },
  { value: 'bold', label: 'Bold (Mạnh mẽ)' },
];

export function BrandFormStepStrategy({
  mission, setMission,
  vision, setVision,
  uniqueValueProposition, setUniqueValueProposition,
  tagline, setTagline,
  brandHashtags, setBrandHashtags,
  signaturePhrases, setSignaturePhrases,
  ctaTemplates, setCtaTemplates,
  evergreenThemes, setEvergreenThemes,
  secondaryColors, setSecondaryColors,
  imageStyle, setImageStyle,
  mainCompetitors, setMainCompetitors,
  competitiveAdvantages, setCompetitiveAdvantages,
}: BrandFormStepStrategyProps) {
  const [newHashtag, setNewHashtag] = useState('');
  const [newPhrase, setNewPhrase] = useState('');
  const [newCta, setNewCta] = useState('');
  const [newTheme, setNewTheme] = useState('');
  const [newCompetitor, setNewCompetitor] = useState('');
  const [newAdvantage, setNewAdvantage] = useState('');
  const [newColor, setNewColor] = useState('#6366f1');
  
  const [openSections, setOpenSections] = useState({
    identity: true,
    content: false,
    competitor: false,
  });

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

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

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-200">
      {/* Brand Identity Section */}
      <Collapsible open={openSections.identity} onOpenChange={() => toggleSection('identity')}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-primary" />
                  <div>
                    <CardTitle className="text-base">Brand Identity</CardTitle>
                    <CardDescription className="text-xs">Mission, Vision, UVP & Tagline</CardDescription>
                  </div>
                </div>
                <ChevronDown className={cn(
                  "w-4 h-4 transition-transform",
                  openSections.identity && "rotate-180"
                )} />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-0">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="mission" className="text-sm flex items-center gap-1">
                    <Target className="w-3.5 h-3.5" />
                    Mission (Sứ mệnh)
                  </Label>
                  <Textarea
                    id="mission"
                    value={mission}
                    onChange={(e) => setMission(e.target.value)}
                    placeholder="Chúng tôi tồn tại để..."
                    className="min-h-[80px] text-sm"
                  />
                  <p className="text-[10px] text-muted-foreground">Lý do tồn tại của thương hiệu</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="vision" className="text-sm flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    Vision (Tầm nhìn)
                  </Label>
                  <Textarea
                    id="vision"
                    value={vision}
                    onChange={(e) => setVision(e.target.value)}
                    placeholder="Trong 5-10 năm tới, chúng tôi sẽ..."
                    className="min-h-[80px] text-sm"
                  />
                  <p className="text-[10px] text-muted-foreground">Mục tiêu dài hạn của thương hiệu</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="uvp" className="text-sm">
                  Unique Value Proposition (UVP)
                </Label>
                <Textarea
                  id="uvp"
                  value={uniqueValueProposition}
                  onChange={(e) => setUniqueValueProposition(e.target.value)}
                  placeholder="Điều gì khiến bạn khác biệt? Tại sao khách hàng nên chọn bạn?"
                  className="min-h-[60px] text-sm"
                />
                <p className="text-[10px] text-muted-foreground">Giá trị độc đáo mà chỉ bạn mang lại</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tagline" className="text-sm">
                  Tagline / Slogan
                </Label>
                <Input
                  id="tagline"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="Just Do It, Think Different, ..."
                  className="text-sm"
                />
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Content Strategy Section */}
      <Collapsible open={openSections.content} onOpenChange={() => toggleSection('content')}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Megaphone className="w-5 h-5 text-primary" />
                  <div>
                    <CardTitle className="text-base">Content Strategy</CardTitle>
                    <CardDescription className="text-xs">Hashtags, Signature Phrases, CTAs</CardDescription>
                  </div>
                </div>
                <ChevronDown className={cn(
                  "w-4 h-4 transition-transform",
                  openSections.content && "rotate-180"
                )} />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-0">
              {/* Brand Hashtags */}
              <div className="space-y-2">
                <Label className="text-sm flex items-center gap-1">
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
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {brandHashtags.map((tag, i) => (
                      <Badge key={i} variant="outline" className="gap-1 text-xs text-primary">
                        {tag}
                        <X
                          className="w-3 h-3 cursor-pointer hover:text-destructive"
                          onClick={() => removeFromArray(i, setBrandHashtags, brandHashtags)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Signature Phrases */}
              <div className="space-y-2">
                <Label className="text-sm flex items-center gap-1">
                  <MessageSquareQuote className="w-3.5 h-3.5" />
                  Signature Phrases (Câu nói đặc trưng)
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={newPhrase}
                    onChange={(e) => setNewPhrase(e.target.value)}
                    placeholder="Câu nói thường xuất hiện trong content..."
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
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {signaturePhrases.map((phrase, i) => (
                      <Badge key={i} variant="secondary" className="gap-1 text-xs">
                        "{phrase}"
                        <X
                          className="w-3 h-3 cursor-pointer hover:text-destructive"
                          onClick={() => removeFromArray(i, setSignaturePhrases, signaturePhrases)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* CTA Templates */}
              <div className="space-y-2">
                <Label className="text-sm">CTA Templates (Mẫu kêu gọi hành động)</Label>
                <div className="flex gap-2">
                  <Input
                    value={newCta}
                    onChange={(e) => setNewCta(e.target.value)}
                    placeholder="VD: Đăng ký ngay để nhận ưu đãi..."
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
                  <div className="space-y-1.5 mt-2">
                    {ctaTemplates.map((cta, i) => (
                      <div key={i} className="flex items-center justify-between bg-muted/50 rounded-md px-3 py-1.5 text-xs">
                        <span>{cta}</span>
                        <X
                          className="w-3.5 h-3.5 cursor-pointer hover:text-destructive"
                          onClick={() => removeFromArray(i, setCtaTemplates, ctaTemplates)}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Evergreen Themes */}
              <div className="space-y-2">
                <Label className="text-sm">Evergreen Themes (Chủ đề xanh)</Label>
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
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {evergreenThemes.map((theme, i) => (
                      <Badge key={i} variant="outline" className="gap-1 text-xs">
                        {theme}
                        <X
                          className="w-3 h-3 cursor-pointer hover:text-destructive"
                          onClick={() => removeFromArray(i, setEvergreenThemes, evergreenThemes)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Image Style */}
              <div className="space-y-2">
                <Label className="text-sm">Image Style</Label>
                <Select value={imageStyle} onValueChange={setImageStyle}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Chọn phong cách hình ảnh" />
                  </SelectTrigger>
                  <SelectContent>
                    {IMAGE_STYLES.map(style => (
                      <SelectItem key={style.value} value={style.value}>{style.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Secondary Colors */}
              <div className="space-y-2">
                <Label className="text-sm">Secondary Colors</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={newColor}
                    onChange={(e) => setNewColor(e.target.value)}
                    className="w-12 h-9 p-1 cursor-pointer"
                  />
                  <Input
                    value={newColor}
                    onChange={(e) => setNewColor(e.target.value)}
                    placeholder="#6366f1"
                    className="text-sm flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addToArray(newColor, setSecondaryColors, secondaryColors, () => setNewColor('#6366f1'))}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {secondaryColors.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {secondaryColors.map((color, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-1.5 bg-muted rounded-full px-2 py-1"
                      >
                        <div
                          className="w-4 h-4 rounded-full border"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-xs">{color}</span>
                        <X
                          className="w-3 h-3 cursor-pointer hover:text-destructive"
                          onClick={() => removeFromArray(i, setSecondaryColors, secondaryColors)}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Competitor Section */}
      <Collapsible open={openSections.competitor} onOpenChange={() => toggleSection('competitor')}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Swords className="w-5 h-5 text-primary" />
                  <div>
                    <CardTitle className="text-base">Competitor Analysis</CardTitle>
                    <CardDescription className="text-xs">Đối thủ & Lợi thế cạnh tranh</CardDescription>
                  </div>
                </div>
                <ChevronDown className={cn(
                  "w-4 h-4 transition-transform",
                  openSections.competitor && "rotate-180"
                )} />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-0">
              {/* Main Competitors */}
              <div className="space-y-2">
                <Label className="text-sm">Đối thủ chính</Label>
                <div className="flex gap-2">
                  <Input
                    value={newCompetitor}
                    onChange={(e) => setNewCompetitor(e.target.value)}
                    placeholder="Tên đối thủ cạnh tranh..."
                    className="text-sm flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addToArray(newCompetitor, setMainCompetitors, mainCompetitors, () => setNewCompetitor(''));
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addToArray(newCompetitor, setMainCompetitors, mainCompetitors, () => setNewCompetitor(''))}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {mainCompetitors.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {mainCompetitors.map((comp, i) => (
                      <Badge key={i} variant="destructive" className="gap-1 text-xs bg-destructive/10 text-destructive hover:bg-destructive/20">
                        {comp}
                        <X
                          className="w-3 h-3 cursor-pointer"
                          onClick={() => removeFromArray(i, setMainCompetitors, mainCompetitors)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Competitive Advantages */}
              <div className="space-y-2">
                <Label className="text-sm">Lợi thế cạnh tranh</Label>
                <div className="flex gap-2">
                  <Input
                    value={newAdvantage}
                    onChange={(e) => setNewAdvantage(e.target.value)}
                    placeholder="Điểm mạnh so với đối thủ..."
                    className="text-sm flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addToArray(newAdvantage, setCompetitiveAdvantages, competitiveAdvantages, () => setNewAdvantage(''));
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addToArray(newAdvantage, setCompetitiveAdvantages, competitiveAdvantages, () => setNewAdvantage(''))}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {competitiveAdvantages.length > 0 && (
                  <div className="space-y-1.5 mt-2">
                    {competitiveAdvantages.map((adv, i) => (
                      <div key={i} className="flex items-center justify-between bg-primary/5 rounded-md px-3 py-1.5 text-xs border border-primary/20">
                        <span className="text-primary">✓ {adv}</span>
                        <X
                          className="w-3.5 h-3.5 cursor-pointer hover:text-destructive"
                          onClick={() => removeFromArray(i, setCompetitiveAdvantages, competitiveAdvantages)}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}