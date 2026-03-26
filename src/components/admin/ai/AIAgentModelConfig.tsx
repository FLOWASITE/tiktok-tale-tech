import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Lightbulb, PenTool, ShieldCheck, UserCheck, Send, BarChart3,
  Settings2, RotateCcw, Cpu, Thermometer, Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAgentModelConfig, ALL_AGENTS, type AgentModelConfig } from '@/hooks/useAgentModelConfig';
import { ModelSelector } from './ModelSelector';
import { useAIConfig } from '@/hooks/useAIConfig';

const ICON_MAP: Record<string, React.ElementType> = {
  Lightbulb, PenTool, ShieldCheck, UserCheck, Send, BarChart3,
};

const QUALITY_MODES = [
  { value: 'fast', label: 'Fast', description: 'Tốc độ nhanh, chi phí thấp' },
  { value: 'balanced', label: 'Balanced', description: 'Cân bằng chất lượng/chi phí' },
  { value: 'quality', label: 'Quality', description: 'Chất lượng cao nhất' },
];

export function AIAgentModelConfig() {
  const { configs, isLoading, upsertConfig, deleteConfig, isUpserting } = useAgentModelConfig();
  const { providers } = useAIConfig();
  const [editingAgent, setEditingAgent] = useState<string | null>(null);
  const [editingConfig, setEditingConfig] = useState<Partial<AgentModelConfig> | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);

  const openRouterProvider = providers?.find(p => p.providerType === 'openrouter');
  const hasOpenRouterApiKey = !!openRouterProvider?.encryptedApiKey;

  const handleEdit = (agentId: string) => {
    const existing = configs.find(c => c.agentName === agentId);
    const agentMeta = ALL_AGENTS.find(a => a.id === agentId)!;

    setEditingAgent(agentId);
    setEditingConfig(existing || {
      agentName: agentId,
      modelOverride: null,
      temperature: 0.7,
      maxTokens: null,
      isEnabled: true,
      qualityMode: 'balanced',
      fallbackModel: null,
      notes: null,
    });
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!editingConfig || !editingAgent) return;
    upsertConfig({ ...editingConfig, agentName: editingAgent });
    setIsDialogOpen(false);
  };

  const handleReset = (agentName: string) => {
    deleteConfig(agentName);
  };

  const getDisplayModel = (agentId: string) => {
    const config = configs.find(c => c.agentName === agentId);
    const agentMeta = ALL_AGENTS.find(a => a.id === agentId)!;
    return config?.modelOverride || agentMeta.defaultModel;
  };

  const isCustomized = (agentId: string) => {
    return configs.some(c => c.agentName === agentId);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="h-48" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Agent Model Configuration</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Cấu hình model AI cho từng Agent trong pipeline 6 giai đoạn
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {ALL_AGENTS.map((agent) => {
          const IconComp = ICON_MAP[agent.icon] || Cpu;
          const customized = isCustomized(agent.id);
          const config = configs.find(c => c.agentName === agent.id);
          const displayModel = getDisplayModel(agent.id);
          const isEnabled = config?.isEnabled ?? true;

          return (
            <Card
              key={agent.id}
              className={cn(
                'relative cursor-pointer transition-all hover:shadow-md',
                !isEnabled && 'opacity-60',
                customized && 'border-primary/30 bg-primary/[0.02]',
              )}
              onClick={() => handleEdit(agent.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={cn(
                      'p-2 rounded-lg',
                      customized ? 'bg-primary/10' : 'bg-muted',
                    )}>
                      <IconComp className={cn(
                        'h-4 w-4',
                        customized ? 'text-primary' : 'text-muted-foreground',
                      )} />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-medium">{agent.label}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">{agent.description}</p>
                    </div>
                  </div>
                  {customized && (
                    <Badge variant="outline" className="text-[10px] border-primary/30 text-primary shrink-0">
                      Custom
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-2.5">
                <div className="flex items-center gap-2 text-xs">
                  <Cpu className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground truncate">{displayModel}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-xs">
                    <Thermometer className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{config?.temperature ?? 0.7}</span>
                  </div>
                  {config?.qualityMode && (
                    <div className="flex items-center gap-1.5 text-xs">
                      <Zap className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="capitalize">{config.qualityMode}</span>
                    </div>
                  )}
                </div>
                {config?.fallbackModel && (
                  <div className="text-[11px] text-muted-foreground">
                    Fallback: {config.fallbackModel}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              {editingAgent && ALL_AGENTS.find(a => a.id === editingAgent)?.label}
            </DialogTitle>
            <DialogDescription>
              Cấu hình model và tham số cho agent này
            </DialogDescription>
          </DialogHeader>

          {editingConfig && editingAgent && (
            <div className="space-y-5">
              {/* Enable/Disable */}
              <div className="flex items-center justify-between">
                <Label>Kích hoạt</Label>
                <Switch
                  checked={editingConfig.isEnabled ?? true}
                  onCheckedChange={(v) => setEditingConfig({ ...editingConfig, isEnabled: v })}
                />
              </div>

              {/* Model Selection */}
              <div className="space-y-2">
                <Label>Model chính</Label>
                <button
                  onClick={() => setIsModelSelectorOpen(true)}
                  className={cn(
                    'w-full flex items-center justify-between p-3 rounded-lg border text-left transition-all',
                    editingConfig.modelOverride
                      ? 'border-primary/30 bg-primary/5'
                      : 'border-border hover:border-primary/20',
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Cpu className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {editingConfig.modelOverride || ALL_AGENTS.find(a => a.id === editingAgent)?.defaultModel || 'Mặc định'}
                    </span>
                  </div>
                  <Settings2 className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>

              {/* Quick Select Recommended */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Gợi ý</Label>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_AGENTS.find(a => a.id === editingAgent)?.recommendedModels.map(m => (
                    <button
                      key={m}
                      onClick={() => setEditingConfig({ ...editingConfig, modelOverride: m })}
                      className={cn(
                        'px-2.5 py-1 text-xs rounded-md border transition-all',
                        editingConfig.modelOverride === m
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border hover:border-primary/30',
                      )}
                    >
                      {m.split('/').pop()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Temperature */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Temperature</Label>
                  <span className="text-sm text-muted-foreground">{editingConfig.temperature ?? 0.7}</span>
                </div>
                <Slider
                  value={[editingConfig.temperature ?? 0.7]}
                  onValueChange={([v]) => setEditingConfig({ ...editingConfig, temperature: v })}
                  min={0}
                  max={2}
                  step={0.1}
                />
              </div>

              {/* Max Tokens */}
              <div className="space-y-2">
                <Label>Max Tokens</Label>
                <Input
                  type="number"
                  placeholder="Mặc định (không giới hạn)"
                  value={editingConfig.maxTokens ?? ''}
                  onChange={(e) => setEditingConfig({
                    ...editingConfig,
                    maxTokens: e.target.value ? parseInt(e.target.value) : null,
                  })}
                />
              </div>

              {/* Quality Mode */}
              <div className="space-y-2">
                <Label>Quality Mode</Label>
                <Select
                  value={editingConfig.qualityMode || 'balanced'}
                  onValueChange={(v) => setEditingConfig({ ...editingConfig, qualityMode: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {QUALITY_MODES.map(m => (
                      <SelectItem key={m.value} value={m.value}>
                        <div>
                          <span>{m.label}</span>
                          <span className="text-xs text-muted-foreground ml-2">{m.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Fallback Model */}
              <div className="space-y-2">
                <Label>Fallback Model</Label>
                <Input
                  placeholder="Model dự phòng khi model chính lỗi"
                  value={editingConfig.fallbackModel ?? ''}
                  onChange={(e) => setEditingConfig({
                    ...editingConfig,
                    fallbackModel: e.target.value || null,
                  })}
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label>Ghi chú</Label>
                <Textarea
                  placeholder="Ghi chú về cấu hình..."
                  value={editingConfig.notes ?? ''}
                  onChange={(e) => setEditingConfig({ ...editingConfig, notes: e.target.value || null })}
                  rows={2}
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            {editingAgent && isCustomized(editingAgent) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  handleReset(editingAgent);
                  setIsDialogOpen(false);
                }}
                className="mr-auto"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                Reset
              </Button>
            )}
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Hủy</Button>
            <Button onClick={handleSave} disabled={isUpserting}>
              {isUpserting ? 'Đang lưu...' : 'Lưu'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Model Selector */}
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
        defaultModel={editingAgent ? (ALL_AGENTS.find(a => a.id === editingAgent)?.defaultModel || 'google/gemini-2.5-flash') : 'google/gemini-2.5-flash'}
        hasOpenRouterApiKey={hasOpenRouterApiKey}
      />
    </div>
  );
}
