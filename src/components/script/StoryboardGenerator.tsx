import { useState } from 'react';
import { Script } from '@/types/script';
import { useStoryboardGenerator } from '@/hooks/useStoryboardGenerator';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { StoryboardSceneCard } from './StoryboardSceneCard';
import { 
  Clapperboard, 
  Loader2, 
  Save, 
  Trash2, 
  Clock,
  Film,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { VIDEO_TYPE_LABELS, CHARACTER_TYPE_LABELS } from '@/types/script';

interface StoryboardGeneratorProps {
  script: Script;
  brandName?: string;
  className?: string;
}

export function StoryboardGenerator({ script, brandName, className }: StoryboardGeneratorProps) {
  const {
    generating,
    storyboard,
    generateStoryboard,
    saveStoryboard,
    updateScene,
    clearStoryboard,
  } = useStoryboardGenerator();

  const handleGenerate = async () => {
    await generateStoryboard({
      scriptContent: script.content,
      scriptTitle: script.title,
      duration: script.duration,
      videoType: script.video_type,
      characterType: script.character_type,
      brandName,
    });
  };

  const handleSave = async () => {
    await saveStoryboard(script.id);
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clapperboard className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Storyboard Generator</CardTitle>
          </div>
          {storyboard && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="flex items-center gap-1">
                <Film className="h-3 w-3" />
                {storyboard.scenes.length} cảnh
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {storyboard.total_duration}s
              </Badge>
            </div>
          )}
        </div>
        <CardDescription>
          AI phân tích kịch bản và tạo visual direction chi tiết cho từng phân cảnh
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Script Info */}
        <div className="rounded-lg bg-muted/50 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{script.title}</span>
            <Badge variant="secondary">{script.duration}s</Badge>
          </div>
          <div className="flex gap-2 text-xs text-muted-foreground">
            <span>{VIDEO_TYPE_LABELS[script.video_type as keyof typeof VIDEO_TYPE_LABELS]}</span>
            <span>•</span>
            <span>{CHARACTER_TYPE_LABELS[script.character_type as keyof typeof CHARACTER_TYPE_LABELS]}</span>
          </div>
        </div>

        {/* Generate Button */}
        {!storyboard && (
          <Button 
            onClick={handleGenerate} 
            disabled={generating}
            className="w-full"
            size="lg"
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Đang phân tích kịch bản...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Tạo Storyboard với AI
              </>
            )}
          </Button>
        )}

        {/* Storyboard Result */}
        {storyboard && (
          <>
            {/* Style Notes */}
            {storyboard.style_notes && (
              <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
                <p className="text-sm font-medium mb-1">🎬 Gợi ý phong cách:</p>
                <p className="text-sm text-muted-foreground">{storyboard.style_notes}</p>
              </div>
            )}

            <Separator />

            {/* Scenes */}
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-4">
                {storyboard.scenes.map((scene) => (
                  <StoryboardSceneCard
                    key={scene.sceneNumber}
                    scene={scene}
                    storyboardId={storyboard.id}
                    onUpdate={(updates) => updateScene(scene.sceneNumber, updates)}
                    editable
                  />
                ))}
              </div>
            </ScrollArea>

            <Separator />

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button onClick={handleSave} className="flex-1">
                <Save className="h-4 w-4 mr-2" />
                Lưu Storyboard
              </Button>
              <Button variant="outline" onClick={handleGenerate} disabled={generating}>
                <RefreshCw className={`h-4 w-4 mr-2 ${generating ? 'animate-spin' : ''}`} />
                Tạo lại
              </Button>
              <Button variant="ghost" onClick={clearStoryboard}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
