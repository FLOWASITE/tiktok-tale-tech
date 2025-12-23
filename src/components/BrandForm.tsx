import { useState, useEffect, useMemo } from 'react';
import { BrandTemplate, BrandScope } from '@/hooks/useBrandTemplates';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { BrandFormStepper, BRAND_FORM_STEPS } from '@/components/BrandFormStepper';
import { BrandFormQuickStart } from '@/components/BrandFormQuickStart';
import { BrandFormStepIdentity } from '@/components/BrandFormStepIdentity';
import { BrandFormStepVisual } from '@/components/BrandFormStepVisual';
import { BrandVoiceSection } from '@/components/BrandVoiceSection';
import { BrandVoicePreview } from '@/components/BrandVoicePreview';
import { AIBrandVoiceGenerator } from '@/components/AIBrandVoiceGenerator';
import { ChannelSettingsEditor, ChannelOverrides } from '@/components/ChannelSettingsEditor';
import { BrandFormMiniPreview } from '@/components/BrandFormMiniPreview';
import { IndustryTemplate } from '@/hooks/useIndustryTemplates';
import { DEFAULT_BRAND_GUIDELINE } from '@/types/carousel';
import { ChevronLeft, ChevronRight, Loader2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

type BrandFormData = Omit<BrandTemplate, 'id' | 'created_at' | 'updated_at' | 'user_id' | 'organization_id'>;

interface BrandFormProps {
  template?: BrandTemplate | null;
  onSubmit: (data: BrandFormData, scope: BrandScope, logoFile?: File | null, deleteLogo?: boolean) => void;
  onCancel: () => void;
  isLoading?: boolean;
  quickStartMode?: boolean;
}

export function BrandForm({ template, onSubmit, onCancel, isLoading, quickStartMode = false }: BrandFormProps) {
  const [currentStep, setCurrentStep] = useState(quickStartMode ? 0 : 1);
  const [showQuickStart, setShowQuickStart] = useState(!template && !quickStartMode);
  
  // Form state
  const [scope, setScope] = useState<BrandScope>('personal');
  const [name, setName] = useState('');
  const [brandName, setBrandName] = useState('');
  const [industries, setIndustries] = useState<string[]>([]);
  const [brandGuideline, setBrandGuideline] = useState('');
  const [includeLogo, setIncludeLogo] = useState(true);
  const [isDefault, setIsDefault] = useState(false);
  const [primaryColor, setPrimaryColor] = useState('#000000');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [deleteLogo, setDeleteLogo] = useState(false);

  // Brand Voice
  const [brandPositioning, setBrandPositioning] = useState('');
  const [toneOfVoice, setToneOfVoice] = useState<string[]>([]);
  const [formalityLevel, setFormalityLevel] = useState('');
  const [languageStyle, setLanguageStyle] = useState<string[]>([]);
  const [preferredWords, setPreferredWords] = useState<string[]>([]);
  const [forbiddenWords, setForbiddenWords] = useState<string[]>([]);
  const [allowEmoji, setAllowEmoji] = useState(true);
  const [complianceRules, setComplianceRules] = useState<string[]>([]);
  const [channelOverrides, setChannelOverrides] = useState<ChannelOverrides>({});
  const [industryTemplateId, setIndustryTemplateId] = useState<string | null>(null);
  
  // Validation & AI
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [guidelineExampleGood, setGuidelineExampleGood] = useState('');
  const [guidelineExampleBad, setGuidelineExampleBad] = useState('');
  const [guidelineKeyPrinciples, setGuidelineKeyPrinciples] = useState<string[]>([]);
  const [showPreview, setShowPreview] = useState(true);

  useEffect(() => {
    if (template) {
      setName(template.name);
      setBrandName(template.brand_name);
      setIndustries(template.industry || []);
      setBrandGuideline(template.brand_guideline);
      setIncludeLogo(template.include_logo);
      setIsDefault(template.is_default);
      setPrimaryColor(template.primary_color || '#000000');
      setLogoPreview(template.logo_url);
      setScope(template.organization_id ? 'organization' : 'personal');
      setBrandPositioning(template.brand_positioning || '');
      setToneOfVoice(template.tone_of_voice || []);
      setFormalityLevel(template.formality_level || '');
      setLanguageStyle(template.language_style || []);
      setPreferredWords(template.preferred_words || []);
      setForbiddenWords(template.forbidden_words || []);
      setAllowEmoji(template.allow_emoji ?? true);
      setComplianceRules(template.compliance_rules || []);
      setChannelOverrides(template.channel_overrides || {});
      setIndustryTemplateId(template.industry_template_id || null);
      setShowQuickStart(false);
      setCurrentStep(1);
    } else {
      setBrandGuideline(DEFAULT_BRAND_GUIDELINE);
    }
  }, [template]);

  const completionPercentage = useMemo(() => {
    let score = 0;
    if (name.trim()) score += 15;
    if (brandName.trim()) score += 15;
    if (brandGuideline.trim() && brandGuideline !== DEFAULT_BRAND_GUIDELINE) score += 10;
    if (industries.length > 0) score += 10;
    if (brandPositioning) score += 10;
    if (toneOfVoice.length > 0) score += 10;
    if (formalityLevel) score += 10;
    if (languageStyle.length > 0) score += 10;
    if (primaryColor !== '#000000') score += 5;
    if (logoPreview) score += 5;
    return Math.min(score, 100);
  }, [name, brandName, brandGuideline, industries, brandPositioning, toneOfVoice, formalityLevel, languageStyle, primaryColor, logoPreview]);

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};
    if (step === 1 && !brandName.trim()) {
      newErrors.brandName = 'Tên thương hiệu là bắt buộc';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 4));
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleStepClick = (step: number) => {
    if (step < currentStep || validateStep(currentStep)) {
      setCurrentStep(step);
    }
  };

  const handleIndustryTemplateSelect = (templateData: IndustryTemplate) => {
    setIndustryTemplateId(templateData.id);
    setIndustries([templateData.name]);
    setBrandPositioning(templateData.brand_positioning || '');
    setToneOfVoice(templateData.brand_voice.tone_of_voice || []);
    setFormalityLevel(templateData.brand_voice.formality_level || '');
    setLanguageStyle(templateData.brand_voice.language_style || []);
    setAllowEmoji(templateData.brand_voice.allow_emoji || false);
    setPreferredWords(templateData.preferred_words || []);
    setForbiddenWords(templateData.forbidden_words || []);
    setShowQuickStart(false);
    setCurrentStep(1);
    toast.success('Đã liên kết Industry Memory!');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentStep !== 4) return;
    if (!validateStep(1)) {
      setCurrentStep(1);
      return;
    }

    onSubmit({
      name: name.trim(),
      brand_name: brandName.trim(),
      industry: industries.length > 0 ? industries : null,
      brand_guideline: brandGuideline.trim(),
      include_logo: includeLogo,
      is_default: isDefault,
      primary_color: primaryColor,
      logo_url: deleteLogo ? null : template?.logo_url || null,
      industry_template_id: industryTemplateId,
      brand_positioning: brandPositioning || null,
      tone_of_voice: toneOfVoice.length > 0 ? toneOfVoice : null,
      formality_level: formalityLevel || null,
      language_style: languageStyle.length > 0 ? languageStyle : null,
      preferred_words: preferredWords.length > 0 ? preferredWords : null,
      forbidden_words: forbiddenWords.length > 0 ? forbiddenWords : null,
      allow_emoji: allowEmoji,
      compliance_rules: complianceRules.length > 0 ? complianceRules : null,
      channel_overrides: Object.keys(channelOverrides).length > 0 ? channelOverrides : null,
    }, scope, logoFile, deleteLogo);
  };

  // Quick Start Screen
  if (showQuickStart && !template) {
    return (
      <BrandFormQuickStart
        onSelectIndustry={handleIndustryTemplateSelect}
        onStartManual={() => {
          setShowQuickStart(false);
          setCurrentStep(1);
        }}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <button type="submit" disabled hidden aria-hidden="true" />

      <BrandFormStepper
        currentStep={currentStep}
        onStepClick={handleStepClick}
        completedSteps={[]}
        validationErrors={errors.brandName ? { 1: true } : {}}
      />

      <div className="flex items-center gap-3 px-1">
        <Progress value={completionPercentage} className="h-2 flex-1" />
        <span className="text-xs text-muted-foreground font-medium w-12 text-right">{completionPercentage}%</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowPreview(!showPreview)}
          className="gap-1 text-xs h-7 px-2 hidden lg:flex"
        >
          {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          {showPreview ? 'Ẩn' : 'Xem trước'}
        </Button>
      </div>

      <div className="flex gap-6">
        {/* Main form content */}
        <div className={showPreview ? 'flex-1 min-w-0' : 'w-full'}>
          {/* Step 1: Identity */}
          {currentStep === 1 && (
            <BrandFormStepIdentity
              brandName={brandName}
              setBrandName={setBrandName}
              scope={scope}
              setScope={setScope}
              industryTemplateId={industryTemplateId}
              setIndustryTemplateId={setIndustryTemplateId}
              setIndustries={setIndustries}
              setBrandPositioning={setBrandPositioning}
              setToneOfVoice={setToneOfVoice}
              setFormalityLevel={setFormalityLevel}
              setLanguageStyle={setLanguageStyle}
              setAllowEmoji={setAllowEmoji}
              setPreferredWords={setPreferredWords}
              setForbiddenWords={setForbiddenWords}
              setName={setName}
              errors={errors}
              setErrors={setErrors}
              isEditing={!!template}
            />
          )}

          {/* Step 2: Visual */}
          {currentStep === 2 && (
            <BrandFormStepVisual
              brandName={brandName}
              industries={industries}
              primaryColor={primaryColor}
              setPrimaryColor={setPrimaryColor}
              logoPreview={logoPreview}
              setLogoPreview={setLogoPreview}
              logoFile={logoFile}
              setLogoFile={setLogoFile}
              deleteLogo={deleteLogo}
              setDeleteLogo={setDeleteLogo}
              existingLogoUrl={template?.logo_url}
              brandGuideline={brandGuideline}
              setBrandGuideline={setBrandGuideline}
              includeLogo={includeLogo}
              setIncludeLogo={setIncludeLogo}
              isDefault={isDefault}
              setIsDefault={setIsDefault}
              guidelineExampleGood={guidelineExampleGood}
              setGuidelineExampleGood={setGuidelineExampleGood}
              guidelineExampleBad={guidelineExampleBad}
              setGuidelineExampleBad={setGuidelineExampleBad}
              guidelineKeyPrinciples={guidelineKeyPrinciples}
              setGuidelineKeyPrinciples={setGuidelineKeyPrinciples}
              toneOfVoice={toneOfVoice}
              formalityLevel={formalityLevel}
              brandPositioning={brandPositioning}
              languageStyle={languageStyle}
              preferredWords={preferredWords}
              forbiddenWords={forbiddenWords}
            />
          )}

          {/* Step 3: Brand Voice */}
          {currentStep === 3 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-2 duration-200">
              <div className="flex items-center justify-between">
                <span className="text-base font-medium">Brand Voice Profile</span>
                <AIBrandVoiceGenerator
                  brandName={brandName}
                  brandGuideline={brandGuideline}
                  currentIndustry={industries}
                  primaryColor={primaryColor}
                  brandPositioning={brandPositioning}
                  toneOfVoice={toneOfVoice}
                  formalityLevel={formalityLevel}
                  languageStyle={languageStyle}
                  preferredWords={preferredWords}
                  forbiddenWords={forbiddenWords}
                  hasLogo={!!logoFile || !!logoPreview || !!template?.logo_url}
                  onGuidelineGenerated={(result) => {
                    setBrandGuideline(result.guideline);
                    if (result.example_good) setGuidelineExampleGood(result.example_good);
                    if (result.example_bad) setGuidelineExampleBad(result.example_bad);
                    if (result.key_principles) setGuidelineKeyPrinciples(result.key_principles);
                  }}
                  onApply={(suggestions) => {
                    if (suggestions.brand_positioning) setBrandPositioning(suggestions.brand_positioning);
                    if (suggestions.tone_of_voice) setToneOfVoice(suggestions.tone_of_voice);
                    if (suggestions.formality_level) setFormalityLevel(suggestions.formality_level);
                    if (suggestions.language_style) setLanguageStyle(suggestions.language_style);
                    if (suggestions.preferred_words) setPreferredWords(suggestions.preferred_words);
                    if (suggestions.forbidden_words) setForbiddenWords(suggestions.forbidden_words);
                    if (suggestions.allow_emoji !== undefined) setAllowEmoji(suggestions.allow_emoji);
                  }}
                />
              </div>
              <BrandVoiceSection
                brandPositioning={brandPositioning}
                onBrandPositioningChange={setBrandPositioning}
                toneOfVoice={toneOfVoice}
                onToneOfVoiceChange={setToneOfVoice}
                formalityLevel={formalityLevel}
                onFormalityLevelChange={setFormalityLevel}
                languageStyle={languageStyle}
                onLanguageStyleChange={setLanguageStyle}
                preferredWords={preferredWords}
                onPreferredWordsChange={setPreferredWords}
                forbiddenWords={forbiddenWords}
                onForbiddenWordsChange={setForbiddenWords}
                allowEmoji={allowEmoji}
                onAllowEmojiChange={setAllowEmoji}
                complianceRules={complianceRules}
                onComplianceRulesChange={setComplianceRules}
              />
              <BrandVoicePreview
                brandName={brandName}
                positioning={brandPositioning}
                toneOfVoice={toneOfVoice}
                formalityLevel={formalityLevel}
                languageStyle={languageStyle}
                allowEmoji={allowEmoji}
              />
            </div>
          )}

          {/* Step 4: Channel Settings */}
          {currentStep === 4 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-200">
              <ChannelSettingsEditor
                value={channelOverrides}
                onChange={setChannelOverrides}
                defaultExpanded={true}
                showWrapper={true}
              />
            </div>
          )}
        </div>

        {/* Mini Preview Panel */}
        {showPreview && (
          <div className="hidden lg:block w-64 shrink-0">
            <BrandFormMiniPreview
              brandName={brandName}
              scope={scope}
              industries={industries}
              primaryColor={primaryColor}
              logoPreview={logoPreview}
              brandPositioning={brandPositioning}
              toneOfVoice={toneOfVoice}
              formalityLevel={formalityLevel}
              languageStyle={languageStyle}
              allowEmoji={allowEmoji}
              preferredWords={preferredWords}
              forbiddenWords={forbiddenWords}
              channelOverrides={channelOverrides}
              completionPercentage={completionPercentage}
            />
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t">
        <div>
          {currentStep > 1 ? (
            <Button type="button" variant="ghost" onClick={handleBack} className="gap-1">
              <ChevronLeft className="w-4 h-4" />
              Quay lại
            </Button>
          ) : (
            <Button type="button" variant="ghost" onClick={onCancel}>
              Hủy
            </Button>
          )}
        </div>

        <div className="flex gap-2">
          {currentStep < 4 ? (
            <Button type="button" onClick={handleNext} className="gap-1">
              Tiếp tục
              <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button type="submit" disabled={isLoading} className="gap-2">
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {template ? 'Cập nhật' : 'Tạo Brand'}
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}
