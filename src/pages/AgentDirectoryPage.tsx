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
    routes: [
      {
        id: 'default',
        label: 'Campaign Strategy',
        steps: [
          { label: 'Phân tích goal config + clarification context', detail: 'topics, channels, frequency, brand DNA' },
          { label: 'Gọi generate-campaign-strategy', detail: 'tạo content plan N bài với title, angle, format' },
          { label: 'Mapping content role + schedule', detail: 'Seed 40% / Sprout 35% / Harvest 25%' },
        ],
      },
    ],
    input: 'Goal config (topics, channels, frequency, brand, industry)',
    output: 'Campaign Content Plan (N pieces với title, angle, format, schedule)',
    tools: ['generate-campaign-strategy', 'clarify-campaign-intent', 'calendar_planner'],
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
    routes: [
      {
        id: 'multichannel',
        label: 'Multichannel',
        condition: 'content_type = multichannel',
        steps: [
          { label: 'Tạo Core Content', detail: 'answer-first structure chuẩn GEO' },
          { label: 'Channel Expansion', detail: 'chuyển đổi N kênh song song (Facebook, TikTok, Blog...)' },
          { label: 'Image Generation', detail: 'tạo ảnh song song cho các kênh' },
        ],
      },
      {
        id: 'video_script',
        label: 'Video Script',
        condition: 'content_type = video_script',
        steps: [
          { label: 'Script Generation', detail: 'tạo kịch bản video hoàn chỉnh' },
          { label: 'Analyze & Score', detail: 'chấm điểm hook, flow, CTA' },
          { label: 'Improve', detail: 'cải thiện nếu score < 70' },
        ],
      },
      {
        id: 'carousel',
        label: 'Carousel',
        condition: 'content_type = carousel',
        steps: [
          { label: 'Slide Text + Image Prompts', detail: 'tạo nội dung 5-8 slides + prompt ảnh' },
          { label: 'Image Generation', detail: 'tạo ảnh tuần tự cho từng slide' },
          { label: 'Compile Output', detail: 'ghép text + ảnh thành carousel hoàn chỉnh' },
        ],
      },
    ],
    input: 'Content Brief + Brand DNA + Style Guide + Industry Pack',
    output: 'Core Content + Channel Versions (đa kênh) + SEO/GEO optimized',
    tools: ['brand_voice_check', 'seo_analyzer', 'geo_scorer', 'channel_adapter', 'image_generator'],
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
    routes: [
      {
        id: 'default',
        label: 'Quality Check',
        steps: [
          { label: 'GEO Scoring', detail: 'geo-score-content — trọng số 40%' },
          { label: 'Compliance Check', detail: 'gemini-2.5-flash — trọng số 35%' },
          { label: 'Persona-Fit Scoring', detail: 'gemini-2.5-flash-lite — trọng số 25%' },
          { label: 'Merge & Flag', detail: 'tính overall score, flag nếu < 50 hoặc compliance fail' },
        ],
      },
    ],
    isParallel: true,
    input: 'Content draft + Persona data + Brand rules',
    output: 'Quality Report (overall score, GEO, compliance, persona-fit)',
    tools: ['geo-score-content', 'regulation_checker', 'brand_validator', 'persona_evaluator'],
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
    routes: [
      {
        id: 'human_in_loop',
        label: 'Human-in-loop',
        condition: 'autonomy = human_in_loop',
        steps: [
          { label: 'Tạo approval record', detail: 'gửi content preview + quality scores' },
          { label: 'Chờ human review', detail: 'approve / reject / edit' },
          { label: 'Xử lý kết quả', detail: 'reject → trả về Creator, approve → publish' },
        ],
      },
      {
        id: 'human_on_loop',
        label: 'Human-on-loop',
        condition: 'autonomy = human_on_loop',
        steps: [
          { label: 'Smart Auto-Approve', detail: 'tự duyệt nếu quality ≥ threshold' },
          { label: 'Ghi log review', detail: 'lưu record để human review sau' },
          { label: 'Chuyển publish', detail: 'tự động forward sang Publisher' },
        ],
      },
      {
        id: 'full_auto',
        label: 'Full Auto',
        condition: 'autonomy = full_auto',
        steps: [
          { label: 'Skip approval', detail: 'không tạo approval record' },
          { label: 'Direct publish', detail: 'chuyển thẳng sang Publisher Agent' },
        ],
      },
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
    routes: [
      {
        id: 'default',
        label: 'Publish Flow',
        steps: [
          { label: 'Resolve content + UTM tagging', detail: 'chuẩn bị nội dung & tracking links' },
          { label: 'Publish tuần tự', detail: 'stagger 2s qua channel-publisher, tránh spam' },
          { label: 'Update status', detail: 'cập nhật content_schedules + campaign progress' },
        ],
      },
    ],
    input: 'Approved content + Channel configs + Schedule',
    output: 'Published URLs + Analytics snapshot + Campaign update',
    tools: ['channel-publisher', 'analytics_aggregator', 'notification_sender'],
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
