import { Workflow, Lightbulb, PenTool, ShieldCheck, CheckCircle2, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AgentDetailCard, AgentInfo } from '@/components/agents/AgentDetailCard';
import { useAgentPipelines } from '@/hooks/useAgentPipelines';
import { PIPELINE_STAGES } from '@/types/agent';

const AGENTS: AgentInfo[] = [
  {
    id: 'strategy',
    name: 'Strategy Agent',
    nameVi: 'Chiến lược',
    icon: Lightbulb,
    color: 'from-violet-500/20 to-violet-500/10',
    role: 'Nghiên cứu thị trường, phân tích brand & đối thủ, lên kế hoạch content calendar với N bài viết tối ưu.',
    tasks: [
      'Phân tích trending topics, competitor gaps, brand context',
      'Lập Content Plan chi tiết (N bài, content role, format, kênh, ngày đăng)',
      'Mapping content với customer journey (Seed → Sprout → Harvest)',
      'Clarify intent với user nếu mục tiêu chưa rõ',
      'Đề xuất content calendar tối ưu theo tần suất & kênh',
    ],
    input: 'Goal config (topics, channels, frequency, brand, industry)',
    output: 'Campaign Content Plan (N pieces với title, angle, format, schedule)',
    tools: ['web_search', 'gap_analyzer', 'calendar_planner', 'persona_matcher', 'clarify_intent'],
    model: 'gemini-2.5-flash',
    costPerCall: '$0.005',
    pipelinePosition: 0,
  },
  {
    id: 'creator',
    name: 'Creator Agent',
    nameVi: 'Sáng tạo',
    icon: PenTool,
    color: 'from-blue-500/20 to-blue-500/10',
    role: 'Viết content hoàn chỉnh từ brief, tối ưu SEO + GEO, chuyển đổi đa kênh, tuân thủ brand voice.',
    tasks: [
      'Tạo core content với answer-first structure chuẩn GEO',
      'Tự review: intent, depth, brand voice, factual accuracy',
      'Tối ưu SEO (keywords, headings, meta) & GEO (citations, entities)',
      'Chuyển đổi đa kênh: Facebook, TikTok, Blog, Email...',
      'Tạo video scripts & carousel slides nếu cần',
    ],
    input: 'Content Brief + Brand DNA + Style Guide + Industry Pack',
    output: 'Core Content + Channel Versions (đa kênh) + SEO/GEO optimized',
    tools: ['brand_voice_check', 'seo_analyzer', 'geo_scorer', 'channel_adapter'],
    model: 'gemini-2.5-flash',
    costPerCall: '$0.010',
    pipelinePosition: 1,
  },
  {
    id: 'quality',
    name: 'Quality Agent',
    nameVi: 'Chất lượng',
    icon: ShieldCheck,
    color: 'from-cyan-500/20 to-cyan-500/10',
    role: 'Kiểm tra chất lượng tổng hợp: GEO scoring, compliance, persona-fit, và tự động flag nếu dưới ngưỡng.',
    tasks: [
      'Chấm GEO Score cho tất cả content types',
      'Kiểm tra compliance: luật QC, brand guidelines, platform policies',
      'Đánh giá persona-fit: pain points, desires, communication style',
      'Tính overall quality score (GEO 30% + Compliance 25% + Self-review 25% + Persona 20%)',
      'Tự động flag nếu score < 50 hoặc compliance fail',
    ],
    input: 'Content draft + Persona data + Brand rules',
    output: 'Quality Report (overall score, GEO, compliance, persona-fit)',
    tools: ['geo_scorer', 'regulation_checker', 'brand_validator', 'persona_evaluator'],
    model: 'gemini-2.5-flash',
    costPerCall: '$0.004',
    pipelinePosition: 2,
  },
  {
    id: 'approval',
    name: 'Approval Agent',
    nameVi: 'Duyệt',
    icon: CheckCircle2,
    color: 'from-amber-500/20 to-amber-500/10',
    role: 'Quản lý quy trình duyệt content: tự động duyệt hoặc chờ human review tùy autonomy level.',
    tasks: [
      'Tạo approval request với summary scores (GEO, compliance, persona)',
      'Human-in-loop: dừng chờ user approve/reject/edit',
      'Human-on-loop: tự approve nhưng ghi log để review sau',
      'Full-auto: skip và chuyển thẳng qua publish',
      'Nếu reject → trả về Creator Agent để tạo lại',
    ],
    input: 'Content + Quality scores + Autonomy level',
    output: 'Approval decision (approve → publish, reject → create)',
    tools: ['notification_sender', 'approval_tracker'],
    model: 'gemini-2.5-flash-lite',
    costPerCall: '$0.001',
    pipelinePosition: 3,
  },
  {
    id: 'publisher',
    name: 'Publisher Agent',
    nameVi: 'Đăng bài',
    icon: Send,
    color: 'from-emerald-500/20 to-emerald-500/10',
    role: 'Đăng bài lên các kênh, theo dõi performance, và cập nhật tiến độ campaign.',
    tasks: [
      'Đăng content lên các kênh đã chọn (Facebook, TikTok, Blog...)',
      'Staggered publishing: đăng tuần tự tránh spam',
      'Thu thập analytics sau khi đăng (engagement, traffic, conversions)',
      'Cập nhật campaign progress (completed_pieces++)',
      'Gửi notification hoàn thành cho user',
    ],
    input: 'Approved content + Channel configs + Schedule',
    output: 'Published URLs + Analytics snapshot + Campaign update',
    tools: ['channel_publisher', 'analytics_aggregator', 'notification_sender'],
    model: 'gemini-2.5-flash-lite',
    costPerCall: '$0.003',
    pipelinePosition: 4,
  },
];

// Map agent id to pipeline stages
const AGENT_STAGE_MAP: Record<string, string[]> = {
  strategy: ['strategy'],
  creator: ['create'],
  quality: ['quality'],
  approval: ['approval'],
  publisher: ['publish', 'analyze'],
};

export default function AgentDirectoryPage() {
  const { pipelines } = useAgentPipelines();

  const getActivePipelines = (agentId: string): number => {
    const stages = AGENT_STAGE_MAP[agentId] || [];
    return pipelines.filter(p => stages.includes(p.current_stage)).length;
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Agent Directory</h1>
        <p className="text-sm text-muted-foreground mt-1">
          5 AI agents chuyên biệt trong pipeline — từ chiến lược đến đăng bài
        </p>
      </div>

      {/* Pipeline flow visual */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2">
        {PIPELINE_STAGES.map((stage, i) => (
          <div key={stage.id} className="flex items-center">
            <div className={cn(
              'px-2.5 py-1 rounded-md text-[10px] font-medium whitespace-nowrap',
              'bg-gradient-to-r border border-border/30',
              stage.color,
            )}>
              {stage.label}
            </div>
            {i < PIPELINE_STAGES.length - 1 && (
              <span className="text-muted-foreground/40 mx-0.5">→</span>
            )}
          </div>
        ))}
      </div>

      {/* Agent cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {AGENTS.map((agent) => (
          <AgentDetailCard
            key={agent.id}
            agent={agent}
            activePipelines={getActivePipelines(agent.id)}
          />
        ))}
      </div>

      {/* Cost summary */}
      <div className="p-4 rounded-xl border border-border/50 bg-card/60">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
          <Workflow className="w-4 h-4 text-primary" />
          Chi phí ước tính full pipeline
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-muted-foreground">
          <div>
            <span className="block text-foreground font-mono text-sm">~$0.023</span>
            per content piece
          </div>
          <div>
            <span className="block text-foreground font-mono text-sm">~$0.46</span>
            20 bài/tháng
          </div>
          <div>
            <span className="block text-foreground font-mono text-sm">5 agents</span>
            trong pipeline
          </div>
          <div>
            <span className="block text-foreground font-mono text-sm">6 stages</span>
            end-to-end
          </div>
        </div>
      </div>
    </div>
  );
}
