import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Zap,
  ChevronDown,
  ChevronUp,
  Settings2,
  Gauge,
  Lightbulb,
  Target,
  DollarSign,
  Hash,
  Trash2,
  Plus,
  Globe,
  Facebook,
  Instagram,
  Twitter,
  Linkedin,
  Mail,
  Youtube,
  MessageCircle,
  Send,
  MapPin,
  Music2,
  AtSign,
} from 'lucide-react';
import {
  useBrandChannelOptimizations,
  type BrandChannelOptimization,
  type QualityMode,
  type PromptStyle,
  type HookIntensity,
  type CostPriority,
} from '@/hooks/useBrandChannelOptimizations';
import { Channel } from '@/types/multichannel';

const ALL_CHANNELS: Channel[] = [
  'website', 'facebook', 'instagram', 'twitter', 'google_maps',
  'linkedin', 'email', 'youtube', 'zalo_oa', 'telegram', 'tiktok', 'threads'
];

const channelIcons: Record<Channel, React.ReactNode> = {
  website: <Globe className="w-4 h-4" />,
  facebook: <Facebook className="w-4 h-4" />,
  instagram: <Instagram className="w-4 h-4" />,
  twitter: <Twitter className="w-4 h-4" />,
  google_maps: <MapPin className="w-4 h-4" />,
  linkedin: <Linkedin className="w-4 h-4" />,
  email: <Mail className="w-4 h-4" />,
  youtube: <Youtube className="w-4 h-4" />,
  zalo_oa: <MessageCircle className="w-4 h-4" />,
  telegram: <Send className="w-4 h-4" />,
  tiktok: <Music2 className="w-4 h-4" />,
  threads: <AtSign className="w-4 h-4" />,
};

const channelLabels: Record<Channel, string> = {
  website: 'Website',
  facebook: 'Facebook',
  instagram: 'Instagram',
  twitter: 'X (Twitter)',
  google_maps: 'Google Maps',
  linkedin: 'LinkedIn',
  email: 'Email',
  youtube: 'YouTube',
  zalo_oa: 'Zalo OA',
  telegram: 'Telegram',
  tiktok: 'TikTok',
  threads: 'Threads',
};

const QUALITY_MODES: { value: QualityMode; label: string; description: string }[] = [
  { value: 'fast', label: 'Nhanh', description: 'Bỏ qua tinh chỉnh' },
  { value: 'balanced', label: 'Cân bằng', description: '1 vòng tinh chỉnh' },
  { value: 'quality', label: 'Chất lượng', description: '2 vòng tinh chỉnh' },
];

const PROMPT_STYLES: { value: PromptStyle; label: string }[] = [
  { value: 'concise', label: 'Ngắn gọn' },
  { value: 'detailed', label: 'Chi tiết' },
  { value: 'creative', label: 'Sáng tạo' },
  { value: 'analytical', label: 'Phân tích' },
];

const HOOK_INTENSITIES: { value: HookIntensity; label: string }[] = [
  { value: 'subtle', label: 'Nhẹ nhàng' },
  { value: 'moderate', label: 'Vừa phải' },
  { value: 'aggressive', label: 'Mạnh mẽ' },
];

const COST_PRIORITIES: { value: CostPriority; label: string }[] = [
  { value: 'speed', label: 'Tốc độ' },
  { value: 'balanced', label: 'Cân bằng' },
  { value: 'quality', label: 'Chất lượng' },
];

const HOOK_TYPES = [
  'question', 'statistic', 'story', 'controversy', 'benefit',
  'curiosity', 'urgency', 'social_proof', 'pain_point'
];

interface BrandChannelOptimizationEditorProps {
  brandTemplateId: string;
}

export function BrandChannelOptimizationEditor({ brandTemplateId }: BrandChannelOptimizationEditorProps) {
  const { optimizations, loading, upsertOptimization, deleteOptimization } = useBrandChannelOptimizations(brandTemplateId);
  const [editingChannel, setEditingChannel] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    quality_mode: QualityMode | null;
    prompt_style: PromptStyle | null;
    hook_intensity: HookIntensity | null;
    cost_priority: CostPriority | null;
    preferred_hook_types: string[];
    max_tokens_override: number | null;
  }>({
    quality_mode: null,
    prompt_style: null,
    hook_intensity: null,
    cost_priority: null,
    preferred_hook_types: [],
    max_tokens_override: null,
  });
  const [expandedChannels, setExpandedChannels] = useState<Set<string>>(new Set());

  const channelsWithOptimization = optimizations.map(o => o.channel);
  const channelsWithoutOptimization = ALL_CHANNELS.filter(c => !channelsWithOptimization.includes(c));

  const handleEditChannel = (channel: string) => {
    const existing = optimizations.find(o => o.channel === channel);
    setEditForm({
      quality_mode: existing?.quality_mode || null,
      prompt_style: existing?.prompt_style || null,
      hook_intensity: existing?.hook_intensity || null,
      cost_priority: existing?.cost_priority || null,
      preferred_hook_types: existing?.preferred_hook_types || [],
      max_tokens_override: existing?.max_tokens_override || null,
    });
    setEditingChannel(channel);
  };

  const handleSave = async () => {
    if (!editingChannel) return;
    await upsertOptimization({
      brand_template_id: brandTemplateId,
      channel: editingChannel,
      ...editForm,
    });
    setEditingChannel(null);
  };

  const handleDelete = async (channel: string) => {
    await deleteOptimization(channel);
  };

  const toggleExpanded = (channel: string) => {
    setExpandedChannels(prev => {
      const next = new Set(prev);
      if (next.has(channel)) {
        next.delete(channel);
      } else {
        next.add(channel);
      }
      return next;
    });
  };

  const toggleHookType = (hookType: string) => {
    setEditForm(prev => ({
      ...prev,
      preferred_hook_types: prev.preferred_hook_types.includes(hookType)
        ? prev.preferred_hook_types.filter(h => h !== hookType)
        : [...prev.preferred_hook_types, hookType],
    }));
  };

  const renderOptimizationBadges = (opt: BrandChannelOptimization) => (
    <div className="flex flex-wrap gap-1">
      {opt.quality_mode && (
        <Badge variant="outline" className="text-xs gap-1">
          <Gauge className="w-3 h-3" />
          {QUALITY_MODES.find(q => q.value === opt.quality_mode)?.label}
        </Badge>
      )}
      {opt.prompt_style && (
        <Badge variant="outline" className="text-xs gap-1">
          <Lightbulb className="w-3 h-3" />
          {PROMPT_STYLES.find(p => p.value === opt.prompt_style)?.label}
        </Badge>
      )}
      {opt.hook_intensity && (
        <Badge variant="outline" className="text-xs gap-1">
          <Target className="w-3 h-3" />
          {HOOK_INTENSITIES.find(h => h.value === opt.hook_intensity)?.label}
        </Badge>
      )}
      {opt.cost_priority && (
        <Badge variant="outline" className="text-xs gap-1">
          <DollarSign className="w-3 h-3" />
          {COST_PRIORITIES.find(c => c.value === opt.cost_priority)?.label}
        </Badge>
      )}
      {opt.preferred_hook_types && opt.preferred_hook_types.length > 0 && (
        <Badge variant="outline" className="text-xs gap-1">
          <Hash className="w-3 h-3" />
          {opt.preferred_hook_types.length} hooks
        </Badge>
      )}
    </div>
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            AI Optimization per Channel
            {optimizations.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {optimizations.length} kênh tùy chỉnh
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Tùy chỉnh cách AI tạo nội dung cho từng kênh của thương hiệu này
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Channels with optimization */}
          {optimizations.map(opt => (
            <Collapsible
              key={opt.id}
              open={expandedChannels.has(opt.channel)}
              onOpenChange={() => toggleExpanded(opt.channel)}
            >
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex w-full items-center justify-between p-3 rounded-lg border border-primary/30 bg-primary/5 hover:border-primary/50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-primary">
                      {channelIcons[opt.channel as Channel]}
                    </span>
                    <span className="font-medium text-sm">{channelLabels[opt.channel as Channel] || opt.channel}</span>
                    <Badge variant="default" className="text-xs">Tùy chỉnh</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    {expandedChannels.has(opt.channel) ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="p-4 border border-t-0 border-primary/30 rounded-b-lg bg-primary/5 space-y-3">
                  {renderOptimizationBadges(opt)}
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditChannel(opt.channel)}
                    >
                      <Settings2 className="w-3 h-3 mr-1" />
                      Chỉnh sửa
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(opt.channel)}
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Xoá
                    </Button>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}

          {/* Channels without optimization */}
          {channelsWithoutOptimization.length > 0 && (
            <div className="pt-2">
              <p className="text-sm text-muted-foreground mb-2">Thêm tùy chỉnh cho kênh:</p>
              <div className="flex flex-wrap gap-2">
                {channelsWithoutOptimization.map(channel => (
                  <Button
                    key={channel}
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => handleEditChannel(channel)}
                  >
                    {channelIcons[channel]}
                    {channelLabels[channel]}
                    <Plus className="w-3 h-3" />
                  </Button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingChannel} onOpenChange={() => setEditingChannel(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingChannel && channelIcons[editingChannel as Channel]}
              Tùy chỉnh AI cho {editingChannel && (channelLabels[editingChannel as Channel] || editingChannel)}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Quality Mode */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Gauge className="w-4 h-4" />
                Quality Mode
              </Label>
              <Select
                value={editForm.quality_mode || ''}
                onValueChange={(v) => setEditForm(prev => ({ ...prev, quality_mode: v as QualityMode || null }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Mặc định (từ hệ thống)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Mặc định</SelectItem>
                  {QUALITY_MODES.map(q => (
                    <SelectItem key={q.value} value={q.value}>
                      {q.label} - {q.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Prompt Style */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4" />
                Prompt Style
              </Label>
              <Select
                value={editForm.prompt_style || ''}
                onValueChange={(v) => setEditForm(prev => ({ ...prev, prompt_style: v as PromptStyle || null }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Mặc định (từ hệ thống)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Mặc định</SelectItem>
                  {PROMPT_STYLES.map(p => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Hook Intensity */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Target className="w-4 h-4" />
                Hook Intensity
              </Label>
              <Select
                value={editForm.hook_intensity || ''}
                onValueChange={(v) => setEditForm(prev => ({ ...prev, hook_intensity: v as HookIntensity || null }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Mặc định (từ hệ thống)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Mặc định</SelectItem>
                  {HOOK_INTENSITIES.map(h => (
                    <SelectItem key={h.value} value={h.value}>{h.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Cost Priority */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Cost Priority
              </Label>
              <Select
                value={editForm.cost_priority || ''}
                onValueChange={(v) => setEditForm(prev => ({ ...prev, cost_priority: v as CostPriority || null }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Mặc định (từ hệ thống)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Mặc định</SelectItem>
                  {COST_PRIORITIES.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Preferred Hook Types */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Hash className="w-4 h-4" />
                Preferred Hook Types
              </Label>
              <div className="flex flex-wrap gap-2">
                {HOOK_TYPES.map(hookType => (
                  <Badge
                    key={hookType}
                    variant={editForm.preferred_hook_types.includes(hookType) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => toggleHookType(hookType)}
                  >
                    {hookType}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Max Tokens Override */}
            <div className="space-y-2">
              <Label>Max Tokens Override</Label>
              <Input
                type="number"
                placeholder="Để trống để dùng mặc định"
                value={editForm.max_tokens_override || ''}
                onChange={(e) => setEditForm(prev => ({
                  ...prev,
                  max_tokens_override: e.target.value ? parseInt(e.target.value) : null,
                }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingChannel(null)}>
              Huỷ
            </Button>
            <Button onClick={handleSave}>
              Lưu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
