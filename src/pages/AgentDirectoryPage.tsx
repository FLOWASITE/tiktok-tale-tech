import { Search, Workflow, PenTool, Gauge, Layers, ShieldCheck, Send, BarChart3, Brain, Lightbulb } from 'lucide-react';
import { AgentDetailCard, AgentInfo } from '@/components/agents/AgentDetailCard';
import { useAgentPipelines } from '@/hooks/useAgentPipelines';
import { PIPELINE_STAGES } from '@/types/agent';

const AGENTS: AgentInfo[] = [
  {
    id: 'orchestrator',
    name: 'Orchestrator',
    nameVi: 'Điều phối',
    icon: Brain,
    color: 'from-purple-500/20 to-purple-500/10',
    role: 'Điều phối toàn bộ pipeline, phân công tasks cho agents, theo dõi tiến độ và quyết định khi nào cần human intervention.',
    tasks: [
      'Phân tách goal thành Content Plan cụ thể',
      'Scheduling pipeline cho từng content piece',
      'Quản lý dependency giữa các agents',
      'Escalation logic khi có lỗi hoặc quality thấp',
      'Quyết định autonomy level cho từng bước',
    ],
    input: 'Goal từ user (topics, channels, frequency, autonomy level)',
    output: 'Pipeline instances + task assignments cho từng agent',
    tools: ['plan_compiler', 'dependency_resolver', 'escalation_engine'],
    model: 'gemini-2.5-flash',
    costPerCall: '$0.002',
    pipelinePosition: -1,
  },
  {
    id: 'research',
    name: 'Research Agent',
    nameVi: 'Nghiên cứu',
    icon: Search,
    color: 'from-violet-500/20 to-violet-500/10',
    role: 'Nghiên cứu xu hướng, phân tích đối thủ, và chọn topic tốt nhất phù hợp chiến lược brand.',
    tasks: [
      'Quét trending topics từ Google Trends & social listening',
      'Phân tích competitor content và gaps',
      'Tổng hợp dữ liệu từ Topic Bank',
      'Chọn topic có score + brand alignment cao nhất',
      'Tạo Content Brief với outline, keywords, references',
    ],
    input: 'Goal config (topics, brand, industry)',
    output: 'Content Brief (topic, keywords, outline, references, persona)',
    tools: ['web_search', 'search_topics', 'discover_topics', 'competitor_analyzer'],
    model: 'gemini-2.5-flash',
    costPerCall: '$0.005',
    pipelinePosition: 0,
  },
  {
    id: 'strategy',
    name: 'Strategy Agent',
    nameVi: 'Chiến lược',
    icon: Lightbulb,
    color: 'from-amber-500/20 to-amber-500/10',
    role: 'Lập kế hoạch content chi tiết, phân tích gap, và đề xuất content calendar tối ưu.',
    tasks: [
      'Phân tích content gap so với đối thủ',
      'Đề xuất content calendar tuần/tháng',
      'Xác định format phù hợp (blog, listicle, how-to, FAQ)',
      'Mapping content với customer journey stages',
      'Ưu tiên topics theo business impact',
    ],
    input: 'Content Brief từ Research Agent + brand context',
    output: 'Content Strategy (format, angle, CTA, audience mapping)',
    tools: ['gap_analyzer', 'calendar_planner', 'persona_matcher'],
    model: 'gemini-2.5-flash',
    costPerCall: '$0.003',
    pipelinePosition: 1,
  },
  {
    id: 'creator',
    name: 'Creator Agent',
    nameVi: 'Sáng tạo',
    icon: PenTool,
    color: 'from-blue-500/20 to-blue-500/10',
    role: 'Viết content hoàn chỉnh từ brief, tuân thủ brand voice, tối ưu sẵn cho SEO và GEO.',
    tasks: [
      'Tạo outline chi tiết với heading hierarchy chuẩn GEO',
      'Viết full draft với answer-first structure',
      'Thêm citation blocks và data points',
      'Tự review: intent, depth, brand voice, factual accuracy',
      'Xử lý tiếng Việt: xưng hô, dấu thanh, tone phù hợp',
    ],
    input: 'Content Brief + Brand DNA + Style Guide + Industry Pack',
    output: 'Core Content piece (long-form, SEO+GEO ready)',
    tools: ['brand_voice_check', 'fact_checker', 'readability_scorer'],
    model: 'gemini-2.5-flash',
    costPerCall: '$0.008',
    pipelinePosition: 2,
  },
  {
    id: 'optimizer',
    name: 'Optimizer Agent',
    nameVi: 'Tối ưu',
    icon: Gauge,
    color: 'from-cyan-500/20 to-cyan-500/10',
    role: 'Tối ưu đồng thời cho Google Search (SEO) và AI Search (GEO), đạt dual score > 70.',
    tasks: [
      'Keyword placement: title, H1, meta, first paragraph, H2s',
      'Internal linking suggestions',
      'GEO optimization: answer blocks, citations, entity clarity',
      'Auto-generate schema markup (Article, FAQ, HowTo)',
      'Nếu score < 70 → tự fix hoặc escalate',
    ],
    input: 'Draft content từ Creator Agent',
    output: 'Optimized content + SEO Score + GEO Score + Schema markup',
    tools: ['seo_analyzer', 'geo_scorer', 'schema_generator', 'keyword_optimizer'],
    model: 'gemini-2.5-flash-lite',
    costPerCall: '$0.003',
    pipelinePosition: 3,
  },
  {
    id: 'expander',
    name: 'Expander Agent',
    nameVi: 'Mở rộng',
    icon: Layers,
    color: 'from-teal-500/20 to-teal-500/10',
    role: 'Chuyển đổi core content thành phiên bản tối ưu cho 10+ kênh, giữ brand voice nhưng adapt format.',
    tasks: [
      'Extract key messages, quotes, statistics từ core content',
      'Tạo phiên bản Blog, Facebook, Instagram, TikTok, Zalo OA',
      'Adapt tone + length cho từng platform',
      'Auto-generate image prompts cho AI Image Studio',
      'Hashtag research per platform per market',
    ],
    input: 'Optimized core content + target channels',
    output: 'Multi-channel versions (10+ kênh) + image prompts',
    tools: ['channel_adapter', 'hashtag_researcher', 'image_prompt_generator'],
    model: 'gemini-2.5-flash-lite',
    costPerCall: '$0.004',
    pipelinePosition: 4,
  },
  {
    id: 'compliance',
    name: 'Compliance Agent',
    nameVi: 'Tuân thủ',
    icon: ShieldCheck,
    color: 'from-orange-500/20 to-orange-500/10',
    role: 'Kiểm tra tuân thủ regulations, brand guidelines, content quality, và platform rules tại mọi giai đoạn.',
    tasks: [
      'Lớp 1: Regulatory — Luật QC VN, ATVSTP, Pharma, PDPA',
      'Lớp 2: Brand — Terminology, tone consistency, competitor mentions',
      'Lớp 3: Quality — Factual accuracy, plagiarism, AI detection',
      'Lớp 4: Platform — Facebook/TikTok/Google policies',
      'Output: Pass (🟢) / Warning (🟡) / Block (🔴)',
    ],
    input: 'Content draft (post-Creator) + channel versions (post-Expander)',
    output: 'Compliance report + Pass/Warning/Block status',
    tools: ['regulation_checker', 'brand_validator', 'plagiarism_scanner', 'policy_checker'],
    model: 'gemini-2.5-flash-lite',
    costPerCall: '$0.002',
    pipelinePosition: -1,
    isParallel: true,
  },
  {
    id: 'analyst',
    name: 'Analyst Agent',
    nameVi: 'Phân tích',
    icon: BarChart3,
    color: 'from-pink-500/20 to-pink-500/10',
    role: 'Theo dõi performance mọi content đã publish, rút kinh nghiệm, và feed insights cho toàn bộ pipeline.',
    tasks: [
      'Track engagement, traffic, SEO rankings, GEO citations',
      'Topic learning: topic nào perform tốt nhất',
      'Format learning: listicle vs how-to vs review',
      'Timing learning: giờ/ngày nào engagement cao nhất',
      'Tạo weekly performance report + recommendations',
    ],
    input: 'Published content + analytics data từ platforms',
    output: 'Performance insights + learning data cho Research & Creator',
    tools: ['analytics_aggregator', 'trend_detector', 'report_generator'],
    model: 'gemini-2.5-flash-lite',
    costPerCall: '$0.003',
    pipelinePosition: 7,
  },
];

// Map agent id to pipeline stages
const AGENT_STAGE_MAP: Record<string, string[]> = {
  research: ['research'],
  strategy: ['research'],
  creator: ['creation'],
  optimizer: ['optimization'],
  expander: ['expansion'],
  compliance: ['compliance'],
  analyst: ['analyzing'],
  orchestrator: ['research', 'creation', 'optimization', 'expansion', 'compliance', 'approval', 'scheduled', 'published', 'analyzing'],
};

export default function AgentDirectoryPage() {
  const { pipelines } = useAgentPipelines();

  const getActivePipelines = (agentId: string): number => {
    const stages = AGENT_STAGE_MAP[agentId] || [];
    if (agentId === 'orchestrator') return pipelines.length;
    return pipelines.filter(p => stages.includes(p.current_stage)).length;
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Agent Directory</h1>
        <p className="text-sm text-muted-foreground mt-1">
          8 AI agents chuyên biệt trong pipeline — từ nghiên cứu đến phân tích
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
            <span className="block text-foreground font-mono text-sm">~$0.028</span>
            per content piece
          </div>
          <div>
            <span className="block text-foreground font-mono text-sm">~$0.56</span>
            20 bài/tháng
          </div>
          <div>
            <span className="block text-foreground font-mono text-sm">8 agents</span>
            trong pipeline
          </div>
          <div>
            <span className="block text-foreground font-mono text-sm">9 stages</span>
            end-to-end
          </div>
        </div>
      </div>
    </div>
  );
}
