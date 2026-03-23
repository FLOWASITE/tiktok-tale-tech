import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, Circle, Clock, Zap, Target, Wrench, BookOpen, Plus, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

interface ActionTask {
  id: string;
  source_module: string;
  priority: string;
  title: string;
  description: string | null;
  status: string;
  impact_score: number | null;
  effort_level: string | null;
  created_at: string;
}

const priorityConfig: Record<string, { icon: React.ElementType; label: string; className: string }> = {
  quick_win: { icon: Zap, label: 'Quick Win', className: 'text-green-600 dark:text-green-400 bg-green-500/10' },
  strategic: { icon: Target, label: 'Strategic', className: 'text-blue-600 dark:text-blue-400 bg-blue-500/10' },
  optimization: { icon: Wrench, label: 'Optimization', className: 'text-yellow-600 dark:text-yellow-400 bg-yellow-500/10' },
  research: { icon: BookOpen, label: 'Research', className: 'text-purple-600 dark:text-purple-400 bg-purple-500/10' },
};

const statusConfig: Record<string, { icon: React.ElementType; label: string }> = {
  pending: { icon: Circle, label: 'Chờ' },
  in_progress: { icon: Clock, label: 'Đang làm' },
  done: { icon: CheckCircle2, label: 'Xong' },
};

export function ActionCenter() {
  const { currentOrganization } = useOrganizationContext();
  const [tasks, setTasks] = useState<ActionTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  const fetchTasks = useCallback(async () => {
    if (!currentOrganization?.id) return;
    try {
      const { data, error } = await supabase
        .from('geo_action_tasks')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setTasks((data as any[]) || []);
    } catch (err) {
      console.error('Error fetching action tasks:', err);
    } finally {
      setLoading(false);
    }
  }, [currentOrganization?.id]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const updateStatus = async (taskId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('geo_action_tasks')
        .update({ status } as any)
        .eq('id', taskId);
      if (error) throw error;
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status } : t));
      toast.success('Cập nhật trạng thái');
    } catch {
      toast.error('Lỗi cập nhật');
    }
  };

  const filteredTasks = filter === 'all' ? tasks : tasks.filter(t => t.priority === filter);

  const pendingCount = tasks.filter(t => t.status === 'pending').length;
  const inProgressCount = tasks.filter(t => t.status === 'in_progress').length;
  const doneCount = tasks.filter(t => t.status === 'done').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Action Center</h3>
          <p className="text-sm text-muted-foreground">Task tối ưu GEO ưu tiên theo tác động</p>
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Lọc theo loại" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            <SelectItem value="quick_win">Quick Win</SelectItem>
            <SelectItem value="strategic">Strategic</SelectItem>
            <SelectItem value="optimization">Optimization</SelectItem>
            <SelectItem value="research">Research</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-border/50">
          <CardContent className="pt-4 pb-3 text-center">
            <Circle className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
            <div className="text-xl font-bold text-foreground">{pendingCount}</div>
            <p className="text-xs text-muted-foreground">Chờ xử lý</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-4 pb-3 text-center">
            <Clock className="h-5 w-5 mx-auto text-yellow-500 mb-1" />
            <div className="text-xl font-bold text-foreground">{inProgressCount}</div>
            <p className="text-xs text-muted-foreground">Đang làm</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-4 pb-3 text-center">
            <CheckCircle2 className="h-5 w-5 mx-auto text-green-500 mb-1" />
            <div className="text-xl font-bold text-foreground">{doneCount}</div>
            <p className="text-xs text-muted-foreground">Hoàn tất</p>
          </CardContent>
        </Card>
      </div>

      {/* Task list */}
      {filteredTasks.length === 0 ? (
        <Card className="border-dashed border-border">
          <CardContent className="py-10 text-center">
            <Target className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              Chưa có task GEO. Chạy scan hoặc phân tích đối thủ để tạo task tự động.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredTasks.map(task => {
            const pConfig = priorityConfig[task.priority] || priorityConfig.optimization;
            const sConfig = statusConfig[task.status] || statusConfig.pending;
            const PIcon = pConfig.icon;
            const SIcon = sConfig.icon;

            return (
              <Card key={task.id} className="border-border/50">
                <CardContent className="py-3 px-4">
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => {
                        const next = task.status === 'pending' ? 'in_progress' : task.status === 'in_progress' ? 'done' : 'pending';
                        updateStatus(task.id, next);
                      }}
                      className="mt-0.5 shrink-0"
                    >
                      <SIcon className={`h-5 w-5 ${task.status === 'done' ? 'text-green-500' : task.status === 'in_progress' ? 'text-yellow-500' : 'text-muted-foreground'}`} />
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-sm font-medium ${task.status === 'done' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                          {task.title}
                        </span>
                        <Badge className={`text-[10px] px-1.5 py-0 ${pConfig.className}`}>
                          <PIcon className="h-3 w-3 mr-0.5" />
                          {pConfig.label}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {task.source_module}
                        </Badge>
                      </div>
                      {task.description && (
                        <p className="text-xs text-muted-foreground mt-1">{task.description}</p>
                      )}
                    </div>
                    {task.impact_score && (
                      <div className="shrink-0 text-right">
                        <span className="text-xs text-muted-foreground">Impact</span>
                        <div className="text-sm font-bold text-foreground">{task.impact_score}</div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
