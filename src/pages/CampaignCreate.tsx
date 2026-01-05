import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  ArrowRight, 
  Check,
  Target,
  DollarSign,
  Layers,
  Flag,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCampaigns } from '@/hooks/useCampaigns';
import { useBrandTemplates } from '@/hooks/useBrandTemplates';
import { 
  CAMPAIGN_TYPES, 
  KPI_METRICS,
  type CampaignFormData,
  type CampaignType,
  type CampaignGoal,
  type CampaignMetric,
  type MilestoneFormData,
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

const TOTAL_STEPS = 4;

export default function CampaignCreate() {
  const navigate = useNavigate();
  const { createCampaign, isCreating } = useCampaigns();
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
  });
  const [milestones, setMilestones] = useState<MilestoneFormData[]>([]);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  const selectedType = CAMPAIGN_TYPES.find(t => t.value === formData.campaign_type);

  // Track completed steps
  useEffect(() => {
    const completed: number[] = [];
    if (formData.name && formData.start_date && formData.end_date && formData.campaign_type) {
      completed.push(1);
    }
    if (completed.includes(1)) {
      completed.push(2); // KPIs step is always "completable"
    }
    if ((formData.target_channels?.length || 0) > 0) {
      completed.push(3);
    }
    // Step 4 is optional
    if (milestones.length > 0) {
      completed.push(4);
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
      return {
        metric,
        label: metricConfig?.label || metric,
        target: 0,
        current: 0,
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

  const canProceed = () => {
    switch (step) {
      case 1:
        return formData.name && formData.start_date && formData.end_date && formData.campaign_type;
      case 2:
        return true; // KPIs optional
      case 3:
        return (formData.target_channels?.length || 0) > 0;
      case 4:
        return true; // Milestones optional
      default:
        return false;
    }
  };

  const handleStepClick = (targetStep: number) => {
    // Only allow going back or to completed steps
    if (targetStep < step || completedSteps.includes(targetStep - 1)) {
      setStep(targetStep);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.start_date || !formData.end_date || !formData.campaign_type) {
      return;
    }
    
    await createCampaign(formData as CampaignFormData);
    // TODO: Create milestones after campaign is created
    navigate('/campaigns');
  };

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
              <h1 className="text-xl font-semibold">Tạo chiến dịch mới</h1>
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
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    Thông tin cơ bản
                  </CardTitle>
                  <CardDescription>
                    Đặt tên và chọn loại chiến dịch phù hợp với mục tiêu
                  </CardDescription>
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

            {/* Step 2: KPIs & Budget */}
            {step === 2 && (
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

            {/* Step 3: Channels */}
            {step === 3 && (
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

            {/* Step 4: Milestones */}
            {step === 4 && (
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
                  disabled={!canProceed() || isCreating}
                >
                  {isCreating ? 'Đang tạo...' : 'Tạo chiến dịch'}
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
    </div>
  );
}
