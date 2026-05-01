import { useNavigate } from 'react-router-dom';
import { Clapperboard, ExternalLink, X, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useScriptToVideo } from '@/contexts/ScriptToVideoContext';

interface Props {
  /** Khi user click vào "X/Y scene đã quay" có thể navigate sang tab gallery hoặc storyboard */
  onJumpToTab?: (tab: 'quick' | 'storyboard' | 'gallery') => void;
}

export function ScriptLinkBanner({ onJumpToTab }: Props) {
  const navigate = useNavigate();
  const { activeScript, activeSceneIndex, completedSceneIds, clearScript, setActiveSceneIndex } = useScriptToVideo();

  if (!activeScript) return null;

  const total = activeScript.scenes.length;
  const completed = Object.keys(completedSceneIds).length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const allDone = completed >= total;

  return (
    <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-foreground/5 flex items-center justify-center shrink-0">
          <Clapperboard className="w-4 h-4 text-foreground/70" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              Đang quay từ kịch bản
            </span>
            {allDone && (
              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                <CheckCircle2 className="w-3 h-3" /> Đủ scene
              </span>
            )}
          </div>
          <h3 className="text-sm font-semibold text-foreground truncate mt-0.5">
            {activeScript.title}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {completed}/{total} scene đã quay · đang ở scene {activeSceneIndex + 1}
          </p>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/videos?tab=scripts')}}
            className="h-7 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
          >
            <ExternalLink className="w-3 h-3" />
            Mở kịch bản
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearScript}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            title="Bỏ liên kết kịch bản"
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <Progress value={pct} className="h-1" />

      {/* Scene chips */}
      <div className="flex items-center gap-1 flex-wrap">
        {activeScript.scenes.map((scene, idx) => {
          const isActive = idx === activeSceneIndex;
          const isDone = !!completedSceneIds[scene.sceneNumber];
          return (
            <button
              key={scene.sceneNumber}
              onClick={() => setActiveSceneIndex(idx)}
              className={[
                'h-6 px-2 rounded-md text-[10px] font-medium border transition flex items-center gap-1',
                isActive
                  ? 'bg-foreground text-background border-foreground'
                  : isDone
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:border-emerald-500/60'
                  : 'bg-background text-muted-foreground border-border/60 hover:border-border',
              ].join(' ')}
              title={scene.prompt.slice(0, 80)}
            >
              {isDone && <CheckCircle2 className="w-2.5 h-2.5" />}
              Scene {scene.sceneNumber}
            </button>
          );
        })}
      </div>

      {allDone && onJumpToTab && (
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/40">
          <p className="text-[11px] text-muted-foreground">Đã đủ scene — sẵn sàng ghép.</p>
          <Button size="sm" variant="outline" onClick={() => onJumpToTab('storyboard')} className="h-7 text-[11px]">
            Sang tab Storyboard →
          </Button>
        </div>
      )}
    </div>
  );
}
