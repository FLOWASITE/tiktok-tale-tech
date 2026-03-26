import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useAIConfig, AI_PROVIDERS, MODELS_BY_PROVIDER, AIProviderConfig, AI_FUNCTIONS, getModelInfo } from '@/hooks/useAIConfig';
import { ALL_AGENTS } from '@/hooks/useAgentModelConfig';
import { useAgentModelConfig } from '@/hooks/useAgentModelConfig';
import { ALL_CHANNELS, useChannelModelConfig } from '@/hooks/useChannelModelConfig';
import { Check, X, Settings, Plus, Trash2, ExternalLink, Sparkles, Search, Flame, Bot, Wand2, Eye, EyeOff, Loader2, CheckCircle2, XCircle, Workflow, ChevronDown, ChevronUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AIProviderManagerProps {
  organizationId?: string;
}

const PROVIDER_ICONS: Record<string, React.ReactNode> = {
  lovable: <Sparkles className="h-5 w-5 text-primary" />,
  openrouter: <Workflow className="h-5 w-5 text-pink-500" />,
  perplexity: <Search className="h-5 w-5 text-blue-500" />,
  firecrawl: <Flame className="h-5 w-5 text-orange-500" />,
  openai: <Bot className="h-5 w-5 text-green-500" />,
  anthropic: <Wand2 className="h-5 w-5 text-purple-500" />,
  gemini: <Sparkles className="h-5 w-5 text-yellow-500" />,
  replicate: <Wand2 className="h-5 w-5 text-cyan-500" />,
  kie: <Wand2 className="h-5 w-5 text-violet-500" />,
  poyo: <Wand2 className="h-5 w-5 text-teal-500" />,
  dashscope: <Bot className="h-5 w-5 text-orange-600" />,
  custom: <Settings className="h-5 w-5 text-muted-foreground" />,
};

const PROVIDER_KEY_URLS: Record<string, string> = {
  openrouter: 'https://openrouter.ai/keys',
  openai: 'https://platform.openai.com/api-keys',
  anthropic: 'https://console.anthropic.com/settings/keys',
  gemini: 'https://aistudio.google.com/app/apikey',
  replicate: 'https://replicate.com/account/api-tokens',
  kie: 'https://kie.ai',
  poyo: 'https://poyo.ai/dashboard/api-key',
  dashscope: 'https://dashscope.console.aliyun.com/',
};

interface TestResult {
  success: boolean;
  message: string;
}

export function AIProviderManager({ organizationId }: AIProviderManagerProps) {
  const { providers, functions: functionConfigs, isLoading, upsertProvider, deleteProvider } = useAIConfig(organizationId);
  const { configs: agentConfigs } = useAgentModelConfig(organizationId);
  const { configs: channelConfigs } = useChannelModelConfig(organizationId);
  const [editingProvider, setEditingProvider] = useState<Partial<AIProviderConfig> & { apiKey?: string } | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [expandedProviders, setExpandedProviders] = useState<Record<string, boolean>>({});

  // Build usage map: for each provider type, list functions/agents/channels using it
  type UsageItem = { name: string; model: string; shortName: string; source: 'F' | 'A' | 'C' };
  const providerUsageMap = useMemo(() => {
    const map: Record<string, UsageItem[]> = {};

    // Functions
    AI_FUNCTIONS.forEach((fn) => {
      const dbConfig = functionConfigs.find(c => c.functionName === fn.name);
      const model = dbConfig?.modelOverride || fn.currentModel;
      const provider = dbConfig?.forceProvider || getModelInfo(model).provider;
      if (!map[provider]) map[provider] = [];
      map[provider].push({ name: fn.name, model, shortName: getModelInfo(model).shortName, source: 'F' });
    });

    // Agents
    ALL_AGENTS.forEach((agent) => {
      const dbConfig = agentConfigs.find(c => c.agentName === agent.id);
      const model = dbConfig?.modelOverride || agent.defaultModel;
      const provider = getModelInfo(model).provider;
      if (!map[provider]) map[provider] = [];
      map[provider].push({ name: agent.label, model, shortName: getModelInfo(model).shortName, source: 'A' });
    });

    // Channels
    ALL_CHANNELS.forEach((ch) => {
      const dbConfig = channelConfigs.find(c => c.channel === ch.id);
      if (dbConfig?.modelOverride) {
        const model = dbConfig.modelOverride;
        const provider = dbConfig.forceProvider || getModelInfo(model).provider;
        if (!map[provider]) map[provider] = [];
        map[provider].push({ name: ch.name, model, shortName: getModelInfo(model).shortName, source: 'C' });
      }
    });

    return map;
  }, [functionConfigs, agentConfigs, channelConfigs]);

  const handleSaveProvider = async () => {
    if (!editingProvider?.providerType) return;

    try {
      // Build provider data with proper typing
      const providerData: Partial<AIProviderConfig> & { providerType: string } = {
        id: editingProvider.id,
        providerType: editingProvider.providerType,
        displayName: editingProvider.displayName,
        isActive: editingProvider.isActive,
        baseUrl: editingProvider.baseUrl,
        defaultModel: editingProvider.defaultModel,
        apiKeySecretName: editingProvider.apiKeySecretName,
      };

      // Save the provider
      const savedProvider = await upsertProvider(providerData);

      // If there's an API key, encrypt and save it via edge function
      if (editingProvider.apiKey && savedProvider?.id) {
        const { error: encryptError } = await supabase.functions.invoke('encrypt-api-key', {
          body: {
            apiKey: editingProvider.apiKey,
            providerId: savedProvider.id,
          },
        });

        if (encryptError) {
          console.error('Failed to encrypt API key:', encryptError);
          toast.error('Lưu provider thành công nhưng không thể mã hóa API key');
        } else {
          toast.success('Provider và API key đã được mã hóa và lưu thành công');
        }
      }

      setIsDialogOpen(false);
      setEditingProvider(null);
      setShowApiKey(false);
      setTestResult(null);
    } catch (error) {
      console.error('Save provider error:', error);
      toast.error('Không thể lưu provider');
    }
  };

  const handleTestConnection = async () => {
    if (!editingProvider?.apiKey || !editingProvider?.providerType) {
      toast.error('Vui lòng nhập API key trước');
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('test-ai-connection', {
        body: {
          provider: editingProvider.providerType,
          apiKey: editingProvider.apiKey,
        },
      });

      if (error) throw error;

      if (data?.success) {
        setTestResult({ success: true, message: data.message || 'Kết nối thành công!' });
        toast.success('Kết nối thành công!');
      } else {
        setTestResult({ success: false, message: data?.error || 'Kết nối thất bại' });
        toast.error(data?.error || 'Kết nối thất bại');
      }
    } catch (error) {
      console.error('Test connection error:', error);
      setTestResult({ success: false, message: 'Không thể test kết nối' });
      toast.error('Không thể test kết nối');
    } finally {
      setIsTesting(false);
    }
  };

  const getConfiguredProvider = (type: string) => {
    return providers.find(p => p.providerType === type);
  };

  const hasApiKey = (provider: Partial<AIProviderConfig>) => {
    return !!(provider as any).encryptedApiKey || !!provider.apiKeySecretName;
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">AI Providers</h3>
          <p className="text-sm text-muted-foreground">
            Quản lý các nhà cung cấp AI và API keys
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {AI_PROVIDERS.map((provider) => {
          const configured = getConfiguredProvider(provider.type);
          const isBuiltIn = provider.type === 'lovable';
          const hasConnector = provider.type === 'perplexity' || provider.type === 'firecrawl';
          const hasKey = configured && hasApiKey(configured);
          
          return (
            <Card key={provider.type} className={configured?.isActive || isBuiltIn ? 'border-primary/50' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {PROVIDER_ICONS[provider.type]}
                    <CardTitle className="text-base">{provider.name}</CardTitle>
                  </div>
                  {isBuiltIn ? (
                    <Badge variant="default" className="bg-primary">Built-in</Badge>
                  ) : configured ? (
                    <Badge variant={configured.isActive ? 'default' : 'secondary'}>
                      {configured.isActive ? (
                        <><Check className="h-3 w-3 mr-1" /> Active</>
                      ) : (
                        <><X className="h-3 w-3 mr-1" /> Inactive</>
                      )}
                    </Badge>
                  ) : hasConnector ? (
                    <Badge variant="outline">Connector</Badge>
                  ) : (
                    <Badge variant="outline">Not configured</Badge>
                  )}
                </div>
                <CardDescription>{provider.description}</CardDescription>
              </CardHeader>
              <CardContent>
                {isBuiltIn ? (
                  <div className="text-sm text-muted-foreground">
                    <p>Sử dụng Lovable AI Gateway - không cần cấu hình API key.</p>
                    <p className="mt-1 text-xs">
                      Models: gemini-2.5-pro, gpt-5, gpt-5-mini...
                    </p>
                  </div>
                ) : hasConnector ? (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Đã kết nối qua Connector
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingProvider(configured || { providerType: provider.type, displayName: provider.name });
                          setIsDialogOpen(true);
                        }}
                      >
                        <Settings className="h-4 w-4 mr-1" />
                        Cấu hình
                      </Button>
                    </div>
                  </div>
                ) : configured ? (
                  <div className="space-y-3">
                    {hasKey && (
                      <p className="text-sm text-green-600">
                        <CheckCircle2 className="h-4 w-4 inline mr-1" />
                        API Key đã cấu hình
                      </p>
                    )}
                    {configured.defaultModel && (
                      <p className="text-sm">
                        Model: <span className="font-medium">{configured.defaultModel}</span>
                      </p>
                    )}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingProvider(configured);
                          setIsDialogOpen(true);
                          setTestResult(null);
                        }}
                      >
                        <Settings className="h-4 w-4 mr-1" />
                        Chỉnh sửa
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteProvider(configured.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      setEditingProvider({ providerType: provider.type, displayName: provider.name });
                      setIsDialogOpen(true);
                      setTestResult(null);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Cấu hình
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) {
          setShowApiKey(false);
          setTestResult(null);
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingProvider?.id ? 'Chỉnh sửa' : 'Thêm'} Provider: {editingProvider?.displayName}
            </DialogTitle>
          </DialogHeader>
          
          {editingProvider && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Tên hiển thị</Label>
                <Input
                  value={editingProvider.displayName || ''}
                  onChange={(e) => setEditingProvider({ ...editingProvider, displayName: e.target.value })}
                  placeholder="Provider name"
                />
              </div>

              {/* API Key Input */}
              {AI_PROVIDERS.find(p => p.type === editingProvider.providerType)?.hasKey && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>API Key</Label>
                    {PROVIDER_KEY_URLS[editingProvider.providerType!] && (
                      <a
                        href={PROVIDER_KEY_URLS[editingProvider.providerType!]}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        Lấy API Key <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      type={showApiKey ? 'text' : 'password'}
                      value={editingProvider.apiKey || ''}
                      onChange={(e) => {
                        setEditingProvider({ ...editingProvider, apiKey: e.target.value });
                        setTestResult(null);
                      }}
                      placeholder={hasApiKey(editingProvider) ? '••••••••••••••••' : 'sk-xxxxx...'}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowApiKey(!showApiKey)}
                    >
                      {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {hasApiKey(editingProvider) 
                      ? 'Để trống nếu không muốn thay đổi API key hiện tại'
                      : 'API key sẽ được mã hóa và lưu an toàn'}
                  </p>
                  
                  {/* Test Connection Button */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full mt-2"
                    onClick={handleTestConnection}
                    disabled={!editingProvider.apiKey || isTesting}
                  >
                    {isTesting ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Đang test...</>
                    ) : (
                      'Test Connection'
                    )}
                  </Button>

                  {/* Test Result */}
                  {testResult && (
                    <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${
                      testResult.success ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                    }`}>
                      {testResult.success ? (
                        <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 flex-shrink-0" />
                      )}
                      {testResult.message}
                    </div>
                  )}
                </div>
              )}

              {editingProvider.providerType === 'custom' && (
                <div className="space-y-2">
                  <Label>Base URL</Label>
                  <Input
                    value={editingProvider.baseUrl || ''}
                    onChange={(e) => setEditingProvider({ ...editingProvider, baseUrl: e.target.value })}
                    placeholder="https://api.example.com/v1"
                  />
                </div>
              )}

              {MODELS_BY_PROVIDER[editingProvider.providerType!]?.length > 0 && (
                <div className="space-y-2">
                  <Label>Default Model</Label>
                  <Select
                    value={editingProvider.defaultModel || ''}
                    onValueChange={(value) => setEditingProvider({ ...editingProvider, defaultModel: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn model mặc định" />
                    </SelectTrigger>
                    <SelectContent>
                      {MODELS_BY_PROVIDER[editingProvider.providerType!].map((model) => (
                        <SelectItem key={model} value={model}>
                          {model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex items-center justify-between">
                <Label>Kích hoạt</Label>
                <Switch
                  checked={editingProvider.isActive ?? true}
                  onCheckedChange={(checked) => setEditingProvider({ ...editingProvider, isActive: checked })}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleSaveProvider}>
              Lưu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
