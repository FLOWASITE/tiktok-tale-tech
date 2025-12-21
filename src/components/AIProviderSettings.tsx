import { useState } from 'react';
import { Eye, EyeOff, ExternalLink, Check, Loader2, Wifi, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAIProviders } from '@/hooks/useAIProviders';
import { AI_PROVIDERS, AIProviderType, AIProviderConfig } from '@/types/aiProvider';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ConnectionTestResult {
  success: boolean;
  message?: string;
  error?: string;
  modelsCount?: number;
  imageGenerationSupported?: boolean;
}

export function AIProviderSettings() {
  const {
    config,
    isLoading,
    setSelectedProvider,
    saveProviderConfig,
    clearProviderConfig,
    getProviderConfig,
  } = useAIProviders();

  const [activeTab, setActiveTab] = useState<AIProviderType>(config.selectedProvider);
  const [showKeys, setShowKeys] = useState<Record<AIProviderType, boolean>>({
    gemini: false,
    openai: false,
    replicate: false,
    custom: false,
  });
  const [testing, setTesting] = useState<AIProviderType | null>(null);
  const [testResults, setTestResults] = useState<Record<AIProviderType, ConnectionTestResult | null>>({
    gemini: null,
    openai: null,
    replicate: null,
    custom: null,
  });
  const [editValues, setEditValues] = useState<Record<AIProviderType, AIProviderConfig>>({
    gemini: getProviderConfig('gemini') || { apiKey: '' },
    openai: getProviderConfig('openai') || { apiKey: '' },
    replicate: getProviderConfig('replicate') || { apiKey: '' },
    custom: getProviderConfig('custom') || { apiKey: '', baseUrl: '', model: '' },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const handleSave = (provider: AIProviderType) => {
    const providerConfig = editValues[provider];
    if (!providerConfig.apiKey.trim()) {
      toast.error('Vui lòng nhập API key');
      return;
    }
    saveProviderConfig(provider, {
      ...providerConfig,
      apiKey: providerConfig.apiKey.trim(),
    });
    toast.success(`Đã lưu cấu hình ${AI_PROVIDERS.find(p => p.id === provider)?.name}`);
  };

  const handleClear = (provider: AIProviderType) => {
    clearProviderConfig(provider);
    setEditValues(prev => ({
      ...prev,
      [provider]: { apiKey: '', baseUrl: '', model: '' },
    }));
    setTestResults(prev => ({ ...prev, [provider]: null }));
    toast.success('Đã xóa cấu hình');
  };

  const handleSetDefault = (provider: AIProviderType) => {
    const providerConfig = getProviderConfig(provider);
    if (!providerConfig?.apiKey) {
      toast.error('Vui lòng lưu API key trước khi đặt làm mặc định');
      return;
    }
    setSelectedProvider(provider);
    toast.success(`Đã đặt ${AI_PROVIDERS.find(p => p.id === provider)?.name} làm provider mặc định`);
  };

  const handleTestConnection = async (provider: AIProviderType) => {
    const providerConfig = getProviderConfig(provider) || editValues[provider];
    if (!providerConfig?.apiKey) {
      toast.error('Vui lòng nhập API key trước');
      return;
    }

    setTesting(provider);
    setTestResults(prev => ({ ...prev, [provider]: null }));

    try {
      // For now, only Gemini has a test endpoint
      if (provider === 'gemini') {
        const { data, error } = await supabase.functions.invoke('test-gemini-connection', {
          body: { geminiApiKey: providerConfig.apiKey },
        });

        if (error) {
          setTestResults(prev => ({ ...prev, [provider]: { success: false, error: error.message } }));
          toast.error('Lỗi test kết nối');
        } else {
          setTestResults(prev => ({ ...prev, [provider]: data }));
          if (data.success) {
            toast.success('Kết nối thành công!');
          } else {
            toast.error(data.error || 'Kết nối thất bại');
          }
        }
      } else {
        // For other providers, just validate the key format
        const isValidFormat = providerConfig.apiKey.length > 10;
        const result: ConnectionTestResult = isValidFormat
          ? { success: true, message: 'API key có định dạng hợp lệ' }
          : { success: false, error: 'API key không hợp lệ' };
        setTestResults(prev => ({ ...prev, [provider]: result }));
        if (isValidFormat) {
          toast.success('API key có định dạng hợp lệ');
        } else {
          toast.error('API key không hợp lệ');
        }
      }
    } catch (error) {
      console.error('Test connection error:', error);
      setTestResults(prev => ({ ...prev, [provider]: { success: false, error: 'Lỗi không xác định' } }));
      toast.error('Lỗi test kết nối');
    } finally {
      setTesting(null);
    }
  };

  const toggleShowKey = (provider: AIProviderType) => {
    setShowKeys(prev => ({ ...prev, [provider]: !prev[provider] }));
  };

  const maskKey = (key: string) => {
    if (!key || key.length < 8) return key;
    return `${key.slice(0, 4)}${'•'.repeat(Math.min(key.length - 8, 20))}${key.slice(-4)}`;
  };

  const renderProviderTab = (provider: typeof AI_PROVIDERS[number]) => {
    const savedConfig = getProviderConfig(provider.id);
    const currentValue = editValues[provider.id];
    const isDefault = config.selectedProvider === provider.id;
    const testResult = testResults[provider.id];
    const isTesting = testing === provider.id;

    return (
      <TabsContent key={provider.id} value={provider.id} className="space-y-4 mt-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium flex items-center gap-2">
              <span>{provider.icon}</span>
              {provider.name}
              {isDefault && (
                <Badge variant="default" className="text-xs">Mặc định</Badge>
              )}
            </h3>
            <p className="text-sm text-muted-foreground">{provider.description}</p>
          </div>
          {provider.getKeyUrl && (
            <a
              href={provider.getKeyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-primary hover:underline"
            >
              <ExternalLink className="w-3 h-3" />
              Lấy API key
            </a>
          )}
        </div>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor={`${provider.id}-key`}>API Key</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id={`${provider.id}-key`}
                  type={showKeys[provider.id] ? 'text' : 'password'}
                  placeholder="Nhập API key..."
                  value={currentValue.apiKey}
                  onChange={(e) =>
                    setEditValues(prev => ({
                      ...prev,
                      [provider.id]: { ...prev[provider.id], apiKey: e.target.value },
                    }))
                  }
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => toggleShowKey(provider.id)}
                >
                  {showKeys[provider.id] ? (
                    <EyeOff className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <Eye className="w-4 h-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          {provider.id === 'custom' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="custom-baseurl">Base URL</Label>
                <Input
                  id="custom-baseurl"
                  placeholder="https://api.example.com/v1"
                  value={currentValue.baseUrl || ''}
                  onChange={(e) =>
                    setEditValues(prev => ({
                      ...prev,
                      custom: { ...prev.custom, baseUrl: e.target.value },
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="custom-model">Model Name</Label>
                <Input
                  id="custom-model"
                  placeholder="model-name"
                  value={currentValue.model || ''}
                  onChange={(e) =>
                    setEditValues(prev => ({
                      ...prev,
                      custom: { ...prev.custom, model: e.target.value },
                    }))
                  }
                />
              </div>
            </>
          )}

          <div className="flex gap-2 flex-wrap">
            <Button onClick={() => handleSave(provider.id)} size="sm">
              Lưu
            </Button>
            {savedConfig && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTestConnection(provider.id)}
                  disabled={isTesting}
                >
                  {isTesting ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                      Đang test...
                    </>
                  ) : (
                    <>
                      <Wifi className="w-3 h-3 mr-1.5" />
                      Test
                    </>
                  )}
                </Button>
                {!isDefault && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSetDefault(provider.id)}
                  >
                    <Check className="w-3 h-3 mr-1.5" />
                    Đặt mặc định
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleClear(provider.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-3 h-3 mr-1.5" />
                  Xóa
                </Button>
              </>
            )}
          </div>

          {testResult && (
            <div
              className={`p-3 rounded-lg ${
                testResult.success
                  ? 'bg-green-500/10 border border-green-500/30'
                  : 'bg-destructive/10 border border-destructive/30'
              }`}
            >
              <div className="flex items-center gap-2">
                {testResult.success ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <XCircle className="w-4 h-4 text-destructive" />
                )}
                <span
                  className={`text-sm ${
                    testResult.success ? 'text-green-600' : 'text-destructive'
                  }`}
                >
                  {testResult.success ? testResult.message : testResult.error}
                </span>
              </div>
              {testResult.success && testResult.modelsCount && (
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge variant="secondary" className="text-xs">
                    {testResult.modelsCount} models
                  </Badge>
                  {testResult.imageGenerationSupported && (
                    <Badge className="text-xs bg-green-500/20 text-green-600 border-green-500/30">
                      Image Generation ✓
                    </Badge>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {savedConfig && (
          <Card className="bg-muted/30">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Đã cấu hình:</span>
                <code className="text-xs bg-muted px-2 py-1 rounded">
                  {maskKey(savedConfig.apiKey)}
                </code>
              </div>
            </CardContent>
          </Card>
        )}
      </TabsContent>
    );
  };

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as AIProviderType)}>
        <TabsList className="grid w-full grid-cols-4">
          {AI_PROVIDERS.map((provider) => {
            const isConfigured = !!getProviderConfig(provider.id);
            const isDefault = config.selectedProvider === provider.id;
            return (
              <TabsTrigger
                key={provider.id}
                value={provider.id}
                className="relative text-xs gap-1"
              >
                <span>{provider.icon}</span>
                <span className="hidden sm:inline">{provider.name.split(' ')[0]}</span>
                {isConfigured && (
                  <span className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${isDefault ? 'bg-primary' : 'bg-green-500'}`} />
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {AI_PROVIDERS.map(renderProviderTab)}
      </Tabs>

      <Card className="bg-muted/30">
        <CardContent className="pt-4">
          <h4 className="font-medium text-sm mb-2">Thông tin</h4>
          <ul className="text-xs text-muted-foreground space-y-1.5">
            <li>• API keys được lưu cục bộ trên trình duyệt của bạn</li>
            <li>• Provider có dấu chấm xanh là đã cấu hình, dấu chấm tím là mặc định</li>
            <li>• Bạn có thể sử dụng nhiều providers và chuyển đổi khi cần</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
