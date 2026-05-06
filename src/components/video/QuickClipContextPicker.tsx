import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, FileText, Lightbulb, Plus, Clapperboard, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useCurrentBrand } from '@/contexts/BrandContext';
import { useScriptToVideo } from '@/contexts/ScriptToVideoContext';
import { buildScriptToVideoNavState } from '@/lib/scriptToVideoNav';
import { Script } from '@/types/script';
import { toast } from 'sonner';

interface ScriptRow {
  id: string;
  title: string;
  topic: string;
  duration: number | null;
  created_at: string;
}

/**
 * Empty-state picker bắt buộc cho Quick Clip:
 *   Bước 1: chọn Chủ đề (group theo `scripts.topic` text)
 *   Bước 2: chọn Kịch bản ai_video thuộc chủ đề
 * Khi xong → fetch full script + hydrate ScriptToVideoContext.
 */
export function QuickClipContextPicker() {
  const navigate = useNavigate();
  const { currentOrganization } = useOrganizationContext();
  const { currentBrand } = useCurrentBrand();
  const { setActiveScript } = useScriptToVideo();

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ScriptRow[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [selectedScriptId, setSelectedScriptId] = useState<string>('');
  const [hydrating, setHydrating] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!currentOrganization) {
        setRows([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      let q = supabase
        .from('scripts')
        .select('id, title, topic, duration, created_at, brand_template_id, script_purpose')
        .eq('organization_id', currentOrganization.id)
        .eq('script_purpose', 'ai_video')
        .order('created_at', { ascending: false })
        .limit(200);
      if (currentBrand?.id) q = q.eq('brand_template_id', currentBrand.id);

      const { data, error } = await q;
      if (!alive) return;
      if (error) {
        console.error('[QuickClipContextPicker] load scripts:', error);
        toast.error('Không tải được danh sách kịch bản.');
      } else {
        setRows((data ?? []) as ScriptRow[]);
      }
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [currentOrganization?.id, currentBrand?.id]);

  const topics = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((r) => map.set(r.topic, (map.get(r.topic) ?? 0) + 1));
    return Array.from(map.entries()).map(([topic, count]) => ({ topic, count }));
  }, [rows]);

  const scriptsForTopic = useMemo(
    () => (selectedTopic ? rows.filter((r) => r.topic === selectedTopic) : []),
    [rows, selectedTopic],
  );

  const handleStart = async () => {
    if (!selectedScriptId) return;
    setHydrating(true);
    try {
      const { data, error } = await supabase
        .from('scripts')
        .select('*')
        .eq('id', selectedScriptId)
        .single();
      if (error || !data) throw error ?? new Error('not found');
      const navState = buildScriptToVideoNavState(data as Script, 0);
      if (!navState) {
        toast.error('Kịch bản chưa có scene nào để quay.');
        return;
      }
      setActiveScript(navState.fromScript.script, 0);
      toast.success('Đã nạp kịch bản — bắt đầu quay scene 1.');
    } catch (e) {
      console.error('[QuickClipContextPicker] hydrate:', e);
      toast.error('Không nạp được kịch bản.');
    } finally {
      setHydrating(false);
    }
  };

  const handleCreateScript = () => {
    // ScriptNew route đã được redirect → /videos?tab=scripts
    navigate('/videos?tab=scripts&new=1&purpose=ai_video');
  };

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-foreground/[0.03] border border-border/60">
        <div className="w-10 h-10 rounded-xl bg-foreground/5 flex items-center justify-center shrink-0">
          <Clapperboard className="w-5 h-5 text-foreground/70" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-foreground">
            Quick Clip cần Chủ đề & Kịch bản
          </h3>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Để giữ nhân vật, brand voice và mạch chuyện nhất quán, mỗi clip phải gắn với một kịch
            bản. Chọn chủ đề và kịch bản bên dưới — Quick Clip sẽ auto-fill prompt từ từng scene.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-xs text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
          Đang tải kịch bản…
        </div>
      ) : topics.length === 0 ? (
        <div className="text-center py-10 px-4 border border-dashed border-border/60 rounded-xl space-y-3">
          <Lightbulb className="w-6 h-6 mx-auto text-muted-foreground/60" />
          <div>
            <p className="text-sm font-medium text-foreground">Chưa có kịch bản video nào</p>
            <p className="text-xs text-muted-foreground mt-1">
              {currentBrand
                ? `Brand "${currentBrand.name}" chưa có kịch bản AI Video.`
                : 'Workspace chưa có kịch bản AI Video.'}{' '}
              Tạo kịch bản đầu tiên để bắt đầu.
            </p>
          </div>
          <Button onClick={handleCreateScript} size="sm" className="gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            Tạo kịch bản mới
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Step 1: Topic */}
          <div className="space-y-2">
            <Label className="text-xs font-medium flex items-center gap-1.5">
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-foreground/10 text-[10px] font-mono">
                1
              </span>
              Chủ đề
            </Label>
            <Select
              value={selectedTopic}
              onValueChange={(v) => {
                setSelectedTopic(v);
                setSelectedScriptId('');
              }}
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Chọn chủ đề từ kịch bản đã có…" />
              </SelectTrigger>
              <SelectContent>
                {topics.map((t) => (
                  <SelectItem key={t.topic} value={t.topic}>
                    <span className="flex items-center gap-2">
                      <Lightbulb className="w-3 h-3 text-muted-foreground" />
                      <span className="truncate">{t.topic}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        ({t.count})
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Step 2: Script */}
          <div className="space-y-2">
            <Label className="text-xs font-medium flex items-center gap-1.5">
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-foreground/10 text-[10px] font-mono">
                2
              </span>
              Kịch bản
            </Label>
            <Select
              value={selectedScriptId}
              onValueChange={setSelectedScriptId}
              disabled={!selectedTopic}
            >
              <SelectTrigger className="h-10">
                <SelectValue
                  placeholder={
                    selectedTopic
                      ? 'Chọn kịch bản AI Video…'
                      : 'Chọn chủ đề trước để xem kịch bản'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {scriptsForTopic.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    <span className="flex items-center gap-2">
                      <FileText className="w-3 h-3 text-muted-foreground" />
                      <span className="truncate max-w-[260px]">{s.title}</span>
                      {s.duration ? (
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {s.duration}s
                        </span>
                      ) : null}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedTopic && scriptsForTopic.length === 0 && (
              <p className="text-[11px] text-muted-foreground">
                Chủ đề này chưa có kịch bản AI Video.
              </p>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCreateScript}
              className="text-[11px] gap-1.5"
            >
              <Plus className="w-3 h-3" />
              Tạo kịch bản mới
            </Button>
            <Button
              onClick={handleStart}
              disabled={!selectedScriptId || hydrating}
              size="sm"
              className="gap-1.5 min-w-[160px]"
            >
              {hydrating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Đang nạp…
                </>
              ) : (
                <>
                  Bắt đầu quay
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
