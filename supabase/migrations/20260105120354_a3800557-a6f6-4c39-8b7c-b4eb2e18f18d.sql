-- Create help_articles table for dynamic knowledge base
CREATE TABLE public.help_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  keywords TEXT[] DEFAULT '{}',
  route_context TEXT[] DEFAULT '{}',
  priority INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  organization_id UUID REFERENCES public.organizations(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add vector embedding column for semantic search
ALTER TABLE public.help_articles ADD COLUMN embedding extensions.vector(768);

-- Indexes for performance
CREATE INDEX help_articles_category_idx ON public.help_articles(category);
CREATE INDEX help_articles_published_idx ON public.help_articles(is_published);
CREATE INDEX help_articles_org_idx ON public.help_articles(organization_id);
CREATE INDEX help_articles_embedding_idx ON public.help_articles 
  USING hnsw (embedding extensions.vector_cosine_ops);

-- Enable RLS
ALTER TABLE public.help_articles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Anyone can read published articles
CREATE POLICY "Anyone can read published help articles"
  ON public.help_articles FOR SELECT
  USING (is_published = true);

-- Admins can manage all articles
CREATE POLICY "Admins can manage help articles"
  ON public.help_articles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_help_articles_updated_at
  BEFORE UPDATE ON public.help_articles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function for semantic search
CREATE OR REPLACE FUNCTION public.search_help_articles(
  query_embedding extensions.vector,
  match_route TEXT DEFAULT NULL,
  match_category TEXT DEFAULT NULL,
  match_threshold FLOAT DEFAULT 0.5,
  match_count INTEGER DEFAULT 5
) RETURNS TABLE (
  id UUID,
  title TEXT,
  content TEXT,
  category TEXT,
  keywords TEXT[],
  similarity FLOAT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ha.id,
    ha.title,
    ha.content,
    ha.category,
    ha.keywords,
    (1 - (ha.embedding <=> query_embedding))::FLOAT as similarity
  FROM public.help_articles ha
  WHERE ha.is_published = true
    AND ha.embedding IS NOT NULL
    AND (match_route IS NULL OR match_route = ANY(ha.route_context))
    AND (match_category IS NULL OR ha.category = match_category)
    AND (1 - (ha.embedding <=> query_embedding)) > match_threshold
  ORDER BY ha.priority DESC, ha.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Seed some initial help articles
INSERT INTO public.help_articles (title, content, category, keywords, route_context, priority) VALUES
('Cách tạo Brand Template mới', 
'## Tạo Brand Template

1. Vào menu **Thương hiệu** hoặc click nút "+ Tạo mới"
2. Điền thông tin cơ bản:
   - Tên thương hiệu
   - Ngành hàng
   - Tone of voice
3. Tùy chỉnh Brand Voice nếu cần
4. Lưu template

**Tips:** Chọn ngành hàng phù hợp để AI hiểu context tốt hơn.',
'brand', 
ARRAY['brand', 'thương hiệu', 'template', 'tạo mới'], 
ARRAY['/brands', '/brands/new', '/'], 
10),

('Sử dụng AI Kho Ý Tưởng', 
'## AI Kho Ý Tưởng (Topic Hub)

AI Kho Ý Tưởng giúp bạn brainstorm ý tưởng content:

1. Truy cập **Kho Ý Tưởng** từ menu
2. Nhập chủ đề hoặc mô tả sản phẩm
3. AI sẽ gợi ý các góc tiếp cận khác nhau
4. Chọn ý tưởng phù hợp để phát triển

**Lưu ý:** Kết hợp với Brand Template để content nhất quán.',
'content', 
ARRAY['ý tưởng', 'topic', 'brainstorm', 'content'], 
ARRAY['/topics', '/'], 
9),

('Tạo nội dung đa kênh', 
'## Multichannel Content

Tạo nội dung cho nhiều kênh cùng lúc:

1. Vào **Đa kênh** từ menu
2. Chọn Brand Template
3. Nhập nội dung gốc hoặc ý tưởng
4. Chọn các kênh muốn tạo (Facebook, Instagram, TikTok...)
5. AI tự động adapt content cho từng kênh

**Tips:** Mỗi kênh có đặc thù riêng, AI sẽ điều chỉnh độ dài và format phù hợp.',
'content', 
ARRAY['multichannel', 'đa kênh', 'facebook', 'instagram', 'tiktok'], 
ARRAY['/multichannel', '/'], 
8),

('Quản lý lịch đăng bài', 
'## Content Calendar

Lên lịch và quản lý nội dung:

1. Truy cập **Lịch đăng** từ menu
2. Xem nội dung theo ngày/tuần/tháng
3. Kéo thả để đổi ngày đăng
4. Click để xem chi tiết hoặc chỉnh sửa

**Tính năng:**
- Lọc theo kênh
- Lọc theo trạng thái
- Export lịch',
'calendar', 
ARRAY['lịch', 'calendar', 'đăng bài', 'schedule'], 
ARRAY['/calendar', '/'], 
7),

('Cài đặt AI cho Admin', 
'## AI Settings (Admin)

Quản trị viên có thể cấu hình AI:

1. Vào **Admin** > **AI Settings**
2. Cấu hình model cho từng function
3. Điều chỉnh temperature, max tokens
4. Thiết lập cache policy

**Lưu ý:** Chỉ Admin mới có quyền truy cập phần này.',
'admin', 
ARRAY['admin', 'ai', 'settings', 'cấu hình'], 
ARRAY['/admin/ai', '/admin'], 
6);