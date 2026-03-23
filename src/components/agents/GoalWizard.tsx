import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Target, Radio, Palette, Eye, ChevronLeft, ChevronRight, 
  Check, Sparkles, ShieldCheck, Zap, Bot
} from 'lucide-react';
import { AgentAutonomyLevel, AgentGoal, AUTONOMY_LEVELS } from '@/types/agent';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useCurrentBrand } from '@/contexts/BrandContext';
import { cn } from '@/lib/utils';
import { CampaignSelector } from '@/components/campaign/CampaignSelector';
import { toast } from 'sonner';

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

const STEPS = [
  { icon: Target, label: 'Mục tiêu' },
  { icon: Radio, label: 'Kênh' },
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

  // Pre-fill when editing
  useEffect(() => {
    if (open && initialData) {
      setName(initialData.name);
      setDescription(initialData.description || '');
      setSelectedChannels(initialData.target_channels || []);
      setFrequency(initialData.frequency || {});
      setAutonomyLevel(initialData.autonomy_level);
      setBrandTemplateId(initialData.brand_template_id || '');
      setCampaignId(initialData.campaign_id || undefined);
      setStep(0);
    } else if (open && !initialData) {
      resetForm();
    }
  }, [open, initialData]);

  // Auto-fill brandTemplateId from currentBrand
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
      default: return true;
    }
  };

  const handleSubmit = () => {
    onSubmit({
      name: name.trim(),
      description: description.trim() || undefined,
      target_topics: [],
      target_channels: selectedChannels,
      frequency,
      autonomy_level: autonomyLevel,
      brand_template_id: brandTemplateId || undefined,
      campaign_id: campaignId || undefined,
    });
  };

  const isEditing = !!initialData;

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
          {step === 0 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs">Tên campaign *</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="VD: Q2 Skincare Campaign" className="text-sm" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Mô tả mục tiêu</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Mô tả mục tiêu campaign để AI nghiên cứu chủ đề phù hợp..." rows={3} className="text-sm resize-none" />
              </div>
              <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
                <Bot className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <p className="text-[11px] text-muted-foreground">
                  <span className="font-medium text-foreground">Research Agent</span> sẽ tự động nghiên cứu xu hướng và đề xuất chủ đề nội dung dựa trên brand, ngành hàng và mô tả mục tiêu của bạn.
                </p>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <Label className="text-xs">Chọn kênh publish & tần suất</Label>
              <div className="grid grid-cols-2 gap-2">
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

          {step === 2 && (
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

          {step === 3 && (
            <div className="space-y-4">
              {/* Brand — readonly from header */}
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

          {step === 4 && (
            <div className="space-y-3">
              <Label className="text-xs font-medium">Xác nhận Campaign</Label>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1.5 border-b">
                  <span className="text-muted-foreground">Tên</span>
                  <span className="font-medium">{name}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b">
                  <span className="text-muted-foreground">Chủ đề</span>
                  <span className="font-medium text-primary/80 flex items-center gap-1">
                    <Bot className="w-3 h-3" /> AI tự nghiên cứu
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b">
                  <span className="text-muted-foreground">Kênh</span>
                  <div className="flex gap-1 flex-wrap justify-end">
                    {selectedChannels.map(ch => {
                      const info = AVAILABLE_CHANNELS.find(c => c.id === ch);
                      return <Badge key={ch} variant="outline" className="text-[9px]">{info?.icon} {info?.label} ({frequency[ch]})</Badge>;
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
                <div className="flex justify-between py-1.5">
                  <span className="text-muted-foreground">Chiến dịch</span>
                  <span className="font-medium">{campaignId ? '✅ Đã liên kết' : 'Không liên kết'}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t bg-muted/30">
          <Button variant="ghost" size="sm" onClick={() => setStep(s => s - 1)} disabled={step === 0} className="text-xs gap-1">
            <ChevronLeft className="w-3.5 h-3.5" /> Quay lại
          </Button>
          {step < 4 ? (
            <Button size="sm" onClick={() => setStep(s => s + 1)} disabled={!canNext()} className="text-xs gap-1">
              Tiếp theo <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          ) : (
            <Button size="sm" onClick={handleSubmit} className="text-xs gap-1">
              <Zap className="w-3.5 h-3.5" /> {isEditing ? 'Cập nhật Campaign' : 'Khởi chạy Campaign'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
