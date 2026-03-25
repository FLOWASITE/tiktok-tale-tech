import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { 
  ArrowLeft, 
  ArrowRight, 
  Check,
  Target,
  MessageSquare,
  DollarSign,
  Layers,
  Flag,
  X,
  Loader2,
  Sparkles,
  Info,
  Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCampaigns, useCampaignDetail } from '@/hooks/useCampaigns';
import { useBrandTemplates } from '@/hooks/useBrandTemplates';
import { supabase } from '@/integrations/supabase/client';
import { 
  CAMPAIGN_TYPES, 
  KPI_METRICS,
  type CampaignFormData,
  type CampaignType,
  type CampaignGoal,
  type CampaignMetric,
  type MilestoneFormData,
  type CampaignContentBrief,
} from '@/types/campaign';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CampaignFormStepper } from '@/components/campaign/CampaignFormStepper';
import { CampaignMilestoneEditor } from '@/components/campaign/CampaignMilestoneEditor';
import { CampaignCreatePreviewPanel } from '@/components/campaign/CampaignCreatePreviewPanel';
import { CampaignTemplateSelector } from '@/components/campaign/CampaignTemplateSelector';
import { 
  CampaignTemplate, 
  generateGoalsFromTemplate, 
  generateMilestonesFromTemplate,
  calculateEndDate 
} from '@/data/campaignTemplates';
import { toast } from 'sonner';

const CHANNELS = [
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'twitter', label: 'Twitter/X' },
  { value: 'zalo', label: 'Zalo' },
  { value: 'email', label: 'Email' },
];

const TOTAL_STEPS = 5;

export default function CampaignCreate() {
  const navigate = useNavigate();
  const { id: campaignId } = useParams<{ id: string }>();
  const isEditMode = !!campaignId;
  
  const { createCampaign, updateCampaign, isCreating, isUpdating } = useCampaigns();
  const { campaign: existingCampaign, milestones: existingMilestones, isLoading: isLoadingCampaign } = useCampaignDetail(campaignId);
  const { templates: brands } = useBrandTemplates();
  
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<Partial<CampaignFormData>>({
    name: '',
    description: '',
    campaign_type: 'awareness',
    start_date: '',
    end_date: '',
    goals: [],
    budget_total: undefined,
    budget_currency: 'VND',
    target_channels: [],
    brand_template_id: undefined,
    content_brief: undefined,
  });
  const [milestones, setMilestones] = useState<MilestoneFormData[]>([]);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(!isEditMode);
  const [selectedTemplate, setSelectedTemplate] = useState<CampaignTemplate | null>(null);
  const [newKeyMessage, setNewKeyMessage] = useState('');

  // Get brand pillars from selected brand
  const selectedBrand = brands.find(b => b.id === formData.brand_template_id);
  const brandPillars: string[] = (selectedBrand?.content_pillars || []).map((p: any) => typeof p === 'string' ? p : p.name || '');

  // Handle template selection
  const handleTemplateSelect = (template: CampaignTemplate) => {
    const today = new Date().toISOString().split('T')[0];
    const endDate = calculateEndDate(today, template);
    
    setFormData({
      ...formData,
      name: template.name + ' ' + new Date().getFullYear(),
      description: template.description,
      campaign_type: template.campaign_type,
      start_date: today,
      end_date: endDate,
      goals: generateGoalsFromTemplate(template),
      target_channels: template.suggested_channels,
    });
    
    setMilestones(generateMilestonesFromTemplate(template, today));
    setSelectedTemplate(template);
    toast.success(`Đã áp dụng mẫu "${template.name}"`);
  };

  // Populate form data in edit mode
  useEffect(() => {
    if (isEditMode && existingCampaign && !isInitialized) {
      setFormData({
        name: existingCampaign.name,
        description: existingCampaign.description || '',
        campaign_type: existingCampaign.campaign_type,
        start_date: existingCampaign.start_date,
        end_date: existingCampaign.end_date,
        goals: existingCampaign.goals || [],
        budget_total: existingCampaign.budget_total || undefined,
        budget_currency: existingCampaign.budget_currency || 'VND',
        target_channels: existingCampaign.target_channels || [],
        brand_template_id: existingCampaign.brand_template_id || undefined,
        content_brief: existingCampaign.content_brief || undefined,
      });
      
      // Convert existing milestones to form data
      if (existingMilestones.length > 0) {
        setMilestones(existingMilestones.map(m => ({
          title: m.title,
          description: m.description || '',
          due_date: m.due_date,
          status: m.status as MilestoneFormData['status'],
        })));
      }
      
      setIsInitialized(true);
    }
  }, [isEditMode, existingCampaign, existingMilestones, isInitialized]);

  const selectedType = CAMPAIGN_TYPES.find(t => t.value === formData.campaign_type);

  // Track completed steps
  useEffect(() => {
    const completed: number[] = [];
    if (formData.name && formData.start_date && formData.end_date && formData.campaign_type) {
      completed.push(1);
    }
    if (completed.includes(1)) {
      completed.push(2); // Content goals step is always "completable" (optional)
    }
    if (completed.includes(2)) {
      completed.push(3); // KPIs step is always "completable"
    }
    if ((formData.target_channels?.length || 0) > 0) {
      completed.push(4);
    }
    // Step 5 is optional
    if (milestones.length > 0) {
      completed.push(5);
    }
    setCompletedSteps(completed);
  }, [formData, milestones]);

  const updateField = <K extends keyof CampaignFormData>(field: K, value: CampaignFormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleTypeChange = (type: CampaignType) => {
    const typeConfig = CAMPAIGN_TYPES.find(t => t.value === type);
    const defaultGoals: CampaignGoal[] = (typeConfig?.defaultMetrics || []).map(metric => {
      const metricConfig = KPI_METRICS.find(m => m.value === metric);
      const existingGoal = formData.goals?.find(g => g.metric === metric);
      return {
        metric,
        label: metricConfig?.label || metric,
        target: existingGoal?.target || 0,
        current: existingGoal?.current || 0,
        unit: metricConfig?.unit,
      };
    });
    
    setFormData(prev => ({
      ...prev,
      campaign_type: type,
      goals: defaultGoals,
    }));
  };

  const handleGoalChange = (metric: CampaignMetric, target: number) => {
    const newGoals = (formData.goals || []).map(g => 
      g.metric === metric ? { ...g, target } : g
    );
    updateField('goals', newGoals);
  };

  const toggleChannel = (channel: string) => {
    const channels = formData.target_channels || [];
    const newChannels = channels.includes(channel)
      ? channels.filter(c => c !== channel)
      : [...channels, channel];
    updateField('target_channels', newChannels);
  };

  // Content brief helpers
  const contentBrief = formData.content_brief || { key_messages: [], primary_cta: '', pillar_allocation: {} };

  const updateContentBrief = (updates: Partial<CampaignContentBrief>) => {
    setFormData(prev => ({
      ...prev,
      content_brief: { ...contentBrief, ...updates },
    }));
  };

  const addKeyMessage = () => {
    const msg = newKeyMessage.trim();
    if (!msg || contentBrief.key_messages.length >= 5) return;
    if (contentBrief.key_messages.includes(msg)) return;
    updateContentBrief({ key_messages: [...contentBrief.key_messages, msg] });
    setNewKeyMessage('');
  };

  const removeKeyMessage = (index: number) => {
    updateContentBrief({ key_messages: contentBrief.key_messages.filter((_, i) => i !== index) });
  };

  const handlePillarSliderChange = (pillar: string, value: number) => {
    const otherPillars = brandPillars.filter(p => p !== pillar);
    const currentAlloc = { ...contentBrief.pillar_allocation };
    const oldValue = currentAlloc[pillar] || 0;
    const diff = value - oldValue;
    
    // Distribute the difference among other pillars proportionally
    const otherTotal = otherPillars.reduce((sum, p) => sum + (currentAlloc[p] || 0), 0);
    
    const newAlloc: Record<string, number> = { ...currentAlloc, [pillar]: value };
    
    if (otherTotal > 0 && diff !== 0) {
      otherPillars.forEach(p => {
        const share = (currentAlloc[p] || 0) / otherTotal;
        newAlloc[p] = Math.max(0, Math.round((currentAlloc[p] || 0) - diff * share));
      });
    } else if (otherPillars.length > 0) {
      const remaining = 100 - value;
      const perPillar = Math.round(remaining / otherPillars.length);
      otherPillars.forEach((p, i) => {
        newAlloc[p] = i === otherPillars.length - 1 
          ? remaining - perPillar * (otherPillars.length - 1) 
          : perPillar;
      });
    }
    
    updateContentBrief({ pillar_allocation: newAlloc });
  };

  // Initialize pillar allocation when brand changes
  useEffect(() => {
    if (brandPillars.length > 0 && Object.keys(contentBrief.pillar_allocation).length === 0) {
      const perPillar = Math.round(100 / brandPillars.length);
      const alloc: Record<string, number> = {};
      brandPillars.forEach((p, i) => {
        alloc[p] = i === brandPillars.length - 1 ? 100 - perPillar * (brandPillars.length - 1) : perPillar;
      });
      updateContentBrief({ pillar_allocation: alloc });
    }
  }, [brandPillars.length, formData.brand_template_id]);

  const canProceed = () => {
    switch (step) {
      case 1:
        return formData.name && formData.start_date && formData.end_date && formData.campaign_type;
      case 2:
        return true; // Content goals optional
      case 3:
        return true; // KPIs optional
      case 4:
        return (formData.target_channels?.length || 0) > 0;
      case 5:
        return true; // Milestones optional
      default:
        return false;
    }
  };

  const handleStepClick = (targetStep: number) => {
    if (targetStep < step || completedSteps.includes(targetStep - 1)) {
      setStep(targetStep);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.start_date || !formData.end_date || !formData.campaign_type) {
      return;
    }
    
    try {
      let savedCampaignId: string;
      
      if (isEditMode && campaignId) {
        await updateCampaign({ id: campaignId, data: formData as CampaignFormData });
        savedCampaignId = campaignId;
        
        await supabase
          .from('campaign_milestones')
          .delete()
          .eq('campaign_id', campaignId);
      } else {
        const newCampaign = await createCampaign(formData as CampaignFormData);
        savedCampaignId = newCampaign.id;
      }
      
      if (milestones.length > 0) {
        const milestonesData = milestones.map((m, index) => ({
          campaign_id: savedCampaignId,
          title: m.title,
          description: m.description || null,
          due_date: m.due_date,
          status: m.status || 'pending',
          sort_order: index,
        }));
        
        const { error: milestonesError } = await supabase
          .from('campaign_milestones')
          .insert(milestonesData);
        
        if (milestonesError) {
          console.error('Error saving milestones:', milestonesError);
          toast.error('Không thể lưu milestones');
        }
      }
      
      navigate('/campaigns');
    } catch (error) {
      console.error('Error saving campaign:', error);
    }
  };

  if (isEditMode && isLoadingCampaign) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isSubmitting = isCreating || isUpdating;
  const pillarTotal = Object.values(contentBrief.pillar_allocation).reduce((s, v) => s + v, 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/campaigns')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold">
                {isEditMode ? 'Chỉnh sửa chiến dịch' : 'Tạo chiến dịch mới'}
              </h1>
              <p className="text-sm text-muted-foreground">Bước {step} / {TOTAL_STEPS}</p>
            </div>
          </div>
          
          <Button variant="ghost" onClick={() => navigate('/campaigns')}>
            <X className="h-4 w-4 mr-2" />
            Hủy
          </Button>
        </div>
        
        {/* Stepper */}
        <div className="container mx-auto pb-4">
          <CampaignFormStepper 
            currentStep={step} 
            onStepClick={handleStepClick}
            completedSteps={completedSteps}
          />
        </div>
      </div>

      {/* Two-Column Layout */}
      <div className="container mx-auto py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Step 1: Basic Info */}
            {step === 1 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Target className="h-5 w-5 text-primary" />
                        Thông tin cơ bản
                      </CardTitle>
                      <CardDescription>
                        Đặt tên và chọn loại chiến dịch phù hợp với mục tiêu
                      </CardDescription>
                    </div>
                    {!isEditMode && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowTemplateSelector(true)}
                        className="shrink-0"
                      >
                        <Sparkles className="h-4 w-4 mr-2" />
                        {selectedTemplate ? 'Đổi mẫu' : 'Dùng mẫu có sẵn'}
                      </Button>
                    )}
                  </div>
                  {selectedTemplate && (
                    <div className="mt-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{selectedTemplate.icon}</span>
                        <div>
                          <p className="text-sm font-medium">Đang dùng mẫu: {selectedTemplate.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {selectedTemplate.duration_days} ngày • {selectedTemplate.milestones.length} mốc thời gian
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Tên chiến dịch *</Label>
                    <Input
                      id="name"
                      placeholder="VD: Black Friday 2025, Tết Nguyên Đán..."
                      value={formData.name}
                      onChange={(e) => updateField('name', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Mô tả</Label>
                    <Textarea
                      id="description"
                      placeholder="Mô tả ngắn gọn về chiến dịch..."
                      value={formData.description}
                      onChange={(e) => updateField('description', e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="space-y-3">
                    <Label>Loại chiến dịch *</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {CAMPAIGN_TYPES.map((type) => (
                        <div
                          key={type.value}
                          onClick={() => handleTypeChange(type.value)}
                          className={cn(
                            'p-4 rounded-xl border-2 cursor-pointer transition-all',
                            formData.campaign_type === type.value
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/50'
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{type.icon}</span>
                            <div>
                              <p className="font-medium">{type.label}</p>
                              <p className="text-xs text-muted-foreground">{type.description}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="start_date">Ngày bắt đầu *</Label>
                      <Input
                        id="start_date"
                        type="date"
                        value={formData.start_date}
                        onChange={(e) => updateField('start_date', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="end_date">Ngày kết thúc *</Label>
                      <Input
                        id="end_date"
                        type="date"
                        value={formData.end_date}
                        onChange={(e) => updateField('end_date', e.target.value)}
                        min={formData.start_date}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Brand (tùy chọn)</Label>
                    <Select 
                      value={formData.brand_template_id || ''} 
                      onValueChange={(v) => updateField('brand_template_id', v || undefined)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn brand template..." />
                      </SelectTrigger>
                      <SelectContent>
                        {brands.map((brand) => (
                          <SelectItem key={brand.id} value={brand.id}>
                            {brand.brand_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 2: Content Goals (NEW) */}
            {step === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    Mục tiêu nội dung
                  </CardTitle>
                  <CardDescription>
                    Cung cấp brief để AI Agent lên kế hoạch nội dung phù hợp
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Info box */}
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
                    <Info className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <div className="text-sm text-muted-foreground">
                      <p className="font-medium text-foreground mb-1">Bước này là tùy chọn</p>
                      <p>Thông tin này sẽ được Strategy Agent sử dụng để lên kế hoạch nội dung phù hợp với chiến dịch. Bạn có thể bỏ qua và bổ sung sau.</p>
                    </div>
                  </div>

                  {/* Key Messages */}
                  <div className="space-y-3">
                    <Label>Thông điệp chính (tối đa 5)</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="VD: Sản phẩm chất lượng cao, giá hợp lý..."
                        value={newKeyMessage}
                        onChange={(e) => setNewKeyMessage(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addKeyMessage();
                          }
                        }}
                        disabled={contentBrief.key_messages.length >= 5}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={addKeyMessage}
                        disabled={!newKeyMessage.trim() || contentBrief.key_messages.length >= 5}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {contentBrief.key_messages.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {contentBrief.key_messages.map((msg, i) => (
                          <Badge key={i} variant="secondary" className="gap-1 py-1.5 px-3">
                            {msg}
                            <button
                              type="button"
                              onClick={() => removeKeyMessage(i)}
                              className="ml-1 hover:text-destructive transition-colors"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Nhấn Enter hoặc nút + để thêm. {contentBrief.key_messages.length}/5 thông điệp.
                    </p>
                  </div>

                  {/* Primary CTA */}
                  <div className="space-y-2">
                    <Label htmlFor="primary_cta">CTA chính (Call-to-Action)</Label>
                    <Input
                      id="primary_cta"
                      placeholder="VD: Mua ngay, Đăng ký dùng thử, Tìm hiểu thêm..."
                      value={contentBrief.primary_cta}
                      onChange={(e) => updateContentBrief({ primary_cta: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Hành động chính bạn muốn khách hàng thực hiện
                    </p>
                  </div>

                  {/* Pillar Allocation */}
                  {brandPillars.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label>Phân bổ Content Pillars (%)</Label>
                        <span className={cn(
                          'text-sm font-medium',
                          pillarTotal === 100 ? 'text-green-600' : 'text-yellow-600'
                        )}>
                          Tổng: {pillarTotal}%
                        </span>
                      </div>
                      <div className="space-y-4">
                        {brandPillars.map((pillar) => {
                          const value = contentBrief.pillar_allocation[pillar] || 0;
                          return (
                            <div key={pillar} className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="font-medium truncate max-w-[70%]">{pillar}</span>
                                <span className="text-muted-foreground">{value}%</span>
                              </div>
                              <Slider
                                value={[value]}
                                onValueChange={([v]) => handlePillarSliderChange(pillar, v)}
                                max={100}
                                step={5}
                                className="w-full"
                              />
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Kéo slider để phân bổ tỷ lệ nội dung cho từng pillar. Hệ thống tự động cân bằng tổng = 100%.
                      </p>
                    </div>
                  )}

                  {brandPillars.length === 0 && (
                    <div className="p-4 rounded-lg border border-dashed border-border">
                      <p className="text-sm text-muted-foreground text-center">
                        Chọn Brand ở bước 1 để hiển thị Content Pillars và phân bổ tỷ lệ
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Step 3: KPIs & Budget */}
            {step === 3 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-primary" />
                    KPIs & Ngân sách
                  </CardTitle>
                  <CardDescription>
                    Đặt mục tiêu KPI và ngân sách cho chiến dịch
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* KPIs based on campaign type */}
                  <div className="space-y-4">
                    <Label>Mục tiêu KPI ({selectedType?.label})</Label>
                    <div className="space-y-3">
                      {(formData.goals || []).map((goal) => {
                        const metricConfig = KPI_METRICS.find(m => m.value === goal.metric);
                        return (
                          <div key={goal.metric} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                            <span className="text-lg">{metricConfig?.icon}</span>
                            <div className="flex-1">
                              <p className="font-medium text-sm">{goal.label}</p>
                              <p className="text-xs text-muted-foreground">{metricConfig?.category}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                placeholder="Target"
                                className="w-32"
                                value={goal.target || ''}
                                onChange={(e) => handleGoalChange(goal.metric, Number(e.target.value))}
                              />
                              {goal.unit && <span className="text-sm text-muted-foreground">{goal.unit}</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Budget */}
                  <div className="space-y-2">
                    <Label>Ngân sách (tùy chọn)</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="VD: 10000000"
                        value={formData.budget_total || ''}
                        onChange={(e) => updateField('budget_total', Number(e.target.value) || undefined)}
                        className="flex-1"
                      />
                      <Select 
                        value={formData.budget_currency} 
                        onValueChange={(v) => updateField('budget_currency', v)}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="VND">VND</SelectItem>
                          <SelectItem value="USD">USD</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 4: Channels */}
            {step === 4 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Layers className="h-5 w-5 text-primary" />
                    Kênh phân phối
                  </CardTitle>
                  <CardDescription>
                    Chọn các kênh sẽ triển khai chiến dịch
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {CHANNELS.map((channel) => {
                      const isSelected = formData.target_channels?.includes(channel.value);
                      return (
                        <div
                          key={channel.value}
                          onClick={() => toggleChannel(channel.value)}
                          className={cn(
                            'p-3 rounded-xl border-2 cursor-pointer transition-all text-center',
                            isSelected
                              ? 'border-primary bg-primary/10'
                              : 'border-border hover:border-primary/50'
                          )}
                        >
                          <p className="font-medium text-sm">{channel.label}</p>
                        </div>
                      );
                    })}
                  </div>

                  {(formData.target_channels?.length || 0) > 0 && (
                    <div className="p-4 rounded-lg bg-muted/50">
                      <p className="text-sm text-muted-foreground mb-2">Đã chọn:</p>
                      <div className="flex flex-wrap gap-2">
                        {formData.target_channels?.map(ch => (
                          <Badge key={ch} variant="secondary">
                            {CHANNELS.find(c => c.value === ch)?.label || ch}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Step 5: Milestones */}
            {step === 5 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Flag className="h-5 w-5 text-primary" />
                    Milestones
                  </CardTitle>
                  <CardDescription>
                    Thiết lập các mốc quan trọng trong chiến dịch
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <CampaignMilestoneEditor
                    milestones={milestones}
                    onMilestonesChange={setMilestones}
                    startDate={formData.start_date}
                    endDate={formData.end_date}
                  />
                </CardContent>
              </Card>
            )}

            {/* Navigation */}
            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setStep(s => s - 1)}
                disabled={step === 1}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Quay lại
              </Button>

              {step < TOTAL_STEPS ? (
                <Button
                  onClick={() => setStep(s => s + 1)}
                  disabled={!canProceed()}
                >
                  Tiếp theo
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={!canProceed() || isSubmitting}
                >
                  {isSubmitting ? 'Đang lưu...' : isEditMode ? 'Cập nhật' : 'Tạo chiến dịch'}
                  <Check className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </div>

          {/* Right: Preview Panel (hidden on mobile) */}
          <div className="hidden lg:block">
            <div className="sticky top-32">
              <CampaignCreatePreviewPanel 
                formData={formData}
                milestones={milestones}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Template Selector Dialog */}
      <CampaignTemplateSelector
        open={showTemplateSelector}
        onOpenChange={setShowTemplateSelector}
        onSelect={handleTemplateSelect}
      />
    </div>
  );
}
