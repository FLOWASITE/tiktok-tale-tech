// ============================================
// Help Knowledge Base
// Chứa thông tin hướng dẫn sử dụng hệ thống
// ============================================

export interface HelpFeature {
  id: string;
  title: string;
  keywords: string[];
  description: string;
  steps: string[];
  route?: string;
  coachmarkId?: string;
}

export interface HelpFAQ {
  question: string;
  answer: string;
  keywords?: string[];
}

export const HELP_FEATURES: HelpFeature[] = [
  {
    id: 'create-brand',
    title: 'Tạo Brand mới',
    keywords: ['brand', 'thương hiệu', 'tạo brand', 'new brand', 'branding'],
    description: 'Hướng dẫn tạo thương hiệu mới trong hệ thống',
    steps: [
      'Vào trang Brands từ menu bên trái',
      'Click nút "Tạo Brand mới"',
      'Điền thông tin cơ bản: Tên, Industry, Positioning',
      'Thiết lập Tone of Voice và Content Pillars',
      'Thêm Personas và Products (tuỳ chọn)',
      'Click "Hoàn tất" để lưu'
    ],
    route: '/brands/new',
    coachmarkId: 'brand-creation'
  },
  {
    id: 'create-content',
    title: 'Tạo nội dung đa kênh',
    keywords: ['content', 'nội dung', 'tạo nội dung', 'multichannel', 'đa kênh', 'post', 'bài viết'],
    description: 'Tạo nội dung cho nhiều kênh social cùng lúc',
    steps: [
      'Chọn Brand Template đã tạo',
      'Click "Tạo nội dung mới"',
      'Chọn các kênh muốn tạo (Facebook, Instagram, TikTok...)',
      'Nhập chủ đề hoặc để AI gợi ý',
      'Xem preview và chỉnh sửa',
      'Lên lịch đăng hoặc xuất bản ngay'
    ],
    route: '/multichannel/new',
    coachmarkId: 'content-creation'
  },
  {
    id: 'ai-chatbot',
    title: 'Sử dụng AI Chatbot',
    keywords: ['chatbot', 'ai', 'trợ lý', 'assistant', 'chat', 'hỏi đáp'],
    description: 'Brainstorm ý tưởng và tạo nội dung với AI',
    steps: [
      'Vào trang Kho Ý Tưởng từ menu',
      'Chọn hoặc tạo conversation mới',
      'Gõ câu hỏi hoặc yêu cầu cho AI',
      'AI sẽ trả lời dựa trên brand guidelines của bạn',
      'Có thể yêu cầu AI phân tích trends, tạo content ideas'
    ],
    route: '/topics'
  },
  {
    id: 'view-calendar',
    title: 'Xem lịch nội dung',
    keywords: ['calendar', 'lịch', 'schedule', 'lên lịch', 'đăng bài'],
    description: 'Quản lý lịch đăng bài trên các kênh',
    steps: [
      'Vào trang Calendar từ menu',
      'Xem các bài đã lên lịch theo ngày/tuần/tháng',
      'Drag & drop để thay đổi lịch',
      'Click vào bài để xem chi tiết hoặc chỉnh sửa'
    ],
    route: '/calendar'
  },
  {
    id: 'manage-scripts',
    title: 'Quản lý kịch bản video',
    keywords: ['script', 'kịch bản', 'video', 'tiktok', 'reels'],
    description: 'Tạo và quản lý kịch bản video ngắn',
    steps: [
      'Vào trang Kịch Bản từ menu',
      'Click "Tạo kịch bản mới"',
      'Chọn loại video và platform',
      'AI sẽ tạo kịch bản phù hợp',
      'Chỉnh sửa và lưu kịch bản'
    ],
    route: '/videos?tab=scripts'
  },
  {
    id: 'carousel-design',
    title: 'Thiết kế Carousel',
    keywords: ['carousel', 'slide', 'thiết kế', 'hình ảnh', 'instagram'],
    description: 'Tạo carousel cho Instagram và LinkedIn',
    steps: [
      'Vào trang Carousel từ menu',
      'Chọn template hoặc tạo mới',
      'Nhập nội dung cho mỗi slide',
      'Tuỳ chỉnh màu sắc và layout',
      'Xuất ra định dạng phù hợp'
    ],
    route: '/carousel'
  },
  {
    id: 'organization-settings',
    title: 'Cài đặt tổ chức',
    keywords: ['organization', 'tổ chức', 'team', 'nhóm', 'member', 'thành viên'],
    description: 'Quản lý thành viên và cài đặt tổ chức',
    steps: [
      'Vào trang Organization từ menu',
      'Xem danh sách thành viên',
      'Mời thành viên mới bằng email',
      'Phân quyền cho từng thành viên',
      'Quản lý các cài đặt chung'
    ],
    route: '/organization'
  },
  {
    id: 'account-settings',
    title: 'Cài đặt tài khoản',
    keywords: ['account', 'tài khoản', 'profile', 'mật khẩu', 'password'],
    description: 'Quản lý thông tin cá nhân và bảo mật',
    steps: [
      'Click vào avatar ở góc phải',
      'Chọn "Tài khoản"',
      'Cập nhật thông tin cá nhân',
      'Đổi mật khẩu nếu cần',
      'Quản lý các kết nối social'
    ],
    route: '/account'
  }
];

export const HELP_FAQS: HelpFAQ[] = [
  {
    question: 'AI chatbot có thể làm gì?',
    answer: 'AI chatbot giúp bạn brainstorm ý tưởng nội dung, phân tích trending topics, tạo content ideas, và đưa ra gợi ý dựa trên brand guidelines của bạn. Bạn có thể hỏi bất cứ điều gì liên quan đến content marketing.',
    keywords: ['ai', 'chatbot', 'làm gì']
  },
  {
    question: 'Làm sao để thay đổi brand template?',
    answer: 'Vào trang Brands, click vào brand bạn muốn chỉnh sửa, sau đó click nút "Chỉnh sửa" để cập nhật thông tin. Mọi thay đổi sẽ được áp dụng cho các nội dung mới.',
    keywords: ['brand', 'thay đổi', 'chỉnh sửa']
  },
  {
    question: 'Tại sao nội dung tạo ra không đúng tone?',
    answer: 'Hãy kiểm tra lại Brand Template của bạn, đặc biệt là phần Tone of Voice và Sample Texts. AI sử dụng các thông tin này để tạo nội dung phù hợp. Thêm nhiều sample texts sẽ giúp AI hiểu rõ hơn phong cách của bạn.',
    keywords: ['tone', 'giọng văn', 'không đúng']
  },
  {
    question: 'Có thể tạo nội dung cho nhiều kênh cùng lúc không?',
    answer: 'Có! Sử dụng tính năng Multi-Channel Content để tạo nội dung cho Facebook, Instagram, LinkedIn, TikTok... cùng một lúc. Mỗi kênh sẽ được tối ưu format phù hợp.',
    keywords: ['nhiều kênh', 'multichannel', 'cùng lúc']
  },
  {
    question: 'Làm sao để mời thành viên vào team?',
    answer: 'Vào trang Organization Settings, click nút "Mời thành viên", nhập email của người muốn mời và chọn quyền phù hợp. Họ sẽ nhận được email mời tham gia.',
    keywords: ['mời', 'team', 'thành viên']
  },
  {
    question: 'Dữ liệu có được bảo mật không?',
    answer: 'Hoàn toàn! Dữ liệu của bạn được mã hoá và lưu trữ an toàn. Chỉ những thành viên trong organization của bạn mới có thể truy cập. Chúng tôi không chia sẻ dữ liệu với bên thứ ba.',
    keywords: ['bảo mật', 'an toàn', 'dữ liệu']
  }
];

export const HELP_GLOSSARY: Record<string, string> = {
  'Brand Template': 'Bộ quy chuẩn thương hiệu bao gồm tone of voice, content pillars, personas - dùng làm nền tảng cho mọi nội dung',
  'Content Pillars': 'Các chủ đề nội dung chính mà thương hiệu tập trung vào, giúp định hướng content strategy',
  'Tone of Voice': 'Phong cách giao tiếp của thương hiệu - ví dụ: thân thiện, chuyên nghiệp, hài hước...',
  'Personas': 'Chân dung khách hàng mục tiêu với đặc điểm nhân khẩu học, sở thích, nhu cầu',
  'Multi-Channel': 'Tính năng tạo nội dung cho nhiều kênh social media cùng lúc',
  'Carousel': 'Dạng bài viết nhiều hình ảnh có thể vuốt qua, phổ biến trên Instagram và LinkedIn',
  'Industry Memory': 'Bộ kiến thức ngành được tích hợp để AI hiểu rõ hơn về lĩnh vực của bạn',
  'Sample Texts': 'Các đoạn văn mẫu thể hiện phong cách viết của thương hiệu, giúp AI học theo'
};

// Route to feature mapping for context-aware suggestions
export const ROUTE_FEATURES: Record<string, string[]> = {
  '/': ['create-brand', 'create-content', 'ai-chatbot'],
  '/dashboard': ['create-brand', 'create-content', 'ai-chatbot'],
  '/brands': ['create-brand', 'create-content'],
  '/brands/new': ['create-brand'],
  '/multichannel': ['create-content', 'view-calendar', 'ai-chatbot'],
  '/multichannel/new': ['create-content'],
  '/topics': ['ai-chatbot', 'create-content'],
  '/calendar': ['view-calendar', 'create-content'],
  '/videos': ['manage-scripts', 'ai-chatbot'],
  '/carousel': ['carousel-design', 'ai-chatbot'],
  '/organization': ['organization-settings'],
  '/account': ['account-settings'],
  '/admin': ['organization-settings', 'account-settings'],
};

// Quick action suggestions based on current route
export function getQuickActions(currentRoute: string): HelpFeature[] {
  const featureIds = ROUTE_FEATURES[currentRoute] || ROUTE_FEATURES['/'];
  return HELP_FEATURES.filter(f => featureIds.includes(f.id));
}

// Search knowledge base
export function searchKnowledgeBase(query: string): {
  features: HelpFeature[];
  faqs: HelpFAQ[];
} {
  const lowerQuery = query.toLowerCase();
  
  const features = HELP_FEATURES.filter(f => 
    f.keywords.some(k => lowerQuery.includes(k)) ||
    f.title.toLowerCase().includes(lowerQuery) ||
    f.description.toLowerCase().includes(lowerQuery)
  );
  
  const faqs = HELP_FAQS.filter(f =>
    f.question.toLowerCase().includes(lowerQuery) ||
    f.answer.toLowerCase().includes(lowerQuery) ||
    f.keywords?.some(k => lowerQuery.includes(k))
  );
  
  return { features, faqs };
}
