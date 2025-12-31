import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Brain,
  Settings2,
  RotateCcw,
  Sparkles,
  Smile,
  Type,
  GraduationCap,
  Zap,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Loader2,
  Eye,
  AlertTriangle,
} from 'lucide-react';
import { useUserPreferences, UserPreferences } from '@/hooks/useUserPreferences';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface UserPreferencesCardProps {
  className?: string;
}

const TONE_OPTIONS = [
  { value: 'casual', label: 'Thoải mái', icon: '😊' },
  { value: 'balanced', label: 'Cân bằng', icon: '⚖️' },
  { value: 'formal', label: 'Trang trọng', icon: '👔' },
  { value: 'professional', label: 'Chuyên nghiệp', icon: '💼' },
] as const;

const EMOJI_OPTIONS = [
  { value: 'none', label: 'Không emoji', icon: '🚫' },
  { value: 'low', label: 'Ít emoji', icon: '🙂' },
  { value: 'medium', label: 'Vừa phải', icon: '😀' },
  { value: 'high', label: 'Nhiều emoji', icon: '🎉' },
] as const;

const LENGTH_OPTIONS = [
  { value: 'concise', label: 'Ngắn gọn', description: 'Súc tích, đi thẳng vào điểm' },
  { value: 'balanced', label: 'Vừa phải', description: 'Đủ chi tiết nhưng không dài' },
  { value: 'detailed', label: 'Chi tiết', description: 'Đầy đủ thông tin, giải thích kỹ' },
] as const;

const SKILL_LEVELS = [
  { value: 'beginner', label: 'Mới bắt đầu', progress: 25, color: 'bg-blue-500' },
  { value: 'intermediate', label: 'Trung bình', progress: 50, color: 'bg-yellow-500' },
  { value: 'advanced', label: 'Nâng cao', progress: 75, color: 'bg-orange-500' },
  { value: 'expert', label: 'Chuyên gia', progress: 100, color: 'bg-emerald-500' },
] as const;

export function UserPreferencesCard({ className }: UserPreferencesCardProps) {
  const { 
    preferences, 
    isLoading, 
    updatePreferences, 
    resetPreferences 
  } = useUserPreferences();
  const [isSaving, setIsSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleUpdate = useCallback(async (updates: Partial<UserPreferences>) => {
    setIsSaving(true);
    const success = await updatePreferences(updates);
    setIsSaving(false);
    if (success) {
      toast.success('Đã lưu preferences');
    }
  }, [updatePreferences]);

  const handleReset = useCallback(async (keepLearned: boolean) => {
    const success = await resetPreferences(keepLearned);
    if (success) {
      toast.success(keepLearned ? 'Đã reset preferences (giữ dữ liệu học)' : 'Đã reset hoàn toàn');
    }
  }, [resetPreferences]);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!preferences) {
    return null;
  }

  const currentSkill = SKILL_LEVELS.find(s => s.value === preferences.skill_level) || SKILL_LEVELS[0];
  const inferredPrefs = preferences.inferred_preferences || {};
  const hasInferredPrefs = Object.keys(inferredPrefs).length > 0;

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">AI Preferences</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reset Preferences</AlertDialogTitle>
                  <AlertDialogDescription>
                    Bạn muốn reset preferences như thế nào?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
                  <AlertDialogCancel>Hủy</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={() => handleReset(true)}
                    className="bg-yellow-600 hover:bg-yellow-700"
                  >
                    Giữ dữ liệu học
                  </AlertDialogAction>
                  <AlertDialogAction 
                    onClick={() => handleReset(false)}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    Reset hoàn toàn
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
        <CardDescription>
          Điều chỉnh cách AI tạo nội dung cho bạn
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Skill Level */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4" />
              Skill Level
            </Label>
            <Badge variant="secondary" className={cn('text-white', currentSkill.color)}>
              {currentSkill.label}
            </Badge>
          </div>
          <Progress value={currentSkill.progress} className="h-2" />
          <p className="text-xs text-muted-foreground">
            Dựa trên {preferences.topics_generated_count} topics đã tạo, {preferences.topics_used_count} topics đã sử dụng
          </p>
        </div>

        <Separator />

        {/* Writing Style */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Type className="w-4 h-4" />
            Phong cách viết
          </h4>

          {/* Tone */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Tone giọng văn</Label>
            <div className="grid grid-cols-2 gap-2">
              {TONE_OPTIONS.map(option => (
                <Button
                  key={option.value}
                  variant={preferences.preferred_tone === option.value ? 'default' : 'outline'}
                  size="sm"
                  className="justify-start"
                  onClick={() => handleUpdate({ preferred_tone: option.value })}
                >
                  <span className="mr-2">{option.icon}</span>
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Content Length */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Độ dài nội dung</Label>
            <Select 
              value={preferences.content_length_preference} 
              onValueChange={(v: any) => handleUpdate({ content_length_preference: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LENGTH_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    <div>
                      <span className="font-medium">{option.label}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        - {option.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Emoji */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <Smile className="w-3 h-3" />
              Emoji
            </Label>
            <div className="flex gap-1">
              {EMOJI_OPTIONS.map(option => (
                <Button
                  key={option.value}
                  variant={preferences.emoji_frequency === option.value ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1 px-2"
                  onClick={() => handleUpdate({ emoji_frequency: option.value })}
                >
                  {option.icon}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <Separator />

        {/* AI Behavior */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Hành vi AI
          </h4>

          {/* Explanation Depth */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm">Mức độ giải thích</Label>
              <p className="text-xs text-muted-foreground">
                {preferences.explanation_depth === 'minimal' && 'Tối giản, chỉ output'}
                {preferences.explanation_depth === 'standard' && 'Giải thích vừa phải'}
                {preferences.explanation_depth === 'detailed' && 'Giải thích chi tiết'}
              </p>
            </div>
            <Select 
              value={preferences.explanation_depth} 
              onValueChange={(v: any) => handleUpdate({ explanation_depth: v })}
            >
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="minimal">Tối giản</SelectItem>
                <SelectItem value="standard">Tiêu chuẩn</SelectItem>
                <SelectItem value="detailed">Chi tiết</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Suggestion Count */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Số gợi ý mỗi lần</Label>
              <Badge variant="outline">{preferences.suggestion_count_preference}</Badge>
            </div>
            <Slider
              value={[preferences.suggestion_count_preference]}
              min={3}
              max={10}
              step={1}
              onValueChange={([v]) => handleUpdate({ suggestion_count_preference: v })}
            />
          </div>

          {/* Auto-save */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm">Tự động lưu drafts</Label>
              <p className="text-xs text-muted-foreground">Lưu nội dung đang soạn</p>
            </div>
            <Switch
              checked={preferences.auto_save_drafts}
              onCheckedChange={(checked) => handleUpdate({ auto_save_drafts: checked })}
            />
          </div>
        </div>

        {/* Inferred Preferences (Learned) */}
        {hasInferredPrefs && (
          <>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Đã học từ bạn
                </h4>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                >
                  <Eye className="w-3 h-3 mr-1" />
                  {showAdvanced ? 'Ẩn' : 'Xem'}
                </Button>
              </div>

              {showAdvanced && (
                <ScrollArea className="h-[120px]">
                  <div className="space-y-2 pr-4">
                    {Object.entries(inferredPrefs).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground capitalize">
                          {key.replace(/_/g, ' ')}
                        </span>
                        {value === true ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        ) : value === false ? (
                          <XCircle className="w-4 h-4 text-red-500" />
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            {String(value)}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}

              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                AI tự động học từ cách bạn chỉnh sửa nội dung
              </p>
            </div>
          </>
        )}

        {/* Stats Footer */}
        <div className="flex items-center justify-between pt-2 text-xs text-muted-foreground">
          <span>Avg edit: {preferences.avg_edit_percentage.toFixed(0)}%</span>
          <span>{preferences.concepts_mastered.length} concepts mastered</span>
        </div>
      </CardContent>
    </Card>
  );
}
