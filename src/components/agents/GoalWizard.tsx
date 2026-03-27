import { useState, useEffect, useCallback, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Target, Radio, Eye, ChevronLeft, ChevronRight, 
  Check, Sparkles, ShieldCheck, Zap, Bot, X, Plus, MessageSquare,
  Megaphone, Heart, Link2, ClipboardList, DollarSign, RefreshCw,
  PieChart, TrendingUp, Settings2, FileText, Images, Video,
  Loader2, CheckCircle2, AlertCircle, ArrowRight, Save, Brain
} from 'lucide-react';
import { AgentAutonomyLevel, AgentGoal, AUTONOMY_LEVELS } from '@/types/agent';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useCurrentBrand } from '@/contexts/BrandContext';
import { cn } from '@/lib/utils';
import { CampaignSelector } from '@/components/campaign/CampaignSelector';
import { ChannelIcon, channelIconColors } from '@/components/ui/channel-icon';
import { Channel } from '@/types/multichannel';
import { toast } from 'sonner';
import { ClarificationStep } from './ClarificationStep';

// ─── Constants ───

const AVAILABLE_CHANNELS: { id: string; label: string; channelKey: Channel }[] = [
  { id: 'blog', label: 'Blog', channelKey: 'website' },
  { id: 'facebook', label: 'Facebook', channelKey: 'facebook' },
  { id: 'instagram', label: 'Instagram', channelKey: 'instagram' },
  { id: 'tiktok', label: 'TikTok', channelKey: 'tiktok' },
  { id: 'zalo', label: 'Zalo OA', channelKey: 'zalo_oa' },
  { id: 'linkedin', label: 'LinkedIn', channelKey: 'linkedin' },
  { id: 'twitter', label: 'X (Twitter)', channelKey: 'twitter' },
  { id: 'email', label: 'Email', channelKey: 'email' },
  { id: 'threads', label: 'Threads', channelKey: 'threads' },
  { id: 'pinterest', label: 'Pinterest', channelKey: 'website' },
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
  { value: 'approve_each', label: 'Duyệt từng bài', description: 'AI tạo từng bài, bạn duyệt mỗi bài trước khi đăng', icon: '✅', autonomy: 'human_in_loop' as AgentAutonomyLevel },
  { value: 'approve_plan', label: 'Duyệt kế hoạch', description: 'Duyệt toàn bộ plan, AI tự chạy theo kế hoạch đã duyệt', icon: '📋', autonomy: 'human_on_loop' as AgentAutonomyLevel },
  { value: 'full_auto', label: 'Tự động hoàn toàn', description: 'AI tự lên kế hoạch, tạo và đăng bài tự động', icon: '🚀', autonomy: 'full_auto' as AgentAutonomyLevel },
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
  { icon: ShieldCheck, label: 'Tự động' },
  { icon: Eye, label: 'Xác nhận' },
];

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
  }) => Promise<GenerationResult>;
  onComplete: (result: GenerationResult) => void;
  initialData?: AgentGoal | null;
}

// ─── Component ───

export function GoalWizard({ open, onOpenChange, onSaveGoal, onGenerateStrategy, onComplete, initialData }: GoalWizardProps) {
  const { currentOrganization } = useOrganizationContext();
  const { currentBrand } = useCurrentBrand();
  const [step, setStep] = useState(0);
  
  // Step 0: Mục tiêu
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedObjective, setSelectedObjective] = useState<string | null>(null);
  const [kpiTargets, setKpiTargets] = useState<Record<string, number>>({});

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

  // Step 2: Kênh
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [frequency, setFrequency] = useState<Record<string, string>>({});

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
  const showClarification = step === confirmStep && generatingStatus === 'idle' && (clarifying || clarificationQuestions || clarificationUnderstanding);
  const isGenerating = generatingStatus !== 'idle';
  const pillarEntries = Object.entries(pillarAllocation);
  const pillarTotal = pillarEntries.reduce((s, [, v]) => s + v, 0);

  // AI Preview computed values
  const estimatedPosts = useMemo(() => {
    if (selectedChannels.length === 0) return 0;
    const freqMultipliers: Record<string, number> = { daily: 7, '3/week': 3, '2/week': 2, weekly: 1 };
    const weeks = Math.ceil(effectiveDuration / 7);
    return selectedChannels.reduce((total, ch) => {
      const f = frequency[ch] || 'weekly';
      return total + weeks * (freqMultipliers[f] || 1);
    }, 0);
  }, [selectedChannels, frequency, effectiveDuration]);

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
      setStep(0);
    } else if (open && !initialData) {
      resetForm();
    }
  }, [open, initialData]);

  useEffect(() => {
    if (open && currentBrand && !brandTemplateId) setBrandTemplateId(currentBrand.id);
  }, [open, currentBrand]);

  // ─── Handlers ───
  const resetForm = () => {
    setStep(0);
    setName(''); setDescription('');
    setSelectedObjective(null); setKpiTargets({});
    setTotalBudget(0); setBudgetAllocation({ content: 50, ads: 30, kol: 20 });
    setKeyMessages([]); setKeyMessageInput(''); setPrimaryCta('');
    setPillarAllocation({});
    setCampaignDurationDays(14); setCustomDuration(''); setTotalPostsTarget('');
    setCampaignStartDate(new Date().toISOString().split('T')[0]);
    setSelectedChannels([]); setFrequency({});
    setAutonomyLevel('human_in_loop'); setApprovalMode('approve_each');
    setAutoApproveEnabled(false); setThresholdQuality(70); setThresholdRiskMax(30); setThresholdGeo(60);
    setBrandVoiceThreshold(70); setLearningSpeed('balanced');
    setBrandTemplateId(currentBrand?.id || ''); setCampaignId(undefined);
    setGeneratingStatus('idle'); setGenerationResult(null); setGenerationError(null);
    setClarifying(false); setClarificationQuestions(null); setClarificationUnderstanding(null); setClarificationContext(null);
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

  const canNext = () => {
    switch (step) {
      case 0: return name.trim().length > 0 && !!selectedObjective;
      case 1: return true; // Strategy step optional
      case 2: return selectedChannels.length > 0;
      default: return true;
    }
  };

  const handleConfirmStep = async () => {
    setClarifying(true); setClarificationQuestions(null); setClarificationUnderstanding(null);
    try {
      const { data, error } = await supabase.functions.invoke('clarify-campaign-intent', {
        body: {
          title: name.trim(),
          description: description.trim() || undefined,
          industry: currentBrand?.industry || undefined,
          channels: selectedChannels,
          brand_name: currentBrand?.brand_name || undefined,
        },
      });
      if (error) throw error;
      if (data?.ready) {
        setClarificationUnderstanding(data.understanding || `Tạo nội dung về "${name}"`);
        setTimeout(() => finalSubmit(null), 1500);
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

  const finalSubmit = async (context: Record<string, string> | null) => {
    const baseContext = context || clarificationContext || {};
    const briefContext: Record<string, any> = { ...baseContext };
    if (selectedObjective) briefContext.objective = selectedObjective;
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
      });
      
      setGenerationResult(result);
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
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Sparkles className="w-4 h-4 text-primary" />
            {isEditing ? 'Chỉnh sửa Campaign' : 'Tạo AI Campaign'}
          </DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
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

        {/* Step content */}
        <div className="px-5 pb-5 min-h-[200px] max-h-[55vh] overflow-y-auto">

          {/* ═══ Step 0: Mục tiêu ═══ */}
          {step === 0 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs">Tên chiến dịch *</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="VD: Ra mắt sản phẩm mới tháng 4" className="text-sm" />
              </div>

              {/* Objective Cards */}
              <div className="space-y-2">
                <Label className="text-xs">Mục tiêu chính của chiến dịch *</Label>
                <p className="text-[10px] text-muted-foreground">Chọn 1 mục tiêu — AI sẽ tối ưu nội dung theo hướng này.</p>
                <div className="grid grid-cols-2 gap-2">
                  {OBJECTIVES.map(obj => {
                    const Icon = obj.icon;
                    const selected = selectedObjective === obj.id;
                    return (
                      <button
                        key={obj.id}
                        onClick={() => { setSelectedObjective(obj.id); setKpiTargets({}); }}
                        className={cn(
                          "flex items-start gap-2.5 p-3 rounded-lg border text-left transition-all",
                          selected ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border hover:border-primary/30"
                        )}
                      >
                        <Icon className={cn("w-4 h-4 mt-0.5 shrink-0", obj.color)} />
                        <div className="min-w-0">
                          <p className="text-xs font-medium leading-tight">{obj.label}</p>
                          <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{obj.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* KPI Targets — show when objective selected */}
              {selectedObj && (
                <div className="space-y-2 p-3 rounded-lg bg-muted/50 border">
                  <div className="flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-primary" />
                    <Label className="text-xs">Chỉ tiêu (KPI) — tùy chọn</Label>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Nhập con số mong muốn để AI đánh giá hiệu quả.</p>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedObj.kpis.map(kpi => (
                      <div key={kpi.key} className="space-y-1">
                        <span className="text-[10px] text-muted-foreground">{kpi.label}</span>
                        <Input
                          type="number"
                          value={kpiTargets[kpi.key] || ''}
                          onChange={e => setKpiTargets({ ...kpiTargets, [kpi.key]: Number(e.target.value) })}
                          placeholder={kpi.placeholder}
                          className="text-sm h-8"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-xs">Mô tả bổ sung</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="VD: Tập trung vào khách hàng nữ 25-35 tuổi, quảng bá chương trình khuyến mãi hè..." rows={2} className="text-sm resize-none" />
              </div>

              <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
                <Bot className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <p className="text-[11px] text-muted-foreground">
                  💡 AI sẽ tự động lên lịch, chọn loại nội dung và viết bài phù hợp dựa trên mục tiêu bạn chọn.
                </p>
              </div>
            </div>
          )}

          {/* ═══ Step 1: Chiến lược ═══ */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Chiến lược nội dung</Label>
                <Badge variant="outline" className="text-[9px] text-muted-foreground">Có thể bỏ qua</Badge>
              </div>
              <p className="text-[10px] text-muted-foreground -mt-2">
                Thêm thông tin để AI lên kế hoạch chính xác hơn. Bỏ trống = AI tự quyết.
              </p>

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
          {step === 2 && (
            <div className="space-y-4">
              <Label className="text-xs">Bạn muốn đăng bài ở đâu?</Label>
              <p className="text-[10px] text-muted-foreground mb-1">Chọn kênh mà bạn muốn AI tạo nội dung.</p>
              <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto">
                {AVAILABLE_CHANNELS.map(ch => {
                  const selected = selectedChannels.includes(ch.id);
                  return (
                    <button key={ch.id} onClick={() => toggleChannel(ch.id)} className={cn(
                      "flex items-center gap-2 p-2.5 rounded-lg border text-left text-sm transition-all",
                      selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                    )}>
                      <ChannelIcon channel={ch.channelKey} size={14} className={channelIconColors[ch.channelKey]} />
                      <span className="text-xs font-medium">{ch.label}</span>
                      {selected && <Check className="w-3.5 h-3.5 text-primary ml-auto" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ═══ Step 3: Tự động ═══ */}
          {step === 3 && (
            <div className="space-y-3">
              {/* Approval Mode — single unified control */}
              <Label className="text-xs">AI hoạt động như thế nào?</Label>
              <p className="text-[10px] text-muted-foreground">Chọn mức độ tự động mà AI được phép thực hiện.</p>
              {APPROVAL_MODE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setApprovalMode(opt.value);
                    setAutonomyLevel(opt.autonomy);
                  }}
                  className={cn(
                    "w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-all",
                    approvalMode === opt.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                  )}
                >
                  <span className="text-lg">{opt.icon}</span>
                  <div>
                    <p className="text-sm font-medium">{opt.label}</p>
                    <p className="text-[10px] text-muted-foreground">{opt.description}</p>
                  </div>
                  {approvalMode === opt.value && <Check className="w-4 h-4 text-primary ml-auto mt-0.5 shrink-0" />}
                </button>
              ))}

              {/* Smart Auto-Approve */}
              {(approvalMode === 'approve_each' || approvalMode === 'approve_plan') && (
                <div className="space-y-3 border-t pt-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-primary" /> Smart Auto-Approve
                    </Label>
                    <button
                      onClick={() => setAutoApproveEnabled(!autoApproveEnabled)}
                      className={cn("relative inline-flex h-5 w-9 items-center rounded-full transition-colors", autoApproveEnabled ? "bg-primary" : "bg-muted-foreground/20")}
                    >
                      <span className={cn("inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform", autoApproveEnabled ? "translate-x-[18px]" : "translate-x-[3px]")} />
                    </button>
                  </div>
                  {autoApproveEnabled && (
                    <div className="space-y-3 p-3 rounded-lg bg-primary/5 border border-primary/10">
                      <p className="text-[10px] text-muted-foreground">Bài viết đạt đủ ngưỡng sẽ được tự động duyệt.</p>
                      {[
                        { label: 'Chất lượng tổng ≥', value: thresholdQuality, setter: setThresholdQuality, min: 50, max: 95, color: 'text-primary' },
                        { label: 'GEO Score ≥', value: thresholdGeo, setter: setThresholdGeo, min: 30, max: 90, color: 'text-primary' },
                        { label: 'Risk Score ≤', value: thresholdRiskMax, setter: setThresholdRiskMax, min: 0, max: 60, color: 'text-destructive' },
                      ].map(t => (
                        <div key={t.label} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px]">{t.label}</span>
                            <span className={cn("text-[11px] font-semibold tabular-nums", t.color)}>{t.value}</span>
                          </div>
                          <Slider value={[t.value]} min={t.min} max={t.max} step={5} onValueChange={([v]) => t.setter(v)} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Advanced Settings */}
              <div className="space-y-3 border-t pt-3">
                <div className="flex items-center gap-1.5">
                  <Settings2 className="w-3.5 h-3.5 text-muted-foreground" />
                  <Label className="text-xs">Cài đặt nâng cao</Label>
                </div>

                {/* Brand Voice Threshold */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px]">Mức độ giữ giọng thương hiệu</span>
                    <span className="text-[11px] font-semibold tabular-nums text-primary">{brandVoiceThreshold}%</span>
                  </div>
                  <Slider value={[brandVoiceThreshold]} min={30} max={100} step={5} onValueChange={([v]) => setBrandVoiceThreshold(v)} />
                  <p className="text-[9px] text-muted-foreground">Cao = giữ đúng tone thương hiệu. Thấp = sáng tạo tự do hơn.</p>
                </div>

                {/* Learning Speed */}
                <div className="space-y-1.5">
                  <span className="text-[11px]">Tốc độ học hỏi</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {LEARNING_SPEED_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setLearningSpeed(opt.value)}
                        className={cn(
                          "p-2 rounded-lg border text-center transition-all",
                          learningSpeed === opt.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                        )}
                      >
                        <p className="text-[10px] font-medium">{opt.label}</p>
                        <p className="text-[8px] text-muted-foreground">{opt.description}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══ Step 4: Xác nhận ═══ */}
          {step === confirmStep && (
            <div className="space-y-3">
              {showClarification ? (
                <ClarificationStep
                  questions={clarificationQuestions || []}
                  understanding={clarificationUnderstanding || undefined}
                  onSubmit={handleClarificationSubmit}
                  onSkip={handleClarificationSkip}
                  isLoading={clarifying}
                />
              ) : (
                <>
                  {/* AI Preview Panel */}
                  <div className="p-3 rounded-lg bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/15 space-y-2.5">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-primary" />
                      <span className="text-xs font-medium">Dự kiến chiến dịch</span>
                    </div>

                    {/* Overview metrics */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-center p-2 rounded-md bg-background/60">
                        <p className="text-lg font-bold text-primary tabular-nums">{estimatedPosts}</p>
                        <p className="text-[9px] text-muted-foreground">Bài viết</p>
                      </div>
                      <div className="text-center p-2 rounded-md bg-background/60">
                        <p className="text-lg font-bold text-primary tabular-nums">{selectedChannels.length}</p>
                        <p className="text-[9px] text-muted-foreground">Kênh</p>
                      </div>
                      <div className="text-center p-2 rounded-md bg-background/60">
                        <p className="text-lg font-bold text-primary tabular-nums">{effectiveDuration}</p>
                        <p className="text-[9px] text-muted-foreground">Ngày</p>
                      </div>
                    </div>

                    {/* Content type breakdown */}
                    {(() => {
                      const visualChannelIds = ['instagram', 'tiktok', 'facebook', 'pinterest'];
                      const videoChannelIds = ['tiktok', 'youtube', 'instagram'];
                      const freqMultipliers: Record<string, number> = { daily: 7, '3/week': 3, '2/week': 2, weekly: 1 };
                      const weeks = Math.ceil(effectiveDuration / 7);

                      const estCarousels = selectedChannels
                        .filter(ch => visualChannelIds.includes(ch))
                        .reduce((sum, ch) => sum + weeks * (freqMultipliers[frequency[ch] || 'weekly'] || 1), 0);

                      const estVideos = selectedChannels
                        .filter(ch => videoChannelIds.includes(ch))
                        .reduce((sum, ch) => sum + weeks * (freqMultipliers[frequency[ch] || 'weekly'] || 1), 0);

                      const breakdownItems = [
                        { icon: FileText, label: 'Nội dung đa kênh', count: estimatedPosts },
                        { icon: Images, label: 'Carousel', count: estCarousels },
                        { icon: Video, label: 'Video Script', count: estVideos },
                      ].filter(item => item.count > 0);

                      return breakdownItems.length > 0 ? (
                        <div className="border-t border-primary/10 pt-2 space-y-1">
                          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Phân bổ nội dung</span>
                          {breakdownItems.map(item => (
                            <div key={item.label} className="flex items-center justify-between py-0.5">
                              <div className="flex items-center gap-1.5">
                                <item.icon className="w-3 h-3 text-muted-foreground/70" />
                                <span className="text-[11px] text-muted-foreground">{item.label}</span>
                              </div>
                              <span className="text-[11px] font-semibold tabular-nums">{item.count}</span>
                            </div>
                          ))}
                        </div>
                      ) : null;
                    })()}

                    {selectedObj && (
                      <div className="flex items-center gap-1.5 text-[10px]">
                        <selectedObj.icon className={cn("w-3 h-3", selectedObj.color)} />
                        <span className="text-muted-foreground">Mục tiêu:</span>
                        <span className="font-medium">{selectedObj.label}</span>
                      </div>
                    )}
                    {selectedChannels.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {selectedChannels.map(ch => {
                          const info = AVAILABLE_CHANNELS.find(c => c.id === ch);
                          return <Badge key={ch} variant="outline" className="text-[9px] flex items-center gap-1"><ChannelIcon channel={info?.channelKey || 'website'} size={10} className={channelIconColors[info?.channelKey || 'website']} /> {info?.label}</Badge>;
                        })}
                      </div>
                    )}
                    <p className="text-[9px] text-muted-foreground">
                      📅 {campaignStartDate} → {new Date(new Date(campaignStartDate).getTime() + effectiveDuration * 86400000).toISOString().split('T')[0]}
                    </p>
                  </div>

                  {/* Brand + Campaign Link */}
                  <div className="space-y-2">
                    <Label className="text-xs">Brand Template</Label>
                    <div className="flex items-center gap-2 p-2 rounded-lg border bg-muted/30">
                      {currentBrand ? (
                        <>
                          <div className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold text-primary-foreground" style={{ backgroundColor: currentBrand.primary_color || 'hsl(var(--primary))' }}>
                            {currentBrand.brand_name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-xs font-medium">{currentBrand.brand_name}</span>
                          <Badge variant="secondary" className="text-[9px] ml-auto">Đang dùng</Badge>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">Chưa chọn brand</span>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Liên kết Chiến dịch (tùy chọn)</Label>
                    <CampaignSelector value={campaignId} onValueChange={setCampaignId} placeholder="Chọn chiến dịch liên kết..." className="text-sm" />
                  </div>

                  {/* Review Summary */}
                  <div className="space-y-1.5 text-xs border-t pt-3">
                    <Label className="text-xs font-medium">Tóm tắt cài đặt</Label>
                    <div className="flex justify-between py-1 border-b"><span className="text-muted-foreground">Tên</span><span className="font-medium truncate ml-2 max-w-[60%] text-right">{name}</span></div>
                    <div className="flex justify-between py-1 border-b"><span className="text-muted-foreground">Chế độ</span><span className="font-medium">{APPROVAL_MODE_OPTIONS.find(o => o.value === approvalMode)?.label}</span></div>
                    {totalBudget > 0 && (
                      <div className="flex justify-between py-1 border-b"><span className="text-muted-foreground">Ngân sách</span><span className="font-medium">{totalBudget.toLocaleString('vi-VN')} VNĐ</span></div>
                    )}
                    {keyMessages.length > 0 && (
                      <div className="py-1 border-b">
                        <span className="text-muted-foreground">Thông điệp</span>
                        <div className="flex gap-1 flex-wrap mt-1">{keyMessages.map((m, i) => <Badge key={i} variant="secondary" className="text-[9px]">{m}</Badge>)}</div>
                      </div>
                    )}
                    {autoApproveEnabled && (
                      <div className="py-1 border-b">
                        <span className="text-muted-foreground">Smart Auto-Approve</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          <Badge variant="outline" className="text-[9px]">Quality ≥ {thresholdQuality}</Badge>
                          <Badge variant="outline" className="text-[9px]">GEO ≥ {thresholdGeo}</Badge>
                          <Badge variant="outline" className="text-[9px] text-destructive border-destructive/30">Risk ≤ {thresholdRiskMax}</Badge>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t bg-muted/30">
          <Button variant="ghost" size="sm" onClick={() => { setStep(s => s - 1); setClarificationQuestions(null); setClarificationUnderstanding(null); }} disabled={step === 0} className="text-xs gap-1">
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
