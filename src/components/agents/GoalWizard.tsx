import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Target, Radio, Palette, Eye, ChevronLeft, ChevronRight, 
  Check, Sparkles, ShieldCheck, Zap, Bot, Calendar, X, Plus, MessageSquare
} from 'lucide-react';
import { AgentAutonomyLevel, AgentGoal, AUTONOMY_LEVELS } from '@/types/agent';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useCurrentBrand } from '@/contexts/BrandContext';
import { cn } from '@/lib/utils';
import { CampaignSelector } from '@/components/campaign/CampaignSelector';
import { toast } from 'sonner';
import { ClarificationStep } from './ClarificationStep';

const AVAILABLE_CHANNELS = [
  { id: 'blog', label: 'Blog', icon: '📝' },
  { id: 'facebook', label: 'Facebook', icon: '📘' },
  { id: 'instagram', label: 'Instagram', icon: '📷' },
  { id: 'tiktok', label: 'TikTok', icon: '🎵' },
  { id: 'zalo', label: 'Zalo OA', icon: '💬' },
  { id: 'linkedin', label: 'LinkedIn', icon: '💼' },
  { id: 'twitter', label: 'X (Twitter)', icon: '🐦' },
  { id: 'email', label: 'Email', icon: '📧' },
  { id: 'threads', label: 'Threads', icon: '🧵' },
  { id: 'pinterest', label: 'Pinterest', icon: '📌' },
];

const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Mỗi ngày' },
  { value: '3/week', label: '3 lần/tuần' },
  { value: '2/week', label: '2 lần/tuần' },
  { value: 'weekly', label: 'Hàng tuần' },
];

const DURATION_OPTIONS = [
  { value: 7, label: '1 tuần', description: '3-4 bài viết' },
  { value: 14, label: '2 tuần', description: '5-7 bài viết' },
  { value: 30, label: '1 tháng', description: '8-12 bài viết' },
  { value: 0, label: 'Tùy chỉnh', description: 'Nhập số ngày' },
];

const APPROVAL_MODE_OPTIONS = [
  { value: 'approve_plan', label: 'Duyệt kế hoạch', description: 'Duyệt toàn bộ plan trước khi AI bắt đầu tạo', icon: '📋' },
  { value: 'approve_each', label: 'Duyệt từng bài', description: 'AI tạo từng bài, bạn duyệt mỗi bài trước khi đăng', icon: '✅' },
  { value: 'full_auto', label: 'Tự động hoàn toàn', description: 'AI tự lên kế hoạch, tạo và đăng bài tự động', icon: '🚀' },
];

const STEPS = [
  { icon: Target, label: 'Mục tiêu' },
  { icon: Radio, label: 'Kênh' },
  { icon: Calendar, label: 'Chiến dịch' },
  { icon: ShieldCheck, label: 'Tự động' },
  { icon: Palette, label: 'Liên kết' },
  { icon: Eye, label: 'Xác nhận' },
];

interface GoalWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    name: string;
    description?: string;
    target_topics: string[];
    target_channels: string[];
    frequency: Record<string, string>;
    autonomy_level: AgentAutonomyLevel;
    brand_template_id?: string;
    campaign_id?: string;
    clarification_context?: Record<string, string>;
    campaign_duration_days?: number;
    campaign_start_date?: string;
    approval_mode?: string;
  }) => void;
  initialData?: AgentGoal | null;
}

export function GoalWizard({ open, onOpenChange, onSubmit, initialData }: GoalWizardProps) {
  const { currentOrganization } = useOrganizationContext();
  const { currentBrand } = useCurrentBrand();
  const [step, setStep] = useState(0);
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [frequency, setFrequency] = useState<Record<string, string>>({});
  const [autonomyLevel, setAutonomyLevel] = useState<AgentAutonomyLevel>('human_in_loop');
  const [brandTemplateId, setBrandTemplateId] = useState<string>('');
  const [campaignId, setCampaignId] = useState<string | undefined>(undefined);

  // Campaign fields
  const [campaignDurationDays, setCampaignDurationDays] = useState(14);
  const [customDuration, setCustomDuration] = useState('');
  const [campaignStartDate, setCampaignStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [approvalMode, setApprovalMode] = useState('approve_plan');

  // Smart auto-approve thresholds
  const [autoApproveEnabled, setAutoApproveEnabled] = useState(false);
  const [thresholdQuality, setThresholdQuality] = useState(70);
  const [thresholdRiskMax, setThresholdRiskMax] = useState(30);
  const [thresholdGeo, setThresholdGeo] = useState(60);

  // Brief fields
  const [keyMessages, setKeyMessages] = useState<string[]>([]);
  const [keyMessageInput, setKeyMessageInput] = useState('');
  const [primaryCta, setPrimaryCta] = useState('');
  const [pillarAllocation, setPillarAllocation] = useState<Record<string, number>>({});

  // Clarification state
  const [clarifying, setClarifying] = useState(false);
  const [clarificationQuestions, setClarificationQuestions] = useState<any[] | null>(null);
  const [clarificationUnderstanding, setClarificationUnderstanding] = useState<string | null>(null);
  const [clarificationContext, setClarificationContext] = useState<Record<string, string> | null>(null);

  // Initialize pillar allocation from brand
  useEffect(() => {
    if (currentBrand?.content_pillars && currentBrand.content_pillars.length > 0 && Object.keys(pillarAllocation).length === 0) {
      const pillars = currentBrand.content_pillars as { name: string; keywords?: string[] }[];
      const evenSplit = Math.floor(100 / pillars.length);
      const remainder = 100 - evenSplit * pillars.length;
      const initial: Record<string, number> = {};
      pillars.forEach((p, i) => {
        initial[p.name] = evenSplit + (i === 0 ? remainder : 0);
      });
      setPillarAllocation(initial);
    }
  }, [currentBrand]);

  useEffect(() => {
    if (open && initialData) {
      setName(initialData.name);
      setDescription(initialData.description || '');
      setSelectedChannels(initialData.target_channels || []);
      setFrequency(initialData.frequency || {});
      setAutonomyLevel(initialData.autonomy_level);
      setBrandTemplateId(initialData.brand_template_id || '');
      setCampaignId(initialData.campaign_id || undefined);
      setCampaignDurationDays(initialData.campaign_duration_days || 14);
      setCampaignStartDate(initialData.campaign_start_date || new Date().toISOString().split('T')[0]);
      setApprovalMode(initialData.approval_mode || 'approve_plan');
      setStep(0);
    } else if (open && !initialData) {
      resetForm();
    }
  }, [open, initialData]);

  useEffect(() => {
    if (open && currentBrand && !brandTemplateId) {
      setBrandTemplateId(currentBrand.id);
    }
  }, [open, currentBrand]);

  const resetForm = () => {
    setStep(0);
    setName(''); setDescription('');
    setSelectedChannels([]); setFrequency({});
    setAutonomyLevel('human_in_loop');
    setBrandTemplateId(currentBrand?.id || '');
    setCampaignId(undefined);
    setCampaignDurationDays(14);
    setCustomDuration('');
    setCampaignStartDate(new Date().toISOString().split('T')[0]);
    setApprovalMode('approve_plan');
    setAutoApproveEnabled(false); setThresholdQuality(70); setThresholdRiskMax(30); setThresholdGeo(60);
    setKeyMessages([]); setKeyMessageInput(''); setPrimaryCta('');
    setPillarAllocation({});
    setClarifying(false);
    setClarificationQuestions(null);
    setClarificationUnderstanding(null);
    setClarificationContext(null);
  };

  const addKeyMessage = () => {
    const msg = keyMessageInput.trim();
    if (msg && keyMessages.length < 5 && !keyMessages.includes(msg)) {
      setKeyMessages([...keyMessages, msg]);
      setKeyMessageInput('');
    }
  };

  const handlePillarChange = (pillarName: string, newValue: number) => {
    const pillars = Object.keys(pillarAllocation);
    if (pillars.length <= 1) return;
    const others = pillars.filter(p => p !== pillarName);
    const oldValue = pillarAllocation[pillarName];
    const diff = newValue - oldValue;
    const totalOthers = others.reduce((s, p) => s + pillarAllocation[p], 0);
    const updated = { ...pillarAllocation, [pillarName]: newValue };
    others.forEach(p => {
      const ratio = totalOthers > 0 ? pillarAllocation[p] / totalOthers : 1 / others.length;
      updated[p] = Math.max(0, Math.round(pillarAllocation[p] - diff * ratio));
    });
    // Fix rounding to ensure sum = 100
    const sum = Object.values(updated).reduce((s, v) => s + v, 0);
    if (sum !== 100 && others.length > 0) {
      updated[others[0]] += 100 - sum;
    }
    setPillarAllocation(updated);
  };

  const toggleChannel = (ch: string) => {
    if (selectedChannels.includes(ch)) {
      setSelectedChannels(selectedChannels.filter(c => c !== ch));
      const newFreq = { ...frequency };
      delete newFreq[ch];
      setFrequency(newFreq);
    } else {
      setSelectedChannels([...selectedChannels, ch]);
      setFrequency({ ...frequency, [ch]: 'weekly' });
    }
  };

  const canNext = () => {
    switch (step) {
      case 0: return name.trim().length > 0;
      case 1: return selectedChannels.length > 0;
      case 2: return (campaignDurationDays > 0 || (customDuration && parseInt(customDuration) > 0)) && !!campaignStartDate;
      default: return true;
    }
  };

  const effectiveDuration = campaignDurationDays > 0 ? campaignDurationDays : parseInt(customDuration) || 14;

  // Trigger clarification check when user reaches last step (confirm)
  const handleConfirmStep = async () => {
    setClarifying(true);
    setClarificationQuestions(null);
    setClarificationUnderstanding(null);

    try {
      const { data, error } = await supabase.functions.invoke('clarify-campaign-intent', {
        body: {
          title: name.trim(),
          description: description.trim() || undefined,
          industry: currentBrand?.industry || undefined,
          channels: selectedChannels,
          brand_name: currentBrand?.brand_name || undefined,
        },
      });

      if (error) throw error;

      if (data?.ready) {
        setClarificationUnderstanding(data.understanding || `Tạo nội dung về "${name}"`);
        setTimeout(() => {
          finalSubmit(null);
        }, 1500);
      } else if (data?.questions?.length > 0) {
        setClarificationQuestions(data.questions);
      } else {
        finalSubmit(null);
      }
    } catch (e) {
      console.error('Clarification error:', e);
      finalSubmit(null);
    } finally {
      setClarifying(false);
    }
  };

  const finalSubmit = (context: Record<string, string> | null) => {
    // Merge brief fields into clarification_context
    const baseContext = context || clarificationContext || {};
    const briefContext: Record<string, any> = { ...baseContext };
    if (keyMessages.length > 0) briefContext.key_messages = keyMessages;
    if (primaryCta.trim()) briefContext.primary_cta = primaryCta.trim();
    if (Object.keys(pillarAllocation).length > 0) briefContext.pillar_allocation = pillarAllocation;
    if (autoApproveEnabled) {
      briefContext.auto_approve_rules = {
        enabled: true,
        min_quality: thresholdQuality,
        max_risk: thresholdRiskMax,
        min_geo: thresholdGeo,
      };
    }

    const hasContext = Object.keys(briefContext).length > 0;

    onSubmit({
      name: name.trim(),
      description: description.trim() || undefined,
      target_topics: [],
      target_channels: selectedChannels,
      frequency,
      autonomy_level: autonomyLevel,
      brand_template_id: brandTemplateId || undefined,
      campaign_id: campaignId || undefined,
      clarification_context: hasContext ? briefContext as any : undefined,
      campaign_duration_days: effectiveDuration,
      campaign_start_date: campaignStartDate,
      approval_mode: approvalMode,
    });
  };

  const handleClarificationSubmit = (answers: Record<string, string>) => {
    setClarificationContext(answers);
    finalSubmit(answers);
  };

  const handleClarificationSkip = () => {
    finalSubmit(null);
  };

  const isEditing = !!initialData;
  const confirmStep = STEPS.length - 1; // last step
  const showClarification = step === confirmStep && (clarifying || clarificationQuestions || clarificationUnderstanding);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Sparkles className="w-4 h-4 text-primary" />
            {isEditing ? 'Chỉnh sửa Campaign' : 'Tạo AI Campaign'}
          </DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-1 px-5 pb-4">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-1 flex-1">
              <button
                onClick={() => i < step && setStep(i)}
                className={cn(
                  "flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full transition-all",
                  i === step ? "bg-primary text-primary-foreground" :
                  i < step ? "bg-primary/10 text-primary cursor-pointer" :
                  "bg-muted text-muted-foreground"
                )}
              >
                {i < step ? <Check className="w-3 h-3" /> : <s.icon className="w-3 h-3" />}
                <span className="hidden sm:inline">{s.label}</span>
              </button>
              {i < STEPS.length - 1 && (
                <div className={cn("h-px flex-1", i < step ? "bg-primary/30" : "bg-border")} />
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="px-5 pb-5 min-h-[200px] max-h-[55vh] overflow-y-auto">
          {/* Step 0: Mục tiêu */}
          {step === 0 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs">Tên campaign *</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="VD: Dịch vụ kế toán tháng 4" className="text-sm" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Mô tả mục tiêu</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Mô tả mục tiêu campaign để AI lên kế hoạch nội dung phù hợp..." rows={3} className="text-sm resize-none" />
              </div>

              {/* Key Messages */}
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" /> Key Messages
                  <span className="text-muted-foreground font-normal">({keyMessages.length}/5)</span>
                </Label>
                <div className="flex gap-1.5">
                  <Input
                    value={keyMessageInput}
                    onChange={e => setKeyMessageInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addKeyMessage())}
                    placeholder="VD: Tiết kiệm 30% chi phí..."
                    className="text-sm flex-1"
                    disabled={keyMessages.length >= 5}
                  />
                  <Button type="button" variant="outline" size="icon" className="h-10 w-10 shrink-0" onClick={addKeyMessage} disabled={!keyMessageInput.trim() || keyMessages.length >= 5}>
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </div>
                {keyMessages.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {keyMessages.map((msg, i) => (
                      <Badge key={i} variant="secondary" className="text-[10px] gap-1 pr-1">
                        {msg}
                        <button onClick={() => setKeyMessages(keyMessages.filter((_, j) => j !== i))} className="hover:text-destructive">
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Primary CTA */}
              <div className="space-y-2">
                <Label className="text-xs">CTA chính</Label>
                <Input value={primaryCta} onChange={e => setPrimaryCta(e.target.value)} placeholder="VD: Đăng ký tư vấn miễn phí" className="text-sm" />
              </div>

              {/* Content Pillars Allocation */}
              {currentBrand?.content_pillars && (currentBrand.content_pillars as any[]).length > 0 && (
                <div className="space-y-3">
                  <Label className="text-xs">Phân bổ Content Pillars (%)</Label>
                  {Object.entries(pillarAllocation).map(([pillarName, pct]) => (
                    <div key={pillarName} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{pillarName}</span>
                        <span className="text-xs font-medium tabular-nums w-8 text-right">{pct}%</span>
                      </div>
                      <Slider
                        value={[pct]}
                        min={0}
                        max={100}
                        step={5}
                        onValueChange={([v]) => handlePillarChange(pillarName, v)}
                        className="w-full"
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
                <Bot className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <p className="text-[11px] text-muted-foreground">
                  <span className="font-medium text-foreground">Strategy Agent</span> sẽ tự động lên kế hoạch N bài viết với các loại content khác nhau (bài viết, video, carousel) dựa trên brand và mục tiêu của bạn.
                </p>
              </div>
            </div>
          )}

          {/* Step 1: Kênh */}
          {step === 1 && (
            <div className="space-y-4">
              <Label className="text-xs">Chọn kênh publish & tần suất</Label>
              <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto">
                {AVAILABLE_CHANNELS.map(ch => {
                  const selected = selectedChannels.includes(ch.id);
                  return (
                    <button key={ch.id} onClick={() => toggleChannel(ch.id)} className={cn(
                      "flex items-center gap-2 p-2.5 rounded-lg border text-left text-sm transition-all",
                      selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                    )}>
                      <span className="text-base">{ch.icon}</span>
                      <span className="text-xs font-medium">{ch.label}</span>
                      {selected && <Check className="w-3.5 h-3.5 text-primary ml-auto" />}
                    </button>
                  );
                })}
              </div>
              {selectedChannels.length > 0 && (
                <div className="space-y-2 border-t pt-3">
                  <Label className="text-xs">Tần suất mỗi kênh</Label>
                  {selectedChannels.map(ch => {
                    const info = AVAILABLE_CHANNELS.find(c => c.id === ch);
                    return (
                      <div key={ch} className="flex items-center gap-2">
                        <span className="text-xs w-24">{info?.icon} {info?.label}</span>
                        <Select value={frequency[ch] || 'weekly'} onValueChange={v => setFrequency({ ...frequency, [ch]: v })}>
                          <SelectTrigger className="h-7 text-xs flex-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {FREQUENCY_OPTIONS.map(f => (
                              <SelectItem key={f.value} value={f.value} className="text-xs">{f.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Chiến dịch (NEW) */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs">Thời lượng chiến dịch</Label>
                <div className="grid grid-cols-2 gap-2">
                  {DURATION_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        setCampaignDurationDays(opt.value);
                        if (opt.value > 0) setCustomDuration('');
                      }}
                      className={cn(
                        "p-3 rounded-lg border text-left transition-all",
                        campaignDurationDays === opt.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                      )}
                    >
                      <p className="text-sm font-medium">{opt.label}</p>
                      <p className="text-[10px] text-muted-foreground">{opt.description}</p>
                    </button>
                  ))}
                </div>
                {campaignDurationDays === 0 && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={customDuration}
                      onChange={e => setCustomDuration(e.target.value)}
                      placeholder="Số ngày"
                      className="text-sm w-24"
                      min={3}
                      max={90}
                    />
                    <span className="text-xs text-muted-foreground">ngày</span>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Ngày bắt đầu</Label>
                <Input
                  type="date"
                  value={campaignStartDate}
                  onChange={e => setCampaignStartDate(e.target.value)}
                  className="text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Chế độ duyệt</Label>
                {APPROVAL_MODE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setApprovalMode(opt.value)}
                    className={cn(
                      "w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-all",
                      approvalMode === opt.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                    )}
                  >
                    <span className="text-lg">{opt.icon}</span>
                    <div>
                      <p className="text-sm font-medium">{opt.label}</p>
                      <p className="text-[10px] text-muted-foreground">{opt.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Tự động */}
          {step === 3 && (
            <div className="space-y-3">
              <Label className="text-xs">Mức độ tự động</Label>
              {AUTONOMY_LEVELS.map(lvl => (
                <Card key={lvl.id} className={cn("cursor-pointer transition-all", autonomyLevel === lvl.id ? "border-primary ring-1 ring-primary/20" : "hover:border-primary/30")} onClick={() => setAutonomyLevel(lvl.id)}>
                  <CardContent className="p-3 flex items-start gap-3">
                    <div className={cn("w-4 h-4 rounded-full border-2 flex items-center justify-center mt-0.5 flex-shrink-0", autonomyLevel === lvl.id ? "border-primary" : "border-muted-foreground/30")}>
                      {autonomyLevel === lvl.id && <div className="w-2 h-2 rounded-full bg-primary" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{lvl.label}</p>
                      <p className="text-[11px] text-muted-foreground">{lvl.description}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Step 4: Liên kết */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs">Brand Template</Label>
                <div className="flex items-center gap-2 p-2.5 rounded-lg border bg-muted/30">
                  {currentBrand ? (
                    <>
                      <div
                        className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold text-primary-foreground"
                        style={{ backgroundColor: currentBrand.primary_color || 'hsl(var(--primary))' }}
                      >
                        {currentBrand.brand_name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium">{currentBrand.brand_name}</span>
                      <Badge variant="secondary" className="text-[9px] ml-auto">Đang dùng</Badge>
                    </>
                  ) : (
                    <span className="text-sm text-muted-foreground">Chưa chọn brand</span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">Brand được lấy từ header. Đổi brand ở menu trên cùng.</p>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Liên kết Chiến dịch (tùy chọn)</Label>
                <CampaignSelector value={campaignId} onValueChange={setCampaignId} placeholder="Chọn chiến dịch liên kết..." className="text-sm" />
                <p className="text-[11px] text-muted-foreground">Content được AI tạo sẽ tự động gán vào chiến dịch này.</p>
              </div>
            </div>
          )}

          {/* Step 5: Xác nhận */}
          {step === confirmStep && (
            <div className="space-y-3">
              {showClarification ? (
                <ClarificationStep
                  questions={clarificationQuestions || []}
                  understanding={clarificationUnderstanding || undefined}
                  onSubmit={handleClarificationSubmit}
                  onSkip={handleClarificationSkip}
                  isLoading={clarifying}
                />
              ) : (
                <>
                  <Label className="text-xs font-medium">Xác nhận Campaign</Label>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1.5 border-b">
                      <span className="text-muted-foreground">Tên</span>
                      <span className="font-medium">{name}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b">
                      <span className="text-muted-foreground">Thời lượng</span>
                      <span className="font-medium">{effectiveDuration} ngày (từ {campaignStartDate})</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b">
                      <span className="text-muted-foreground">Chế độ duyệt</span>
                      <span className="font-medium">{APPROVAL_MODE_OPTIONS.find(o => o.value === approvalMode)?.label}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b">
                      <span className="text-muted-foreground">Kênh</span>
                      <div className="flex gap-1 flex-wrap justify-end">
                        {selectedChannels.map(ch => {
                          const info = AVAILABLE_CHANNELS.find(c => c.id === ch);
                          return <Badge key={ch} variant="outline" className="text-[9px]">{info?.icon} {info?.label}</Badge>;
                        })}
                      </div>
                    </div>
                    <div className="flex justify-between py-1.5 border-b">
                      <span className="text-muted-foreground">Tự động</span>
                      <span className="font-medium">{AUTONOMY_LEVELS.find(l => l.id === autonomyLevel)?.label}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b">
                      <span className="text-muted-foreground">Brand</span>
                      <span className="font-medium">{currentBrand?.brand_name || 'Mặc định'}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b">
                      <span className="text-muted-foreground">Chiến dịch</span>
                      <span className="font-medium">{campaignId ? '✅ Đã liên kết' : 'Không liên kết'}</span>
                    </div>
                    {keyMessages.length > 0 && (
                      <div className="flex justify-between py-1.5 border-b">
                        <span className="text-muted-foreground">Key Messages</span>
                        <div className="flex gap-1 flex-wrap justify-end max-w-[60%]">
                          {keyMessages.map((msg, i) => (
                            <Badge key={i} variant="secondary" className="text-[9px]">{msg}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {primaryCta.trim() && (
                      <div className="flex justify-between py-1.5 border-b">
                        <span className="text-muted-foreground">CTA chính</span>
                        <span className="font-medium">{primaryCta}</span>
                      </div>
                    )}
                    {Object.keys(pillarAllocation).length > 0 && (
                      <div className="py-1.5">
                        <span className="text-muted-foreground">Pillar %</span>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {Object.entries(pillarAllocation).map(([name, pct]) => (
                            <Badge key={name} variant="outline" className="text-[9px]">{name}: {pct}%</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t bg-muted/30">
          <Button variant="ghost" size="sm" onClick={() => { setStep(s => s - 1); setClarificationQuestions(null); setClarificationUnderstanding(null); }} disabled={step === 0} className="text-xs gap-1">
            <ChevronLeft className="w-3.5 h-3.5" /> Quay lại
          </Button>
          {step < confirmStep ? (
            <Button size="sm" onClick={() => setStep(s => s + 1)} disabled={!canNext()} className="text-xs gap-1">
              Tiếp theo <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          ) : !showClarification ? (
            <Button size="sm" onClick={handleConfirmStep} disabled={clarifying} className="text-xs gap-1">
              <Zap className="w-3.5 h-3.5" /> {isEditing ? 'Cập nhật Campaign' : 'Khởi chạy Campaign'}
            </Button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
