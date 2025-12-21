import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Loader2, CheckCircle, XCircle, Wifi, ExternalLink, Sparkles } from 'lucide-react';
import { GeminiApiKeyInput } from './GeminiApiKeyInput';
import { useGeminiApiKey } from '@/hooks/useGeminiApiKey';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ConnectionTestResult {
  success: boolean;
  message?: string;
  error?: string;
  modelsCount?: number;
  imageGenerationSupported?: boolean;
}

export function SettingsDialog() {
  const { apiKey, isConfigured } = useGeminiApiKey();
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);

  const handleTestConnection = async () => {
    if (!apiKey) {
      toast.error('Vui lòng nhập API key trước');
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('test-gemini-connection', {
        body: { geminiApiKey: apiKey },
      });

      if (error) {
        setTestResult({ success: false, error: error.message });
        toast.error('Lỗi test kết nối');
      } else {
        setTestResult(data);
        if (data.success) {
          toast.success('Kết nối thành công!');
        } else {
          toast.error(data.error || 'Kết nối thất bại');
        }
      }
    } catch (error) {
      console.error('Test connection error:', error);
      setTestResult({ success: false, error: 'Lỗi không xác định' });
      toast.error('Lỗi test kết nối');
    } finally {
      setTesting(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <Settings className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Cài đặt
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Gemini API Key Section */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Gemini Image Generation
            </h3>
            <GeminiApiKeyInput />

            {/* Test Connection */}
            {isConfigured && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Wifi className="w-4 h-4" />
                    Test kết nối
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    onClick={handleTestConnection}
                    disabled={testing}
                    variant="outline"
                    className="w-full"
                  >
                    {testing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Đang test...
                      </>
                    ) : (
                      <>
                        <Wifi className="w-4 h-4 mr-2" />
                        Test kết nối API
                      </>
                    )}
                  </Button>

                  {testResult && (
                    <div
                      className={`p-3 rounded-lg ${
                        testResult.success
                          ? 'bg-green-500/10 border border-green-500/30'
                          : 'bg-destructive/10 border border-destructive/30'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        {testResult.success ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-destructive" />
                        )}
                        <span
                          className={`font-medium text-sm ${
                            testResult.success ? 'text-green-600' : 'text-destructive'
                          }`}
                        >
                          {testResult.success ? testResult.message : testResult.error}
                        </span>
                      </div>
                      {testResult.success && (
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
                </CardContent>
              </Card>
            )}
          </div>

          {/* Info Section */}
          <Card className="bg-muted/30">
            <CardContent className="pt-4">
              <h4 className="font-medium text-sm mb-2">Thông tin</h4>
              <ul className="text-xs text-muted-foreground space-y-1.5">
                <li>• API key được lưu cục bộ trên trình duyệt của bạn</li>
                <li>• Gemini Image API sử dụng model gemini-2.0-flash-exp</li>
                <li>• Miễn phí với giới hạn số lượng request/phút</li>
              </ul>
              <a
                href="https://ai.google.dev/pricing"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-primary hover:underline mt-3"
              >
                <ExternalLink className="w-3 h-3" />
                Xem chi tiết pricing và quota
              </a>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
