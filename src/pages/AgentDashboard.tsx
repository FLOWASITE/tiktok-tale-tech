import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Pause, Play, LayoutGrid, CheckSquare, Target, Bot, Zap } from 'lucide-react';
import { PipelineKanban } from '@/components/agents/PipelineKanban';
import { AgentStatusPanel } from '@/components/agents/AgentStatusPanel';
import { ApprovalQueue } from '@/components/agents/ApprovalQueue';
import { GoalWizard } from '@/components/agents/GoalWizard';
import { useAgentPipelines } from '@/hooks/useAgentPipelines';
import { useAgentApprovals } from '@/hooks/useAgentApprovals';
import { useAgentGoals } from '@/hooks/useAgentGoals';
import { AgentPipelineStage } from '@/types/agent';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function AgentDashboard() {
  const { currentOrganization } = useOrganizationContext();
  const { pipelines, isLoading: pipelinesLoading, updateStage } = useAgentPipelines();
  const { approvals, pendingCount, updateApproval } = useAgentApprovals();
  const { goals, createGoal } = useAgentGoals();
  const [activeTab, setActiveTab] = useState('pipeline');
  const [wizardOpen, setWizardOpen] = useState(false);

  const handleCreateGoal = async (data: Parameters<typeof createGoal.mutateAsync>[0]) => {
    await createGoal.mutateAsync(data);
    setWizardOpen(false);
    try {
      const goalsList = await supabase
        .from('agent_goals')
        .select('id')
        .eq('organization_id', currentOrganization?.id || '')
        .order('created_at', { ascending: false })
        .limit(1);
      const newGoalId = goalsList.data?.[0]?.id;
      if (newGoalId) {
        await supabase.functions.invoke('agent-pipeline', {
          body: { action: 'trigger_from_goal', goal_id: newGoalId },
        });
        toast.success('Pipeline đã được khởi tạo');
      }
    } catch (e) {
      console.error('Pipeline trigger error:', e);
    }
  };

  const activeGoals = goals.filter(g => g.is_active && !g.is_paused);
  const totalInPipeline = pipelines.filter(p => !['published', 'analyzing'].includes(p.current_stage)).length;
  const publishedThisWeek = pipelines.filter(p => {
    if (p.current_stage !== 'published') return false;
    const d = new Date(p.completed_at || p.updated_at);
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return d >= weekAgo;
  }).length;
  const flaggedCount = pipelines.filter(p => p.is_flagged).length;

  const handleStageChange = (id: string, stage: AgentPipelineStage) => {
    updateStage.mutate({ id, stage });
  };

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
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <Pause className="w-3.5 h-3.5" /> Pause All
            </Button>
            <Button size="sm" className="gap-1.5 text-xs">
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
            <div className="flex gap-4">
              <div className="flex-1 min-w-0">
                <PipelineKanban pipelines={pipelines} onStageChange={handleStageChange} />
              </div>
              <div className="hidden lg:block w-[200px] flex-shrink-0">
                <AgentStatusPanel pipelines={pipelines} />
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
                  <Button size="sm" className="gap-1.5">
                    <Plus className="w-3.5 h-3.5" /> Tạo campaign đầu tiên
                  </Button>
                </div>
              ) : (
                goals.map(goal => (
                  <Card key={goal.id}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{goal.name}</p>
                          <Badge variant={goal.is_active ? 'default' : 'secondary'} className="text-[10px] h-4">
                            {goal.is_paused ? 'Tạm dừng' : goal.is_active ? 'Đang chạy' : 'Tắt'}
                          </Badge>
                        </div>
                        {goal.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">{goal.description}</p>
                        )}
                        <div className="flex items-center gap-2 flex-wrap">
                          {goal.target_channels.map(ch => (
                            <Badge key={ch} variant="outline" className="text-[9px] h-4">{ch}</Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                          {goal.is_paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
