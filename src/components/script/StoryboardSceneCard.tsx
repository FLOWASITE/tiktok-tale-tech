import { StoryboardScene } from '@/types/storyboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Camera, 
  Clock, 
  Lightbulb, 
  Move, 
  Type,
  MapPin,
  Activity,
  Pencil,
  Check,
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useState } from 'react';
import { SceneImagePreview } from './SceneImagePreview';
import { BRollKeywords } from './BRollKeywords';

interface StoryboardSceneCardProps {
  scene: StoryboardScene;
  onUpdate?: (updates: Partial<StoryboardScene>) => void;
  editable?: boolean;
}

export function StoryboardSceneCard({ scene, onUpdate, editable = false }: StoryboardSceneCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedScene, setEditedScene] = useState(scene);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showVisuals, setShowVisuals] = useState(false);

  const handleSave = () => {
    onUpdate?.(editedScene);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedScene(scene);
    setIsEditing(false);
  };

  const emotionColors: Record<string, string> = {
    'Confident': 'bg-blue-500/20 text-blue-600',
    'Curious': 'bg-purple-500/20 text-purple-600',
    'Excited': 'bg-orange-500/20 text-orange-600',
    'Serious': 'bg-slate-500/20 text-slate-600',
    'Neutral': 'bg-gray-500/20 text-gray-600',
    'Friendly': 'bg-green-500/20 text-green-600',
    'Urgent': 'bg-red-500/20 text-red-600',
  };

  return (
    <Card className="relative">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
              {scene.sceneNumber}
            </div>
            <CardTitle className="text-base">Scene {scene.sceneNumber}</CardTitle>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {scene.duration}s
          </Badge>
          <Badge className={emotionColors[scene.emotionalTone] || emotionColors['Neutral']}>
            {scene.emotionalTone}
          </Badge>
          {editable && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowVisuals(!showVisuals)}
              className="h-8 px-2 text-xs"
            >
              {showVisuals ? (
                <>
                  <ChevronUp className="h-3 w-3 mr-1" />
                  Ẩn visual
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3 mr-1" />
                  Xem visual
                </>
              )}
            </Button>
          )}
          {editable && !isEditing && (
            <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)} className="h-8 w-8">
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          {isEditing && (
            <>
              <Button variant="ghost" size="icon" onClick={handleSave} className="h-8 w-8">
                <Check className="h-4 w-4 text-green-500" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleCancel} className="h-8 w-8">
                <X className="h-4 w-4 text-red-500" />
              </Button>
            </>
          )}
        </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Prompt Text */}
        <div className="rounded-lg bg-muted/50 p-3">
          <p className="text-sm font-medium mb-1">Nội dung:</p>
          {isEditing ? (
            <Textarea
              value={editedScene.promptText}
              onChange={(e) => setEditedScene({ ...editedScene, promptText: e.target.value })}
              className="min-h-[80px]"
            />
          ) : (
            <p className="text-sm text-muted-foreground">{scene.promptText}</p>
          )}
        </div>

        {/* Visual Direction Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Camera Angle */}
          <div className="flex items-start gap-2">
            <Camera className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <div>
              <p className="text-xs font-medium text-muted-foreground">Góc máy</p>
              {isEditing ? (
                <Input
                  value={editedScene.visualDirection.cameraAngle}
                  onChange={(e) => setEditedScene({
                    ...editedScene,
                    visualDirection: { ...editedScene.visualDirection, cameraAngle: e.target.value }
                  })}
                  className="h-7 text-sm"
                />
              ) : (
                <p className="text-sm">{scene.visualDirection.cameraAngle}</p>
              )}
            </div>
          </div>

          {/* Camera Movement */}
          <div className="flex items-start gap-2">
            <Move className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <div>
              <p className="text-xs font-medium text-muted-foreground">Chuyển động</p>
              {isEditing ? (
                <Input
                  value={editedScene.visualDirection.cameraMovement}
                  onChange={(e) => setEditedScene({
                    ...editedScene,
                    visualDirection: { ...editedScene.visualDirection, cameraMovement: e.target.value }
                  })}
                  className="h-7 text-sm"
                />
              ) : (
                <p className="text-sm">{scene.visualDirection.cameraMovement}</p>
              )}
            </div>
          </div>

          {/* Lighting */}
          <div className="flex items-start gap-2">
            <Lightbulb className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <div>
              <p className="text-xs font-medium text-muted-foreground">Ánh sáng</p>
              {isEditing ? (
                <Input
                  value={editedScene.visualDirection.lighting}
                  onChange={(e) => setEditedScene({
                    ...editedScene,
                    visualDirection: { ...editedScene.visualDirection, lighting: e.target.value }
                  })}
                  className="h-7 text-sm"
                />
              ) : (
                <p className="text-sm">{scene.visualDirection.lighting}</p>
              )}
            </div>
          </div>

          {/* Background */}
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <div>
              <p className="text-xs font-medium text-muted-foreground">Bối cảnh</p>
              {isEditing ? (
                <Input
                  value={editedScene.visualDirection.backgroundSetting}
                  onChange={(e) => setEditedScene({
                    ...editedScene,
                    visualDirection: { ...editedScene.visualDirection, backgroundSetting: e.target.value }
                  })}
                  className="h-7 text-sm"
                />
              ) : (
                <p className="text-sm">{scene.visualDirection.backgroundSetting}</p>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        {scene.visualDirection.actions.length > 0 && (
          <div className="flex items-start gap-2">
            <Activity className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Hành động</p>
              <div className="flex flex-wrap gap-1">
                {scene.visualDirection.actions.map((action, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {action}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Text Overlay */}
        {scene.visualDirection.textOverlay && (
          <div className="flex items-start gap-2">
            <Type className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <div>
              <p className="text-xs font-medium text-muted-foreground">Text Overlay</p>
              <p className="text-sm font-medium text-primary">{scene.visualDirection.textOverlay}</p>
            </div>
          </div>
        )}

        {/* Transitions */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
          <span>↘ {scene.transitionIn || 'Cut'}</span>
          <span>{scene.transitionOut || 'Cut'} ↗</span>
        </div>

        {/* Notes */}
        {scene.notes && (
          <div className="text-xs text-muted-foreground italic bg-yellow-500/10 p-2 rounded">
            💡 {scene.notes}
          </div>
        )}

        {/* Phase 2: Visual Enhancements */}
        {showVisuals && editable && (
          <>
            <div className="pt-3 border-t space-y-3">
              {/* AI Scene Image Preview */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">🖼️ AI Scene Preview</p>
                <SceneImagePreview 
                  scene={scene}
                  onImageGenerated={(url) => {
                    // Optional: Save image reference to scene.notes
                    console.log('Scene image generated:', url);
                  }}
                />
              </div>

              {/* B-Roll Keywords */}
              <BRollKeywords scene={scene} />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
