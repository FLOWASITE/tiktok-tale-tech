import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Wand2, Sparkles, Info, Video, CheckCircle2, XCircle, ChevronLeft, ChevronRight, Clapperboard, Download } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { AspectRatioPicker, VideoAspectRatio } from './AspectRatioPicker';
import { VIDEO_MODELS } from './ProviderModelPicker';
import { AdminModelBadge } from '@/components/shared/AdminModelBadge';
import { useFunctionModel } from '@/hooks/useFunctionModel';
import { useVideoGeneration } from '@/hooks/useVideoGeneration';
import { useCurrentBrand } from '@/contexts/BrandContext';
import { useScriptToVideo } from '@/contexts/ScriptToVideoContext';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ModelUsedBadge } from '@/components/ui/ModelUsedBadge';
import { PublishVideoMenu } from './PublishVideoMenu';
import { MultiCharacterPicker } from './MultiCharacterPicker';
import { CharacterVoicePreview } from './CharacterVoicePreview';
import { type CharacterProfile } from '@/hooks/useCharacterProfiles';

// Default fallback if Admin hasn't configured a model yet.
const DEFAULT_VIDEO_MODEL = 'geminigen/veo-3.1-fast';

// Friendly labels for the AdminModelBadge tooltip
const VIDEO_MODEL_LABELS: Record<string, string> = Object.fromEntries(
  VIDEO_MODELS.map((m) => [m.id, m.label]),
);

/**
 * Auto-pick model theo aspect (mirror logic của generate-script edge function).
 * - Vertical/square (9:16, 1:1, 2:3): Seedance 2 (cap 10s).
 * - Landscape (16:9): Veo 3.1 Fast (cap 8s, audio native).
 */
function autoPickModelForAspect(aspect: VideoAspectRatio): string {
  if (aspect === '16:9') return 'geminigen/veo-3.1-fast';
  return 'poyo/seedance-2';
}

function defaultDurationForAspect(aspect: VideoAspectRatio): number {
  return aspect === '16:9' ? 8 : 10;
}

const EXAMPLE_PROMPTS = [
  'Cô gái Việt 25 tuổi cười rạng rỡ trong tiệm cà phê ánh sáng vàng dịu, máy quay zoom chậm vào ánh mắt, phong cách điện ảnh ấm áp.',
  'Sản phẩm son môi đỏ xoay chậm 360 độ trên nền đá hoa cương trắng, ánh sáng studio mềm, macro shot, cinematic.',
  'Toàn cảnh phòng phẫu thuật thẩm mỹ hiện đại, ánh sáng trắng, bác sĩ đeo khẩu trang đang chuẩn bị, dolly forward chậm.',
];

export function QuickClipTab() {
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [aspect, setAspect] = useState<VideoAspectRatio>('9:16');
  const [duration, setDuration] = useState(10); // Default 10s cho 9:16 (Seedance 2 cap)
  const [enhancing, setEnhancing] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [selectedCharacterIds, setSelectedCharacterIds] = useState<string[]>([]);
  const [selectedCharacters, setSelectedCharacters] = useState<CharacterProfile[]>([]);
  const { generateVideo, generating, generations } = useVideoGeneration();
  const { currentBrand } = useCurrentBrand();
  const { currentOrganization } = useOrganizationContext();
  const {
    activeScript,
    activeSceneIndex,
    currentScene,
    completedSceneIds,
    setActiveSceneIndex,
    goToNextScene,
    markSceneCompleted,
  } = useScriptToVideo();

  // Admin model chỉ là FALLBACK — auto-pick theo aspect là ưu tiên cao hơn
  // (đồng bộ với logic pickRecommendedVideoModel trong generate-script).
  const { data: modelInfo } = useFunctionModel(
    'generate-video',
    DEFAULT_VIDEO_MODEL,
    currentOrganization?.id ?? null,
  );
  const adminModel = modelInfo?.model ?? DEFAULT_VIDEO_MODEL;

  // Auto-pick: ưu tiên model phù hợp aspect; fallback admin nếu auto-pick không tồn tại trong VIDEO_MODELS.
  const autoPicked = autoPickModelForAspect(aspect);
  const effectiveModel =
    VIDEO_MODELS.find((m) => m.id === autoPicked)?.id ??
    VIDEO_MODELS.find((m) => m.id === adminModel)?.id ??
    VIDEO_MODELS[0].id;
  const selectedModel = VIDEO_MODELS.find((m) => m.id === effectiveModel) ?? VIDEO_MODELS[0];
  const estimatedCost = selectedModel ? (selectedModel.pricePerSec * duration).toFixed(2) : '0.00';
  const activeJob = activeJobId ? generations.find((g) => g.id === activeJobId) : null;

  // Khi đổi aspect → reset duration về cap mặc định của model mới (tránh giữ giá trị cũ vượt cap)
  useEffect(() => {
    const cap = selectedModel?.maxDuration ?? 10;
    const target = defaultDurationForAspect(aspect);
    setDuration(Math.min(target, cap));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aspect]);

  // Auto-fill prompt/duration/aspect when scene changes (từ script)
  useEffect(() => {
    if (!currentScene) return;
    setPrompt(currentScene.prompt);
    if (currentScene.aspect) setAspect(currentScene.aspect);
    if (currentScene.duration) {
      // Dùng duration của scene, clamp theo cap của model auto-pick cho aspect đó
      const targetAspect = currentScene.aspect ?? aspect;
      const targetModelId = autoPickModelForAspect(targetAspect);
      const targetCap = VIDEO_MODELS.find((m) => m.id === targetModelId)?.maxDuration ?? 10;
      setDuration(Math.max(3, Math.min(currentScene.duration, targetCap)));
    }
    setActiveJobId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeScript?.id, activeSceneIndex]);

  // When the active job for current scene completes → mark + auto-advance
  useEffect(() => {
    if (!activeJob || !currentScene || !activeScript) return;
    if (activeJob.status === 'completed') {
      if (!completedSceneIds[currentScene.sceneNumber]) {
        markSceneCompleted(currentScene.sceneNumber, activeJob.id);
        // Auto move to next scene if there's one
        if (activeSceneIndex < activeScript.scenes.length - 1) {
          setTimeout(() => goToNextScene(), 1200);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeJob?.status]);


  const handleSmartPrompt = async () => {
    if (prompt.trim().length < 5) {
      toast.error('Nhập ý tưởng ngắn (≥5 ký tự) trước khi dùng Smart Prompt.');
      return;
    }
    setEnhancing(true);
    try {
      const channel = aspect === '16:9' ? 'youtube' : aspect === '1:1' ? 'facebook' : 'tiktok';
      const { data, error } = await supabase.functions.invoke('generate-video-prompt', {
        body: {
          idea: prompt.trim(),
          channel,
          aspect_ratio: aspect,
          duration,
          brand_id: currentBrand?.id,
          industry_id: (currentBrand as { industry_template_id?: string } | null)?.industry_template_id,
          language: 'vi',
          character_profile_id: selectedCharacterIds[0] || undefined,
          character_profile_ids: selectedCharacterIds.length > 0 ? selectedCharacterIds : undefined,
        },
      });
      if (error) throw error;
      const result = data?.data;
      if (result?.cinematic_prompt) {
        setPrompt(result.cinematic_prompt);
        if (result.negative_prompt) setNegativePrompt(result.negative_prompt);
        toast.success('Smart Prompt đã tinh chỉnh ý tưởng theo brand & channel.');
      } else {
        toast.error('Không nhận được prompt nâng cao.');
      }
    } catch (e) {
      console.error('[QuickClipTab] Smart Prompt error:', e);
      toast.error('Không thể nâng cấp prompt — thử lại sau.');
    } finally {
      setEnhancing(false);
    }
  };

  const handleGenerate = async () => {
    if (prompt.trim().length < 10) {
      toast.error('Prompt cần ít nhất 10 ký tự để mô tả rõ ý tưởng.');
      return;
    }
    const provider = selectedModel?.provider ?? 'geminigen';
    // Character injection is handled server-side by generate-video edge function
    const result = await generateVideo({
      provider,
      prompt: prompt.trim(),
      // Gửi model auto-pick để override admin default (Seedance 2 cho 9:16/1:1, Veo 3.1 Fast cho 16:9)
      model: selectedModel.id,
      duration,
      aspect_ratio: aspect,
      resolution: '1080p',
      negative_prompt: negativePrompt.trim() || undefined,
      // Liên kết với scene của kịch bản nếu có
      script_id: activeScript?.id,
      scene_number: currentScene?.sceneNumber,
      // Reference image from character profile
      starting_frame_url: selectedCharacters[0]?.reference_image_url || undefined,
      character_profile_id: selectedCharacters[0]?.id || undefined,
      character_profile_ids: selectedCharacters.length > 0 ? selectedCharacters.map(c => c.id) : undefined,
    });
    if (result) {
      setActiveJobId(result.id);
    }
  };

  const totalScenes = activeScript?.scenes.length ?? 0;
  const isLastScene = activeScript ? activeSceneIndex >= totalScenes - 1 : false;
  const isFirstScene = activeSceneIndex <= 0;

  return (
    <div className="space-y-6">
      {/* Scene navigator — chỉ hiện khi có activeScript */}
      {activeScript && currentScene && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-foreground/[0.03] border border-border/60">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveSceneIndex(activeSceneIndex - 1)}
            disabled={isFirstScene}
            className="h-8 w-8 p-0 shrink-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1 min-w-0 flex items-center gap-2">
            <Clapperboard className="w-3.5 h-3.5 text-foreground/60 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Scene {currentScene.sceneNumber} / {totalScenes}
                {completedSceneIds[currentScene.sceneNumber] && (
                  <span className="ml-1.5 text-emerald-600 dark:text-emerald-400 normal-case tracking-normal">· đã quay</span>
                )}
              </p>
              <p className="text-xs text-foreground truncate">{currentScene.prompt.slice(0, 110)}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveSceneIndex(activeSceneIndex + 1)}
            disabled={isLastScene}
            className="h-8 w-8 p-0 shrink-0"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Header strip */}
      <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/40 border border-border/40">
        <div className="w-8 h-8 rounded-lg bg-foreground/5 flex items-center justify-center shrink-0">
          <Wand2 className="w-4 h-4 text-foreground/70" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">Quick Clip</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {activeScript
              ? 'Prompt đã tự nạp từ scene của kịch bản. Bạn vẫn có thể chỉnh trước khi quay.'
              : 'Mô tả 1 cảnh quay → AI sinh video 5–10s. Phù hợp test ý tưởng, B-roll, hook intro.'}
          </p>
        </div>
      </div>


      {/* Prompt */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="video-prompt" className="text-sm font-medium">
            Mô tả cảnh quay
          </Label>
          <span className="text-[10px] text-muted-foreground font-mono">{prompt.length} ký tự</span>
        </div>
        <Textarea
          id="video-prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="VD: Cô gái cười dịu dàng trong vườn hoa hồng, ánh sáng ban mai, máy quay slow-motion zoom vào khuôn mặt..."
          className="min-h-[100px] resize-none text-sm"
          disabled={generating || enhancing}
        />
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSmartPrompt}
            disabled={generating || enhancing || prompt.trim().length < 5}
            className="h-7 text-[11px] gap-1.5"
          >
            {enhancing ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Wand2 className="w-3 h-3" />
            )}
            Smart Prompt {currentBrand ? `· ${currentBrand.name}` : ''}
          </Button>
          <span className="text-[10px] text-muted-foreground mx-1 self-center">·</span>
          <span className="text-[10px] text-muted-foreground mr-1 self-center">Mẫu:</span>
          {EXAMPLE_PROMPTS.map((p, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setPrompt(p)}
              disabled={generating || enhancing}
              className="text-[10px] px-2 py-1 rounded-md bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors border border-border/30"
            >
              <Sparkles className="w-2.5 h-2.5 inline mr-1" />
              {i + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Negative prompt (optional) */}
      <div className="space-y-2">
        <Label htmlFor="video-neg-prompt" className="text-xs font-medium text-muted-foreground">
          Negative prompt <span className="text-[10px]">(tùy chọn — điều cần tránh)</span>
        </Label>
        <Textarea
          id="video-neg-prompt"
          value={negativePrompt}
          onChange={(e) => setNegativePrompt(e.target.value)}
          placeholder="VD: low quality, blurry, distorted faces, watermark..."
          className="min-h-[50px] resize-none text-xs font-mono"
          disabled={generating || enhancing}
        />
      </div>

      {/* Character consistency */}
      <MultiCharacterPicker
        value={selectedCharacterIds}
        onChange={(ids, profiles) => {
          setSelectedCharacterIds(ids);
          setSelectedCharacters(profiles);
        }}
      />

      {/* Aspect ratio */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Tỉ lệ khung hình</Label>
        <AspectRatioPicker value={aspect} onChange={setAspect} disabled={generating} />
      </div>

      {/* Duration */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Độ dài</Label>
          <span className="text-xs text-muted-foreground font-mono">{duration} giây</span>
        </div>
        <Slider
          value={[duration]}
          onValueChange={([v]) => setDuration(v)}
          min={3}
          max={selectedModel?.maxDuration ?? 10}
          step={1}
          disabled={generating}
        />
      </div>

      {/* Model — read-only, do Admin cấu hình */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Model AI</Label>
        <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/20 border border-border/40">
          <AdminModelBadge
            functionName="generate-video"
            defaultModel={DEFAULT_VIDEO_MODEL}
            organizationId={currentOrganization?.id}
            labelMap={VIDEO_MODEL_LABELS}
          />
          <span className="text-[10px] text-muted-foreground">
            {selectedModel?.description ?? 'Admin chưa cấu hình'}
          </span>
        </div>
      </div>

      {/* Cost preview */}
      <Alert className="border-border/40 bg-muted/30">
        <Info className="h-4 w-4 text-muted-foreground" />
        <AlertDescription className="text-xs text-muted-foreground">
          Ước tính chi phí: <span className="font-mono font-medium text-foreground">~${estimatedCost} USD</span> ·{' '}
          {selectedModel?.label} · {duration}s · {aspect}. Sẽ trừ vào hạn mức Video của workspace.
        </AlertDescription>
      </Alert>

      {/* Active job progress */}
      {activeJob && (
        <div className="rounded-xl border border-border/40 bg-muted/30 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {activeJob.status === 'completed' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : activeJob.status === 'failed' ? (
                <XCircle className="w-4 h-4 text-destructive" />
              ) : (
                <Loader2 className="w-4 h-4 animate-spin text-foreground/70" />
              )}
              <span className="text-sm font-medium">
                {activeJob.status === 'completed' ? 'Hoàn tất' :
                 activeJob.status === 'failed' ? 'Thất bại' :
                 'Đang tạo video…'}
              </span>
            </div>
            <span className="text-[11px] text-muted-foreground font-mono">
              {activeJob.status === 'processing' || activeJob.status === 'pending'
                ? 'Khoảng 1–3 phút'
                : `${activeJob.progress}%`}
            </span>
          </div>
          <Progress value={activeJob.progress ?? 10} className="h-1.5" />
          {activeJob.status === 'completed' && activeJob.video_url && (
            <div className="space-y-3">
              <video src={activeJob.video_url} controls className="w-full rounded-lg max-h-[280px] bg-black" />
              <div className="flex items-center flex-wrap gap-2">
                {activeJob.model_used && (
                  <ModelUsedBadge modelUsed={activeJob.model_used} />
                )}
                <div className="flex-1" />
                <Button asChild variant="outline" size="sm" className="h-7 text-[11px] gap-1">
                  <a href={activeJob.video_url} download target="_blank" rel="noreferrer">
                    <Download className="w-3 h-3" />
                    Tải về
                  </a>
                </Button>
                <PublishVideoMenu
                  videoUrl={activeJob.video_url}
                  aspectRatio={aspect}
                  defaultCaption={prompt.slice(0, 200)}
                  size="sm"
                  variant="outline"
                  className="h-7 text-[11px]"
                />
              </div>
            </div>
          )}
          {activeJob.status === 'failed' && (
            <p className="text-xs text-destructive">{activeJob.error_message ?? 'Provider trả lỗi không xác định'}</p>
          )}
        </div>
      )}

      {/* Generate */}
      <div className="flex justify-end pt-2">
        <Button
          onClick={handleGenerate}
          disabled={generating || prompt.trim().length < 10}
          size="lg"
          className="gap-2 min-w-[180px]"
        >
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Đang gửi yêu cầu...
            </>
          ) : (
            <>
              <Video className="w-4 h-4" />
              Tạo video
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
