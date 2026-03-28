import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Type, Image, Globe, X, Layers } from 'lucide-react';
import { useGroupModelConfig, FUNCTION_TYPE_GROUPS, countAffectedFunctions } from '@/hooks/useGroupModelConfig';
import { AIFunctionConfig, getModelInfo } from '@/hooks/useAIConfig';
import { ProviderIndicator } from './ModelCard';
import { ModelSelector } from './ModelSelector';

interface GroupDefaultsPanelProps {
  organizationId?: string;
  functionConfigs: Map<string, AIFunctionConfig>;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  text: <Type className="h-4 w-4" />,
  image: <Image className="h-4 w-4" />,
  search: <Globe className="h-4 w-4" />,
};

const TYPE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  text: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-600' },
  image: { bg: 'bg-pink-500/10', border: 'border-pink-500/30', text: 'text-pink-600' },
  search: { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-600' },
};

export function GroupDefaultsPanel({ organizationId, functionConfigs }: GroupDefaultsPanelProps) {
  const { groupConfigs, getGroupConfig, upsertGroupConfig, deleteGroupConfig, isUpserting } = useGroupModelConfig(organizationId);
  const [selectorOpen, setSelectorOpen] = useState<string | null>(null);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Layers className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Group Defaults</h3>
          <span className="text-xs text-muted-foreground">— Đặt model mặc định cho nhóm function type</span>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {FUNCTION_TYPE_GROUPS.map((group) => {
            const config = getGroupConfig(group.id);
            const colors = TYPE_COLORS[group.id];
            const { total, affected } = countAffectedFunctions(group.id, functionConfigs);
            const modelInfo = config?.modelOverride ? getModelInfo(config.modelOverride) : null;

            return (
              <div
                key={group.id}
                className={cn(
                  "relative rounded-lg border p-3 transition-all",
                  config?.modelOverride ? colors.border : "border-border",
                  config?.modelOverride && colors.bg
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={cn("h-7 w-7 rounded-md flex items-center justify-center", colors.bg, colors.text)}>
                      {TYPE_ICONS[group.id]}
                    </div>
                    <div>
                      <span className="text-sm font-medium">{group.label}</span>
                      <p className="text-[10px] text-muted-foreground">{group.description}</p>
                    </div>
                  </div>
                </div>

                {config?.modelOverride ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <ProviderIndicator provider={modelInfo!.provider} showLabel />
                      <span className="text-xs font-medium truncate">{modelInfo!.shortName}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="text-[10px]">
                        {affected}/{total} functions áp dụng
                      </Badge>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-[10px] px-2"
                          onClick={() => setSelectorOpen(group.id)}
                        >
                          Đổi
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-[10px] px-1 text-destructive hover:text-destructive"
                          onClick={() => deleteGroupConfig(group.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-[10px] text-muted-foreground italic">Chưa đặt — dùng model mặc định từng function</p>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-[10px]">
                        {total} functions
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 text-[10px] px-2"
                        onClick={() => setSelectorOpen(group.id)}
                      >
                        Đặt model
                      </Button>
                    </div>
                  </div>
                )}

                {/* Model Selector Dialog */}
                <ModelSelector
                  open={selectorOpen === group.id}
                  onOpenChange={(open) => { if (!open) setSelectorOpen(null); }}
                  selectedModel={config?.modelOverride || null}
                  defaultModel=""
                  functionType={group.id}
                  hasOpenRouterApiKey={false}
                  onSelectModel={(model) => {
                    upsertGroupConfig({ functionType: group.id, modelOverride: model });
                    setSelectorOpen(null);
                  }}
                />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
