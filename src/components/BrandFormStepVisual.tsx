import { useRef, useCallback, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { BrandColorPicker } from '@/components/BrandColorPicker';
import { Upload, X, Image as ImageIcon, Wand2, Loader2, Sparkles, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BrandFormStepVisualProps {
  brandName: string;
  industries: string[];
  primaryColor: string;
  setPrimaryColor: (value: string) => void;
  logoPreview: string | null;
  setLogoPreview: (value: string | null) => void;
  logoFile: File | null;
  setLogoFile: (file: File | null) => void;
  deleteLogo: boolean;
  setDeleteLogo: (value: boolean) => void;
  existingLogoUrl?: string | null;
  brandGuideline: string;
  setBrandGuideline: (value: string) => void;
  includeLogo: boolean;
  setIncludeLogo: (value: boolean) => void;
  isDefault: boolean;
  setIsDefault: (value: boolean) => void;
  // AI results
  guidelineExampleGood: string;
  setGuidelineExampleGood: (value: string) => void;
  guidelineExampleBad: string;
  setGuidelineExampleBad: (value: string) => void;
  guidelineKeyPrinciples: string[];
  setGuidelineKeyPrinciples: (value: string[]) => void;
  // Brand voice for AI generation
  toneOfVoice: string[];
  formalityLevel: string;
  brandPositioning: string;
  languageStyle: string[];
  preferredWords: string[];
  forbiddenWords: string[];
}

export function BrandFormStepVisual({
  brandName,
  industries,
  primaryColor,
  setPrimaryColor,
  logoPreview,
  setLogoPreview,
  logoFile,
  setLogoFile,
  deleteLogo,
  setDeleteLogo,
  existingLogoUrl,
  brandGuideline,
  setBrandGuideline,
  includeLogo,
  setIncludeLogo,
  isDefault,
  setIsDefault,
  guidelineExampleGood,
  setGuidelineExampleGood,
  guidelineExampleBad,
  setGuidelineExampleBad,
  guidelineKeyPrinciples,
  setGuidelineKeyPrinciples,
  toneOfVoice,
  formalityLevel,
  brandPositioning,
  languageStyle,
  preferredWords,
  forbiddenWords,
}: BrandFormStepVisualProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isGeneratingGuideline, setIsGeneratingGuideline] = useState(false);

  const handleFileSelect = useCallback((file: File) => {
    if (file && file.type.startsWith('image/')) {
      setLogoFile(file);
      setDeleteLogo(false);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, [setLogoFile, setDeleteLogo, setLogoPreview]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    setDeleteLogo(!!existingLogoUrl);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleGenerateGuideline = async () => {
    if (!brandName.trim()) {
      toast.error('Cần có tên brand để tạo guideline');
      return;
    }

    setIsGeneratingGuideline(true);
    setGuidelineExampleGood('');
    setGuidelineExampleBad('');
    setGuidelineKeyPrinciples([]);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-brand-guideline', {
        body: {
          brand_name: brandName.trim(),
          industry: industries,
          primary_color: primaryColor,
          has_logo: !!logoFile || !!logoPreview || !!existingLogoUrl,
          tone_of_voice: toneOfVoice,
          formality_level: formalityLevel,
          brand_positioning: brandPositioning,
          language_style: languageStyle,
          preferred_words: preferredWords,
          forbidden_words: forbiddenWords,
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
        toast.success('Đã tạo Brand Guideline với AI!');
      }
    } catch (error) {
      console.error('Error generating guideline:', error);
      toast.error('Không thể tạo guideline. Vui lòng thử lại.');
    } finally {
      setIsGeneratingGuideline(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-200">
      <div className="grid gap-6 md:grid-cols-2">
        {/* Left Column - Logo & Color */}
        <div className="space-y-5">
          {/* Logo Upload */}
          <div className="space-y-2">
            <Label>Logo thương hiệu</Label>
            <div
              className={`border-2 border-dashed rounded-lg p-4 transition-colors ${
                isDragging ? 'border-primary bg-primary/5' : 'border-border'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="flex items-center gap-4">
                {logoPreview ? (
                  <div className="relative w-16 h-16 rounded-lg border overflow-hidden bg-muted shrink-0">
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      className="w-full h-full object-contain"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="absolute -top-1 -right-1 p-1 rounded-full bg-destructive text-destructive-foreground shadow-md hover:bg-destructive/90"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-lg border border-dashed flex items-center justify-center bg-muted/50 shrink-0">
                    <ImageIcon className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    id="logo-upload"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    {logoPreview ? 'Thay đổi' : 'Upload'}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">
                    Kéo thả hoặc click để upload
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Color Picker */}
          <BrandColorPicker value={primaryColor} onChange={setPrimaryColor} />

          {/* Checkboxes */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeLogo"
                checked={includeLogo}
                onCheckedChange={(checked) => setIncludeLogo(checked === true)}
              />
              <Label htmlFor="includeLogo" className="text-sm cursor-pointer">
                Bao gồm Logo trong carousel
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="isDefault"
                checked={isDefault}
                onCheckedChange={(checked) => setIsDefault(checked === true)}
              />
              <Label htmlFor="isDefault" className="text-sm cursor-pointer">
                Đặt làm mặc định
              </Label>
            </div>
          </div>
        </div>

        {/* Right Column - Brand Guideline */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="brandGuideline">Brand Guideline</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleGenerateGuideline}
              disabled={isGeneratingGuideline || !brandName.trim()}
              className="gap-1 h-7 text-xs"
            >
              {isGeneratingGuideline ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Wand2 className="w-3 h-3" />
              )}
              AI Tạo Guideline
            </Button>
          </div>
          <Textarea
            id="brandGuideline"
            value={brandGuideline}
            onChange={(e) => setBrandGuideline(e.target.value)}
            placeholder="Mô tả phong cách, màu sắc, tone of voice..."
            rows={6}
            className="resize-none"
          />
          
          {/* AI Guideline Preview */}
          {(guidelineExampleGood || guidelineExampleBad || guidelineKeyPrinciples.length > 0) && (
            <div className="mt-3 space-y-3 p-3 rounded-lg border border-primary/20 bg-primary/5">
              <div className="flex items-center gap-2 text-sm font-medium text-primary">
                <Sparkles className="w-4 h-4" />
                AI Preview
              </div>
              
              {guidelineKeyPrinciples.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Nguyên tắc chính:</p>
                  <ul className="text-xs space-y-1 list-disc list-inside text-foreground/80">
                    {guidelineKeyPrinciples.map((principle, idx) => (
                      <li key={idx}>{principle}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {guidelineExampleGood && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-green-600 dark:text-green-400 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Ví dụ đúng:
                  </p>
                  <p className="text-xs p-2 rounded bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 text-green-800 dark:text-green-300">
                    "{guidelineExampleGood}"
                  </p>
                </div>
              )}
              
              {guidelineExampleBad && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-red-600 dark:text-red-400 flex items-center gap-1">
                    <X className="w-3 h-3" /> Ví dụ sai (tránh):
                  </p>
                  <p className="text-xs p-2 rounded bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-800 dark:text-red-300 line-through">
                    "{guidelineExampleBad}"
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
