import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Pause, Play, LayoutGrid, CheckSquare, Target, Bot, Zap, Trash2, Pencil, Rocket, BarChart3 } from 'lucide-react';
import { PipelineKanban } from '@/components/agents/PipelineKanban';
import { AgentStatusPanel } from '@/components/agents/AgentStatusPanel';
import { ApprovalQueue } from '@/components/agents/ApprovalQueue';
import { GoalWizard } from '@/components/agents/GoalWizard';
import { useAgentPipelines } from '@/hooks/useAgentPipelines';
import { useAgentApprovals } from '@/hooks/useAgentApprovals';
import { useAgentGoals } from '@/hooks/useAgentGoals';
import { CampaignDashboard } from '@/components/agents/CampaignDashboard';
import { AgentGoal, AgentPipelineStage, AUTONOMY_LEVELS } from '@/types/agent';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

export default function AgentDashboard() {
  const { currentOrganization } = useOrganizationContext();
  const { pipelines, isLoading: pipelinesLoading, updateStage } = useAgentPipelines();
  const { approvals, pendingCount, updateApproval } = useAgentApprovals();
  const { goals, createGoal, updateGoal, deleteGoal } = useAgentGoals();
  const [activeTab, setActiveTab] = useState('pipeline');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<AgentGoal | null>(null);
  const [filterGoalId, setFilterGoalId] = useState<string | null>(null);
  const [triggeringGoalId, setTriggeringGoalId] = useState<string | null>(null);

  const handleCreateGoal = async (data: Parameters<typeof createGoal.mutateAsync>[0]) => {
    await createGoal.mutateAsync(data);
    setWizardOpen(false);
    setEditingGoal(null);
    try {
      const goalsList = await supabase
        .from('agent_goals')
        .select('id')
        .eq('organization_id', currentOrganization?.id || '')
        .order('created_at', { ascending: false })
        .limit(1);
      const newGoalId = goalsList.data?.[0]?.id;
      if (newGoalId) {
        const { data: result } = await supabase.functions.invoke('agent-pipeline', {
          body: { action: 'trigger_from_goal', goal_id: newGoalId },
        });
        const count = result?.pipelines_created || 0;
        toast.success(`Đã tạo ${count} pipeline và bắt đầu chạy tự động`);
      }
    } catch (e) {
      console.error('Pipeline trigger error:', e);
    }
  };

  const handleEditGoal = (goal: AgentGoal) => {
    setEditingGoal(goal);
    setWizardOpen(true);
  };

  const handleDeleteGoal = (goal: AgentGoal) => {
    if (confirm(`Xóa campaign "${goal.name}"? Các pipeline đang chạy sẽ không bị ảnh hưởng.`)) {
      deleteGoal.mutate(goal.id);
    }
  };

  const handleRunNow = async (goal: AgentGoal) => {
    setTriggeringGoalId(goal.id);
    try {
      const { data: result } = await supabase.functions.invoke('agent-pipeline', {
        body: { action: 'trigger_from_goal', goal_id: goal.id },
      });
      const count = result?.pipelines_created || 0;
      toast.success(`Đã tạo ${count} pipeline mới cho "${goal.name}"`);
    } catch (e) {
      toast.error('Không thể kích hoạt pipeline');
    } finally {
      setTriggeringGoalId(null);
    }
  };

  const activeGoals = goals.filter(g => g.is_active && !g.is_paused);
  const totalInPipeline = pipelines.filter(p => !['published', 'analyzing'].includes(p.current_stage)).length;
  const publishedThisWeek = pipelines.filter(p => {
    if (p.current_stage !== 'published') return false;
    const d = new Date(p.completed_at || p.updated_at);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return d >= weekAgo;
  }).length;

  const filteredPipelines = filterGoalId
    ? pipelines.filter(p => p.goal_id === filterGoalId)
    : pipelines;

  const handleStageChange = (id: string, stage: AgentPipelineStage) => {
    updateStage.mutate({ id, stage });
  };

  const getPipelineCountForGoal = (goalId: string) =>
    pipelines.filter(p => p.goal_id === goalId && !['published', 'analyzing'].includes(p.current_stage)).length;

  return (
    <>
      <Helmet><title>AI Agents | Flowa</title></Helmet>
      <div className="flex flex-col gap-4 p-4 sm:p-6 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">AI Content Agents</h1>
              <p className="text-xs text-muted-foreground">Pipeline tự động tạo & tối ưu nội dung</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => {
              goals.filter(g => g.is_active && !g.is_paused).forEach(g => updateGoal.mutate({ id: g.id, is_paused: true }));
            }}>
              <Pause className="w-3.5 h-3.5" /> Pause All
            </Button>
            <Button size="sm" className="gap-1.5 text-xs" onClick={() => { setEditingGoal(null); setWizardOpen(true); }}>
              <Plus className="w-3.5 h-3.5" /> Campaign mới
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-3 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10"><Target className="w-4 h-4 text-blue-500" /></div>
              <div>
                <p className="text-lg font-bold">{activeGoals.length}</p>
                <p className="text-[10px] text-muted-foreground">Campaigns</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10"><Zap className="w-4 h-4 text-amber-500" /></div>
              <div>
                <p className="text-lg font-bold">{totalInPipeline}</p>
                <p className="text-[10px] text-muted-foreground">Trong pipeline</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10"><CheckSquare className="w-4 h-4 text-emerald-500" /></div>
              <div>
                <p className="text-lg font-bold">{publishedThisWeek}</p>
                <p className="text-[10px] text-muted-foreground">Đã đăng tuần này</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10"><CheckSquare className="w-4 h-4 text-orange-500" /></div>
              <div>
                <p className="text-lg font-bold">{pendingCount}</p>
                <p className="text-[10px] text-muted-foreground">Chờ duyệt</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="pipeline" className="gap-1.5 text-xs">
              <LayoutGrid className="w-3.5 h-3.5" /> Pipeline
            </TabsTrigger>
            <TabsTrigger value="approvals" className="gap-1.5 text-xs">
              <CheckSquare className="w-3.5 h-3.5" /> Duyệt
              {pendingCount > 0 && (
                <Badge variant="destructive" className="ml-1 text-[9px] h-4 px-1.5">{pendingCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="campaigns" className="gap-1.5 text-xs">
              <Target className="w-3.5 h-3.5" /> Campaigns
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pipeline" className="mt-4">
            {/* Goal filter */}
            {goals.length > 0 && (
              <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                <Badge
                  variant={filterGoalId ? 'outline' : 'default'}
                  className="text-[10px] cursor-pointer"
                  onClick={() => setFilterGoalId(null)}
                >
                  Tất cả ({pipelines.length})
                </Badge>
                {goals.map(g => (
                  <Badge
                    key={g.id}
                    variant={filterGoalId === g.id ? 'default' : 'outline'}
                    className="text-[10px] cursor-pointer"
                    onClick={() => setFilterGoalId(filterGoalId === g.id ? null : g.id)}
                  >
                    {g.name} ({getPipelineCountForGoal(g.id)})
                  </Badge>
                ))}
              </div>
            )}
            <div className="flex gap-4">
              <div className="flex-1 min-w-0">
                <PipelineKanban pipelines={filteredPipelines} onStageChange={handleStageChange} />
              </div>
              <div className="hidden lg:block w-[200px] flex-shrink-0">
                <AgentStatusPanel pipelines={filteredPipelines} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="approvals" className="mt-4">
            <ApprovalQueue
              approvals={approvals}
              onApprove={(id, notes) => updateApproval.mutate({ id, status: 'approved', notes })}
              onReject={(id, notes) => updateApproval.mutate({ id, status: 'rejected', notes })}
            />
          </TabsContent>

          <TabsContent value="campaigns" className="mt-4">
            <div className="space-y-3">
              {goals.length === 0 ? (
                <div className="text-center py-16">
                  <Target className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground mb-3">Chưa có campaign nào</p>
                  <Button size="sm" className="gap-1.5" onClick={() => { setEditingGoal(null); setWizardOpen(true); }}>
                    <Plus className="w-3.5 h-3.5" /> Tạo campaign đầu tiên
                  </Button>
                </div>
              ) : (
                goals.map(goal => {
                  const pipeCount = getPipelineCountForGoal(goal.id);
                  const autonomyLabel = AUTONOMY_LEVELS.find(l => l.id === goal.autonomy_level)?.label || goal.autonomy_level;
                  return (
                    <Card key={goal.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-medium">{goal.name}</p>
                              <Badge variant={goal.is_active ? 'default' : 'secondary'} className="text-[10px] h-4">
                                {goal.is_paused ? 'Tạm dừng' : goal.is_active ? 'Đang chạy' : 'Tắt'}
                              </Badge>
                              {pipeCount > 0 && (
                                <Badge variant="outline" className="text-[10px] h-4">
                                  {pipeCount} pipeline
                                </Badge>
                              )}
                            </div>
                            {goal.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1">{goal.description}</p>
                            )}
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="text-[9px] h-4 bg-primary/5">{autonomyLabel}</Badge>
                              {goal.target_channels.map(ch => (
                                <Badge key={ch} variant="outline" className="text-[9px] h-4">{ch}</Badge>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost" size="sm" className="h-7 w-7 p-0"
                              onClick={() => handleRunNow(goal)}
                              disabled={triggeringGoalId === goal.id}
                              title="Chạy ngay"
                            >
                              <Rocket className="w-3.5 h-3.5 text-primary" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => updateGoal.mutate({ id: goal.id, is_paused: !goal.is_paused })}>
                              {goal.is_paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleEditGoal(goal)} title="Chỉnh sửa">
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleDeleteGoal(goal)} title="Xóa">
                              <Trash2 className="w-3.5 h-3.5 text-destructive" />
                            </Button>
                            <Button
                              variant="ghost" size="sm" className="h-7 px-2 text-[10px]"
                              onClick={() => { setFilterGoalId(goal.id); setActiveTab('pipeline'); }}
                            >
                              Xem pipeline →
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </TabsContent>
        </Tabs>

        <GoalWizard
          open={wizardOpen}
          onOpenChange={(open) => { setWizardOpen(open); if (!open) setEditingGoal(null); }}
          onSubmit={handleCreateGoal}
          initialData={editingGoal}
        />
      </div>
    </>
  );
}
