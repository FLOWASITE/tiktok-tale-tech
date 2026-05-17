import { useState, useEffect, useCallback, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useSuggestObjectives } from '@/hooks/agents/useSuggestObjectives';
import { useSuggestChannels } from '@/hooks/agents/useSuggestChannels';
import { useSuggestStrategy } from '@/hooks/agents/useSuggestStrategy';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Target, Radio, Eye, ChevronLeft, ChevronRight, 
  Check, Sparkles, ShieldCheck, Zap, Bot, X, Plus, MessageSquare,
  Megaphone, Heart, Link2, ClipboardList, DollarSign, RefreshCw,
  PieChart, TrendingUp, Settings2, FileText, Images, Video,
  Loader2, CheckCircle2, AlertCircle, ArrowRight, Save, Brain, Star,
  CalendarDays, Wand2, Lightbulb
} from 'lucide-react';
import { AgentAutonomyLevel, AgentGoal, AUTONOMY_LEVELS } from '@/types/agent';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useOrganizationSettings } from '@/hooks/useOrganizationSettings';
import { useCurrentBrand } from '@/contexts/BrandContext';
import { cn } from '@/lib/utils';
import { CampaignSelector } from '@/components/campaign/CampaignSelector';
import { ChannelIcon, channelIconColors } from '@/components/ui/channel-icon';
import { Channel } from '@/types/multichannel';
import { toast } from 'sonner';
import { ClarificationStep } from './ClarificationStep';
import ContentScheduleStudio from './ContentScheduleStudio';
import { usePreviewSchedule } from '@/hooks/agents/usePreviewSchedule';
import type { SchedulePiece } from '@/lib/scheduleExport';
import { analyzeCampaignName, type NameQualityResult } from '@/lib/campaignNameQuality';

// ─── Constants ───

const AVAILABLE_CHANNELS: { id: string; label: string; channelKey: Channel; group: 'longform' | 'social' }[] = [
  // 🌐 Website & Long-form
  { id: 'website',   label: 'Website',      channelKey: 'website',   group: 'longform' },
  { id: 'blogger',   label: 'Blogger',      channelKey: 'blogger',   group: 'longform' },
  { id: 'wordpress', label: 'WordPress',    channelKey: 'wordpress', group: 'longform' },
  { id: 'shopify',   label: 'Shopify Blog', channelKey: 'shopify',   group: 'longform' },
  { id: 'wix',       label: 'Wix Blog',     channelKey: 'wix',       group: 'longform' },
  { id: 'medium',    label: 'Medium',       channelKey: 'medium',    group: 'longform' },
  { id: 'email',     label: 'Email',        channelKey: 'email',     group: 'longform' },
  // 💬 Mạng xã hội
  { id: 'facebook',    label: 'Facebook',    channelKey: 'facebook',    group: 'social' },
  { id: 'instagram',   label: 'Instagram',   channelKey: 'instagram',   group: 'social' },
  { id: 'linkedin',    label: 'LinkedIn',    channelKey: 'linkedin',    group: 'social' },
  { id: 'twitter',     label: 'X (Twitter)', channelKey: 'twitter',     group: 'social' },
  { id: 'threads',     label: 'Threads',     channelKey: 'threads',     group: 'social' },
  { id: 'bluesky',     label: 'Bluesky',     channelKey: 'bluesky',     group: 'social' },
  { id: 'pinterest',   label: 'Pinterest',   channelKey: 'pinterest',   group: 'social' },
  { id: 'telegram',    label: 'Telegram',    channelKey: 'telegram',    group: 'social' },
  { id: 'zalo',        label: 'Zalo OA',     channelKey: 'zalo_oa',     group: 'social' },
  { id: 'google_maps', label: 'Google Maps', channelKey: 'google_maps', group: 'social' },
  // ❌ TikTok / YouTube không nằm trong AI Campaign — chỉ post từ Video Studio
];

const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Mỗi ngày' },
  { value: '3/week', label: '3 lần/tuần' },
  { value: '2/week', label: '2 lần/tuần' },
  { value: 'weekly', label: 'Hàng tuần' },
];

const DURATION_OPTIONS = [
  { value: 7, label: '1 tuần', description: '3-4 bài viết' },
  { value: 14, label: '2 tuần', description: '5-7 bài viết' },
  { value: 30, label: '1 tháng', description: '8-12 bài viết' },
  { value: 90, label: '3 tháng', description: '20-30 bài viết' },
  { value: 0, label: 'Tùy chỉnh', description: 'Nhập số ngày' },
];

const APPROVAL_MODE_OPTIONS = [
  { value: 'approve_each', label: 'Duyệt từng bài', description: 'AI tạo từng bài, bạn duyệt mỗi bài trước khi đăng', icon: ShieldCheck, autonomy: 'human_in_loop' as AgentAutonomyLevel },
  { value: 'approve_plan', label: 'Duyệt kế hoạch', description: 'Duyệt toàn bộ plan, AI tự chạy theo kế hoạch đã duyệt', icon: FileText, autonomy: 'human_on_loop' as AgentAutonomyLevel },
  { value: 'full_auto', label: 'Tự động hoàn toàn', description: 'AI tự lên kế hoạch, tạo và đăng bài tự động', icon: Sparkles, autonomy: 'full_auto' as AgentAutonomyLevel },
];

const OBJECTIVES = [
  { id: 'awareness', label: 'Tăng nhận biết', description: 'Nhiều người biết đến thương hiệu hơn', icon: Megaphone, color: 'text-blue-500', kpis: [{ key: 'reach', label: 'Reach mục tiêu', placeholder: '10000' }, { key: 'impressions', label: 'Impressions mục tiêu', placeholder: '50000' }] },
  { id: 'engagement', label: 'Tăng tương tác', description: 'Nhiều like, comment, share hơn', icon: Heart, color: 'text-pink-500', kpis: [{ key: 'engagement_rate', label: '% tương tác mục tiêu', placeholder: '5' }, { key: 'comments', label: 'Số comment mục tiêu', placeholder: '100' }] },
  { id: 'traffic', label: 'Tăng traffic', description: 'Kéo người truy cập về website', icon: Link2, color: 'text-emerald-500', kpis: [{ key: 'clicks', label: 'Clicks mục tiêu', placeholder: '5000' }, { key: 'ctr', label: '% CTR mục tiêu', placeholder: '3' }] },
  { id: 'leads', label: 'Thu thập leads', description: 'Lấy thông tin khách hàng tiềm năng', icon: ClipboardList, color: 'text-amber-500', kpis: [{ key: 'form_fills', label: 'Số form mục tiêu', placeholder: '200' }, { key: 'signups', label: 'Số đăng ký mục tiêu', placeholder: '100' }] },
  { id: 'revenue', label: 'Tăng doanh thu', description: 'Bán hàng và chuyển đổi', icon: DollarSign, color: 'text-green-500', kpis: [{ key: 'conversions', label: 'Số đơn mục tiêu', placeholder: '50' }, { key: 'roas', label: 'ROAS mục tiêu (x)', placeholder: '3' }] },
  { id: 'retention', label: 'Giữ chân KH', description: 'Khách hàng quay lại mua thêm', icon: RefreshCw, color: 'text-violet-500', kpis: [{ key: 'repeat_rate', label: '% mua lại mục tiêu', placeholder: '30' }, { key: 'nps', label: 'NPS mục tiêu', placeholder: '50' }] },
];

const STEPS = [
  { icon: Target, label: 'Mục tiêu' },
  { icon: PieChart, label: 'Chiến lược' },
  { icon: Radio, label: 'Kênh' },
  { icon: Eye, label: 'Xác nhận' },
];

const AUTONOMY_TO_APPROVAL: Record<AgentAutonomyLevel, string> = {
  human_in_loop: 'approve_each',
  human_on_loop: 'approve_plan',
  full_auto: 'full_auto',
};

const PILLAR_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

const BUDGET_COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-4))'];

const INDUSTRY_SUGGESTIONS: Record<string, string[]> = {
  'accounting': ['Tiết kiệm chi phí kế toán', 'Tư vấn thuế chuyên nghiệp', 'Báo cáo tài chính chính xác', 'Hỗ trợ doanh nghiệp SME', 'Tuân thủ pháp luật', 'Quy trình tự động hoá'],
  'ecommerce': ['Mua sắm tiện lợi', 'Giao hàng nhanh chóng', 'Ưu đãi độc quyền', 'Sản phẩm chất lượng', 'Đổi trả miễn phí', 'Thanh toán an toàn'],
  'education': ['Học tập hiệu quả', 'Phương pháp tiên tiến', 'Cam kết đầu ra', 'Giảng viên chất lượng', 'Lộ trình cá nhân hoá', 'Chứng chỉ được công nhận'],
  'healthcare': ['Sức khỏe toàn diện', 'Đội ngũ bác sĩ giỏi', 'Công nghệ hiện đại', 'Chăm sóc tận tâm', 'Kết quả rõ ràng', 'Chi phí hợp lý'],
  'technology': ['Giải pháp công nghệ', 'Tối ưu hiệu suất', 'Bảo mật dữ liệu', 'Hỗ trợ 24/7', 'Tích hợp dễ dàng', 'Mở rộng linh hoạt'],
  'food': ['Nguyên liệu tươi sạch', 'Hương vị đặc biệt', 'Giao hàng nhanh', 'Giá cả hợp lý', 'Đóng gói sạch sẽ', 'Thực đơn đa dạng'],
  'beauty': ['Làm đẹp tự nhiên', 'Sản phẩm an toàn', 'Kết quả rõ rệt', 'Xu hướng mới nhất', 'Thành phần minh bạch', 'Phù hợp mọi làn da'],
  'real_estate': ['Vị trí đắc địa', 'Pháp lý minh bạch', 'Tiềm năng tăng giá', 'Hỗ trợ vay vốn', 'Thiết kế hiện đại', 'Tiện ích đầy đủ'],
  'fitness': ['Lịch tập cá nhân hoá', 'Huấn luyện viên chuyên nghiệp', 'Kết quả sau 30 ngày', 'Cộng đồng năng động'],
  'travel': ['Trải nghiệm độc đáo', 'Hành trình an toàn', 'Giá cạnh tranh', 'Hỗ trợ 24/7', 'Lịch trình linh hoạt'],
  'finance': ['Đầu tư thông minh', 'Lãi suất hấp dẫn', 'Bảo mật tuyệt đối', 'Tư vấn miễn phí', 'Giải ngân nhanh'],
};

const OBJECTIVE_SUGGESTIONS: Record<string, string[]> = {
  'awareness': [
    'Thương hiệu uy tín hàng đầu',
    'Giải pháp #1 cho ngành',
    'Được tin dùng bởi hàng nghìn khách hàng',
    'Cam kết chất lượng vượt trội',
    'Nâng tầm trải nghiệm',
    'Thiết kế tối ưu — dễ dùng, hiệu quả',
  ],
  'engagement': [
    'Chia sẻ câu chuyện của bạn',
    'Kết nối - Trải nghiệm - Yêu thích',
    'Cùng tạo nên xu hướng mới',
    'Thử thách hôm nay — khác biệt ngày mai',
    'Tương tác liền tay — nhận quà ngay',
    'Cộng đồng sáng tạo cùng nhau',
  ],
  'traffic': [
    'Khám phá nội dung hữu ích',
    'Cập nhật xu hướng mỗi ngày',
    'Bài viết chuyên sâu theo ngành',
    'Tài liệu miễn phí — tải ngay',
    'Blog & hướng dẫn từ chuyên gia',
  ],
  'leads': [
    'Nhận tư vấn miễn phí',
    'Đăng ký để nhận ưu đãi đặc biệt',
    'Demo sản phẩm 1:1',
    'Báo giá nhanh trong 24h',
    'Dùng thử không giới hạn 14 ngày',
  ],
  'revenue': [
    'Tiết kiệm đến 30% chi phí',
    'Ưu đãi có hạn — chốt ngay hôm nay',
    'Hoàn tiền nếu không hài lòng',
    'Giá tốt — rủi ro thấp',
    'Mua 1 lần — dùng lâu dài',
    'Combo tối ưu cho người mới',
  ],
  'retention': [
    'Ưu đãi dành riêng khách thân thiết',
    'Càng gắn bó — càng nhiều quyền lợi',
    'Nâng cấp trải nghiệm của bạn',
    'Tri ân khách hàng định kỳ',
    'Hỗ trợ ưu tiên & xử lý nhanh',
  ],
};

const CTA_SUGGESTIONS: Record<string, string[]> = {
  'awareness': ['Tìm hiểu thêm', 'Khám phá ngay', 'Xem chi tiết', 'Xem demo', 'Tải brochure', 'Xem case study'],
  'engagement': ['Tham gia ngay', 'Chia sẻ với bạn bè', 'Bình luận ý kiến', 'Thử ngay', 'Tham gia thử thách', 'Vote ngay'],
  'traffic': ['Đọc ngay', 'Xem bài viết', 'Tải miễn phí', 'Truy cập ngay', 'Xem hướng dẫn'],
  'leads': ['Đăng ký ngay', 'Nhận tư vấn', 'Nhận báo giá', 'Đặt lịch demo', 'Dùng thử miễn phí', 'Liên hệ ngay'],
  'revenue': ['Mua ngay', 'Đặt hàng ngay', 'Nhận ưu đãi', 'Chốt đơn hôm nay', 'Nhận mã giảm giá', 'Bắt đầu ngay', 'Sở hữu ngay'],
  'retention': ['Gia hạn ngay', 'Nâng cấp gói', 'Nhận ưu đãi VIP', 'Kích hoạt lại', 'Đổi điểm ngay', 'Xem quyền lợi'],
};

const DEFAULT_SUGGESTIONS = ['Chất lượng hàng đầu', 'Giá cả cạnh tranh', 'Dịch vụ chuyên nghiệp', 'Uy tín lâu năm', 'An tâm sử dụng', 'Tối ưu chi phí'];

const LEARNING_SPEED_OPTIONS = [
  { value: 'conservative', label: 'Thận trọng', description: 'Thay đổi ít, ổn định' },
  { value: 'balanced', label: 'Cân bằng', description: 'Mặc định, phù hợp hầu hết' },
  { value: 'aggressive', label: 'Nhanh', description: 'Thử nghiệm nhiều, học nhanh' },
];

// ─── Types ───

type GoalSubmitData = {
  name: string;
  description?: string;
  target_topics: string[];
  target_channels: string[];
  frequency: Record<string, string>;
  autonomy_level: AgentAutonomyLevel;
  brand_template_id?: string;
  campaign_id?: string;
  clarification_context?: Record<string, string>;
  campaign_duration_days?: number;
  campaign_start_date?: string;
  approval_mode?: string;
};

type GeneratingStatus = 'idle' | 'saving' | 'generating' | 'done' | 'error';

interface GenerationResult {
  total_pieces?: number;
  pipelines_created?: number;
  approval_mode?: string;
  plan_id?: string;
  goal_name?: string;
}

interface GoalWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveGoal: (data: GoalSubmitData) => Promise<string>;
  onGenerateStrategy: (goalId: string, data: {
    name: string;
    description?: string;
    target_channels: string[];
    campaign_duration_days?: number;
    campaign_start_date?: string;
    approval_mode?: string;
    brand_template_id?: string;
    clarification_context?: Record<string, string>;
    pre_generated_plan?: SchedulePiece[];
  }) => Promise<GenerationResult>;
  onComplete: (result: GenerationResult) => void;
  initialData?: AgentGoal | null;
}

// ─── Component ───

export function GoalWizard({ open, onOpenChange, onSaveGoal, onGenerateStrategy, onComplete, initialData }: GoalWizardProps) {
  const { currentOrganization } = useOrganizationContext();
  const { defaultAutonomyLevel } = useOrganizationSettings();
  const { currentBrand } = useCurrentBrand();
  const [step, setStep] = useState(0);
  
  // Step 0: Mục tiêu
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  // Multi-objective: max 3, objectives[0] = primary
  const [objectives, setObjectives] = useState<string[]>([]);
  const [kpiTargets, setKpiTargets] = useState<Record<string, number>>({});
  // AI mode picker (Step 0)
  const [aiMode, setAiMode] = useState<'assist' | 'auto'>('auto');
  // Auto-suggest mode
  const [autoMode, setAutoMode] = useState(false);
  const [aiObjectiveIds, setAiObjectiveIds] = useState<Set<string>>(new Set());
  const [aiKpiKeys, setAiKpiKeys] = useState<Set<string>>(new Set());
  const [aiReasoning, setAiReasoning] = useState<string>('');
  const suggestObjectives = useSuggestObjectives();
  // Derived helper — kept as a local "selectedObjective" alias so legacy references work
  const selectedObjective = objectives[0] ?? null;
  const secondaryObjectives = objectives.slice(1);
  const hasObjectiveConflict = objectives.includes('awareness') && objectives.includes('revenue');

  // Step 1: Chiến lược
  const [totalBudget, setTotalBudget] = useState<number>(0);
  const [budgetAllocation, setBudgetAllocation] = useState({ content: 50, ads: 30, kol: 20 });
  const [keyMessages, setKeyMessages] = useState<string[]>([]);
  const [keyMessageInput, setKeyMessageInput] = useState('');
  const [primaryCta, setPrimaryCta] = useState('');
  const [pillarAllocation, setPillarAllocation] = useState<Record<string, number>>({});
  const [campaignDurationDays, setCampaignDurationDays] = useState(14);
  const [customDuration, setCustomDuration] = useState('');
  const [campaignStartDate, setCampaignStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [totalPostsTarget, setTotalPostsTarget] = useState<number | ''>('');

  // Content Schedule Studio state
  const [editableSchedule, setEditableSchedule] = useState<SchedulePiece[] | null>(null);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [scheduleAutoTriggered, setScheduleAutoTriggered] = useState(false);
  const [scheduleStale, setScheduleStale] = useState(false);
  const previewSchedule = usePreviewSchedule();

  // Step 2: Kênh
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [frequency, setFrequency] = useState<Record<string, string>>({});
  // Auto-suggest channels mode
  const [autoChannelMode, setAutoChannelMode] = useState(false);
  const [aiChannelIds, setAiChannelIds] = useState<Set<string>>(new Set());
  const [aiChannelReasoning, setAiChannelReasoning] = useState<string>('');
  const suggestChannels = useSuggestChannels();

  // Step 1 Auto strategy
  const [autoStrategyMode, setAutoStrategyMode] = useState(false);
  const [aiStrategyKeys, setAiStrategyKeys] = useState<{
    keyMessages: Set<string>;
    cta: boolean;
    budget: boolean;
    pillars: boolean;
    posts: boolean;
  }>({ keyMessages: new Set(), cta: false, budget: false, pillars: false, posts: false });
  const [aiStrategyReasoning, setAiStrategyReasoning] = useState('');
  const suggestStrategy = useSuggestStrategy();

  // Master auto-pilot
  const [autoPilotRunning, setAutoPilotRunning] = useState(false);
  const [autoPilotStage, setAutoPilotStage] = useState<'idle' | 'objectives' | 'channels' | 'strategy' | 'done'>('idle');

  // Step 3: Tự động
  const [autonomyLevel, setAutonomyLevel] = useState<AgentAutonomyLevel>('human_in_loop');
  const [approvalMode, setApprovalMode] = useState('approve_each');
  const [autoApproveEnabled, setAutoApproveEnabled] = useState(false);
  const [thresholdQuality, setThresholdQuality] = useState(70);
  const [thresholdRiskMax, setThresholdRiskMax] = useState(30);
  const [thresholdGeo, setThresholdGeo] = useState(60);
  const [brandVoiceThreshold, setBrandVoiceThreshold] = useState(70);
  const [learningSpeed, setLearningSpeed] = useState('balanced');

  // Step 4: Xác nhận
  const [brandTemplateId, setBrandTemplateId] = useState<string>('');
  const [campaignId, setCampaignId] = useState<string | undefined>(undefined);

  // Clarification
  const [clarifying, setClarifying] = useState(false);
  const [clarificationQuestions, setClarificationQuestions] = useState<any[] | null>(null);
  const [clarificationUnderstanding, setClarificationUnderstanding] = useState<string | null>(null);
  const [clarificationContext, setClarificationContext] = useState<Record<string, string> | null>(null);

  // Campaign name quality
  const nameQuality: NameQualityResult = useMemo(() => analyzeCampaignName(name), [name]);
  const [nameIssue, setNameIssue] = useState<{
    issue: 'vague' | 'irrelevant' | 'gibberish';
    reason: string;
    suggestions: string[];
  } | null>(null);
  const [suggestingNames, setSuggestingNames] = useState(false);

  // Generating state
  const [generatingStatus, setGeneratingStatus] = useState<GeneratingStatus>('idle');
  const [generationResult, setGenerationResult] = useState<GenerationResult | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // ─── Derived ───
  const industrySuggestions = useMemo(() => {
    const industry = (Array.isArray(currentBrand?.industry) ? currentBrand.industry[0] : currentBrand?.industry)?.toLowerCase() || '';
    let suggestions = DEFAULT_SUGGESTIONS;
    for (const [key, vals] of Object.entries(INDUSTRY_SUGGESTIONS)) {
      if (industry.includes(key)) { suggestions = vals; break; }
    }
    const objSuggestions = OBJECTIVE_SUGGESTIONS[selectedObjective || ''] || [];
    const merged = [...suggestions];
    objSuggestions.forEach(s => { if (!merged.includes(s)) merged.push(s); });
    return merged;
  }, [currentBrand?.industry, selectedObjective]);

  const ctaSuggestions = useMemo(() => {
    return CTA_SUGGESTIONS[selectedObjective || ''] || CTA_SUGGESTIONS['awareness'];
  }, [selectedObjective]);

  const effectiveDuration = campaignDurationDays > 0 ? campaignDurationDays : parseInt(customDuration) || 14;
  const isEditing = !!initialData;
  const confirmStep = STEPS.length - 1;
  const showClarification = step === confirmStep && generatingStatus === 'idle' && (clarifying || clarificationQuestions || clarificationUnderstanding || nameIssue);
  const isGenerating = generatingStatus !== 'idle';
  const pillarEntries = Object.entries(pillarAllocation);
  const pillarTotal = pillarEntries.reduce((s, [, v]) => s + v, 0);

  // AI Preview computed values
  const estimatedPosts = useMemo(() => {
    if (selectedChannels.length === 0) return 0;
    // Per-week frequency → per-day rate, tính theo ngày thực tế (không round-up tuần)
    const freqPerWeek: Record<string, number> = { daily: 7, '3/week': 3, '2/week': 2, weekly: 1 };
    return selectedChannels.reduce((total, ch) => {
      const f = frequency[ch] || 'weekly';
      const perDay = (freqPerWeek[f] || 1) / 7;
      return total + Math.max(1, Math.round(effectiveDuration * perDay));
    }, 0);
  }, [selectedChannels, frequency, effectiveDuration]);

  // ─── Schedule Studio: build context + trigger preview ───
  const buildPreviewClarification = (): Record<string, any> => {
    const ctx: Record<string, any> = {};
    if (objectives.length > 0) {
      ctx.objectives = objectives;
      ctx.primary_objective = objectives[0];
      ctx.secondary_objectives = secondaryObjectives;
      ctx.objective = objectives[0];
      ctx.objective_weights = { primary: 0.7, secondary: 0.3 };
    }
    if (Object.keys(kpiTargets).length > 0) ctx.kpi_targets = kpiTargets;
    if (keyMessages.length > 0) ctx.key_messages = keyMessages;
    if (primaryCta.trim()) ctx.primary_cta = primaryCta.trim();
    if (Object.keys(pillarAllocation).length > 0) ctx.pillar_allocation = pillarAllocation;
    if (totalPostsTarget) ctx.total_posts_target = totalPostsTarget;
    if (totalBudget > 0) {
      ctx.total_budget = totalBudget;
      ctx.budget_allocation = budgetAllocation;
    }
    ctx.frequency = frequency;
    return ctx;
  };

  const triggerSchedulePreview = async () => {
    if (!currentOrganization?.id || selectedChannels.length === 0 || !name.trim()) return;
    setScheduleError(null);
    setScheduleStale(false);
    // Build per-channel targets from current frequency settings
    const freqPerWeek: Record<string, number> = { daily: 7, '3/week': 3, '2/week': 2, weekly: 1 };
    const perChannelTargets: Record<string, number> = {};
    selectedChannels.forEach(ch => {
      const perDay = (freqPerWeek[frequency[ch] || 'weekly'] || 1) / 7;
      perChannelTargets[ch] = Math.max(1, Math.round(effectiveDuration * perDay));
    });
    const res = await previewSchedule.run({
      campaign_title: name.trim(),
      campaign_description: description.trim() || undefined,
      target_channels: selectedChannels,
      campaign_duration_days: effectiveDuration,
      campaign_start_date: campaignStartDate,
      brand_template_id: brandTemplateId || undefined,
      clarification_context: buildPreviewClarification(),
      organization_id: currentOrganization.id,
      target_post_count: estimatedPosts > 0 ? estimatedPosts : undefined,
      per_channel_targets: Object.keys(perChannelTargets).length > 0 ? perChannelTargets : undefined,
    });
    if (res?.plan) {
      setEditableSchedule(res.plan);
      setScheduleAutoTriggered(true);
    } else {
      setScheduleError(previewSchedule.error || 'Không tạo được lịch');
      setScheduleAutoTriggered(true);
    }
  };

  // ─── Effects ───
  useEffect(() => {
    if (currentBrand?.content_pillars && (currentBrand.content_pillars as any[]).length > 0 && Object.keys(pillarAllocation).length === 0) {
      const pillars = currentBrand.content_pillars as { name: string }[];
      const evenSplit = Math.floor(100 / pillars.length);
      const remainder = 100 - evenSplit * pillars.length;
      const initial: Record<string, number> = {};
      pillars.forEach((p, i) => { initial[p.name] = evenSplit + (i === 0 ? remainder : 0); });
      setPillarAllocation(initial);
    }
  }, [currentBrand]);

  useEffect(() => {
    if (open && initialData) {
      setName(initialData.name);
      setDescription(initialData.description || '');
      setSelectedChannels(initialData.target_channels || []);
      setFrequency(initialData.frequency || {});
      setAutonomyLevel(initialData.autonomy_level);
      setBrandTemplateId(initialData.brand_template_id || '');
      setCampaignId(initialData.campaign_id || undefined);
      setCampaignDurationDays(initialData.campaign_duration_days || 14);
      setCampaignStartDate(initialData.campaign_start_date || new Date().toISOString().split('T')[0]);
      setApprovalMode(initialData.approval_mode || 'approve_plan');
      // Rehydrate objectives from clarification_context (multi or legacy single)
      const ctx = (initialData as any).clarification_context || {};
      if (Array.isArray(ctx.objectives) && ctx.objectives.length > 0) {
        setObjectives(ctx.objectives.slice(0, 3));
      } else if (typeof ctx.objective === 'string' && ctx.objective) {
        setObjectives([ctx.objective]);
      }
      setStep(0);
    } else if (open && !initialData) {
      resetForm();
    }
  }, [open, initialData]);

  useEffect(() => {
    if (open && currentBrand && !brandTemplateId) setBrandTemplateId(currentBrand.id);
  }, [open, currentBrand]);

  // Apply workspace default autonomy on open (only when creating new, not editing)
  useEffect(() => {
    if (open && !initialData && defaultAutonomyLevel) {
      setAutonomyLevel(defaultAutonomyLevel);
      setApprovalMode(AUTONOMY_TO_APPROVAL[defaultAutonomyLevel] || 'full_auto');
    }
  }, [open, initialData, defaultAutonomyLevel]);

  // Auto-trigger schedule preview when entering Step Xác nhận lần đầu
  useEffect(() => {
    if (
      step === STEPS.length - 1 &&
      !scheduleAutoTriggered &&
      editableSchedule === null &&
      selectedChannels.length > 0 &&
      !previewSchedule.loading &&
      generatingStatus === 'idle'
    ) {
      void triggerSchedulePreview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Mark stale when channels/frequency/duration thay đổi sau khi đã có schedule
  useEffect(() => {
    if (editableSchedule && editableSchedule.length > 0) setScheduleStale(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(selectedChannels), JSON.stringify(frequency), effectiveDuration, campaignStartDate]);

  // ─── Handlers ───
  const resetForm = () => {
    setStep(0);
    setName(''); setDescription('');
    setObjectives([]); setKpiTargets({});
    setTotalBudget(0); setBudgetAllocation({ content: 50, ads: 30, kol: 20 });
    setKeyMessages([]); setKeyMessageInput(''); setPrimaryCta('');
    setPillarAllocation({});
    setCampaignDurationDays(14); setCustomDuration(''); setTotalPostsTarget('');
    setCampaignStartDate(new Date().toISOString().split('T')[0]);
    setSelectedChannels([]); setFrequency({});
    setAutonomyLevel(defaultAutonomyLevel || 'full_auto'); setApprovalMode(AUTONOMY_TO_APPROVAL[defaultAutonomyLevel || 'full_auto'] || 'full_auto');
    setAutoApproveEnabled(false); setThresholdQuality(70); setThresholdRiskMax(30); setThresholdGeo(60);
    setBrandVoiceThreshold(70); setLearningSpeed('balanced');
    setBrandTemplateId(currentBrand?.id || ''); setCampaignId(undefined);
    setGeneratingStatus('idle'); setGenerationResult(null); setGenerationError(null);
    setClarifying(false); setClarificationQuestions(null); setClarificationUnderstanding(null); setClarificationContext(null); setNameIssue(null);
    setAutoMode(false); setAutoChannelMode(false); setAutoStrategyMode(false);
    setAiObjectiveIds(new Set()); setAiKpiKeys(new Set()); setAiChannelIds(new Set());
    setAiReasoning(''); setAiChannelReasoning(''); setAiStrategyReasoning('');
    setAiStrategyKeys({ keyMessages: new Set(), cta: false, budget: false, pillars: false, posts: false });
    setAutoPilotRunning(false); setAutoPilotStage('idle');
    setEditableSchedule(null); setScheduleError(null); setScheduleAutoTriggered(false); setScheduleStale(false);
  };

  const addKeyMessage = () => {
    const msg = keyMessageInput.trim();
    if (msg && keyMessages.length < 5 && !keyMessages.includes(msg)) {
      setKeyMessages([...keyMessages, msg]);
      setKeyMessageInput('');
    }
  };

  const addSuggestion = (suggestion: string) => {
    if (keyMessages.length < 5 && !keyMessages.includes(suggestion)) setKeyMessages([...keyMessages, suggestion]);
  };

  const handlePillarChange = (pillarName: string, newValue: number) => {
    const pillars = Object.keys(pillarAllocation);
    if (pillars.length <= 1) return;
    const others = pillars.filter(p => p !== pillarName);
    const diff = newValue - pillarAllocation[pillarName];
    const totalOthers = others.reduce((s, p) => s + pillarAllocation[p], 0);
    const updated = { ...pillarAllocation, [pillarName]: newValue };
    others.forEach(p => {
      const ratio = totalOthers > 0 ? pillarAllocation[p] / totalOthers : 1 / others.length;
      updated[p] = Math.max(0, Math.round(pillarAllocation[p] - diff * ratio));
    });
    const sum = Object.values(updated).reduce((s, v) => s + v, 0);
    if (sum !== 100 && others.length > 0) updated[others[0]] += 100 - sum;
    setPillarAllocation(updated);
  };

  const handleBudgetChange = (key: 'content' | 'ads' | 'kol', newValue: number) => {
    const keys: ('content' | 'ads' | 'kol')[] = ['content', 'ads', 'kol'];
    const others = keys.filter(k => k !== key);
    const diff = newValue - budgetAllocation[key];
    const totalOthers = others.reduce((s, k) => s + budgetAllocation[k], 0);
    const updated = { ...budgetAllocation, [key]: newValue };
    others.forEach(k => {
      const ratio = totalOthers > 0 ? budgetAllocation[k] / totalOthers : 1 / others.length;
      (updated as any)[k] = Math.max(0, Math.round(budgetAllocation[k] - diff * ratio));
    });
    const sum = updated.content + updated.ads + updated.kol;
    if (sum !== 100) (updated as any)[others[0]] += 100 - sum;
    setBudgetAllocation(updated);
  };

  const toggleChannel = (ch: string) => {
    if (selectedChannels.includes(ch)) {
      setSelectedChannels(selectedChannels.filter(c => c !== ch));
      const newFreq = { ...frequency }; delete newFreq[ch]; setFrequency(newFreq);
    } else {
      setSelectedChannels([...selectedChannels, ch]);
      setFrequency({ ...frequency, [ch]: 'weekly' });
    }
  };

  // ─── Auto-strategy runner ───
  const runAutoStrategy = async (overrides?: { objectives?: string[]; channels?: string[] }) => {
    const useObjs = overrides?.objectives ?? objectives;
    const useChs = overrides?.channels ?? selectedChannels;
    if (useObjs.length === 0) {
      toast.error('Cần có mục tiêu trước khi gợi ý chiến lược');
      return false;
    }
    try {
      const result = await suggestStrategy.mutateAsync({
        title: name,
        description,
        objectives: useObjs,
        target_channels: useChs,
        campaign_duration_days: effectiveDuration,
        brand_template_id: brandTemplateId || currentBrand?.id,
        organization_id: currentOrganization?.id,
      });
      const filledMsgs = new Set<string>();
      setKeyMessages(prev => {
        const merged = [...prev];
        result.key_messages.forEach(m => {
          if (!merged.includes(m) && merged.length < 5) {
            merged.push(m);
            filledMsgs.add(m);
          }
        });
        return merged;
      });
      let ctaFilled = false;
      if (!primaryCta.trim() && result.primary_cta) {
        setPrimaryCta(result.primary_cta);
        ctaFilled = true;
      }
      let budgetFilled = false;
      if (totalBudget === 0 || (budgetAllocation.content === 50 && budgetAllocation.ads === 30 && budgetAllocation.kol === 20)) {
        setBudgetAllocation(result.budget_allocation);
        budgetFilled = true;
      }
      let pillarsFilled = false;
      if (Object.keys(result.pillar_allocation).length > 0 && Object.keys(pillarAllocation).length === 0) {
        setPillarAllocation(result.pillar_allocation);
        pillarsFilled = true;
      }
      let postsFilled = false;
      if (totalPostsTarget === '' || totalPostsTarget === 0) {
        setTotalPostsTarget(result.total_posts_target);
        postsFilled = true;
      }
      setAiStrategyKeys({
        keyMessages: filledMsgs,
        cta: ctaFilled,
        budget: budgetFilled,
        pillars: pillarsFilled,
        posts: postsFilled,
      });
      setAiStrategyReasoning(result.reasoning || '');
      toast.success('AI đã gợi ý chiến lược', { description: result.reasoning });
      return true;
    } catch (err: any) {
      const msg = String(err?.message || '');
      if (msg.includes('429')) toast.error('AI quá tải, thử lại sau');
      else if (msg.includes('402')) toast.error('Hết credit AI, nạp thêm để dùng tiếp');
      else toast.error('AI gợi ý chiến lược thất bại', { description: msg });
      return false;
    }
  };

  const clearAutoStrategy = () => {
    setKeyMessages(prev => prev.filter(m => !aiStrategyKeys.keyMessages.has(m)));
    if (aiStrategyKeys.cta) setPrimaryCta('');
    if (aiStrategyKeys.budget) setBudgetAllocation({ content: 50, ads: 30, kol: 20 });
    if (aiStrategyKeys.pillars) setPillarAllocation({});
    if (aiStrategyKeys.posts) setTotalPostsTarget('');
    setAiStrategyKeys({ keyMessages: new Set(), cta: false, budget: false, pillars: false, posts: false });
    setAiStrategyReasoning('');
  };

  // ─── Master Auto-Pilot ───
  const runAutoPilot = async () => {
    if (!name.trim() && !description.trim()) {
      toast.error('Cần có tên hoặc mô tả chiến dịch trước');
      return;
    }
    if (nameQuality.status === 'gibberish') {
      toast.error('Tên chiến dịch không rõ nghĩa', {
        description: nameQuality.reason || 'Đặt tên cụ thể hơn (sản phẩm, đối tượng, thời điểm) để AI hiểu đúng.',
      });
      return;
    }
    setAutoPilotRunning(true);
    try {
      // 1. Objectives
      setAutoPilotStage('objectives');
      setAutoMode(true);
      const objResult = await suggestObjectives.mutateAsync({
        title: name,
        description,
        channels: selectedChannels,
        brand_template_id: brandTemplateId || currentBrand?.id,
        brand_name: currentBrand?.brand_name,
        industry: Array.isArray(currentBrand?.industry) ? currentBrand.industry[0] : (currentBrand?.industry as string | undefined),
        organization_id: currentOrganization?.id,
      });
      const aiIds = objResult.objectives.slice(0, 3);
      setObjectives(aiIds);
      setAiObjectiveIds(new Set(aiIds));
      setKpiTargets(prev => {
        const next = { ...prev };
        const filled: string[] = [];
        Object.entries(objResult.kpis).forEach(([k, v]) => {
          if (next[k] === undefined || next[k] === 0) {
            next[k] = v as number;
            filled.push(k);
          }
        });
        setAiKpiKeys(new Set(filled));
        return next;
      });
      setAiReasoning(objResult.reasoning || '');

      // 2. Channels
      setAutoPilotStage('channels');
      setAutoChannelMode(true);
      const chResult = await suggestChannels.mutateAsync({
        title: name,
        description,
        objectives: aiIds,
        brand_template_id: brandTemplateId || currentBrand?.id,
        brand_name: currentBrand?.brand_name,
        industry: Array.isArray(currentBrand?.industry) ? currentBrand.industry[0] : (currentBrand?.industry as string | undefined),
        organization_id: currentOrganization?.id,
      });
      const chIds = chResult.channels.map(c => c.id);
      setSelectedChannels(prev => Array.from(new Set([...prev, ...chIds])));
      setFrequency(prev => {
        const next = { ...prev };
        chResult.channels.forEach(c => { if (!next[c.id]) next[c.id] = c.frequency; });
        return next;
      });
      setAiChannelIds(new Set(chIds));
      setAiChannelReasoning(chResult.reasoning || '');

      // 3. Strategy (dùng kết quả vừa lấy)
      setAutoPilotStage('strategy');
      setAutoStrategyMode(true);
      await runAutoStrategy({ objectives: aiIds, channels: chIds });

      // 4. Done → nhảy thẳng tới Step Xác nhận
      setAutoPilotStage('done');
      setStep(confirmStep);
      toast.success('🪄 AI đã hoàn tất! Review và xác nhận chiến dịch.');
    } catch (err: any) {
      const msg = String(err?.message || '');
      if (msg.includes('429')) toast.error('AI quá tải, thử lại sau');
      else if (msg.includes('402')) toast.error('Hết credit AI, nạp thêm để dùng tiếp');
      else toast.error('Auto-pilot thất bại', { description: msg });
    } finally {
      setAutoPilotRunning(false);
    }
  };

  const canNext = () => {
    switch (step) {
      case 0: return name.trim().length > 0 && objectives.length > 0;
      case 1: return true; // Strategy step optional
      case 2: return selectedChannels.length > 0;
      default: return true;
    }
  };

  const handleConfirmStep = async () => {
    // Client-side smart skip: if strategic context already complete AND name is OK → bypass AI clarify
    const hasObjective = objectives.length > 0;
    const hasMessagesOrCta = keyMessages.length > 0 || !!primaryCta.trim();
    const hasPillars = Object.keys(pillarAllocation).length > 0;
    const hasGoodTitle = name.trim().length > 15;
    const hasDescription = description.trim().length > 20;
    const nameOk = nameQuality.status === 'ok';
    if (nameOk && hasObjective && (hasMessagesOrCta || hasPillars) && (hasGoodTitle || hasDescription)) {
      finalSubmit(null);
      return;
    }

    setClarifying(true); setClarificationQuestions(null); setClarificationUnderstanding(null); setNameIssue(null);
    try {
      const { data, error } = await supabase.functions.invoke('clarify-campaign-intent', {
        body: {
          title: name.trim(),
          description: description.trim() || undefined,
          industry: currentBrand?.industry || undefined,
          channels: selectedChannels,
          brand_name: currentBrand?.brand_name || undefined,
          // Strategic context from earlier wizard steps
          objective: selectedObj?.label,
          objectives: objectives.map(id => OBJECTIVES.find(o => o.id === id)?.label || id),
          primary_objective: selectedObj?.label,
          objective_ids: objectives,
          key_messages: keyMessages,
          primary_cta: primaryCta.trim() || undefined,
          pillars: Object.keys(pillarAllocation),
          kpi_targets: kpiTargets,
          total_posts_target: totalPostsTarget || undefined,
          duration_days: effectiveDuration,
        },
      });
      if (error) throw error;
      // Name issue takes priority — show suggestion UI before normal clarification
      if (data?.name_issue && Array.isArray(data?.suggested_names) && data.suggested_names.length > 0) {
        setNameIssue({
          issue: data.name_issue,
          reason: data.name_issue_reason || 'Tên chiến dịch có thể chưa phản ánh đúng nội dung.',
          suggestions: data.suggested_names.slice(0, 3),
        });
      } else if (data?.ready) {
        setClarificationUnderstanding(data.understanding || `Tạo nội dung về "${name}"`);
        setTimeout(() => finalSubmit(null), 1200);
      } else if (data?.questions?.length > 0) {
        setClarificationQuestions(data.questions);
      } else {
        finalSubmit(null);
      }
    } catch (e) {
      console.error('Clarification error:', e);
      finalSubmit(null);
    } finally {
      setClarifying(false);
    }
  };

  // On-demand: ask AI for 3 suggested names from current brief, used by the inline alert
  const fetchNameSuggestions = async () => {
    if (suggestingNames) return;
    setSuggestingNames(true);
    try {
      const { data, error } = await supabase.functions.invoke('clarify-campaign-intent', {
        body: {
          title: name.trim() || 'untitled',
          description: description.trim() || undefined,
          industry: currentBrand?.industry || undefined,
          channels: selectedChannels,
          brand_name: currentBrand?.brand_name || undefined,
          objectives: objectives.map(id => OBJECTIVES.find(o => o.id === id)?.label || id),
          primary_objective: selectedObj?.label,
          key_messages: keyMessages,
          primary_cta: primaryCta.trim() || undefined,
          pillars: Object.keys(pillarAllocation),
        },
      });
      if (error) throw error;
      if (Array.isArray(data?.suggested_names) && data.suggested_names.length > 0) {
        setNameIssue({
          issue: data.name_issue || 'vague',
          reason: data.name_issue_reason || nameQuality.reason || 'Đặt tên cụ thể hơn để AI hiểu đúng.',
          suggestions: data.suggested_names.slice(0, 3),
        });
      } else {
        toast.info('AI chưa có gợi ý tốt hơn', { description: 'Hãy bổ sung mô tả ngắn để AI hiểu hơn.' });
      }
    } catch (e: any) {
      toast.error('Không lấy được gợi ý', { description: String(e?.message || e) });
    } finally {
      setSuggestingNames(false);
    }
  };

  const finalSubmit = async (context: Record<string, string> | null) => {
    const baseContext = context || clarificationContext || {};
    const briefContext: Record<string, any> = { ...baseContext };
    if (objectives.length > 0) {
      briefContext.objectives = objectives;                              // ['awareness','engagement']
      briefContext.primary_objective = objectives[0];                    // 'awareness'
      briefContext.secondary_objectives = secondaryObjectives;           // ['engagement']
      briefContext.objective = objectives[0];                            // backward-compat
      briefContext.objective_weights = { primary: 0.7, secondary: 0.3 };
    }
    if (Object.keys(kpiTargets).length > 0) briefContext.kpi_targets = kpiTargets;
    if (totalBudget > 0) briefContext.total_budget = totalBudget;
    briefContext.budget_allocation = budgetAllocation;
    if (keyMessages.length > 0) briefContext.key_messages = keyMessages;
    if (primaryCta.trim()) briefContext.primary_cta = primaryCta.trim();
    if (totalPostsTarget) briefContext.total_posts_target = totalPostsTarget;
    if (Object.keys(pillarAllocation).length > 0) briefContext.pillar_allocation = pillarAllocation;
    briefContext.brand_voice_threshold = brandVoiceThreshold;
    briefContext.learning_speed = learningSpeed;
    if (autoApproveEnabled) {
      briefContext.auto_approve_rules = { enabled: true, min_quality: thresholdQuality, max_risk: thresholdRiskMax, min_geo: thresholdGeo };
    }
    const hasContext = Object.keys(briefContext).length > 0;
    const submitData: GoalSubmitData = {
      name: name.trim(),
      description: description.trim() || undefined,
      target_topics: [],
      target_channels: selectedChannels,
      frequency,
      autonomy_level: autonomyLevel,
      brand_template_id: brandTemplateId || undefined,
      campaign_id: campaignId || undefined,
      clarification_context: hasContext ? briefContext as any : undefined,
      campaign_duration_days: effectiveDuration,
      campaign_start_date: campaignStartDate,
      approval_mode: approvalMode,
    };

    // Start generating flow inside dialog
    setGeneratingStatus('saving');
    setGenerationError(null);
    setGenerationResult(null);

    try {
      const goalId = await onSaveGoal(submitData);
      setGeneratingStatus('generating');
      
      const result = await onGenerateStrategy(goalId, {
        name: submitData.name,
        description: submitData.description,
        target_channels: submitData.target_channels,
        campaign_duration_days: submitData.campaign_duration_days,
        campaign_start_date: submitData.campaign_start_date,
        approval_mode: submitData.approval_mode,
        brand_template_id: submitData.brand_template_id,
        clarification_context: submitData.clarification_context,
        pre_generated_plan:
          editableSchedule && editableSchedule.length > 0 && !scheduleStale
            ? editableSchedule
            : undefined,
      });
      
      setGenerationResult({ ...result, goal_name: name.trim() });
      setGeneratingStatus('done');
    } catch (e: any) {
      console.error('Campaign generation error:', e);
      setGenerationError(e?.message || 'Đã xảy ra lỗi');
      setGeneratingStatus('error');
    }
  };

  const handleClarificationSubmit = (answers: Record<string, string>) => { setClarificationContext(answers); finalSubmit(answers); };
  const handleClarificationSkip = () => { finalSubmit(null); };

  const selectedObj = OBJECTIVES.find(o => o.id === selectedObjective);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden" onInteractOutside={(e) => { if (isGenerating) e.preventDefault(); }}>
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Sparkles className="w-4 h-4 text-primary" />
            {isGenerating ? 'Đang tạo chiến dịch...' : isEditing ? 'Chỉnh sửa Campaign' : 'Tạo AI Campaign'}
          </DialogTitle>
        </DialogHeader>

        {/* Step indicator — hide when generating */}
        {!isGenerating && (
          <div className="flex items-center gap-1 px-5 pb-4">
            {STEPS.map((s, i) => (
              <div key={i} className="flex items-center gap-1 flex-1">
                <button
                  onClick={() => i < step && setStep(i)}
                  className={cn(
                    "flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full transition-all",
                    i === step ? "bg-primary text-primary-foreground" :
                    i < step ? "bg-primary/10 text-primary cursor-pointer" :
                    "bg-muted text-muted-foreground"
                  )}
                >
                  {i < step ? <Check className="w-3 h-3" /> : <s.icon className="w-3 h-3" />}
                  <span className="hidden sm:inline">{s.label}</span>
                </button>
                {i < STEPS.length - 1 && (
                  <div className={cn("h-px flex-1", i < step ? "bg-primary/30" : "bg-border")} />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Step content */}
        <div className="px-5 pb-5 min-h-[200px] max-h-[55vh] overflow-y-auto">

          {/* ═══ Generating Progress UI ═══ */}
          {isGenerating && (
            <div className="space-y-6 py-4">
              {/* Progress Steps */}
              <div className="relative pl-8">
                {/* Vertical line */}
                <div className="absolute left-[11px] top-3 bottom-3 w-px bg-border" />
                
                <div className="space-y-4">
                  {/* Step 1: Save goal */}
                  <div className="relative flex items-start gap-3">
                    <div className="absolute -left-8 mt-0.5 flex items-center justify-center">
                      <div className={cn(
                        "h-[22px] w-[22px] rounded-full flex items-center justify-center transition-all duration-500",
                        generatingStatus === 'saving' ? "bg-primary/20 border-2 border-primary" : "bg-primary text-primary-foreground"
                      )}>
                        {generatingStatus === 'saving' ? (
                          <Loader2 className="h-3 w-3 animate-spin text-primary" />
                        ) : (
                          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }}>
                            <Check className="h-3 w-3" />
                          </motion.div>
                        )}
                      </div>
                    </div>
                    <div className={cn(
                      "flex items-center gap-2 py-1.5 px-3 rounded-lg text-sm transition-all",
                      generatingStatus === 'saving' ? "bg-primary/5 text-primary font-medium" : "text-muted-foreground"
                    )}>
                      <Save className="h-3.5 w-3.5" />
                      <span>Lưu campaign goal</span>
                    </div>
                  </div>

                  {/* Step 2: Generate strategy */}
                  <div className="relative flex items-start gap-3">
                    <div className="absolute -left-8 mt-0.5 flex items-center justify-center">
                      <div className={cn(
                        "h-[22px] w-[22px] rounded-full flex items-center justify-center transition-all duration-500",
                        generatingStatus === 'saving' && "bg-muted border border-border",
                        generatingStatus === 'generating' && "bg-primary/20 border-2 border-primary",
                        (generatingStatus === 'done' || generatingStatus === 'error') && (generatingStatus === 'done' ? "bg-primary text-primary-foreground" : "bg-destructive text-destructive-foreground")
                      )}>
                        {generatingStatus === 'saving' ? (
                          <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
                        ) : generatingStatus === 'generating' ? (
                          <Loader2 className="h-3 w-3 animate-spin text-primary" />
                        ) : generatingStatus === 'done' ? (
                          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }}>
                            <Check className="h-3 w-3" />
                          </motion.div>
                        ) : (
                          <AlertCircle className="h-3 w-3" />
                        )}
                      </div>
                    </div>
                    <div className={cn(
                      "flex items-center gap-2 py-1.5 px-3 rounded-lg text-sm transition-all",
                      generatingStatus === 'generating' ? "bg-primary/5 text-primary font-medium" :
                      generatingStatus === 'done' ? "text-muted-foreground" :
                      generatingStatus === 'error' ? "text-destructive" :
                      "text-muted-foreground/50"
                    )}>
                      <Brain className="h-3.5 w-3.5" />
                      <span>AI đang lên kế hoạch nội dung</span>
                    </div>
                  </div>

                  {/* Step 3: Complete */}
                  <div className="relative flex items-start gap-3">
                    <div className="absolute -left-8 mt-0.5 flex items-center justify-center">
                      <div className={cn(
                        "h-[22px] w-[22px] rounded-full flex items-center justify-center transition-all duration-500",
                        generatingStatus === 'done' ? "bg-primary text-primary-foreground" : "bg-muted border border-border"
                      )}>
                        {generatingStatus === 'done' ? (
                          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }}>
                            <CheckCircle2 className="h-3 w-3" />
                          </motion.div>
                        ) : (
                          <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
                        )}
                      </div>
                    </div>
                    <div className={cn(
                      "flex items-center gap-2 py-1.5 px-3 rounded-lg text-sm transition-all",
                      generatingStatus === 'done' ? "text-primary font-medium" : "text-muted-foreground/50"
                    )}>
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Hoàn tất</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Generating animation */}
              {generatingStatus === 'generating' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-center gap-2 text-xs text-muted-foreground"
                >
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                  <span>AI đang phân tích & lên lịch nội dung...</span>
                </motion.div>
              )}

              {/* Error state */}
              {generatingStatus === 'error' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 space-y-2"
                >
                  <div className="flex items-center gap-2 text-sm text-destructive font-medium">
                    <AlertCircle className="h-4 w-4" />
                    <span>Không thể tạo kế hoạch</span>
                  </div>
                  <p className="text-xs text-destructive/80">{generationError}</p>
                </motion.div>
              )}

              {/* Done state — results */}
              {generatingStatus === 'done' && generationResult && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="space-y-3"
                >
                  <div className="p-4 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/15 space-y-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                      <span className="text-sm font-semibold">Chiến dịch đã sẵn sàng!</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-center p-2 rounded-lg bg-background/60">
                        <p className="text-lg font-bold text-primary tabular-nums">
                          {generationResult.approval_mode === 'full_auto' 
                            ? generationResult.pipelines_created || 0
                            : generationResult.total_pieces || 0}
                        </p>
                        <p className="text-[9px] text-muted-foreground">
                          {generationResult.approval_mode === 'full_auto' ? 'Pipeline' : 'Bài viết'}
                        </p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-background/60">
                        <p className="text-lg font-bold text-primary tabular-nums">{selectedChannels.length}</p>
                        <p className="text-[9px] text-muted-foreground">Kênh</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-background/60">
                        <p className="text-lg font-bold text-primary tabular-nums">{effectiveDuration}</p>
                        <p className="text-[9px] text-muted-foreground">Ngày</p>
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground text-center">
                      {generationResult.approval_mode === 'full_auto' 
                        ? '🚀 Pipeline đã được tạo tự động và đang chạy.'
                        : '📋 Kế hoạch đã sẵn sàng để bạn xem và duyệt.'}
                    </p>
                  </div>
                </motion.div>
              )}
            </div>
          )}

          {/* ═══ Step 0: Mục tiêu ═══ */}
          {!isGenerating && step === 0 && (
            <TooltipProvider delayDuration={200}>
            <div className="space-y-4">
              {/* ─── Brief card ─── */}
              <section className="space-y-3 rounded-xl border border-border bg-card p-4 sm:p-5">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="campaign-name" className="text-xs font-medium">
                      Tên chiến dịch <span className="text-destructive">*</span>
                    </Label>
                    <span className={cn(
                      "text-[10px] tabular-nums",
                      name.length > 80 ? "text-destructive" : "text-muted-foreground"
                    )}>
                      {name.length}/80
                    </span>
                  </div>
                  <Input
                    id="campaign-name"
                    autoFocus
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="VD: Ra mắt serum vitamin C tháng 4"
                    maxLength={120}
                    className="h-11 text-base font-medium"
                  />
                </div>

                {/* ─── Name quality inline alert ─── */}
                {name.trim().length >= 3 && nameQuality.status !== 'ok' && (
                  <div className={cn(
                    "rounded-md border px-2.5 py-2 space-y-1.5",
                    nameQuality.status === 'gibberish'
                      ? "border-destructive/30 bg-destructive/5"
                      : "border-amber-500/30 bg-amber-500/5"
                  )}>
                    <div className="flex items-start gap-1.5">
                      <AlertCircle className={cn(
                        "w-3.5 h-3.5 mt-0.5 shrink-0",
                        nameQuality.status === 'gibberish' ? "text-destructive" : "text-amber-600 dark:text-amber-400"
                      )} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] leading-snug">
                          <span className="font-medium">
                            {nameQuality.status === 'gibberish' ? 'Tên chưa rõ nghĩa.' : 'Tên hơi chung chung.'}
                          </span>{' '}
                          <span className="text-muted-foreground">
                            {nameQuality.reason || 'Nên thêm sản phẩm, đối tượng hoặc thời điểm để AI hiểu đúng.'}
                          </span>
                        </p>
                      </div>
                    </div>
                    {nameIssue?.suggestions?.length ? (
                      <div className="flex flex-wrap gap-1 pl-5">
                        {nameIssue.suggestions.map((s, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => { setName(s); setNameIssue(null); }}
                            className="text-[10px] px-2 py-1 rounded-full border border-border bg-background hover:border-primary/50 hover:bg-primary/5 transition-colors"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="pl-5">
                        <button
                          type="button"
                          onClick={fetchNameSuggestions}
                          disabled={suggestingNames || (!name.trim() && !description.trim())}
                          className="text-[10px] inline-flex items-center gap-1 text-primary hover:underline disabled:opacity-50 disabled:no-underline"
                        >
                          {suggestingNames ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                          {suggestingNames ? 'AI đang gợi ý…' : 'Đề xuất tên với AI'}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="campaign-desc" className="text-xs font-medium">
                      Mô tả ngắn <span className="text-muted-foreground font-normal">(tuỳ chọn)</span>
                    </Label>
                    <span className={cn(
                      "text-[10px] tabular-nums",
                      description.length > 400 ? "text-destructive" : "text-muted-foreground"
                    )}>
                      {description.length}/400
                    </span>
                  </div>
                  <Textarea
                    id="campaign-desc"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Mục tiêu, đối tượng, USP, ưu đãi…"
                    maxLength={500}
                    rows={3}
                    className="text-sm resize-none"
                    aria-describedby="brief-hint"
                  />
                </div>

                <p id="brief-hint" className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                  <Lightbulb className="w-3 h-3 mt-0.5 shrink-0" />
                  <span>Brief càng rõ → AI làm càng đúng. Vài câu ngắn về mục tiêu, khách hàng và USP là đủ.</span>
                </p>
              </section>

              {/* ─── AI mode picker + action zone ─── */}
              <section className="space-y-3 rounded-xl border border-border bg-card p-4 sm:p-5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-medium">
                    Cách triển khai
                  </span>
                  {!name.trim() && !description.trim() && (
                    <span className="text-[10px] text-muted-foreground">Cần brief để bật AI</span>
                  )}
                </div>

                {/* Segmented mode picker */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {([
                    { id: 'auto' as const, icon: Wand2, title: 'AI tự chạy toàn bộ', desc: 'AI lo objective + kênh + kế hoạch. Bạn duyệt cuối.' },
                    { id: 'assist' as const, icon: Sparkles, title: 'Tự chọn từng bước', desc: 'AI gợi ý, bạn quyết định ở mỗi bước.' },
                  ]).map(({ id, icon: Icon, title, desc }) => {
                    const active = aiMode === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setAiMode(id)}
                        disabled={autoPilotRunning}
                        className={cn(
                          "text-left rounded-lg border p-3 transition-colors",
                          "hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          "disabled:opacity-60 disabled:cursor-not-allowed",
                          active ? "border-foreground/30 bg-accent/40" : "border-border bg-card"
                        )}
                      >
                        <div className="flex items-start gap-2.5">
                          <div className={cn(
                            "h-4 w-4 mt-0.5 rounded-full border-2 shrink-0 flex items-center justify-center",
                            active ? "border-foreground" : "border-muted-foreground/40"
                          )}>
                            {active && <div className="h-1.5 w-1.5 rounded-full bg-foreground" />}
                          </div>
                          <Icon className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold leading-tight">{title}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{desc}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Action zone */}
                <div className="pt-1">
                  {aiMode === 'auto' ? (
                    <div className="space-y-2.5">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="block">
                            <Button
                              onClick={() => runAutoPilot()}
                              disabled={autoPilotRunning || (!name.trim() && !description.trim())}
                              className="w-full h-11 gap-2"
                            >
                              {autoPilotRunning
                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                : <Wand2 className="w-4 h-4" />}
                              {autoPilotRunning ? 'AI đang chạy…' : 'Bắt đầu AI tự chạy'}
                              {!autoPilotRunning && <ArrowRight className="w-4 h-4" />}
                            </Button>
                          </span>
                        </TooltipTrigger>
                        {(!name.trim() && !description.trim()) && (
                          <TooltipContent side="top" className="text-[11px]">
                            Cần ít nhất tên hoặc mô tả chiến dịch
                          </TooltipContent>
                        )}
                      </Tooltip>

                      {autoPilotRunning && (
                        <div className="space-y-1.5 px-1">
                          {([
                            { key: 'objectives', label: 'Phân tích mục tiêu' },
                            { key: 'channels', label: 'Chọn kênh phù hợp' },
                            { key: 'strategy', label: 'Lên chiến lược nội dung' },
                          ] as const).map(({ key, label }) => {
                            const stages = ['objectives', 'channels', 'strategy', 'done'];
                            const currentIdx = stages.indexOf(autoPilotStage);
                            const myIdx = stages.indexOf(key);
                            const done = currentIdx > myIdx;
                            const active = currentIdx === myIdx;
                            return (
                              <div key={key} className="flex items-center gap-2 text-[11px]">
                                {done ? <Check className="w-3.5 h-3.5 text-foreground" /> :
                                 active ? <Loader2 className="w-3.5 h-3.5 animate-spin text-foreground" /> :
                                 <div className="w-3.5 h-3.5 rounded-full border border-muted-foreground/30" />}
                                <span className={cn(
                                  done ? "text-muted-foreground" :
                                  active ? "text-foreground font-medium" :
                                  "text-muted-foreground/60"
                                )}>
                                  {label}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2 rounded-lg bg-accent/30 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <Label htmlFor="auto-obj" className="text-[11px] font-medium cursor-pointer">
                          Để AI chọn mục tiêu giúp tôi
                        </Label>
                        <Switch
                          id="auto-obj"
                          checked={autoMode}
                          disabled={suggestObjectives.isPending || (!name.trim() && !description.trim())}
                          onCheckedChange={async (checked) => {
                            setAutoMode(checked);
                            if (!checked) {
                              setObjectives(prev => prev.filter(id => !aiObjectiveIds.has(id)));
                              setKpiTargets(prev => {
                                const next = { ...prev };
                                aiKpiKeys.forEach(k => { delete next[k]; });
                                return next;
                              });
                              setAiObjectiveIds(new Set());
                              setAiKpiKeys(new Set());
                              setAiReasoning('');
                              return;
                            }
                            try {
                              const result = await suggestObjectives.mutateAsync({
                                title: name,
                                description,
                                channels: selectedChannels,
                                brand_template_id: brandTemplateId || currentBrand?.id,
                                brand_name: currentBrand?.brand_name,
                                industry: Array.isArray(currentBrand?.industry)
                                  ? currentBrand.industry[0]
                                  : (currentBrand?.industry as string | undefined),
                                organization_id: currentOrganization?.id,
                              });
                              const aiIds = result.objectives.slice(0, 3);
                              setObjectives(aiIds);
                              setAiObjectiveIds(new Set(aiIds));
                              setKpiTargets(prev => {
                                const next = { ...prev };
                                const filled: string[] = [];
                                Object.entries(result.kpis).forEach(([k, v]) => {
                                  if (next[k] === undefined || next[k] === 0) {
                                    next[k] = v;
                                    filled.push(k);
                                  }
                                });
                                setAiKpiKeys(new Set(filled));
                                return next;
                              });
                              setAiReasoning(result.reasoning || '');
                              toast.success('AI đã gợi ý mục tiêu', { description: result.reasoning });
                            } catch (err: any) {
                              const msg = String(err?.message || '');
                              if (msg.includes('429')) toast.error('AI quá tải, thử lại sau');
                              else if (msg.includes('402')) toast.error('Hết credit AI, nạp thêm để dùng tiếp');
                              else toast.error('AI gợi ý thất bại', { description: msg });
                              setAutoMode(false);
                            }
                          }}
                        />
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        AI phân tích brief + brand để chọn 1 mục tiêu Chính + 1-2 phụ và đề xuất KPI.
                      </p>
                      {suggestObjectives.isPending && (
                        <div className="flex items-center gap-1.5 text-[11px] text-foreground">
                          <Loader2 className="w-3 h-3 animate-spin" /> Đang phân tích brief…
                        </div>
                      )}
                      {aiReasoning && !suggestObjectives.isPending && (
                        <div className="flex items-start gap-1.5 text-[11px] text-muted-foreground italic">
                          <Sparkles className="w-3 h-3 mt-0.5 shrink-0" />
                          <span>{aiReasoning}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </section>

              {/* ═══ Objective + KPI — chỉ hiện ở chế độ Assist ═══ */}
              {aiMode === 'assist' && (
                <>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Mục tiêu chiến dịch * <span className="text-muted-foreground font-normal">({objectives.length}/3)</span></Label>
                      {objectives.length > 1 && (
                        <span className="text-[9px] text-muted-foreground">Click mục tiêu đã chọn để đặt làm Chính</span>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Chọn tối đa 3 mục tiêu. Mục tiêu <span className="font-medium text-foreground">Chính</span> nhận 70% trọng số nội dung, phụ 30%.
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {OBJECTIVES.map(obj => {
                        const Icon = obj.icon;
                        const idx = objectives.indexOf(obj.id);
                        const isSelected = idx >= 0;
                        const isPrimary = idx === 0;
                        const isAiPick = aiObjectiveIds.has(obj.id);
                        return (
                          <button
                            key={obj.id}
                            onClick={() => {
                              setObjectives(prev => {
                                const i = prev.indexOf(obj.id);
                                if (i === 0) return prev.filter(x => x !== obj.id);
                                if (i > 0) return [obj.id, ...prev.filter(x => x !== obj.id)];
                                if (prev.length >= 3) { toast.warning('Tối đa 3 mục tiêu / chiến dịch'); return prev; }
                                return [...prev, obj.id];
                              });
                              setAiObjectiveIds(prev => {
                                const next = new Set(prev);
                                next.delete(obj.id);
                                return next;
                              });
                            }}
                            className={cn(
                              "relative flex items-start gap-2.5 p-3 rounded-lg border text-left transition-all",
                              isPrimary ? "border-primary bg-primary/10 ring-1 ring-primary/30" :
                              isSelected ? "border-primary/50 bg-primary/5" :
                              "border-border hover:border-primary/30"
                            )}
                          >
                            <Icon className={cn("w-4 h-4 mt-0.5 shrink-0", obj.color)} />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1 flex-wrap">
                                <p className="text-xs font-medium leading-tight">{obj.label}</p>
                                {isPrimary && (
                                  <span className="inline-flex items-center gap-0.5 text-[8px] font-semibold px-1 py-0.5 rounded bg-primary text-primary-foreground">
                                    <Star className="w-2 h-2 fill-current" />Chính
                                  </span>
                                )}
                                {isSelected && !isPrimary && (
                                  <span className="text-[8px] font-medium px-1 py-0.5 rounded bg-muted text-muted-foreground">Phụ</span>
                                )}
                                {isAiPick && isSelected && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="inline-flex items-center gap-0.5 text-[8px] font-medium px-1 py-0.5 rounded bg-muted text-muted-foreground">
                                        <Sparkles className="w-2 h-2" />AI
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="max-w-[220px] text-[10px]">
                                      {aiReasoning || 'AI đề xuất dựa trên brief của bạn'}
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                              <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{obj.description}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    {hasObjectiveConflict && (
                      <div className="flex items-start gap-1.5 p-2 rounded-md bg-amber-500/10 border border-amber-500/30">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                        <p className="text-[10px] text-amber-700 dark:text-amber-300 leading-tight">
                          <span className="font-medium">Awareness + Revenue</span> thường khó đạt cùng campaign (cold audience ít convert ngay). Cân nhắc tách 2 chiến dịch riêng.
                        </p>
                      </div>
                    )}
                  </div>

                  {selectedObj && (
                    <div className="space-y-2 p-3 rounded-lg bg-muted/50 border">
                      <div className="flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-primary" />
                        <Label className="text-xs">Chỉ tiêu (KPI) — tùy chọn</Label>
                      </div>
                      <p className="text-[10px] text-muted-foreground">Nhập con số mong muốn để AI đánh giá hiệu quả.</p>
                      <div className="grid grid-cols-2 gap-2">
                        {selectedObj.kpis.map(kpi => {
                          const isAiKpi = aiKpiKeys.has(kpi.key);
                          return (
                            <div key={kpi.key} className="space-y-1">
                              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                {kpi.label}
                                {isAiKpi && <Sparkles className="w-2.5 h-2.5 text-primary" />}
                              </span>
                              <Input
                                type="number"
                                value={kpiTargets[kpi.key] || ''}
                                onChange={e => {
                                  setKpiTargets({ ...kpiTargets, [kpi.key]: Number(e.target.value) });
                                  if (isAiKpi) {
                                    setAiKpiKeys(prev => {
                                      const next = new Set(prev);
                                      next.delete(kpi.key);
                                      return next;
                                    });
                                  }
                                }}
                                placeholder={kpi.placeholder}
                                className={cn("text-sm h-8", isAiKpi && "border-primary/40 bg-primary/5")}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
            </TooltipProvider>
          )}

          {/* ═══ Step 1: Chiến lược ═══ */}
          {!isGenerating && step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Chiến lược nội dung</Label>
                <Badge variant="outline" className="text-[9px] text-muted-foreground">Có thể bỏ qua</Badge>
              </div>
              <p className="text-[10px] text-muted-foreground -mt-2">
                Thêm thông tin để AI lên kế hoạch chính xác hơn. Bỏ trống = AI tự quyết.
              </p>

              {/* Auto-suggest strategy toggle */}
              <div className="flex items-start gap-3 p-3 rounded-lg border border-dashed border-primary/30 bg-primary/5">
                <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="auto-strat" className="text-xs font-medium cursor-pointer">
                      Để AI chọn chiến lược giúp tôi
                    </Label>
                    <Switch
                      id="auto-strat"
                      checked={autoStrategyMode}
                      disabled={suggestStrategy.isPending || objectives.length === 0}
                      onCheckedChange={async (checked) => {
                        setAutoStrategyMode(checked);
                        if (!checked) {
                          clearAutoStrategy();
                          return;
                        }
                        const ok = await runAutoStrategy();
                        if (!ok) setAutoStrategyMode(false);
                      }}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    AI sẽ gợi ý thông điệp, CTA, phân bổ ngân sách & pillar dựa trên mục tiêu + brand. Bạn có thể chỉnh tay.
                  </p>
                  {suggestStrategy.isPending && (
                    <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-primary">
                      <Loader2 className="w-3 h-3 animate-spin" /> Đang lên chiến lược…
                    </div>
                  )}
                  {aiStrategyReasoning && !suggestStrategy.isPending && (
                    <p className="text-[10px] text-muted-foreground italic mt-1.5">
                      <Sparkles className="w-2.5 h-2.5 inline mr-1 text-primary" />{aiStrategyReasoning}
                    </p>
                  )}
                </div>
              </div>

              {/* Duration & Posts Target */}
              <div className="space-y-3">
                <Label className="text-xs">Thời lượng chiến dịch</Label>
                <div className="grid grid-cols-3 gap-1.5">
                  {DURATION_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => { setCampaignDurationDays(opt.value); if (opt.value > 0) setCustomDuration(''); }}
                      className={cn(
                        "p-2 rounded-lg border text-center transition-all",
                        campaignDurationDays === opt.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                      )}
                    >
                      <p className="text-xs font-medium">{opt.label}</p>
                      <p className="text-[9px] text-muted-foreground">{opt.description}</p>
                    </button>
                  ))}
                </div>
                {campaignDurationDays === 0 && (
                  <div className="flex items-center gap-2">
                    <Input type="number" value={customDuration} onChange={e => setCustomDuration(e.target.value)} placeholder="Số ngày" className="text-sm w-24 h-8" min={3} max={365} />
                    <span className="text-xs text-muted-foreground">ngày</span>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2">
                    <Label className="text-[10px] text-muted-foreground whitespace-nowrap">Bắt đầu:</Label>
                    <Input type="date" value={campaignStartDate} onChange={e => setCampaignStartDate(e.target.value)} className="text-sm h-8 w-full" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-[10px] text-muted-foreground whitespace-nowrap">Số bài:</Label>
                    <Input
                      type="number"
                      value={totalPostsTarget}
                      onChange={e => setTotalPostsTarget(e.target.value ? parseInt(e.target.value) : '')}
                      placeholder="VD: 20"
                      className="text-sm h-8 w-full"
                      min={1}
                      max={500}
                    />
                  </div>
                </div>
                <p className="text-[9px] text-muted-foreground">Nhập số bài viết mong muốn để AI phân bổ lịch đăng phù hợp. Bỏ trống = AI tự tính.</p>
              </div>

              {/* Budget */}
              <div className="space-y-2">
                <Label className="text-xs">Ngân sách (tùy chọn)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={totalBudget || ''}
                    onChange={e => setTotalBudget(Number(e.target.value))}
                    placeholder="0"
                    className="text-sm h-8 flex-1"
                  />
                  <span className="text-xs text-muted-foreground shrink-0">VNĐ</span>
                </div>
                {totalBudget > 0 && (
                  <div className="space-y-2 p-3 rounded-lg bg-muted/50 border">
                    <p className="text-[10px] text-muted-foreground">Phân bổ ngân sách:</p>
                    {/* Stacked bar */}
                    <div className="h-2.5 rounded-full overflow-hidden flex bg-muted">
                      {(['content', 'ads', 'kol'] as const).map((key, i) => (
                        <div key={key} className="h-full transition-all duration-300" style={{ width: `${budgetAllocation[key]}%`, backgroundColor: BUDGET_COLORS[i] }} />
                      ))}
                    </div>
                    {([
                      { key: 'content' as const, label: 'Nội dung' },
                      { key: 'ads' as const, label: 'Quảng cáo' },
                      { key: 'kol' as const, label: 'KOL/Influencer' },
                    ]).map(({ key, label }, i) => (
                      <div key={key} className="space-y-0.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: BUDGET_COLORS[i] }} />
                            <span className="text-[10px]">{label}</span>
                          </div>
                          <span className="text-[10px] font-medium tabular-nums">{budgetAllocation[key]}%</span>
                        </div>
                        <Slider value={[budgetAllocation[key]]} min={0} max={100} step={5} onValueChange={([v]) => handleBudgetChange(key, v)} className="w-full" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Key Messages */}
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" /> Thông điệp chính
                  <span className="text-muted-foreground font-normal">({keyMessages.length}/5)</span>
                </Label>
                <p className="text-[10px] text-muted-foreground">Điều gì bạn muốn khách hàng nhớ nhất?</p>
                <div className="flex gap-1.5">
                  <Input
                    value={keyMessageInput}
                    onChange={e => setKeyMessageInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addKeyMessage())}
                    placeholder="VD: Tiết kiệm 30% chi phí..."
                    className="text-sm flex-1 h-8"
                    disabled={keyMessages.length >= 5}
                  />
                  <Button type="button" variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={addKeyMessage} disabled={!keyMessageInput.trim() || keyMessages.length >= 5}>
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
                {keyMessages.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {keyMessages.map((msg, i) => (
                      <Badge key={i} variant="secondary" className="text-[10px] gap-1 pr-1">
                        {msg}
                        <button onClick={() => setKeyMessages(keyMessages.filter((_, j) => j !== i))} className="hover:text-destructive"><X className="w-3 h-3" /></button>
                      </Badge>
                    ))}
                  </div>
                )}
                {keyMessages.length < 5 && (
                  <div className="space-y-1">
                    <div className="flex flex-wrap gap-1">
                      {industrySuggestions.filter(s => !keyMessages.includes(s)).slice(0, 8).map((s, i) => (
                        <button key={i} onClick={() => addSuggestion(s)} className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border border-dashed border-primary/30 text-primary hover:bg-primary/10 transition-colors">
                          <Plus className="w-2.5 h-2.5" />{s}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      Gợi ý theo {selectedObjective ? OBJECTIVES.find(o => o.id === selectedObjective)?.label?.toLowerCase() : 'ngành'} & thương hiệu
                    </p>
                  </div>
                )}
              </div>

              {/* CTA */}
              <div className="space-y-1.5">
                <Label className="text-xs">Kêu gọi hành động (CTA)</Label>
                <Input value={primaryCta} onChange={e => setPrimaryCta(e.target.value)} placeholder="VD: Đăng ký ngay, Mua ngay, Liên hệ..." className="text-sm h-8" />
                <div className="flex flex-wrap gap-1">
                  {ctaSuggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => setPrimaryCta(s)}
                      className={cn(
                        "inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border border-dashed transition-colors",
                        primaryCta === s
                          ? "bg-primary/15 border-primary text-primary"
                          : "border-primary/30 text-primary hover:bg-primary/10"
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Content Pillars */}
              {currentBrand?.content_pillars && (currentBrand.content_pillars as any[]).length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs">Tỷ lệ chủ đề nội dung</Label>
                  <div className="h-2.5 rounded-full overflow-hidden flex bg-muted">
                    {pillarEntries.map(([pName, pct], i) => (
                      <div key={pName} className="h-full transition-all duration-300" style={{ width: `${pct}%`, backgroundColor: PILLAR_COLORS[i % PILLAR_COLORS.length], opacity: pct > 0 ? 1 : 0 }} />
                    ))}
                  </div>
                  {pillarEntries.map(([pName, pct], i) => (
                    <div key={pName} className="space-y-0.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: PILLAR_COLORS[i % PILLAR_COLORS.length] }} />
                          <span className="text-[10px]">{pName}</span>
                        </div>
                        <span className="text-[10px] font-medium tabular-nums">{pct}%</span>
                      </div>
                      <Slider value={[pct]} min={0} max={100} step={5} onValueChange={([v]) => handlePillarChange(pName, v)} className="w-full" />
                    </div>
                  ))}
                  <div className={cn("text-[10px] font-medium text-right tabular-nums", pillarTotal === 100 ? "text-green-600" : "text-amber-500")}>
                    Tổng: {pillarTotal}%{pillarTotal === 100 && <Check className="w-3 h-3 inline ml-1" />}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══ Step 2: Kênh ═══ */}
          {!isGenerating && step === 2 && (
            <div className="space-y-4">
              <Label className="text-xs">Bạn muốn đăng bài ở đâu?</Label>
              <p className="text-[10px] text-muted-foreground mb-1">Chọn kênh mà bạn muốn AI tạo nội dung.</p>

              {/* Auto-suggest channels toggle */}
              <div className="flex items-start gap-3 p-3 rounded-lg border border-dashed border-primary/30 bg-primary/5">
                <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="auto-ch" className="text-xs font-medium cursor-pointer">
                      Để AI chọn kênh hợp lý
                    </Label>
                    <Switch
                      id="auto-ch"
                      checked={autoChannelMode}
                      disabled={suggestChannels.isPending || (!name.trim() && !description.trim())}
                      onCheckedChange={async (checked) => {
                        setAutoChannelMode(checked);
                        if (!checked) {
                          // Remove only AI-picked channels, keep user-added ones
                          setSelectedChannels(prev => prev.filter(id => !aiChannelIds.has(id)));
                          setFrequency(prev => {
                            const next = { ...prev };
                            aiChannelIds.forEach(id => { delete next[id]; });
                            return next;
                          });
                          setAiChannelIds(new Set());
                          setAiChannelReasoning('');
                          return;
                        }
                        try {
                          const result = await suggestChannels.mutateAsync({
                            title: name,
                            description,
                            objectives,
                            brand_template_id: brandTemplateId || currentBrand?.id,
                            brand_name: currentBrand?.brand_name,
                            industry: Array.isArray(currentBrand?.industry)
                              ? currentBrand.industry[0]
                              : (currentBrand?.industry as string | undefined),
                            organization_id: currentOrganization?.id,
                          });
                          const aiIds = result.channels.map(c => c.id);
                          setSelectedChannels(prev => Array.from(new Set([...prev, ...aiIds])));
                          setFrequency(prev => {
                            const next = { ...prev };
                            result.channels.forEach(c => {
                              if (!next[c.id]) next[c.id] = c.frequency;
                            });
                            return next;
                          });
                          setAiChannelIds(new Set(aiIds));
                          setAiChannelReasoning(result.reasoning || '');
                          toast.success('AI đã gợi ý kênh', { description: result.reasoning });
                        } catch (err: any) {
                          const msg = String(err?.message || '');
                          if (msg.includes('429')) toast.error('AI quá tải, thử lại sau');
                          else if (msg.includes('402')) toast.error('Hết credit AI, nạp thêm để dùng tiếp');
                          else toast.error('AI gợi ý thất bại', { description: msg });
                          setAutoChannelMode(false);
                        }
                      }}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    AI sẽ chọn 2–5 kênh phù hợp với mục tiêu & ngành nghề và đề xuất tần suất đăng. Bạn vẫn có thể chỉnh.
                  </p>
                  {suggestChannels.isPending && (
                    <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-primary">
                      <Loader2 className="w-3 h-3 animate-spin" /> Đang phân tích kênh phù hợp…
                    </div>
                  )}
                  {aiChannelReasoning && !suggestChannels.isPending && (
                    <p className="text-[10px] text-muted-foreground italic mt-1.5">
                      <Sparkles className="w-2.5 h-2.5 inline mr-1 text-primary" />{aiChannelReasoning}
                    </p>
                  )}
                </div>
              </div>

              {(['longform', 'social'] as const).map(group => {
                const items = AVAILABLE_CHANNELS.filter(c => c.group === group);
                return (
                  <div key={group} className="space-y-1.5">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                      {group === 'longform' ? '🌐 Website & Long-form' : '💬 Mạng xã hội'}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {items.map(ch => {
                        const selected = selectedChannels.includes(ch.id);
                        const isAiPick = aiChannelIds.has(ch.id);
                        return (
                          <button key={ch.id} onClick={() => toggleChannel(ch.id)} className={cn(
                            "flex items-center gap-2 p-2.5 rounded-lg border text-left text-sm transition-all relative",
                            selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/30",
                            isAiPick && selected && "ring-1 ring-primary/40"
                          )}>
                            <ChannelIcon channel={ch.channelKey} size={14} className={channelIconColors[ch.channelKey]} />
                            <span className="text-xs font-medium">{ch.label}</span>
                            {isAiPick && (
                              <Sparkles className="w-3 h-3 text-primary ml-auto shrink-0" />
                            )}
                            {selected && !isAiPick && <Check className="w-3.5 h-3.5 text-primary ml-auto" />}
                            {selected && isAiPick && <Check className="w-3 h-3 text-primary shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* (Step "Tự động" removed — autonomy is now configured globally in Workspace Settings) */}

          {/* ═══ Step 4: Xác nhận ═══ */}
          {!isGenerating && step === confirmStep && (() => {
            const startMs = new Date(campaignStartDate).getTime();
            const endDate = new Date(startMs + effectiveDuration * 86400000).toISOString().split('T')[0];
            const visualChannelIds = ['instagram', 'facebook', 'pinterest', 'threads'];
            const freqPerWeek: Record<string, number> = { daily: 7, '3/week': 3, '2/week': 2, weekly: 1 };
            const freqLabel: Record<string, string> = { daily: 'Mỗi ngày', '3/week': '3/tuần', '2/week': '2/tuần', weekly: 'Hàng tuần' };
            const estCarousels = selectedChannels
              .filter(ch => visualChannelIds.includes(ch))
              .reduce((sum, ch) => {
                const perDay = (freqPerWeek[frequency[ch] || 'weekly'] || 1) / 7;
                return sum + Math.max(1, Math.round(effectiveDuration * perDay));
              }, 0);
            const approvalLabel = APPROVAL_MODE_OPTIONS.find(o => o.value === approvalMode)?.label;
            const postsPerWeek = effectiveDuration > 0 ? Math.round((estimatedPosts / effectiveDuration) * 7) : 0;
            const weeks = Math.floor(effectiveDuration / 7);
            const remDays = effectiveDuration % 7;
            const durationLabel = weeks > 0 ? `${weeks} tuần${remDays > 0 ? ` ${remDays} ngày` : ''}` : `${effectiveDuration} ngày`;
            const fmtDate = (s: string) => {
              const d = new Date(s);
              return `${d.getDate()}/${d.getMonth() + 1}`;
            };
            const formatBudgetShort = (n: number) => {
              if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}tỷ`;
              if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}tr`;
              if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
              return String(n);
            };
            const getChannelPosts = (ch: string) => {
              const perDay = (freqPerWeek[frequency[ch] || 'weekly'] || 1) / 7;
              return Math.max(1, Math.round(effectiveDuration * perDay));
            };
            const weekMarkers = Math.max(1, Math.min(weeks, 12));
            const usedAI = autoMode || autoChannelMode || autoStrategyMode;
            const hasBudget = totalBudget > 0;
            const hasPillars = Object.keys(pillarAllocation).length > 0;
            const hasKpis = Object.keys(kpiTargets).filter(k => kpiTargets[k] > 0).length > 0;

            return (
              <div className="space-y-2.5">
                {/* Campaign title + description */}
                {(name.trim() || description.trim()) && (
                  <div className="space-y-0.5">
                    {name.trim() && <h3 className="text-sm font-semibold text-foreground truncate">{name}</h3>}
                    {description.trim() && <p className="text-[11px] text-muted-foreground line-clamp-2">{description}</p>}
                  </div>
                )}

                {/* Hero metric strip */}
                <div className="flex items-stretch gap-1.5 flex-wrap">
                  <div className="flex-1 min-w-[60px] flex flex-col items-center justify-center py-1.5 rounded-md bg-primary/5 border border-primary/10">
                    <p className="text-base font-bold text-primary tabular-nums leading-none">{estimatedPosts}</p>
                    <p className="text-[9px] text-muted-foreground mt-0.5">Bài viết</p>
                  </div>
                  <div className="flex-1 min-w-[60px] flex flex-col items-center justify-center py-1.5 rounded-md bg-primary/5 border border-primary/10">
                    <p className="text-base font-bold text-primary tabular-nums leading-none">{selectedChannels.length}</p>
                    <p className="text-[9px] text-muted-foreground mt-0.5">Kênh</p>
                  </div>
                  <div className="flex-1 min-w-[60px] flex flex-col items-center justify-center py-1.5 rounded-md bg-primary/5 border border-primary/10">
                    <p className="text-base font-bold text-primary tabular-nums leading-none">{effectiveDuration}</p>
                    <p className="text-[9px] text-muted-foreground mt-0.5">Ngày</p>
                  </div>
                  {estCarousels > 0 && (
                    <div className="flex-1 min-w-[60px] flex flex-col items-center justify-center py-1.5 rounded-md bg-primary/5 border border-primary/10">
                      <p className="text-base font-bold text-primary tabular-nums leading-none">{estCarousels}</p>
                      <p className="text-[9px] text-muted-foreground mt-0.5">Carousel</p>
                    </div>
                  )}
                  {postsPerWeek > 0 && (
                    <div className="flex-1 min-w-[60px] flex flex-col items-center justify-center py-1.5 rounded-md bg-muted/40 border border-border">
                      <p className="text-base font-bold text-foreground tabular-nums leading-none">{postsPerWeek}</p>
                      <p className="text-[9px] text-muted-foreground mt-0.5">Bài/tuần</p>
                    </div>
                  )}
                  {hasBudget && (
                    <div className="flex-1 min-w-[60px] flex flex-col items-center justify-center py-1.5 rounded-md bg-muted/40 border border-border">
                      <p className="text-base font-bold text-foreground tabular-nums leading-none">{formatBudgetShort(totalBudget)}</p>
                      <p className="text-[9px] text-muted-foreground mt-0.5">Ngân sách</p>
                    </div>
                  )}
                </div>

                {/* Timeline mini-bar */}
                <div className="rounded-md border bg-card px-2.5 py-2">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1.5">
                    <span className="font-medium text-foreground tabular-nums">{fmtDate(campaignStartDate)}</span>
                    <span className="text-[9px] uppercase tracking-wide">{durationLabel}</span>
                    <span className="font-medium text-foreground tabular-nums">{fmtDate(endDate)}</span>
                  </div>
                  <div className="relative h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/60 to-primary" />
                  </div>
                  {weeks > 0 && weeks <= 12 && (
                    <div className="flex justify-between mt-1 px-0.5">
                      {Array.from({ length: weekMarkers + 1 }).map((_, i) => (
                        <span key={i} className="text-[8px] text-muted-foreground/60 tabular-nums">W{i}</span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Mục tiêu & Brand */}
                <div className="rounded-lg border bg-card p-2.5 grid grid-cols-2 gap-x-3 gap-y-2 text-[11px]">
                  {selectedObj && (
                    <div className="flex items-start gap-1.5">
                      <selectedObj.icon className={cn("w-3.5 h-3.5 mt-0.5 shrink-0", selectedObj.color)} />
                      <div className="min-w-0">
                        <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Mục tiêu chính</p>
                        <p className="font-medium truncate">{selectedObj.label}</p>
                        {secondaryObjectives.length > 0 && (
                          <p className="text-[9px] text-muted-foreground truncate">
                            +{secondaryObjectives.length} phụ: {secondaryObjectives.map(id => OBJECTIVES.find(o => o.id === id)?.label).filter(Boolean).join(', ')}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-1.5">
                    {currentBrand ? (
                      <>
                        <div className="w-3.5 h-3.5 mt-0.5 shrink-0 rounded flex items-center justify-center text-[8px] font-bold text-primary-foreground" style={{ backgroundColor: currentBrand.primary_color || 'hsl(var(--primary))' }}>
                          {currentBrand.brand_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Brand</p>
                          <p className="font-medium truncate">{currentBrand.brand_name}</p>
                        </div>
                      </>
                    ) : (
                      <div className="min-w-0">
                        <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Brand</p>
                        <p className="text-muted-foreground italic">Chưa chọn</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Chiến lược nội dung */}
                {(keyMessages.length > 0 || primaryCta.trim() || hasBudget || hasPillars) && (
                  <div className="rounded-lg border bg-card p-2.5 space-y-2.5 text-[11px]">
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wide font-medium flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Chiến lược nội dung
                    </p>

                    {keyMessages.length > 0 && (
                      <div>
                        <p className="text-[9px] text-muted-foreground mb-1">Thông điệp ({keyMessages.length})</p>
                        <div className="flex flex-wrap gap-1">
                          {keyMessages.slice(0, 4).map((m, i) => <Badge key={i} variant="secondary" className="text-[9px] font-normal">{m}</Badge>)}
                          {keyMessages.length > 4 && <Badge variant="outline" className="text-[9px]">+{keyMessages.length - 4}</Badge>}
                        </div>
                      </div>
                    )}

                    {primaryCta.trim() && (
                      <div className="flex items-center gap-1.5">
                        <Zap className="w-3 h-3 text-amber-500 shrink-0" />
                        <span className="text-[9px] text-muted-foreground uppercase tracking-wide">CTA:</span>
                        <span className="font-medium truncate">{primaryCta}</span>
                      </div>
                    )}

                    {hasBudget && (
                      <div className="space-y-1.5 pt-1 border-t border-border/60">
                        <div className="flex items-center justify-between">
                          <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Ngân sách</p>
                          <p className="text-[10px] font-semibold tabular-nums">{totalBudget.toLocaleString('vi-VN')} đ</p>
                        </div>
                        {([
                          { key: 'content', label: 'Content', pct: budgetAllocation.content },
                          { key: 'ads', label: 'Ads', pct: budgetAllocation.ads },
                          { key: 'kol', label: 'KOL', pct: budgetAllocation.kol },
                        ] as const).map(row => row.pct > 0 && (
                          <div key={row.key} className="flex items-center gap-2">
                            <span className="w-12 text-[10px] text-muted-foreground shrink-0">{row.label}</span>
                            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                              <div className="h-full bg-primary" style={{ width: `${row.pct}%` }} />
                            </div>
                            <span className="w-8 text-right text-[10px] font-medium tabular-nums">{row.pct}%</span>
                            <span className="w-16 text-right text-[10px] text-muted-foreground tabular-nums">{formatBudgetShort(Math.round(totalBudget * row.pct / 100))}đ</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {hasPillars && (
                      <div className="space-y-1 pt-1 border-t border-border/60">
                        <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Content Pillars</p>
                        {Object.entries(pillarAllocation).map(([pillar, pct]) => pct > 0 && (
                          <div key={pillar} className="flex items-center gap-2">
                            <span className="flex-1 min-w-0 text-[10px] truncate">{pillar}</span>
                            <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                              <div className="h-full bg-primary/70" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="w-8 text-right text-[10px] font-medium tabular-nums">{pct}%</span>
                            <span className="w-12 text-right text-[10px] text-muted-foreground tabular-nums">~{Math.round(estimatedPosts * pct / 100)} bài</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Kênh & Tần suất */}
                {selectedChannels.length > 0 && (
                  <div className="rounded-lg border bg-card p-2.5 space-y-1.5">
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wide font-medium flex items-center gap-1">
                      <Radio className="w-3 h-3" /> Kênh & Tần suất
                    </p>
                    <div className="space-y-1">
                      {selectedChannels.map(ch => {
                        const info = AVAILABLE_CHANNELS.find(c => c.id === ch);
                        const freq = frequency[ch] || 'weekly';
                        const posts = getChannelPosts(ch);
                        return (
                          <div key={ch} className="flex items-center gap-2 text-[11px] py-0.5">
                            <ChannelIcon channel={info?.channelKey || 'website'} size={12} className={channelIconColors[info?.channelKey || 'website']} />
                            <span className="flex-1 min-w-0 truncate font-medium">{info?.label || ch}</span>
                            <Badge variant="outline" className="text-[9px] font-normal h-4 px-1.5">{freqLabel[freq]}</Badge>
                            <span className="text-[10px] text-muted-foreground tabular-nums w-14 text-right">~{posts} bài</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Lịch nội dung chi tiết — Studio */}
                {selectedChannels.length > 0 && (
                  <div className="rounded-lg border bg-card overflow-hidden">
                    <div className="flex items-center justify-between px-2.5 py-2 border-b">
                      <div className="flex items-center gap-1.5">
                        <CalendarDays className="w-3.5 h-3.5 text-primary" />
                        <span className="text-[11px] font-semibold">Lịch nội dung chi tiết</span>
                        {editableSchedule && (
                          <Badge variant="secondary" className="text-[9px] h-4 px-1.5 font-normal">
                            {editableSchedule.length} bài
                          </Badge>
                        )}
                        {scheduleStale && editableSchedule && (
                          <Badge variant="outline" className="text-[9px] h-4 px-1.5 font-normal border-amber-500/40 text-amber-700 dark:text-amber-300 bg-amber-500/10">
                            Cần làm mới
                          </Badge>
                        )}
                      </div>
                      {(scheduleStale || scheduleError) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-[10px] gap-1"
                          onClick={() => void triggerSchedulePreview()}
                          disabled={previewSchedule.loading}
                        >
                          <RefreshCw className={cn('w-3 h-3', previewSchedule.loading && 'animate-spin')} />
                          Sinh lại
                        </Button>
                      )}
                    </div>

                    {previewSchedule.loading && (
                      <div className="p-3 space-y-2">
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          <Loader2 className="w-3 h-3 animate-spin text-primary" />
                          <span>AI đang sinh ~{estimatedPosts} bài cho {selectedChannels.length} kênh…</span>
                        </div>
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className="h-7 rounded bg-muted/40 animate-pulse" />
                        ))}
                      </div>
                    )}

                    {!previewSchedule.loading && scheduleError && !editableSchedule && (
                      <div className="p-3 space-y-2">
                        <div className="flex items-start gap-2 text-[11px] text-destructive">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span>{scheduleError}</span>
                        </div>
                        <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => void triggerSchedulePreview()}>
                          <RefreshCw className="w-3 h-3 mr-1" /> Thử lại
                        </Button>
                      </div>
                    )}

                    {!previewSchedule.loading && editableSchedule && editableSchedule.length > 0 && currentOrganization?.id && (
                      <ContentScheduleStudio
                        pieces={editableSchedule}
                        onChange={setEditableSchedule}
                        onRegenerate={() => void triggerSchedulePreview()}
                        isGenerating={previewSchedule.loading}
                        channels={selectedChannels.map((id) => {
                          const info = AVAILABLE_CHANNELS.find((c) => c.id === id);
                          return { id, label: info?.label || id, channelKey: info?.channelKey || 'website' };
                        })}
                        pillars={Object.keys(pillarAllocation)}
                        startDate={campaignStartDate}
                        duration={effectiveDuration}
                        campaignTitle={name}
                        organizationId={currentOrganization.id}
                        brandTemplateId={brandTemplateId || undefined}
                        clarificationContext={buildPreviewClarification()}
                        error={scheduleError}
                      />
                    )}

                    {!previewSchedule.loading && !editableSchedule && !scheduleError && (
                      <div className="p-3 flex flex-col items-start gap-2">
                        <p className="text-[11px] text-muted-foreground">Chưa có lịch. Bấm để AI sinh đề xuất theo kênh + pillar đã chọn.</p>
                        <Button size="sm" className="h-7 text-[11px] gap-1" onClick={() => void triggerSchedulePreview()}>
                          <Sparkles className="w-3 h-3" /> Tạo lịch bằng AI
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {hasKpis && (
                  <div className="rounded-lg border bg-card p-2.5 space-y-1.5">
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wide font-medium flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" /> KPI Mục tiêu
                    </p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {Object.entries(kpiTargets).filter(([, v]) => v > 0).map(([key, val]) => {
                        const allKpis = OBJECTIVES.flatMap(o => o.kpis);
                        const meta = allKpis.find(k => k.key === key);
                        return (
                          <div key={key} className="flex items-center justify-between gap-1.5 px-2 py-1 rounded bg-muted/30 border border-border/60">
                            <span className="text-[10px] text-muted-foreground truncate">{meta?.label || key}</span>
                            <span className="text-[11px] font-semibold tabular-nums">{val.toLocaleString('vi-VN')}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* AI Reasoning panel */}
                {usedAI && (aiReasoning || aiChannelReasoning || aiStrategyReasoning) && (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-2.5 space-y-1.5">
                    <p className="text-[10px] font-medium flex items-center gap-1 text-primary">
                      <Sparkles className="w-3 h-3" /> AI đã đề xuất
                    </p>
                    <div className="space-y-1 text-[10px] leading-relaxed">
                      {aiReasoning && (
                        <div className="flex gap-1.5">
                          <Check className="w-3 h-3 text-primary shrink-0 mt-0.5" />
                          <p className="text-muted-foreground"><span className="font-medium text-foreground">Mục tiêu:</span> {aiReasoning}</p>
                        </div>
                      )}
                      {aiChannelReasoning && (
                        <div className="flex gap-1.5">
                          <Check className="w-3 h-3 text-primary shrink-0 mt-0.5" />
                          <p className="text-muted-foreground"><span className="font-medium text-foreground">Kênh:</span> {aiChannelReasoning}</p>
                        </div>
                      )}
                      {aiStrategyReasoning && (
                        <div className="flex gap-1.5">
                          <Check className="w-3 h-3 text-primary shrink-0 mt-0.5" />
                          <p className="text-muted-foreground"><span className="font-medium text-foreground">Chiến lược:</span> {aiStrategyReasoning}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Clarification understanding callout */}
                {!showClarification && clarificationUnderstanding && (
                  <div className="rounded-md border border-blue-500/20 bg-blue-500/5 px-2.5 py-1.5 flex items-start gap-1.5">
                    <Brain className="w-3 h-3 text-blue-500 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      <span className="font-medium text-foreground">AI hiểu: </span>{clarificationUnderstanding}
                    </p>
                  </div>
                )}

                {/* Name issue takes precedence over generic clarification */}
                {showClarification && nameIssue && (
                  <div className="space-y-2.5 rounded-lg border border-amber-300/60 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/10 p-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium leading-tight">
                          {nameIssue.issue === 'irrelevant' ? 'Tên chiến dịch có vẻ lệch khỏi mô tả'
                            : nameIssue.issue === 'gibberish' ? 'Tên chiến dịch chưa rõ nghĩa'
                            : 'Tên chiến dịch hơi chung chung'}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{nameIssue.reason}</p>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">AI gợi ý</p>
                      <div className="flex flex-col gap-1">
                        {nameIssue.suggestions.map((s, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => {
                              setName(s);
                              setNameIssue(null);
                              setTimeout(() => finalSubmit(null), 100);
                            }}
                            className="text-left text-[11px] px-2.5 py-1.5 rounded-md border border-border bg-background hover:border-primary/50 hover:bg-primary/5 transition-colors"
                          >
                            <CheckCircle2 className="inline w-3 h-3 mr-1 text-primary" />
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-amber-200/40 dark:border-amber-900/30">
                      <Button size="sm" variant="ghost" onClick={() => { setNameIssue(null); }} className="h-7 text-[10px] text-muted-foreground px-2">
                        Quay lại sửa tay
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { setNameIssue(null); finalSubmit(null); }} className="h-7 text-[10px] px-2">
                        Giữ tên hiện tại
                      </Button>
                    </div>
                  </div>
                )}

                {/* Clarification — inline below summary, doesn't replace it */}
                {showClarification && !nameIssue && (
                  <ClarificationStep
                    questions={clarificationQuestions || []}
                    understanding={clarificationUnderstanding || undefined}
                    onSubmit={handleClarificationSubmit}
                    onSkip={handleClarificationSkip}
                    isLoading={clarifying}
                  />
                )}

                {/* Advanced settings — open by default if auto-approve is on */}
                {!showClarification && (
                  <Collapsible defaultOpen={autoApproveEnabled}>
                    <CollapsibleTrigger className="flex items-center justify-between w-full px-2.5 py-2 rounded-md border bg-muted/30 hover:bg-muted/50 transition-colors group">
                      <div className="flex items-center gap-1.5 text-[11px] font-medium">
                        <Settings2 className="w-3 h-3 text-muted-foreground" />
                        Cài đặt nâng cao
                        <Badge variant="outline" className="text-[9px] font-normal">{approvalLabel}</Badge>
                        {autoApproveEnabled && <Badge variant="secondary" className="text-[9px] gap-0.5"><Bot className="w-2.5 h-2.5" />Auto</Badge>}
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-2 mt-2 px-2.5 py-2 rounded-md border bg-card text-[11px]">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-muted-foreground">Chế độ AI</span>
                        <Select
                          value={approvalMode}
                          onValueChange={(v) => {
                            const opt = APPROVAL_MODE_OPTIONS.find(o => o.value === v);
                            if (opt) { setApprovalMode(opt.value); setAutonomyLevel(opt.autonomy); }
                          }}
                        >
                          <SelectTrigger className="h-7 w-auto text-[10px] px-2 gap-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {APPROVAL_MODE_OPTIONS.map(o => (
                              <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">Liên kết Chiến dịch (tùy chọn)</Label>
                        <CampaignSelector value={campaignId} onValueChange={setCampaignId} placeholder="Chọn chiến dịch..." className="text-xs" />
                      </div>
                      {autoApproveEnabled && (
                        <div>
                          <span className="text-muted-foreground">Smart Auto-Approve</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            <Badge variant="outline" className="text-[9px]">Quality ≥ {thresholdQuality}</Badge>
                            <Badge variant="outline" className="text-[9px]">GEO ≥ {thresholdGeo}</Badge>
                            <Badge variant="outline" className="text-[9px] text-destructive border-destructive/30">Risk ≤ {thresholdRiskMax}</Badge>
                          </div>
                        </div>
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </div>
            );
          })()}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t bg-muted/30">
          {isGenerating ? (
            <>
              <div />
              {generatingStatus === 'done' ? (
                <Button size="sm" onClick={() => onComplete(generationResult || {})} className="text-xs gap-1.5">
                  {generationResult?.approval_mode === 'full_auto' ? 'Xem Pipeline' : 'Xem kế hoạch'}
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              ) : generatingStatus === 'error' ? (
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => { setGeneratingStatus('idle'); setGenerationError(null); }} className="text-xs gap-1">
                    <ChevronLeft className="w-3.5 h-3.5" /> Quay lại
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onOpenChange(false)} className="text-xs">
                    Đóng
                  </Button>
                </div>
              ) : null}
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => { setStep(s => s - 1); setClarificationQuestions(null); setClarificationUnderstanding(null); setNameIssue(null); }} disabled={step === 0} className="text-xs gap-1">
                <ChevronLeft className="w-3.5 h-3.5" /> Quay lại
              </Button>
              {step < confirmStep ? (
                <Button size="sm" onClick={() => setStep(s => s + 1)} disabled={!canNext()} className="text-xs gap-1">
                  Tiếp theo <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              ) : !showClarification ? (
                <Button size="sm" onClick={handleConfirmStep} disabled={clarifying} className="text-xs gap-1">
                  <Zap className="w-3.5 h-3.5" /> {isEditing ? 'Cập nhật Campaign' : 'Khởi chạy Campaign'}
                </Button>
              ) : null}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
