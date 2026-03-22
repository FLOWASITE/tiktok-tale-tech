export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type FunctionCategory = 
  | 'ai-content' | 'social-publish' | 'social-oauth' | 'social-test'
  | 'payment' | 'admin' | 'image' | 'industry' | 'knowledge' 
  | 'chat' | 'ad-copy' | 'brand' | 'utility' | 'gateway';

export type OptimizationStatus = 'optimized' | 'legacy' | 'gateway';

export interface EdgeFunctionEntry {
  name: string;
  category: FunctionCategory;
  description: string;
  externalApis: string[];
  sharedDeps: string[];
  verifyJwt: boolean;
  riskLevel: RiskLevel;
  /** withPerf + singleton applied */
  hasPerf: boolean;
  /** Semantic cache integrated */
  hasSemanticCache: boolean;
  /** Gateway/router or standalone */
  optimizationStatus: OptimizationStatus;
}

const CATEGORY_META: Record<FunctionCategory, { label: string; color: string; icon: string }> = {
  'ai-content':    { label: 'AI Content',        color: 'hsl(260, 70%, 55%)', icon: 'Brain' },
  'social-publish':{ label: 'Social Publishing', color: 'hsl(200, 80%, 50%)', icon: 'Send' },
  'social-oauth':  { label: 'Social OAuth',      color: 'hsl(30, 90%, 55%)',  icon: 'KeyRound' },
  'social-test':   { label: 'Social Testing',    color: 'hsl(45, 80%, 50%)',  icon: 'TestTube' },
  'payment':       { label: 'Payment',           color: 'hsl(150, 70%, 40%)', icon: 'CreditCard' },
  'admin':         { label: 'Admin',             color: 'hsl(0, 70%, 55%)',   icon: 'Shield' },
  'image':         { label: 'Image Processing',  color: 'hsl(280, 60%, 55%)', icon: 'Image' },
  'industry':      { label: 'Industry Memory',   color: 'hsl(170, 60%, 45%)', icon: 'Building2' },
  'knowledge':     { label: 'Knowledge & AI',    color: 'hsl(220, 70%, 55%)', icon: 'BookOpen' },
  'chat':          { label: 'Chat & Conversation',color:'hsl(190, 70%, 50%)', icon: 'MessageSquare' },
  'ad-copy':       { label: 'Ad Copy',           color: 'hsl(340, 70%, 55%)', icon: 'Megaphone' },
  'brand':         { label: 'Brand',             color: 'hsl(25, 80%, 55%)',  icon: 'Palette' },
  'utility':       { label: 'Utility',           color: 'hsl(0, 0%, 50%)',    icon: 'Wrench' },
  'gateway':       { label: 'Gateway/Router',    color: 'hsl(140, 70%, 45%)', icon: 'GitBranch' },
};

export { CATEGORY_META };

function risk(externalApis: string[]): RiskLevel {
  if (externalApis.length >= 3) return 'critical';
  if (externalApis.length === 2) return 'high';
  if (externalApis.length === 1) return 'medium';
  return 'low';
}

function fn(
  name: string, category: FunctionCategory, description: string,
  externalApis: string[] = [], sharedDeps: string[] = [], verifyJwt = false,
  opts: { hasPerf?: boolean; hasSemanticCache?: boolean; optimizationStatus?: OptimizationStatus } = {}
): EdgeFunctionEntry {
  return { 
    name, category, description, externalApis, sharedDeps, verifyJwt, 
    riskLevel: risk(externalApis),
    hasPerf: opts.hasPerf ?? true, // All functions now have withPerf
    hasSemanticCache: opts.hasSemanticCache ?? false,
    optimizationStatus: opts.optimizationStatus ?? 'optimized',
  };
}

export const EDGE_FUNCTIONS: EdgeFunctionEntry[] = [
  // ── AI Content ──
  fn('generate-script',          'ai-content', 'Tạo kịch bản video từ chủ đề', ['Lovable AI'], ['ai-client', 'brand-context']),
  fn('generate-multichannel',    'ai-content', 'Tạo nội dung đa kênh từ core content (SSE streaming)', ['Lovable AI'], ['ai-client', 'brand-context', 'channel-config']),
  fn('ai-edit-channel',          'ai-content', 'Chỉnh sửa nội dung kênh bằng AI', ['Lovable AI'], ['ai-client']),
  fn('generate-carousel',        'ai-content', 'Tạo nội dung carousel', ['Lovable AI'], ['ai-client', 'brand-context']),
  fn('generate-carousel-image',  'ai-content', 'Tạo hình ảnh cho carousel', ['Lovable AI'], ['ai-client']),
  fn('generate-core-content',    'ai-content', 'Tạo nội dung gốc từ topic', ['Lovable AI'], ['ai-client', 'brand-context']),
  fn('generate-hooks',           'ai-content', 'Tạo hook cho nội dung (có semantic cache)', ['Lovable AI'], ['ai-client', 'semantic-cache'], false, { hasSemanticCache: true }),
  fn('generate-storyboard',      'ai-content', 'Tạo storyboard cho video', ['Lovable AI'], ['ai-client']),
  fn('generate-sample-text',     'ai-content', 'Tạo văn bản mẫu cho brand', ['Lovable AI'], ['ai-client']),
  fn('analyze-script',           'ai-content', 'Phân tích chất lượng kịch bản', ['Lovable AI'], ['ai-client']),
  fn('improve-script',           'ai-content', 'Cải thiện kịch bản (có semantic cache)', ['Lovable AI'], ['ai-client', 'semantic-cache'], false, { hasSemanticCache: true }),
  fn('suggest-prompt-rewrite',   'ai-content', 'Gợi ý viết lại prompt', ['Lovable AI'], ['ai-client']),
  fn('extract-broll-keywords',   'ai-content', 'Trích xuất từ khóa B-roll', ['Lovable AI'], ['ai-client']),
  fn('generate-music',           'ai-content', 'Gợi ý nhạc nền cho video', ['Lovable AI'], ['ai-client']),
  fn('generate-journey-messaging','ai-content','Tạo messaging theo customer journey', ['Lovable AI'], ['ai-client', 'brand-context']),
  fn('optimize-social-text',     'ai-content', 'Tối ưu văn bản cho social media', ['Lovable AI'], ['ai-client']),
  fn('learn-from-feedback',      'ai-content', 'Học từ feedback người dùng', ['Lovable AI'], ['ai-client']),
  fn('learn-from-edits',         'ai-content', 'Học từ chỉnh sửa người dùng', ['Lovable AI'], ['ai-client']),
  fn('validate-seamless-consistency','ai-content','Kiểm tra tính nhất quán nội dung', ['Lovable AI'], ['ai-client']),

  // ── Topic & Chat AI ──
  fn('topic-ai',                 'chat', 'Xử lý AI cho topics (suggest, analyze, recommend, trending)', ['Lovable AI'], ['ai-client']),
  fn('chat-topics',              'chat', 'Chat AI về chủ đề nội dung', ['Lovable AI'], ['ai-client']),
  fn('chat-conversations',       'chat', 'Chat AI đa năng (CRUD + AI)', ['Lovable AI'], ['ai-client']),
  fn('summarize-conversation',   'chat', 'Tóm tắt cuộc hội thoại (có semantic cache)', ['Lovable AI'], ['ai-client', 'semantic-cache'], false, { hasSemanticCache: true }),
  fn('help-chatbot',             'chat', 'Chatbot hỗ trợ người dùng', ['Lovable AI'], ['ai-client']),
  fn('help-article-search',      'chat', 'Tìm kiếm bài viết hỗ trợ', [], []),
  fn('sales-chatbot',            'chat', 'Chatbot tư vấn bán hàng', ['Lovable AI'], ['ai-client']),

  // ── Brand ──
  fn('generate-brand-voice',     'brand', 'Tạo brand voice từ mô tả', ['Lovable AI'], ['ai-client']),
  fn('generate-brand-guideline', 'brand', 'Tạo brand guideline', ['Lovable AI'], ['ai-client']),
  fn('generate-brand-image',     'brand', 'Tạo hình ảnh thương hiệu', ['Lovable AI'], ['ai-client']),

  // ── Image Processing ──
  fn('overlay-logo-canvas',      'image', 'Ghép logo lên ảnh bằng Canvas API', [], ['storage']),
  fn('overlay-brand-logo',       'image', 'Ghép brand logo lên ảnh', [], ['storage']),
  fn('overlay-text-canvas',      'image', 'Ghép text lên ảnh bằng Canvas API', [], ['storage']),
  fn('generate-scene-thumbnail', 'image', 'Tạo thumbnail cho scene', ['Lovable AI'], ['ai-client']),
  fn('edit-image-background',    'image', 'Sửa nền ảnh bằng AI', ['Lovable AI'], ['ai-client']),
  fn('decompose-image-request',  'image', 'Phân tích yêu cầu tạo ảnh', ['Lovable AI'], ['ai-client']),
  fn('delete-carousel-image',    'image', 'Xóa ảnh carousel từ storage', [], ['storage']),
  fn('cleanup-old-images',       'image', 'Dọn dẹp ảnh cũ trong storage', [], ['storage']),
  fn('generate-video',           'image', 'Tạo video từ ảnh/script', ['Lovable AI'], ['ai-client']),

  // ── Gateway/Router (consolidated) ──
  fn('channel-publisher',        'gateway', '🔀 Router: đăng bài tất cả kênh', ['All Social APIs'], ['perf'], false, { optimizationStatus: 'gateway' }),
  fn('auth-gateway',             'gateway', '🔀 Router: OAuth callback tất cả kênh', ['All Social APIs'], ['perf'], false, { optimizationStatus: 'gateway' }),
  fn('social-diagnostics',       'gateway', '🔀 Router: test kết nối & credentials tất cả kênh', ['All Social APIs'], ['perf'], false, { optimizationStatus: 'gateway' }),
  fn('warm-up-functions',        'gateway', '🔥 Warm-up cron: ping top functions mỗi 4 phút + refresh MV', [], ['perf'], false, { optimizationStatus: 'gateway' }),

  // ── Social Publishing (legacy, routed via channel-publisher) ──
  fn('publish-zalo',             'social-publish', 'Đăng bài lên Zalo OA', ['Zalo API'], ['social-auth'], false, { optimizationStatus: 'legacy' }),
  fn('publish-facebook',         'social-publish', 'Đăng bài lên Facebook', ['Facebook Graph API'], ['social-auth'], false, { optimizationStatus: 'legacy' }),
  fn('publish-instagram',        'social-publish', 'Đăng bài lên Instagram', ['Instagram Graph API'], ['social-auth'], false, { optimizationStatus: 'legacy' }),
  fn('publish-linkedin',         'social-publish', 'Đăng bài lên LinkedIn', ['LinkedIn API'], ['social-auth'], false, { optimizationStatus: 'legacy' }),
  fn('publish-twitter',          'social-publish', 'Đăng bài lên X/Twitter', ['X API'], ['social-auth'], false, { optimizationStatus: 'legacy' }),
  fn('publish-threads',          'social-publish', 'Đăng bài lên Threads', ['Threads API'], ['social-auth'], false, { optimizationStatus: 'legacy' }),
  fn('publish-google-business',  'social-publish', 'Đăng bài lên Google Business', ['Google Business API'], ['social-auth'], false, { optimizationStatus: 'legacy' }),
  fn('publish-website',          'social-publish', 'Đăng bài lên website', ['WordPress API'], ['social-auth'], false, { optimizationStatus: 'legacy' }),

  // ── Social OAuth (legacy, routed via auth-gateway) ──
  fn('connect-social',           'social-oauth', 'Kết nối tài khoản social', [], ['social-auth'], false, { optimizationStatus: 'legacy' }),
  fn('instagram-oauth-callback', 'social-oauth', 'Instagram OAuth callback', ['Instagram Graph API'], [], false, { optimizationStatus: 'legacy' }),
  fn('facebook-oauth-callback',  'social-oauth', 'Facebook OAuth callback', ['Facebook Graph API'], [], false, { optimizationStatus: 'legacy' }),
  fn('linkedin-oauth-callback',  'social-oauth', 'LinkedIn OAuth callback', ['LinkedIn API'], [], false, { optimizationStatus: 'legacy' }),
  fn('threads-oauth-callback',   'social-oauth', 'Threads OAuth callback', ['Threads API'], [], false, { optimizationStatus: 'legacy' }),
  fn('zalo-oauth-callback',      'social-oauth', 'Zalo OAuth callback', ['Zalo API'], [], false, { optimizationStatus: 'legacy' }),
  fn('google-business-oauth-callback','social-oauth','Google Business OAuth callback', ['Google Business API'], [], false, { optimizationStatus: 'legacy' }),
  fn('x-oauth-callback',         'social-oauth', 'X/Twitter OAuth callback', ['X API'], [], false, { optimizationStatus: 'legacy' }),
  fn('connect-website',          'social-oauth', 'Kết nối website (WordPress)', ['WordPress API'], [], false, { optimizationStatus: 'legacy' }),
  fn('connect-meta-ads',         'social-oauth', 'Kết nối Meta Ads', ['Meta Ads API'], [], false, { optimizationStatus: 'legacy' }),
  fn('manage-social-platform-settings','social-oauth','Quản lý cài đặt nền tảng social', [], []),
  fn('auto-suggest-connections', 'social-oauth', 'Tự động gợi ý kết nối social', [], []),

  // ── Social Token Refresh ──
  fn('refresh-instagram-token',  'social-oauth', 'Làm mới token Instagram', ['Instagram Graph API'], []),
  fn('refresh-facebook-token',   'social-oauth', 'Làm mới token Facebook', ['Facebook Graph API'], []),
  fn('refresh-linkedin-token',   'social-oauth', 'Làm mới token LinkedIn', ['LinkedIn API'], []),
  fn('refresh-threads-token',    'social-oauth', 'Làm mới token Threads', ['Threads API'], []),
  fn('refresh-zalo-token',       'social-oauth', 'Làm mới token Zalo', ['Zalo API'], []),
  fn('refresh-google-business-token','social-oauth','Làm mới token Google Business', ['Google Business API'], []),
  fn('refresh-x-token',          'social-oauth', 'Làm mới token X/Twitter', ['X API'], []),

  // ── Social Testing (legacy, routed via social-diagnostics) ──
  fn('test-instagram-connection',   'social-test', 'Test kết nối Instagram', ['Instagram Graph API'], [], false, { optimizationStatus: 'legacy' }),
  fn('test-instagram-credentials',  'social-test', 'Test credentials Instagram', ['Instagram Graph API'], [], false, { optimizationStatus: 'legacy' }),
  fn('test-facebook-connection',    'social-test', 'Test kết nối Facebook', ['Facebook Graph API'], [], false, { optimizationStatus: 'legacy' }),
  fn('test-facebook-credentials',   'social-test', 'Test credentials Facebook', ['Facebook Graph API'], [], false, { optimizationStatus: 'legacy' }),
  fn('test-linkedin-connection',    'social-test', 'Test kết nối LinkedIn', ['LinkedIn API'], [], false, { optimizationStatus: 'legacy' }),
  fn('test-linkedin-credentials',   'social-test', 'Test credentials LinkedIn', ['LinkedIn API'], [], false, { optimizationStatus: 'legacy' }),
  fn('test-threads-connection',     'social-test', 'Test kết nối Threads', ['Threads API'], [], false, { optimizationStatus: 'legacy' }),
  fn('test-threads-credentials',    'social-test', 'Test credentials Threads', ['Threads API'], [], false, { optimizationStatus: 'legacy' }),
  fn('test-twitter-connection',     'social-test', 'Test kết nối X/Twitter', ['X API'], [], false, { optimizationStatus: 'legacy' }),
  fn('test-twitter-credentials',    'social-test', 'Test credentials X/Twitter', ['X API'], [], false, { optimizationStatus: 'legacy' }),
  fn('test-zalo-connection',        'social-test', 'Test kết nối Zalo', ['Zalo API'], [], false, { optimizationStatus: 'legacy' }),
  fn('test-zalo-credentials',       'social-test', 'Test credentials Zalo', ['Zalo API'], [], false, { optimizationStatus: 'legacy' }),
  fn('test-google-business-connection','social-test','Test kết nối Google Business', ['Google Business API'], [], false, { optimizationStatus: 'legacy' }),
  fn('test-google-business-credentials','social-test','Test credentials Google Business', ['Google Business API'], [], false, { optimizationStatus: 'legacy' }),
  fn('test-website-connection',     'social-test', 'Test kết nối website', ['WordPress API'], [], false, { optimizationStatus: 'legacy' }),
  fn('test-website-credentials',    'social-test', 'Test credentials website', ['WordPress API'], [], false, { optimizationStatus: 'legacy' }),
  fn('test-ai-connection',          'social-test', 'Test kết nối AI provider', ['Lovable AI'], []),

  // ── Payment ──
  fn('create-vnpay-payment',     'payment', 'Tạo thanh toán VNPay', ['VNPay API'], []),
  fn('vnpay-callback',           'payment', 'Xử lý callback VNPay', ['VNPay API'], []),
  fn('payment-webhook',          'payment', 'Webhook thanh toán', [], []),

  // ── Ad Copy ──
  fn('generate-ad-copy',         'ad-copy', 'Tạo ad copy AI', ['Lovable AI'], ['ai-client', 'brand-context']),
  fn('suggest-ad-fix',           'ad-copy', 'Gợi ý sửa ad copy', ['Lovable AI'], ['ai-client']),
  fn('predict-ad-performance',   'ad-copy', 'Dự đoán hiệu suất quảng cáo', ['Lovable AI'], ['ai-client']),
  fn('optimize-ad-copy',         'ad-copy', 'Tối ưu ad copy (có semantic cache)', ['Lovable AI'], ['ai-client', 'semantic-cache'], false, { hasSemanticCache: true }),
  fn('score-ad-creative',        'ad-copy', 'Chấm điểm creative quảng cáo', ['Lovable AI'], ['ai-client']),
  fn('kpi-ai',                   'ad-copy', 'AI phân tích KPI', ['Lovable AI'], ['ai-client']),
  fn('campaign-notifications',   'ad-copy', 'Thông báo campaign', [], []),
  fn('fetch-meta-ad-insights',   'ad-copy', 'Lấy insights từ Meta Ads', ['Meta Ads API'], []),
  fn('sync-ad-performance',      'ad-copy', 'Đồng bộ hiệu suất quảng cáo', ['Meta Ads API'], []),
  fn('analyze-dashboard-insights','ad-copy','Phân tích insights dashboard', ['Lovable AI'], ['ai-client']),

  // ── Industry & Knowledge ──
  fn('categorize-industries',    'industry', 'Phân loại ngành nghề', ['Lovable AI'], ['ai-client']),
  fn('enrich-industry-profiles', 'industry', 'Làm giàu profile ngành', ['Lovable AI'], ['ai-client']),
  fn('enrich-personas',          'industry', 'Làm giàu customer personas', ['Lovable AI'], ['ai-client']),
  fn('migrate-industry-templates','industry','Migrate industry templates', [], []),
  fn('generate-missing-profiles','industry', 'Tạo profiles còn thiếu', ['Lovable AI'], ['ai-client']),
  fn('regenerate-profiles',      'industry', 'Tạo lại profiles', ['Lovable AI'], ['ai-client']),
  fn('delete-orphan-industries', 'industry', 'Xóa industry mồ côi', [], []),

  // ── Knowledge Graph & Regulations ──
  fn('generate-knowledge-embeddings','knowledge','Tạo embeddings cho knowledge', ['Lovable AI'], ['ai-client']),
  fn('generate-embedding',       'knowledge', 'Tạo embedding vector', ['Lovable AI'], ['ai-client']),
  fn('semantic-search',          'knowledge', 'Tìm kiếm ngữ nghĩa', ['Lovable AI'], ['ai-client']),
  fn('extract-knowledge-entities','knowledge','Trích xuất entities từ knowledge', ['Lovable AI'], ['ai-client']),
  fn('migrate-to-knowledge-graph','knowledge','Migrate dữ liệu sang knowledge graph', [], []),
  fn('analyze-regulation-impact','knowledge', 'Phân tích tác động quy định', ['Lovable AI'], ['ai-client']),
  fn('apply-regulation-propagation','knowledge','Áp dụng lan truyền quy định', [], []),
  fn('parse-regulation-document','knowledge', 'Parse tài liệu quy định', ['Lovable AI'], ['ai-client']),
  fn('extract-regulation-content','knowledge','Trích xuất nội dung quy định', ['Lovable AI'], ['ai-client']),
  fn('auto-crawl-regulations',   'knowledge', 'Tự động crawl quy định', ['Lovable AI', 'Firecrawl'], ['ai-client']),
  fn('reparse-regulations',      'knowledge', 'Parse lại quy định', ['Lovable AI'], ['ai-client']),
  fn('reparse-with-quality',     'knowledge', 'Parse lại với quality check', ['Lovable AI'], ['ai-client']),
  fn('firecrawl-trends',         'knowledge', 'Crawl xu hướng từ web', ['Firecrawl'], []),

  // ── Admin & Utility ──
  fn('create-organization',      'admin', 'Tạo tổ chức mới', [], []),
  fn('create-org-member',        'admin', 'Thêm thành viên tổ chức', [], []),
  fn('admin-manage-user',        'admin', 'Quản lý user (admin)', [], []),
  fn('encrypt-api-key',          'utility', 'Mã hóa API key', [], []),
  fn('fetch-openrouter-models',  'utility', 'Lấy danh sách models OpenRouter', ['OpenRouter API'], []),
  fn('fetch-news-url',           'utility', 'Fetch nội dung từ URL tin tức', [], []),
  fn('health-check',             'utility', 'Kiểm tra sức khỏe hệ thống', [], []),
  fn('facebook-webhook',         'utility', 'Facebook webhook receiver', ['Facebook Graph API'], []),
  fn('batch-generate-embeddings','utility', 'Batch tạo embeddings', ['Lovable AI'], ['ai-client']),
];

// ── Helpers ──
export function getFunctionsByCategory(category: FunctionCategory): EdgeFunctionEntry[] {
  return EDGE_FUNCTIONS.filter(f => f.category === category);
}

export function getCategorySummary() {
  const summary: Record<string, number> = {};
  EDGE_FUNCTIONS.forEach(f => {
    summary[f.category] = (summary[f.category] || 0) + 1;
  });
  return Object.entries(summary)
    .map(([cat, count]) => ({ category: cat as FunctionCategory, count, ...CATEGORY_META[cat as FunctionCategory] }))
    .sort((a, b) => b.count - a.count);
}

export function getRiskSummary() {
  const counts = { low: 0, medium: 0, high: 0, critical: 0 };
  EDGE_FUNCTIONS.forEach(f => counts[f.riskLevel]++);
  return counts;
}

export function getExternalApiSummary() {
  const apiMap = new Map<string, number>();
  EDGE_FUNCTIONS.forEach(f => {
    f.externalApis.forEach(api => {
      apiMap.set(api, (apiMap.get(api) || 0) + 1);
    });
  });
  return Array.from(apiMap.entries())
    .map(([api, count]) => ({ api, count }))
    .sort((a, b) => b.count - a.count);
}

export function getOptimizationSummary() {
  const perfCount = EDGE_FUNCTIONS.filter(f => f.hasPerf).length;
  const cacheCount = EDGE_FUNCTIONS.filter(f => f.hasSemanticCache).length;
  const gatewayCount = EDGE_FUNCTIONS.filter(f => f.optimizationStatus === 'gateway').length;
  const legacyCount = EDGE_FUNCTIONS.filter(f => f.optimizationStatus === 'legacy').length;
  const optimizedCount = EDGE_FUNCTIONS.filter(f => f.optimizationStatus === 'optimized').length;
  return { perfCount, cacheCount, gatewayCount, legacyCount, optimizedCount, total: EDGE_FUNCTIONS.length };
}
