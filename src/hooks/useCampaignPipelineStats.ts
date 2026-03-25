import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AgentPipeline, AgentPipelineStage, PIPELINE_STAGES } from '@/types/agent';
import { getGradeFromScore, CreativeGrade } from '@/types/creativeScore';

export interface PipelineStats {
  total: number;
  completed: number;
  inProgress: number;
  flagged: number;
  completionRate: number;
  approvalRate: number;
  avgQualityScore: number | null;
  qualityGrade: CreativeGrade | null;
  avgCompletionTimeHours: number | null;
  stageDistribution: { stage: string; label: string; count: number; color: string }[];
  pillarDistribution: { role: string; count: number; percentage: number }[];
}

const PAST_APPROVAL_STAGES: AgentPipelineStage[] = ['publish', 'analyze'];

export function useCampaignPipelineStats(campaignId: string | undefined) {
  return useQuery({
    queryKey: ['campaign-pipeline-stats', campaignId],
    queryFn: async (): Promise<PipelineStats> => {
      if (!campaignId) throw new Error('No campaign ID');

      // Fetch pipelines for this campaign
      const { data: pipelines, error } = await supabase
        .from('agent_pipelines')
        .select('*')
        .eq('campaign_id', campaignId);
      if (error) throw error;

      const all = (pipelines || []) as unknown as AgentPipeline[];
      const total = all.length;

      if (total === 0) {
        return {
          total: 0, completed: 0, inProgress: 0, flagged: 0,
          completionRate: 0, approvalRate: 0,
          avgQualityScore: null, qualityGrade: null,
          avgCompletionTimeHours: null,
          stageDistribution: PIPELINE_STAGES.map(s => ({ stage: s.id, label: s.label, count: 0, color: s.color })),
          pillarDistribution: [],
        };
      }

      const completed = all.filter(p => p.completed_at != null).length;
      const flagged = all.filter(p => p.is_flagged).length;
      const inProgress = total - completed - flagged;

      // Approval rate: pipelines that passed approval (now in publish/analyze) without flag
      const pastApproval = all.filter(p => PAST_APPROVAL_STAGES.includes(p.current_stage) || p.completed_at);
      const approvedClean = pastApproval.filter(p => !p.is_flagged).length;
      const approvalRate = pastApproval.length > 0 ? Math.round((approvedClean / pastApproval.length) * 100) : 0;

      // Quality scores
      const withScores = all.filter(p => p.overall_quality_score != null);
      const avgQualityScore = withScores.length > 0
        ? Math.round(withScores.reduce((s, p) => s + (p.overall_quality_score || 0), 0) / withScores.length)
        : null;

      // Avg completion time
      const completedWithTime = all.filter(p => p.completed_at && p.created_at);
      const avgCompletionTimeHours = completedWithTime.length > 0
        ? Math.round(completedWithTime.reduce((s, p) => {
            const diff = new Date(p.completed_at!).getTime() - new Date(p.created_at).getTime();
            return s + diff / (1000 * 60 * 60);
          }, 0) / completedWithTime.length * 10) / 10
        : null;

      // Stage distribution
      const stageCounts: Record<string, number> = {};
      all.forEach(p => { stageCounts[p.current_stage] = (stageCounts[p.current_stage] || 0) + 1; });
      const stageDistribution = PIPELINE_STAGES.map(s => ({
        stage: s.id, label: s.label, count: stageCounts[s.id] || 0, color: s.color,
      }));

      // Pillar distribution from campaign_content_plans
      let pillarDistribution: { role: string; count: number; percentage: number }[] = [];
      try {
        // Get goals linked to this campaign
        const { data: goals } = await supabase
          .from('agent_goals')
          .select('id')
          .eq('campaign_id', campaignId);

        if (goals && goals.length > 0) {
          const goalIds = goals.map(g => g.id);
          const { data: plans } = await supabase
            .from('campaign_content_plans')
            .select('plan_data')
            .in('goal_id', goalIds);

          if (plans) {
            const roleCounts: Record<string, number> = {};
            let totalPieces = 0;
            plans.forEach(plan => {
              const pieces = (plan.plan_data as any[]) || [];
              pieces.forEach(piece => {
                const role = piece.content_role || 'other';
                roleCounts[role] = (roleCounts[role] || 0) + 1;
                totalPieces++;
              });
            });
            pillarDistribution = Object.entries(roleCounts)
              .map(([role, count]) => ({
                role,
                count,
                percentage: totalPieces > 0 ? Math.round((count / totalPieces) * 100) : 0,
              }))
              .sort((a, b) => b.count - a.count);
          }
        }
      } catch {
        // Pillar data is supplementary, don't fail
      }

      return {
        total, completed, inProgress, flagged,
        completionRate: Math.round((completed / total) * 100),
        approvalRate,
        avgQualityScore,
        qualityGrade: avgQualityScore != null ? getGradeFromScore(avgQualityScore) : null,
        avgCompletionTimeHours,
        stageDistribution,
        pillarDistribution,
      };
    },
    enabled: !!campaignId,
  });
}
