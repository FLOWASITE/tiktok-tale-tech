import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sparkles, Loader2 } from 'lucide-react';
import { useHookGenerator } from '@/hooks/useHookGenerator';
import { HookCard } from './HookCard';
import { GeneratedHook } from '@/types/hook';

interface BrandVoice {
  brand_name?: string;
  tone_of_voice?: string[];
  formality_level?: string;
  preferred_words?: string[];
  forbidden_words?: string[];
  brand_positioning?: string;
}

interface HookGeneratorProps {
  brandVoice?: BrandVoice;
  onSaveHook?: (hook: GeneratedHook) => void;
  onUseHook?: (openingLine: string) => void;
}

const PLATFORMS = [
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube_shorts', label: 'YouTube Shorts' },
  { value: 'reels', label: 'Instagram Reels' },
  { value: 'facebook', label: 'Facebook' },
];

const DURATIONS = [
  { value: '15s', label: '15 giây' },
  { value: '30s', label: '30 giây' },
  { value: '60s', label: '60 giây' },
  { value: '90s', label: '90 giây' },
];

export function HookGenerator({ brandVoice, onSaveHook, onUseHook }: HookGeneratorProps) {
  const [topic, setTopic] = useState('');
  const [platform, setPlatform] = useState('tiktok');
  const [duration, setDuration] = useState('60s');
  
  const { hooks, loading, generateHooks, clearHooks } = useHookGenerator();

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    
    await generateHooks({
      topic,
      brandVoice,
      platform,
      duration,
      count: 5,
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            AI Hook Generator
            {brandVoice?.brand_name && (
              <span className="text-xs font-normal text-muted-foreground">
                • {brandVoice.brand_name}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="topic">Chủ đề video</Label>
            <Input
              id="topic"
              placeholder="VD: Cách tiết kiệm tiền hiệu quả cho Gen Z"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !loading && handleGenerate()}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Nền tảng</Label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Thời lượng</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATIONS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button 
            onClick={handleGenerate} 
            disabled={loading || !topic.trim()}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Đang tạo hooks...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Tạo 5 Hooks
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Generated Hooks */}
      {hooks.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">
              Hooks được tạo ({hooks.length})
            </h3>
            <Button variant="ghost" size="sm" onClick={clearHooks}>
              Xóa tất cả
            </Button>
          </div>
          
          <div className="grid gap-3">
            {hooks.map((hook, index) => (
              <HookCard
                key={index}
                hook={hook}
                type="generated"
                onSave={onSaveHook ? () => onSaveHook(hook) : undefined}
                onUse={onUseHook}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
