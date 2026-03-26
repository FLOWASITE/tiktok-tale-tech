import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useChannelModelConfig, ALL_CHANNELS, ChannelModelConfig, QualityMode, PromptStyle, HookIntensity, CostPriority } from '@/hooks/useChannelModelConfig';
import { useAIConfig, getModelInfo, ModelInfo } from '@/hooks/useAIConfig';
import { useOpenRouterModels, openRouterModelToModelInfo } from '@/hooks/useOpenRouterModels';
import { ModelSelector } from './ModelSelector';
import { ProviderIndicator } from './ModelCard';
import { 
  Settings, Check, X, RotateCcw, Sparkles, Zap, Star,
  Facebook, Instagram, Linkedin, Youtube, Twitter, Globe, 
  Mail, Send, MapPin, MessageCircle, AtSign, Music2,
  Gauge, Lightbulb, Target, DollarSign, Hash
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AIChannelModelConfigProps {
  organizationId?: string;
}

// Channel icons map
const CHANNEL_ICONS: Record<string, React.ReactNode> = {
  facebook: <Facebook className="h-4 w-4" />,
  instagram: <Instagram className="h-4 w-4" />,
  linkedin: <Linkedin className="h-4 w-4" />,
  tiktok: <Music2 className="h-4 w-4" />,
  threads: <AtSign className="h-4 w-4" />,
  youtube: <Youtube className="h-4 w-4" />,
  twitter: <Twitter className="h-4 w-4" />,
  website: <Globe className="h-4 w-4" />,
  email: <Mail className="h-4 w-4" />,
  zalo_oa: <MessageCircle className="h-4 w-4" />,
  telegram: <Send className="h-4 w-4" />,
  google_maps: <MapPin className="h-4 w-4" />,
};

// Hook types available
const HOOK_TYPES = [
  { id: 'question', label: 'Câu hỏi' },
  { id: 'bold_statement', label: 'Tuyên bố táo bạo' },
  { id: 'transformation', label: 'Chuyển đổi' },
  { id: 'story', label: 'Câu chuyện' },
  { id: 'number', label: 'Con số' },
  { id: 'negative', label: 'Cảnh báo' },
  { id: 'social_proof', label: 'Bằng chứng xã hội' },
  { id: 'direct_address', label: 'Gọi thẳng' },
  { id: 'shocking_fact', label: 'Sự thật gây sốc' },
  { id: 'challenge', label: 'Thử thách' },
];

// Quick presets
const QUICK_PRESETS = {
  default: { label: 'Mặc định', model: null, icon: <Sparkles className="h-4 w-4" /> },
  fast: { label: 'Nhanh', model: 'google/gemini-2.5-flash-lite', icon: <Zap className="h-4 w-4" /> },
  quality: { label: 'Chất lượng', model: 'google/gemini-3-pro-preview', icon: <Star className="h-4 w-4" /> },
};

// Default model for multichannel
const DEFAULT_MODEL = 'google/gemini-3-pro-preview';

export function AIChannelModelConfig({ organizationId }: AIChannelModelConfigProps) {
  const { configs, isLoading, upsertConfig, deleteConfig, getChannelConfig, isUpserting } = useChannelModelConfig(organizationId);
  const { providers } = useAIConfig(organizationId);
  
  const [editingChannel, setEditingChannel] = useState<string | null>(null);
  const [editingConfig, setEditingConfig] = useState<Partial<ChannelModelConfig> | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);

  // Check if OpenRouter provider has API key configured
  const hasOpenRouterApiKey = useMemo(() => {
    return providers.some(
      p => p.providerType === 'openrouter' && p.encryptedApiKey && p.isActive
    );
  }, [providers]);

  // Fetch OpenRouter models for enhanced model info
  const { data: openRouterModels } = useOpenRouterModels(hasOpenRouterApiKey);

  // Enhanced getModelInfo
  const getEnhancedModelInfo = (modelId: string | null): ModelInfo => {
    if (!modelId) {
      return getModelInfo(DEFAULT_MODEL);
    }
    const hardcodedInfo = getModelInfo(modelId);
    if (hardcodedInfo.description !== 'OpenRouter model') {
      return hardcodedInfo;
    }
    const orModel = openRouterModels?.find(m => m.id === modelId);
    if (orModel) {
      return openRouterModelToModelInfo(orModel);
    }
    return hardcodedInfo;
  };

  const handleEditChannel = (channel: string) => {
    const existingConfig = getChannelConfig(channel);
    setEditingChannel(channel);
    setEditingConfig(existingConfig || {
      channel,
      modelOverride: null,
      temperature: 0.7,
      maxTokens: null,
      isEnabled: true,
      priority: 0,
      qualityModeDefault: null,
      promptStyle: null,
      hookIntensity: null,
      costPriority: null,
      preferredHookTypes: null,
      allowUserOverride: true,
    });
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!editingChannel || !editingConfig) return;
    upsertConfig({
      channel: editingChannel,
      ...editingConfig,
    });
    setIsDialogOpen(false);
    setEditingChannel(null);
    setEditingConfig(null);
  };

  const handleReset = (channel: string) => {
    deleteConfig(channel);
  };

  const handleModelSelect = (modelId: string) => {
    if (editingConfig) {
      setEditingConfig({ ...editingConfig, modelOverride: modelId });
    }
    setIsModelSelectorOpen(false);
  };

  const getCurrentPreset = (): 'default' | 'fast' | 'quality' | 'custom' => {
    if (!editingConfig?.modelOverride) return 'default';
    if (editingConfig.modelOverride === QUICK_PRESETS.fast.model) return 'fast';
    if (editingConfig.modelOverride === QUICK_PRESETS.quality.model) return 'quality';
    return 'custom';
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const currentModelInfo = editingConfig?.modelOverride 
    ? getEnhancedModelInfo(editingConfig.modelOverride)
    : getEnhancedModelInfo(DEFAULT_MODEL);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h3 className="text-base sm:text-lg font-medium">Channel Model Configuration</h3>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Cấu hình AI model riêng cho từng kênh social khi tạo nội dung đa kênh
          </p>
        </div>
        <Badge variant="outline" className="w-fit">
          {configs.filter(c => c.modelOverride).length} / {ALL_CHANNELS.length} đã customize
        </Badge>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[150px]">Channel</TableHead>
                <TableHead>Model</TableHead>
                <TableHead className="hidden md:table-cell">Optimization</TableHead>
                <TableHead className="text-center w-[80px]">Status</TableHead>
                <TableHead className="text-right w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ALL_CHANNELS.map((channel) => {
                const config = getChannelConfig(channel.id);
                const displayModel = config?.modelOverride || DEFAULT_MODEL;
                const modelInfo = getEnhancedModelInfo(displayModel);
                const isCustomized = !!config?.modelOverride;
                const hasOptimizations = config?.qualityModeDefault || config?.promptStyle || config?.hookIntensity || config?.costPriority || (config?.preferredHookTypes && config.preferredHookTypes.length > 0);
                
                return (
                  <TableRow key={channel.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                          {CHANNEL_ICONS[channel.id]}
                        </div>
                        <span className="font-medium text-sm">{channel.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-2 cursor-help">
                              <ProviderIndicator provider={modelInfo.provider} />
                              <div className="flex flex-col">
                                <span className="text-sm font-medium">
                                  {modelInfo.provider === 'dashscope' ? '☁️ ' : ''}{modelInfo.shortName}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                  {isCustomized ? (
                                    <>
                                      {modelInfo.provider === 'lovable' && 'Lovable AI'}
                                      {modelInfo.provider === 'openrouter' && 'OpenRouter'}
                                      {modelInfo.provider === 'kie' && 'KIE.ai'}
                                      {modelInfo.provider === 'poyo' && 'PoYo.ai'}
                                      {modelInfo.provider === 'dashscope' && 'DashScope'}
                                      {!['lovable', 'openrouter', 'kie', 'poyo', 'dashscope'].includes(modelInfo.provider) && 'Custom'}
                                    </>
                                  ) : 'Default'}
                                </span>
                              </div>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs">
                            <div className="space-y-1">
                              <p className="font-semibold">{modelInfo.shortName}</p>
                              <p className="text-sm">{modelInfo.description}</p>
                              <p className="text-[10px] font-mono text-muted-foreground">{displayModel}</p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {hasOptimizations ? (
                        <div className="flex flex-wrap gap-1">
                          {config?.qualityModeDefault && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              <Gauge className="h-2.5 w-2.5 mr-0.5" />
                              {config.qualityModeDefault}
                            </Badge>
                          )}
                          {config?.promptStyle && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              <Lightbulb className="h-2.5 w-2.5 mr-0.5" />
                              {config.promptStyle}
                            </Badge>
                          )}
                          {config?.hookIntensity && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              <Target className="h-2.5 w-2.5 mr-0.5" />
                              {config.hookIntensity}
                            </Badge>
                          )}
                          {config?.costPriority && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              <DollarSign className="h-2.5 w-2.5 mr-0.5" />
                              {config.costPriority}
                            </Badge>
                          )}
                          {config?.preferredHookTypes && config.preferredHookTypes.length > 0 && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              <Hash className="h-2.5 w-2.5 mr-0.5" />
                              {config.preferredHookTypes.length} hooks
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {config ? (
                        config.isEnabled ? (
                          <Badge variant="default" className="bg-green-500">
                            <Check className="h-3 w-3" />
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <X className="h-3 w-3" />
                          </Badge>
                        )
                      ) : (
                        <Badge variant="outline">Default</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditChannel(channel.id)}
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                        {(isCustomized || hasOptimizations) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleReset(channel.id)}
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader className="pb-2">
            <DialogTitle className="flex items-center gap-2">
              {editingChannel && CHANNEL_ICONS[editingChannel]}
              <span>Cấu hình {ALL_CHANNELS.find(c => c.id === editingChannel)?.name}</span>
            </DialogTitle>
          </DialogHeader>
          
          {editingConfig && (
            <Tabs defaultValue="model" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="model" className="text-xs sm:text-sm">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Model
                </TabsTrigger>
                <TabsTrigger value="optimization" className="text-xs sm:text-sm">
                  <Gauge className="h-3 w-3 mr-1" />
                  Optimization
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="model" className="space-y-4 mt-4">
                {/* Enable/Disable */}
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Kích hoạt channel này</Label>
                  <Switch
                    checked={editingConfig.isEnabled ?? true}
                    onCheckedChange={(checked) => setEditingConfig({ ...editingConfig, isEnabled: checked })}
                  />
                </div>

                {/* Model Selection */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-2 text-sm">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Chọn AI Model
                  </Label>
                  
                  {/* Quick Presets */}
                  <div className="grid gap-2">
                    {Object.entries(QUICK_PRESETS).map(([key, preset]) => (
                      <button
                        key={key}
                        onClick={() => setEditingConfig({ ...editingConfig, modelOverride: preset.model })}
                        className={cn(
                          "w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all",
                          getCurrentPreset() === key
                            ? "border-primary bg-primary/5"
                            : "border-muted hover:border-primary/50 hover:bg-accent/50"
                        )}
                      >
                        <div className={cn(
                          "h-8 w-8 rounded-full flex items-center justify-center",
                          getCurrentPreset() === key ? "bg-primary/10 text-primary" : "bg-muted"
                        )}>
                          {preset.icon}
                        </div>
                        <div>
                          <span className="font-medium">{preset.label}</span>
                          <p className="text-xs text-muted-foreground">
                            {preset.model ? getEnhancedModelInfo(preset.model).shortName : 'Gemini 3 Pro (Function Default)'}
                          </p>
                        </div>
                        {getCurrentPreset() === key && (
                          <Check className="h-4 w-4 text-primary ml-auto" />
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Custom Model Selection */}
                  <button
                    onClick={() => setIsModelSelectorOpen(true)}
                    className={cn(
                      "w-full flex items-center justify-between p-3 rounded-lg border text-left transition-all",
                      getCurrentPreset() === 'custom'
                        ? "border-primary bg-primary/5"
                        : "border-dashed border-muted-foreground/30 hover:border-primary/50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "h-8 w-8 rounded-full flex items-center justify-center",
                        getCurrentPreset() === 'custom' ? "bg-primary/10 text-primary" : "bg-muted"
                      )}>
                        <Settings className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="font-medium">Chọn model khác</span>
                        {getCurrentPreset() === 'custom' && editingConfig.modelOverride && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <ProviderIndicator provider={currentModelInfo.provider} />
                            {currentModelInfo.shortName}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                </div>

                {/* Temperature */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Temperature</Label>
                    <span className="text-sm font-mono">{editingConfig.temperature ?? 0.7}</span>
                  </div>
                  <Slider
                    value={[editingConfig.temperature ?? 0.7]}
                    onValueChange={([value]) => setEditingConfig({ ...editingConfig, temperature: value })}
                    min={0}
                    max={1}
                    step={0.1}
                  />
                  <p className="text-xs text-muted-foreground">
                    0 = Chính xác, 1 = Sáng tạo
                  </p>
                </div>

                {/* Max Tokens */}
                <div className="space-y-2">
                  <Label className="text-sm">Max Tokens (tùy chọn)</Label>
                  <Input
                    type="number"
                    placeholder="Mặc định theo function"
                    value={editingConfig.maxTokens || ''}
                    onChange={(e) => setEditingConfig({ 
                      ...editingConfig, 
                      maxTokens: e.target.value ? parseInt(e.target.value) : null 
                    })}
                  />
                </div>
              </TabsContent>
              
              <TabsContent value="optimization" className="space-y-4 mt-4">
                {/* Quality Mode */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm">
                    <Gauge className="h-4 w-4 text-blue-500" />
                    Quality Mode mặc định
                  </Label>
                  <Select
                    value={editingConfig.qualityModeDefault || 'default'}
                    onValueChange={(value) => setEditingConfig({ 
                      ...editingConfig, 
                      qualityModeDefault: value === 'default' ? null : value as QualityMode 
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn quality mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Mặc định hệ thống</SelectItem>
                      <SelectItem value="fast">Fast - Bỏ qua self-critique</SelectItem>
                      <SelectItem value="balanced">Balanced - 1 lần tinh chỉnh</SelectItem>
                      <SelectItem value="quality">Quality - 2 lần tinh chỉnh</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Prompt Style */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm">
                    <Lightbulb className="h-4 w-4 text-yellow-500" />
                    Prompt Style
                  </Label>
                  <Select
                    value={editingConfig.promptStyle || 'default'}
                    onValueChange={(value) => setEditingConfig({ 
                      ...editingConfig, 
                      promptStyle: value === 'default' ? null : value as PromptStyle 
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn prompt style" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Mặc định</SelectItem>
                      <SelectItem value="concise">Concise - Ngắn gọn, súc tích</SelectItem>
                      <SelectItem value="detailed">Detailed - Chi tiết, đầy đủ</SelectItem>
                      <SelectItem value="creative">Creative - Sáng tạo, độc đáo</SelectItem>
                      <SelectItem value="analytical">Analytical - Phân tích, logic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Hook Intensity */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm">
                    <Target className="h-4 w-4 text-red-500" />
                    Hook Intensity
                  </Label>
                  <Select
                    value={editingConfig.hookIntensity || 'default'}
                    onValueChange={(value) => setEditingConfig({ 
                      ...editingConfig, 
                      hookIntensity: value === 'default' ? null : value as HookIntensity 
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn hook intensity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Mặc định</SelectItem>
                      <SelectItem value="subtle">Subtle - Nhẹ nhàng, tinh tế</SelectItem>
                      <SelectItem value="moderate">Moderate - Vừa phải, cân bằng</SelectItem>
                      <SelectItem value="aggressive">Aggressive - Mạnh mẽ, gây chú ý</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Cost Priority */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm">
                    <DollarSign className="h-4 w-4 text-green-500" />
                    Cost Priority
                  </Label>
                  <Select
                    value={editingConfig.costPriority || 'default'}
                    onValueChange={(value) => setEditingConfig({ 
                      ...editingConfig, 
                      costPriority: value === 'default' ? null : value as CostPriority 
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn cost priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Mặc định</SelectItem>
                      <SelectItem value="economy">Economy - Tiết kiệm token</SelectItem>
                      <SelectItem value="balanced">Balanced - Cân bằng</SelectItem>
                      <SelectItem value="performance">Performance - Ưu tiên chất lượng</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Preferred Hook Types */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm">
                    <Hash className="h-4 w-4 text-purple-500" />
                    Preferred Hook Types
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {HOOK_TYPES.map((hookType) => {
                      const isSelected = editingConfig.preferredHookTypes?.includes(hookType.id);
                      return (
                        <button
                          key={hookType.id}
                          type="button"
                          onClick={() => {
                            const current = editingConfig.preferredHookTypes || [];
                            const updated = isSelected
                              ? current.filter(t => t !== hookType.id)
                              : [...current, hookType.id];
                            setEditingConfig({
                              ...editingConfig,
                              preferredHookTypes: updated.length > 0 ? updated : null,
                            });
                          }}
                          className={cn(
                            "px-2 py-1 text-xs rounded-full border transition-all",
                            isSelected
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-muted/50 border-muted-foreground/20 hover:border-primary/50"
                          )}
                        >
                          {hookType.label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Chọn các loại hook ưu tiên cho channel này
                  </p>
                </div>

                {/* Allow User Override */}
                <div className="flex items-center justify-between pt-2 border-t">
                  <div>
                    <Label className="text-sm">Cho phép user override</Label>
                    <p className="text-xs text-muted-foreground">
                      User có thể chọn quality mode khác khi tạo nội dung
                    </p>
                  </div>
                  <Switch
                    checked={editingConfig.allowUserOverride ?? true}
                    onCheckedChange={(checked) => setEditingConfig({ ...editingConfig, allowUserOverride: checked })}
                  />
                </div>
              </TabsContent>
            </Tabs>
          )}
          
          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleSave} disabled={isUpserting}>
              {isUpserting ? 'Đang lưu...' : 'Lưu'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Model Selector Dialog */}
      <ModelSelector
        open={isModelSelectorOpen}
        onOpenChange={setIsModelSelectorOpen}
        selectedModel={editingConfig?.modelOverride || null}
        onSelectModel={(model) => {
          if (editingConfig) {
            setEditingConfig({ ...editingConfig, modelOverride: model });
          }
          setIsModelSelectorOpen(false);
        }}
        functionType="text"
        defaultModel={DEFAULT_MODEL}
        hasOpenRouterApiKey={hasOpenRouterApiKey}
      />
    </div>
  );
}
