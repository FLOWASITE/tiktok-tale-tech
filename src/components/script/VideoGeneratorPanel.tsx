import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Loader2, Video, Sparkles, Clock, Maximize } from 'lucide-react';
import { VideoProvider, VIDEO_PROVIDER_CONFIG, ASPECT_RATIO_CONFIG, GEMINIGEN_VIDEO_MODELS } from '@/types/videoGeneration';
import { useVideoGeneration } from '@/hooks/useVideoGeneration';
import { Script } from '@/types/script';
import { StoryboardScene } from '@/types/storyboard';

interface VideoGeneratorPanelProps {
  script?: Script;
  scene?: StoryboardScene;
  storyboardId?: string;
  onVideoGenerated?: (videoUrl: string) => void;
}

export function VideoGeneratorPanel({
  script,
  scene,
  storyboardId,
  onVideoGenerated,
}: VideoGeneratorPanelProps) {
  const { generateVideo, generating } = useVideoGeneration();
  
  const [provider, setProvider] = useState<VideoProvider>('geminigen');
  const [model, setModel] = useState<string>(GEMINIGEN_VIDEO_MODELS[0].id);
  const [prompt, setPrompt] = useState(scene?.promptText || '');
  const [duration, setDuration] = useState<number>(5);
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [resolution, setResolution] = useState('1080p');

  const providerConfig = VIDEO_PROVIDER_CONFIG[provider];
  const availableAspectRatios = providerConfig.aspectRatios;

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    const result = await generateVideo({
      provider,
      prompt: prompt.trim(),
      model: provider === 'geminigen' ? model : undefined,
      duration,
      aspect_ratio: aspectRatio,
      resolution,
      script_id: script?.id,
      storyboard_id: storyboardId,
      scene_number: scene?.sceneNumber,
    });

    if (result?.video_url) {
      onVideoGenerated?.(result.video_url);
    }
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Video className="h-4 w-4 text-primary" />
          Text-to-Video Generator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Provider Selection */}
        <div className="space-y-2">
          <Label className="text-xs font-medium">Provider</Label>
          <RadioGroup
            value={provider}
            onValueChange={(v) => setProvider(v as VideoProvider)}
            className="grid grid-cols-1 gap-2"
          >
            {Object.entries(VIDEO_PROVIDER_CONFIG).map(([key, config]) => (
              <div key={key} className="flex items-center space-x-2">
                <RadioGroupItem
                  value={key}
                  id={`provider-${key}`}
                  disabled={key === 'runway'}
                />
                <Label
                  htmlFor={`provider-${key}`}
                  className="flex-1 flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <span>{config.icon}</span>
                    <span className="text-sm">{config.label}</span>
                  </span>
                  {config.requiresApiKey && (
                    <Badge variant="outline" className="text-[10px]">
                      API Key
                    </Badge>
                  )}
                  {key === 'runway' && (
                    <Badge variant="secondary" className="text-[10px]">
                      Coming Soon
                    </Badge>
                  )}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        {/* Model Selection (GeminiGen only) */}
        {provider === 'geminigen' && (
          <div className="space-y-2">
            <Label className="text-xs font-medium flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Model
            </Label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GEMINIGEN_VIDEO_MODELS.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.label} (max {m.maxDuration}s)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Prompt */}
        <div className="space-y-2">
          <Label className="text-xs font-medium">Video Prompt</Label>
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Mô tả chi tiết cảnh quay: nhân vật, hành động, góc camera, ánh sáng..."
            rows={4}
            className="text-sm resize-none"
          />
          <p className="text-[10px] text-muted-foreground">
            💡 Prompt càng chi tiết, video càng đẹp. Mô tả camera motion, lighting, mood.
          </p>
        </div>

        {/* Duration & Aspect Ratio */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-xs font-medium flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Duration
            </Label>
            <Select
              value={duration.toString()}
              onValueChange={(v) => setDuration(parseInt(v))}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 giây</SelectItem>
                {providerConfig.maxDuration >= 10 && (
                  <SelectItem value="10">10 giây</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium flex items-center gap-1">
              <Maximize className="h-3 w-3" />
              Aspect Ratio
            </Label>
            <Select
              value={aspectRatio}
              onValueChange={setAspectRatio}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableAspectRatios.map((ratio) => (
                  <SelectItem key={ratio} value={ratio}>
                    {ASPECT_RATIO_CONFIG[ratio]?.label || ratio}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Resolution */}
        <div className="space-y-2">
          <Label className="text-xs font-medium">Resolution</Label>
          <Select value={resolution} onValueChange={setResolution}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="480p">480p (Nhanh)</SelectItem>
              <SelectItem value="1080p">1080p (Chất lượng cao)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Generate Button */}
        <Button
          onClick={handleGenerate}
          disabled={generating || !prompt.trim()}
          className="w-full"
        >
          {generating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Đang tạo video...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Tạo Video
            </>
          )}
        </Button>

        {/* Info */}
        <div className="text-[10px] text-muted-foreground space-y-1 pt-2 border-t">
          <p>🎬 {providerConfig.label}: {providerConfig.description}</p>
          <p>⏱️ Thời gian tạo: 1-5 phút tùy provider</p>
        </div>
      </CardContent>
    </Card>
  );
}
