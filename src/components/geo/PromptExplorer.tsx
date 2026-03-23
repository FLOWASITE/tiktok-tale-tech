import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, TrendingUp, AlertCircle, Sparkles, Loader2, Plus, Trash2 } from 'lucide-react';
import { GEOMonitor } from '@/hooks/useGEOMonitors';
import { useGEOResults } from '@/hooks/useGEOResults';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface GEOPrompt {
  id: string;
  prompt_text: string;
  intent_type: string;
  source: string;
  cluster_name: string | null;
  use_count: number;
  is_active: boolean;
}

interface PromptExplorerProps {
  monitors: GEOMonitor[];
}

const intentColors: Record<string, string> = {
  informational: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  commercial: 'bg-green-500/10 text-green-600 dark:text-green-400',
  transactional: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  navigational: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
  comparison: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
};

export function PromptExplorer({ monitors }: PromptExplorerProps) {
  const activeMonitor = monitors.find(m => m.is_active) || monitors[0];
  const { results } = useGEOResults(activeMonitor?.id);
  const [prompts, setPrompts] = useState<GEOPrompt[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [newPrompt, setNewPrompt] = useState('');
  const [newIntent, setNewIntent] = useState('informational');
  const [filterIntent, setFilterIntent] = useState<string>('all');

  const fetchPrompts = useCallback(async () => {
    if (!activeMonitor?.id) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('geo_prompts')
        .select('*')
        .eq('brand_monitor_id', activeMonitor.id)
        .eq('is_active', true)
        .order('use_count', { ascending: false })
        .limit(200);
      setPrompts((data as any[]) || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [activeMonitor?.id]);

  useEffect(() => { fetchPrompts(); }, [fetchPrompts]);

  const handleGenerate = async () => {
    if (!activeMonitor) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('geo-generate-prompts', {
        body: { monitorId: activeMonitor.id },
      });
      if (error) throw error;
      toast.success(`Đã tạo ${data?.prompts_generated || 0} prompts mới`);
      fetchPrompts();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi tạo prompts');
    } finally {
      setGenerating(false);
    }
  };

  const addManualPrompt = async () => {
    if (!newPrompt.trim() || !activeMonitor) return;
    try {
      const { error } = await supabase.from('geo_prompts').insert({
        organization_id: activeMonitor.organization_id,
        brand_monitor_id: activeMonitor.id,
        prompt_text: newPrompt.trim(),
        intent_type: newIntent,
        source: 'manual',
      } as any);
      if (error) throw error;
      setNewPrompt('');
      fetchPrompts();
      toast.success('Đã thêm prompt');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const deletePrompt = async (id: string) => {
    try {
      await supabase.from('geo_prompts').update({ is_active: false } as any).eq('id', id);
      setPrompts(prev => prev.filter(p => p.id !== id));
    } catch {}
  };

  // Group results by prompt for scan data
  const promptMap = new Map<string, { mentioned: number; total: number; engines: Set<string> }>();
  results.forEach(r => {
    const entry = promptMap.get(r.prompt) || { mentioned: 0, total: 0, engines: new Set() };
    entry.total++;
    if (r.brand_mentioned) entry.mentioned++;
    entry.engines.add(r.ai_engine);
    promptMap.set(r.prompt, entry);
  });

  const gapPrompts = Array.from(promptMap.entries())
    .filter(([, data]) => data.mentioned === 0 && data.total > 0)
    .map(([prompt, data]) => ({ prompt, total: data.total }));

  // Cluster prompts
  const clusters = new Map<string, GEOPrompt[]>();
  const filtered = filterIntent === 'all' ? prompts : prompts.filter(p => p.intent_type === filterIntent);
  filtered.forEach(p => {
    const cluster = p.cluster_name || 'Chưa phân loại';
    if (!clusters.has(cluster)) clusters.set(cluster, []);
    clusters.get(cluster)!.push(p);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Search className="h-5 w-5" />
            Prompt Explorer & Bank
          </h3>
          <p className="text-sm text-muted-foreground">
            {prompts.length} prompts · Search Console cho AI
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={filterIntent} onValueChange={setFilterIntent}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Intent" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="informational">Informational</SelectItem>
              <SelectItem value="commercial">Commercial</SelectItem>
              <SelectItem value="transactional">Transactional</SelectItem>
              <SelectItem value="comparison">Comparison</SelectItem>
              <SelectItem value="navigational">Navigational</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleGenerate} disabled={generating || !activeMonitor} size="sm">
            {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
            {generating ? 'Đang tạo...' : 'Auto-generate'}
          </Button>
        </div>
      </div>

      {/* Add manual prompt */}
      <Card className="border-border/50">
        <CardContent className="py-3 px-4">
          <div className="flex gap-2 items-center">
            <Input
              value={newPrompt}
              onChange={e => setNewPrompt(e.target.value)}
              placeholder="Thêm prompt thủ công..."
              className="flex-1"
              onKeyDown={e => e.key === 'Enter' && addManualPrompt()}
            />
            <Select value={newIntent} onValueChange={setNewIntent}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="informational">Info</SelectItem>
                <SelectItem value="commercial">Commercial</SelectItem>
                <SelectItem value="transactional">Transaction</SelectItem>
                <SelectItem value="comparison">Comparison</SelectItem>
                <SelectItem value="navigational">Navigation</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" onClick={addManualPrompt} disabled={!newPrompt.trim()}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Prompt Bank by Cluster */}
      {Array.from(clusters.entries()).map(([cluster, clusterPrompts]) => (
        <Card key={cluster} className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              <span>{cluster}</span>
              <Badge variant="outline" className="text-[10px]">{clusterPrompts.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {clusterPrompts.map(p => {
                const scanData = promptMap.get(p.prompt_text);
                const rate = scanData ? Math.round((scanData.mentioned / scanData.total) * 100) : null;

                return (
                  <div key={p.id} className="flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors group">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-foreground truncate">{p.prompt_text}</p>
                      <div className="flex gap-1 mt-0.5">
                        <Badge className={`text-[10px] px-1.5 py-0 ${intentColors[p.intent_type] || ''}`}>
                          {p.intent_type}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">{p.source}</Badge>
                        {p.use_count > 0 && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{p.use_count}x scanned</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {rate !== null && (
                        <div className="flex items-center gap-1">
                          <TrendingUp className={`h-3.5 w-3.5 ${rate > 0 ? 'text-green-500' : 'text-destructive'}`} />
                          <span className="text-sm font-medium text-foreground">{rate}%</span>
                        </div>
                      )}
                      <button
                        onClick={() => deletePrompt(p.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}

      {prompts.length === 0 && !loading && (
        <Card className="border-dashed border-border">
          <CardContent className="py-10 text-center">
            <Sparkles className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground mb-3">
              Chưa có prompts. Click "Auto-generate" để AI tạo prompt bank dựa trên industry và keywords.
            </p>
            <Button onClick={handleGenerate} disabled={generating || !activeMonitor}>
              {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Generate Prompt Bank
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Gap Prompts */}
      {gapPrompts.length > 0 && (
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              Gap Prompts — Brand chưa xuất hiện ({gapPrompts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {gapPrompts.slice(0, 10).map(({ prompt, total }) => (
                <div key={prompt} className="flex items-center justify-between p-2 rounded-lg bg-destructive/5">
                  <p className="text-sm text-foreground truncate">{prompt}</p>
                  <Badge variant="destructive" className="text-[10px] shrink-0">0% — {total} scans</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
