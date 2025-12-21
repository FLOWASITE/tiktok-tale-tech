import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Eye, EyeOff, Key, ExternalLink, Check, X, Save } from 'lucide-react';
import { useGeminiApiKey } from '@/hooks/useGeminiApiKey';
import { toast } from 'sonner';

interface GeminiApiKeyInputProps {
  compact?: boolean;
}

export function GeminiApiKeyInput({ compact = false }: GeminiApiKeyInputProps) {
  const { apiKey, isConfigured, saveApiKey, clearApiKey } = useGeminiApiKey();
  const [showKey, setShowKey] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = () => {
    if (inputValue.trim()) {
      saveApiKey(inputValue.trim());
      setInputValue('');
      setIsEditing(false);
      toast.success('Đã lưu Gemini API Key!');
    }
  };

  const handleClear = () => {
    clearApiKey();
    setInputValue('');
    setIsEditing(false);
    toast.info('Đã xóa Gemini API Key');
  };

  const maskedKey = apiKey ? `${apiKey.slice(0, 8)}...${apiKey.slice(-4)}` : '';

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Key className="w-4 h-4 text-muted-foreground" />
        {isConfigured ? (
          <>
            <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
              <Check className="w-3 h-3 mr-1" />
              Đã cấu hình
            </Badge>
            <Button variant="ghost" size="sm" onClick={handleClear} className="h-6 px-2 text-xs">
              <X className="w-3 h-3" />
            </Button>
          </>
        ) : (
          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
            Chưa cấu hình
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4 rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Key className="w-4 h-4 text-primary" />
          <Label className="font-medium">Gemini API Key</Label>
        </div>
        {isConfigured ? (
          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
            <Check className="w-3 h-3 mr-1" />
            Đã cấu hình
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
            Chưa cấu hình
          </Badge>
        )}
      </div>

      {isConfigured && !isEditing ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Input
              type={showKey ? 'text' : 'password'}
              value={showKey ? apiKey : maskedKey}
              readOnly
              className="font-mono text-sm bg-muted/50"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setShowKey(!showKey)}
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="flex-1"
            >
              Đổi Key
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClear}
              className="text-destructive hover:text-destructive"
            >
              <X className="w-4 h-4 mr-1" />
              Xóa
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Input
              type={showKey ? 'text' : 'password'}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Nhập Gemini API Key..."
              className="font-mono text-sm"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setShowKey(!showKey)}
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              disabled={!inputValue.trim()}
              size="sm"
              className="flex-1"
            >
              <Save className="w-4 h-4 mr-1" />
              Lưu Key
            </Button>
            {isEditing && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsEditing(false);
                  setInputValue('');
                }}
              >
                Hủy
              </Button>
            )}
          </div>
        </div>
      )}

      <a
        href="https://aistudio.google.com/apikey"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
      >
        <ExternalLink className="w-3 h-3" />
        Lấy API Key từ Google AI Studio
      </a>
    </div>
  );
}
