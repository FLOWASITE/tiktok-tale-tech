import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { LandingNav } from '@/landing/components/LandingNav';
import { FooterSection } from '@/landing/components/FooterSection';
import { 
  ArrowLeft, 
  Clock, 
  User, 
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Target,
  BarChart3,
  FileText,
  Copy,
  Layers,
  RefreshCw,
  LineChart,
  Facebook,
  Instagram,
  Linkedin,
  Twitter,
  Mail,
  Globe,
  Smartphone,
  Youtube,
  MessageCircle,
  Sparkles,
  ArrowRight,
  BookOpen,
  Lightbulb,
  TrendingUp,
  Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { 
  ReadingProgress, 
  SocialShare, 
  BlogReactions, 
  BlogComments, 
  RelatedPosts,
  BlogBreadcrumb,
  blogPostsData 
} from '@/components/blog';
import { SEOHead, HowToSEOSchema, TOCSEOSchema } from '@/components/SEOHead';

const POST_SLUG = 'cach-tao-content-da-kenh';
const POST_CATEGORY = 'Strategy';

const BlogPostMultiChannel = () => {
  const tableOfContents = [
    { id: 'section-1', title: '1. Content Đa Kênh Là Gì? Tại Sao Quan Trọng?' },
    { id: 'section-2', title: '2. 5 Sai Lầm Phổ Biến Khi Làm Content Đa Kênh' },
    { id: 'section-3', title: '3. Framework CORE: Quy Trình 4 Bước' },
    { id: 'section-4', title: '4. Đặc Điểm Từng Kênh: Cheat Sheet' },
    { id: 'section-5', title: '5. Content Pillars: Nền Tảng Chiến Lược' },
    { id: 'section-6', title: '6. Repurpose Content: Nghệ Thuật "1 Thành 10"' },
    { id: 'section-7', title: '7. Tools & Resources Hỗ Trợ' },
    { id: 'section-8', title: '8. Case Study: Từ 1 Blog Thành 30 Content' },
    { id: 'section-9', title: '9. Templates Miễn Phí' },
    { id: 'section-10', title: '10. Kết Luận & Next Steps' },
  ];

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Cách Tạo Content Đa Kênh: Hướng Dẫn Toàn Diện Từ A-Z [2026]"
        description="Học cách tạo content cho 10+ kênh từ 1 ý tưởng duy nhất. Bao gồm framework, templates, tools và case studies thực tế."
        canonicalPath="/blog/cach-tao-content-da-kenh"
        ogType="article"
        ogImage="https://images.unsplash.com/photo-1432888622747-4eb9a8efeb07?w=1200&h=630&fit=crop"
        article={{ author: 'Flowa Team', publishDate: '2026-01-15T00:00:00+07:00', section: 'Guide', tags: ['content đa kênh', 'hướng dẫn', 'framework', 'marketing'], readingTime: 'PT25M', wordCount: 6500, authorUrl: 'https://flowa.vn', authorJobTitle: 'Content Marketing Team' }}
        breadcrumbs={[
          { name: 'Trang chủ', url: '/' },
          { name: 'Blog', url: '/blog' },
          { name: 'Cách Tạo Content Đa Kênh', url: '/blog/cach-tao-content-da-kenh' },
        ]}
      />
      <HowToSEOSchema
        name="Cách Tạo Content Đa Kênh: Hướng Dẫn Toàn Diện Từ A-Z"
        description="Quy trình 4 bước tạo content đa kênh hiệu quả từ 1 ý tưởng duy nhất."
        steps={[
          { name: 'Create - Tạo Core Content', text: 'Viết 1 bài pillar content chất lượng cao (blog post 2000+ từ) làm nền tảng.' },
          { name: 'Optimize - Tối ưu cho từng kênh', text: 'Adapt nội dung theo format, tone và đặc thù của từng platform.' },
          { name: 'Repurpose - Nhân bản nội dung', text: 'Biến 1 bài gốc thành 10+ formats: carousel, video script, email, thread.' },
          { name: 'Evaluate - Đo lường hiệu quả', text: 'Track metrics từng kênh, A/B test và tối ưu liên tục.' },
        ]}
      />
      <TOCSEOSchema
        items={tableOfContents.map((item) => ({
          name: item.title,
          url: `https://tiktok-tale-tech.lovable.app/blog/cach-tao-content-da-kenh#${item.id}`,
        }))}
      />
      {/* Reading Progress */}
      <ReadingProgress />

      {/* Navigation */}
      <LandingNav />

      {/* Secondary Nav - Back to Blog */}
      <div className="sticky top-16 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-12">
            <Link to="/blog" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" />
              <span className="font-medium">Blog</span>
            </Link>
            <div className="flex items-center gap-2">
              <BlogReactions postSlug={POST_SLUG} />
            </div>
          </div>
        </div>
      </div>

      {/* Hero */}
      <section className="relative py-12 lg:py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          {/* Breadcrumb */}
          <div className="mb-6">
            <BlogBreadcrumb postTitle="Cách Tạo Content Đa Kênh" />
          </div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Badge variant="outline" className="mb-4 border-primary/30 text-primary">
              Guide
            </Badge>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 leading-tight">
              Cách Tạo Content Đa Kênh:{' '}
              <span className="bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
                Hướng Dẫn Toàn Diện
              </span>{' '}
              Từ A-Z [2026]
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Học cách tạo content cho 10+ kênh từ 1 ý tưởng duy nhất. Bao gồm framework, templates, tools và case studies thực tế. Tiết kiệm 80% thời gian ngay hôm nay.
            </p>
            <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground mb-6">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Flowa Team
              </div>
              <time dateTime="2026-01-15" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Tháng 1, 2026
              </time>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                25 phút đọc
              </div>
            </div>
            <SocialShare 
              title="Cách Tạo Content Đa Kênh: Hướng Dẫn Toàn Diện Từ A-Z [2026]"
              description="Học cách tạo content cho 10+ kênh từ 1 ý tưởng duy nhất."
            />
          </motion.div>
        </div>
      </section>

      {/* Hero Image */}
      <section className="pb-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="rounded-3xl overflow-hidden shadow-2xl shadow-primary/10"
          >
            <img
              src="https://images.unsplash.com/photo-1432888622747-4eb9a8efeb07?w=1200&h=600&fit=crop"
              alt="Hướng dẫn tạo content đa kênh toàn diện từ A-Z"
              className="w-full h-auto"
              loading="lazy"
              width={1200}
              height={600}
            />
          </motion.div>
        </div>
      </section>

      {/* Mobile Table of Contents */}
      <section className="lg:hidden py-4 border-b border-border/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="toc" className="border-none">
              <AccordionTrigger className="py-3 px-4 bg-muted/50 rounded-xl hover:bg-muted/70 transition-colors">
                <span className="flex items-center gap-2 font-semibold text-sm">
                  <FileText className="w-4 h-4" />
                  Mục lục bài viết
                </span>
              </AccordionTrigger>
              <AccordionContent className="pt-2">
                <nav className="space-y-1 bg-card rounded-xl p-3 border border-border/50">
                  {tableOfContents.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => scrollToSection(item.id)}
                      className="block w-full text-left py-2.5 px-3 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors"
                    >
                      {item.title}
                    </button>
                  ))}
                </nav>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* Content */}
      <section className="py-8 lg:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-[280px_1fr] gap-12">
            {/* Sidebar - Table of Contents */}
            <aside className="hidden lg:block">
              <div className="sticky top-24">
                <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">
                  Mục lục
                </h3>
                <nav className="space-y-1">
                  {tableOfContents.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => scrollToSection(item.id)}
                      className="block w-full text-left py-2 px-3 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors"
                    >
                      {item.title}
                    </button>
                  ))}
                </nav>

                {/* CTA Card */}
                <div className="mt-8 p-4 rounded-xl bg-gradient-to-br from-primary/10 to-purple-500/10 border border-primary/20">
                  <h4 className="font-semibold mb-2">Tự động hóa content</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Tạo content cho 12 kênh trong 10 phút
                  </p>
                  <Button size="sm" className="w-full" asChild>
                    <Link to="/auth">Dùng thử Flowa</Link>
                  </Button>
                </div>
              </div>
            </aside>

            {/* Main Content */}
            <article className="prose prose-lg dark:prose-invert max-w-none">
              {/* Section 1 */}
              <section id="section-1" className="scroll-mt-24">
                <h2 className="text-2xl lg:text-3xl font-bold mb-6 flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center text-lg font-bold">1</span>
                  Content Đa Kênh Là Gì? Tại Sao Quan Trọng?
                </h2>

                <h3 className="text-xl font-bold mb-4">Định Nghĩa</h3>
                
                <div className="p-6 rounded-2xl bg-gradient-to-br from-primary/10 via-purple-500/5 to-pink-500/10 border border-primary/20 mb-8">
                  <p className="text-lg leading-relaxed">
                    <strong>Content đa kênh (Multi-channel Content)</strong> là chiến lược tạo và phân phối nội dung trên nhiều nền tảng khác nhau một cách có hệ thống, đảm bảo thông điệp nhất quán nhưng được tối ưu riêng cho từng kênh.
                  </p>
                </div>

                <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                  Khác với việc đơn giản copy-paste một bài viết lên nhiều nơi, content đa kênh đòi hỏi:
                </p>

                <div className="grid sm:grid-cols-2 gap-4 mb-8">
                  {[
                    { icon: Target, text: 'Hiểu đặc thù từng platform (format, tone, audience behavior)' },
                    { icon: RefreshCw, text: 'Adapt nội dung phù hợp với context của từng kênh' },
                    { icon: Sparkles, text: 'Giữ brand voice nhất quán xuyên suốt' },
                    { icon: LineChart, text: 'Tối ưu cho mục tiêu của từng nền tảng' },
                  ].map((item, i) => (
                    <div key={i} className="p-4 rounded-xl bg-card border border-border/50 flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <item.icon className="w-4 h-4" />
                      </div>
                      <span className="text-sm">{item.text}</span>
                    </div>
                  ))}
                </div>

                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-500" />
                  Tại Sao Content Đa Kênh Quan Trọng Hơn Bao Giờ Hết?
                </h3>

                <div className="space-y-6 mb-8">
                  <div className="p-5 rounded-xl bg-muted/50 border-l-4 border-blue-500">
                    <h4 className="font-bold mb-2">Lý do 1: Khách hàng ở khắp nơi</h4>
                    <p className="text-muted-foreground text-sm mb-3">Theo nghiên cứu của Salesforce 2025:</p>
                    <ul className="space-y-1 text-sm">
                      <li>• Người tiêu dùng trung bình sử dụng <strong>7.6 kênh</strong> để tương tác với brands</li>
                      <li>• <strong>73% khách hàng</strong> expect trải nghiệm nhất quán across channels</li>
                      <li>• <strong>86% buyers</strong> sẵn sàng trả thêm cho trải nghiệm tốt hơn</li>
                    </ul>
                  </div>

                  <div className="p-5 rounded-xl bg-muted/50 border-l-4 border-orange-500">
                    <h4 className="font-bold mb-2">Lý do 2: Thuật toán thay đổi liên tục</h4>
                    <div className="bg-card rounded-lg p-4 font-mono text-sm mb-3">
                      <div>2020: Facebook organic reach ~5.2%</div>
                      <div>2022: Facebook organic reach ~2.2%</div>
                      <div>2024: Facebook organic reach ~1.5%</div>
                      <div className="text-orange-500">2026: Facebook organic reach ~0.8% (dự đoán)</div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Phụ thuộc vào 1 kênh = rủi ro cực lớn. <strong>Đa kênh = đa dạng hóa rủi ro.</strong>
                    </p>
                  </div>

                  <div className="p-5 rounded-xl bg-muted/50 border-l-4 border-green-500">
                    <h4 className="font-bold mb-2">Lý do 3: Mỗi kênh phục vụ mục đích khác nhau</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border-collapse mt-3">
                        <thead>
                          <tr className="bg-muted">
                            <th className="p-2 text-left font-semibold border-b border-border">Kênh</th>
                            <th className="p-2 text-left font-semibold border-b border-border">Mục đích chính</th>
                            <th className="p-2 text-left font-semibold border-b border-border">Giai đoạn</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            { channel: 'TikTok', purpose: 'Discovery, Awareness', stage: 'Top of Funnel' },
                            { channel: 'Instagram', purpose: 'Engagement, Lifestyle', stage: 'Top-Mid Funnel' },
                            { channel: 'Facebook', purpose: 'Community, Nurturing', stage: 'Mid Funnel' },
                            { channel: 'LinkedIn', purpose: 'Authority, B2B', stage: 'Mid Funnel' },
                            { channel: 'Blog/SEO', purpose: 'Education, Trust', stage: 'Mid Funnel' },
                            { channel: 'Email', purpose: 'Conversion, Retention', stage: 'Bottom Funnel' },
                          ].map((row, i) => (
                            <tr key={i} className="hover:bg-muted/30">
                              <td className="p-2 border-b border-border/50 font-medium">{row.channel}</td>
                              <td className="p-2 border-b border-border/50">{row.purpose}</td>
                              <td className="p-2 border-b border-border/50 text-primary">{row.stage}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  Thống Kê Đáng Chú Ý
                </h3>

                <div className="overflow-x-auto mb-8">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-gradient-to-r from-primary/10 to-purple-500/10">
                        <th className="p-3 text-left font-semibold border-b border-border">Metric</th>
                        <th className="p-3 text-left font-semibold border-b border-border">Single-channel</th>
                        <th className="p-3 text-left font-semibold border-b border-border">Multi-channel</th>
                        <th className="p-3 text-left font-semibold border-b border-border text-green-500">Difference</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { metric: 'Customer retention', single: '33%', multi: '89%', diff: '+170%' },
                        { metric: 'Purchase frequency', single: '1.8x', multi: '3.2x', diff: '+78%' },
                        { metric: 'Average order value', single: 'Baseline', multi: '+13%', diff: '+13%' },
                        { metric: 'Customer lifetime value', single: 'Baseline', multi: '+30%', diff: '+30%' },
                      ].map((row, i) => (
                        <tr key={i} className="hover:bg-muted/30">
                          <td className="p-3 border-b border-border/50 font-medium">{row.metric}</td>
                          <td className="p-3 border-b border-border/50 text-muted-foreground">{row.single}</td>
                          <td className="p-3 border-b border-border/50 font-medium">{row.multi}</td>
                          <td className="p-3 border-b border-border/50 text-green-500 font-bold">{row.diff}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-sm text-muted-foreground italic text-center">Nguồn: Harvard Business Review, McKinsey 2025</p>
              </section>

              {/* Section 2 */}
              <section id="section-2" className="scroll-mt-24 mt-16">
                <h2 className="text-2xl lg:text-3xl font-bold mb-6 flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center text-lg font-bold">2</span>
                  5 Sai Lầm Phổ Biến Khi Làm Content Đa Kênh
                </h2>

                <p className="text-lg text-muted-foreground mb-8">
                  Trước khi đi vào "cách làm đúng", hãy điểm qua những sai lầm phổ biến mà hầu hết marketers mắc phải.
                </p>

                {/* Mistake 1 */}
                <div className="mb-8 p-6 rounded-2xl border border-red-500/20 bg-red-500/5">
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    Sai Lầm #1: Copy-Paste Nguyên Xi
                  </h3>
                  
                  <div className="bg-card rounded-xl p-4 mb-4 font-mono text-sm">
                    <div className="mb-2"><strong>Facebook:</strong> "5 cách chăm sóc da mùa đông hiệu quả..."</div>
                    <div className="mb-2"><strong>Instagram:</strong> "5 cách chăm sóc da mùa đông hiệu quả..."</div>
                    <div><strong>LinkedIn:</strong> "5 cách chăm sóc da mùa đông hiệu quả..."</div>
                  </div>

                  <h4 className="font-semibold mb-2 text-red-500">Vấn đề:</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground mb-4">
                    <li>• Instagram cắt caption sau 125 ký tự → người đọc không thấy nội dung chính</li>
                    <li>• LinkedIn audience không care về skincare routine cá nhân</li>
                    <li>• Không có hashtags cho Instagram, không có formatting cho LinkedIn</li>
                    <li>• Engagement thấp vì content không native với platform</li>
                  </ul>

                  <h4 className="font-semibold mb-2 text-green-500 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Cách khắc phục:
                  </h4>
                  <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-3">
                    <div>
                      <strong>Facebook (Community-focused):</strong>
                      <p className="text-muted-foreground mt-1">"Mùa đông này da bạn có đang 'kêu cứu' không? 🥶 Mình vừa thử 5 cách này và da đỡ khô hẳn! [Đọc tiếp trong comments]"</p>
                    </div>
                    <div>
                      <strong>Instagram (Visual-first):</strong>
                      <p className="text-muted-foreground mt-1">"Da khô mùa đông? Save ngay 5 tips này! 💧 #skincare #winterskincare #beautytips"</p>
                    </div>
                    <div>
                      <strong>LinkedIn (Professional angle):</strong>
                      <p className="text-muted-foreground mt-1">"Là marketer, tôi họp online 6-8 tiếng/ngày. Điều hòa + màn hình = da khô, mệt mỏi. Đây là routine 5 phút buổi sáng giúp tôi luôn fresh trước camera..."</p>
                    </div>
                  </div>
                </div>

                {/* Mistake 2 */}
                <div className="mb-8 p-6 rounded-2xl border border-red-500/20 bg-red-500/5">
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    Sai Lầm #2: Không Có Content Pillars
                  </h3>
                  
                  <p className="text-muted-foreground mb-4 text-sm">
                    Thứ 2: Post về sản phẩm mới → Thứ 3: Share meme → Thứ 4: Behind-the-scenes → Thứ 5: Quote truyền cảm hứng... 
                    Không có chủ đề nhất quán, audience confused về brand identity.
                  </p>

                  <h4 className="font-semibold mb-2 text-green-500 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Cách khắc phục - Xây dựng 3-5 Content Pillars:
                  </h4>
                  <div className="grid sm:grid-cols-2 gap-3 mt-4">
                    {[
                      { pillar: 'Education', percent: '40%', examples: 'Ingredient spotlights, Tutorials, Myths debunked' },
                      { pillar: 'Behind-the-scenes', percent: '25%', examples: 'Product dev, Team stories, Factory tours' },
                      { pillar: 'User-generated', percent: '20%', examples: 'Customer reviews, Before/after, Testimonials' },
                      { pillar: 'Promotion', percent: '15%', examples: 'New launches, Sales/offers, Bundle deals' },
                    ].map((item, i) => (
                      <div key={i} className="p-3 rounded-lg bg-card border border-border/50">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-semibold">{item.pillar}</span>
                          <Badge variant="outline">{item.percent}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{item.examples}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Mistake 3 */}
                <div className="mb-8 p-6 rounded-2xl border border-red-500/20 bg-red-500/5">
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    Sai Lầm #3: Bỏ Qua Platform-Specific Features
                  </h3>
                  
                  <ul className="space-y-1 text-sm text-muted-foreground mb-4">
                    <li>• Đăng video ngang trên TikTok (platform dọc)</li>
                    <li>• Không dùng hashtags trên Instagram</li>
                    <li>• Không tag people trên LinkedIn</li>
                    <li>• Đăng link trên Instagram feed (không click được)</li>
                  </ul>

                  <h4 className="font-semibold mb-2 text-green-500 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Cách khắc phục - Hiểu và tận dụng features:
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse mt-3">
                      <thead>
                        <tr className="bg-muted">
                          <th className="p-2 text-left font-semibold border-b border-border">Platform</th>
                          <th className="p-2 text-left font-semibold border-b border-border">Must-use Features</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { platform: 'Instagram', features: 'Hashtags (20-30), Location tag, Alt text, Collab posts' },
                          { platform: 'TikTok', features: 'Trending sounds, Duet/Stitch, Hashtag challenges' },
                          { platform: 'LinkedIn', features: 'Document posts, Polls, Tag people, Newsletter' },
                          { platform: 'Facebook', features: 'Groups, Live, Events, Reels' },
                          { platform: 'Twitter/X', features: 'Threads, Polls, Spaces, Communities' },
                        ].map((row, i) => (
                          <tr key={i} className="hover:bg-muted/30">
                            <td className="p-2 border-b border-border/50 font-medium">{row.platform}</td>
                            <td className="p-2 border-b border-border/50">{row.features}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Mistake 4 & 5 */}
                <div className="grid md:grid-cols-2 gap-4 mb-8">
                  <div className="p-5 rounded-xl border border-red-500/20 bg-red-500/5">
                    <h4 className="font-bold mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                      Sai Lầm #4: Inconsistent Posting
                    </h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Tuần 1: 15 posts → Tuần 2: 3 posts → Tuần 3: 0 posts → Tuần 4: 20 posts
                    </p>
                    <p className="text-xs text-green-500">
                      ✓ Khắc phục: Sustainable schedule {">"} Aggressive schedule
                    </p>
                  </div>
                  <div className="p-5 rounded-xl border border-red-500/20 bg-red-500/5">
                    <h4 className="font-bold mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                      Sai Lầm #5: Không Đo Lường Cross-Channel
                    </h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Track metrics riêng lẻ, không biết kênh nào drive conversions
                    </p>
                    <p className="text-xs text-green-500">
                      ✓ Khắc phục: Unified tracking với UTM parameters
                    </p>
                  </div>
                </div>
              </section>

              {/* Section 3 - CORE Framework */}
              <section id="section-3" className="scroll-mt-24 mt-16">
                <h2 className="text-2xl lg:text-3xl font-bold mb-6 flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-green-500/10 text-green-500 flex items-center justify-center text-lg font-bold">3</span>
                  Framework CORE: Quy Trình 4 Bước Tạo Content Đa Kênh
                </h2>

                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  {[
                    { letter: 'C', word: 'Create', desc: 'Tạo content gốc', color: 'bg-blue-500' },
                    { letter: 'O', word: 'Optimize', desc: 'Tối ưu cho từng kênh', color: 'bg-purple-500' },
                    { letter: 'R', word: 'Repurpose', desc: 'Chuyển đổi format', color: 'bg-pink-500' },
                    { letter: 'E', word: 'Evaluate', desc: 'Đánh giá & học hỏi', color: 'bg-orange-500' },
                  ].map((item, i) => (
                    <div key={i} className="relative p-4 rounded-xl bg-card border border-border/50 text-center">
                      <div className={`w-12 h-12 ${item.color} text-white rounded-xl flex items-center justify-center text-2xl font-bold mx-auto mb-3`}>
                        {item.letter}
                      </div>
                      <h4 className="font-bold">{item.word}</h4>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                  ))}
                </div>

                {/* Step 1: Create */}
                <div className="mb-8 p-6 rounded-2xl bg-blue-500/5 border border-blue-500/20">
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-500 text-white rounded-lg flex items-center justify-center text-sm font-bold">C</div>
                    Bước 1: CREATE — Tạo Content Gốc
                  </h3>
                  
                  <p className="text-muted-foreground mb-4">
                    <strong>Mục tiêu:</strong> Tạo 1 piece of content "master" chất lượng cao, có thể adapt sang nhiều kênh.
                  </p>

                  <h4 className="font-semibold mb-3">Best format cho content gốc:</h4>
                  <div className="overflow-x-auto mb-4">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-muted/50">
                          <th className="p-2 text-left font-semibold border-b border-border">Format Gốc</th>
                          <th className="p-2 text-left font-semibold border-b border-border">Dễ Repurpose Sang</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { format: 'Blog post (2000+ từ)', repurpose: 'Social posts, email, infographic, video script' },
                          { format: 'Video dài (10+ phút)', repurpose: 'Shorts, reels, quotes, blog post' },
                          { format: 'Podcast episode', repurpose: 'Blog post, social quotes, audiogram' },
                          { format: 'Webinar/Livestream', repurpose: 'Clips, blog recap, social posts' },
                        ].map((row, i) => (
                          <tr key={i} className="hover:bg-muted/30">
                            <td className="p-2 border-b border-border/50 font-medium">{row.format}</td>
                            <td className="p-2 border-b border-border/50">{row.repurpose}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="bg-card rounded-xl p-4">
                    <h4 className="font-semibold mb-2">📝 Content Master Template:</h4>
                    <div className="text-sm space-y-1 text-muted-foreground">
                      <div><strong>1. HOOK:</strong> Attention-grabbing opening</div>
                      <div><strong>2. PROBLEM:</strong> Pain point</div>
                      <div><strong>3. AGITATE:</strong> Make it worse</div>
                      <div><strong>4. SOLUTION:</strong> Your answer</div>
                      <div><strong>5. HOW-TO:</strong> Step-by-step</div>
                      <div><strong>6. PROOF:</strong> Evidence</div>
                      <div><strong>7. CTA:</strong> Next step</div>
                    </div>
                  </div>
                </div>

                {/* Step 2: Optimize */}
                <div className="mb-8 p-6 rounded-2xl bg-purple-500/5 border border-purple-500/20">
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <div className="w-8 h-8 bg-purple-500 text-white rounded-lg flex items-center justify-center text-sm font-bold">O</div>
                    Bước 2: OPTIMIZE — Tối Ưu Cho Từng Kênh
                  </h3>

                  <p className="text-muted-foreground mb-4">
                    <strong>Mục tiêu:</strong> Adapt content gốc thành versions native cho từng platform.
                  </p>

                  <h4 className="font-semibold mb-3">Optimization Matrix:</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-muted/50">
                          <th className="p-2 text-left font-semibold border-b border-border">Element</th>
                          <th className="p-2 text-left font-semibold border-b border-border">Facebook</th>
                          <th className="p-2 text-left font-semibold border-b border-border">Instagram</th>
                          <th className="p-2 text-left font-semibold border-b border-border">LinkedIn</th>
                          <th className="p-2 text-left font-semibold border-b border-border">TikTok</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { element: 'Tone', fb: 'Casual', ig: 'Aspirational', li: 'Professional', tt: 'Fun, trendy' },
                          { element: 'Length', fb: '100-250 words', ig: '50-150 words', li: '150-300 words', tt: '50-100 words' },
                          { element: 'Hashtags', fb: '1-3', ig: '20-30', li: '3-5', tt: '3-5 trending' },
                          { element: 'Emojis', fb: 'Moderate', ig: 'Heavy', li: 'Light', tt: 'Heavy' },
                          { element: 'Best time', fb: '1-4pm', ig: '11am-1pm', li: '8-10am', tt: '7-9pm' },
                        ].map((row, i) => (
                          <tr key={i} className="hover:bg-muted/30">
                            <td className="p-2 border-b border-border/50 font-medium">{row.element}</td>
                            <td className="p-2 border-b border-border/50">{row.fb}</td>
                            <td className="p-2 border-b border-border/50">{row.ig}</td>
                            <td className="p-2 border-b border-border/50">{row.li}</td>
                            <td className="p-2 border-b border-border/50">{row.tt}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Step 3: Repurpose */}
                <div className="mb-8 p-6 rounded-2xl bg-pink-500/5 border border-pink-500/20">
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <div className="w-8 h-8 bg-pink-500 text-white rounded-lg flex items-center justify-center text-sm font-bold">R</div>
                    Bước 3: REPURPOSE — Chuyển Đổi Format
                  </h3>

                  <p className="text-muted-foreground mb-4">
                    <strong>Mục tiêu:</strong> Biến 1 content thành nhiều formats khác nhau để maximize reach.
                  </p>

                  <div className="bg-card rounded-xl p-4 mb-4">
                    <h4 className="font-semibold mb-3">Repurpose Map từ Blog Post:</h4>
                    <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                      {[
                        '→ Infographic',
                        '→ Carousel (10 slides)',
                        '→ Video script',
                        '→ Podcast talking points',
                        '→ Email newsletter',
                        '→ Twitter thread',
                        '→ LinkedIn document',
                        '→ Quote graphics',
                        '→ FAQ content',
                      ].map((item, i) => (
                        <div key={i} className="p-2 rounded-lg bg-muted/50">{item}</div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-muted/50 rounded-lg p-4 text-sm">
                    <strong>Repurpose Timeline:</strong>
                    <div className="mt-2 space-y-1 text-muted-foreground">
                      <div>Ngày 1: Publish blog post</div>
                      <div>Ngày 2: Share trên LinkedIn</div>
                      <div>Ngày 3: Twitter thread</div>
                      <div>Ngày 4: Instagram carousel</div>
                      <div>Ngày 5-7: TikTok/Reels, Email</div>
                      <div>Ngày 8-14: Quote graphics (1/ngày)</div>
                    </div>
                  </div>
                </div>

                {/* Step 4: Evaluate */}
                <div className="p-6 rounded-2xl bg-orange-500/5 border border-orange-500/20">
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <div className="w-8 h-8 bg-orange-500 text-white rounded-lg flex items-center justify-center text-sm font-bold">E</div>
                    Bước 4: EVALUATE — Đánh Giá & Học Hỏi
                  </h3>

                  <p className="text-muted-foreground mb-4">
                    <strong>Mục tiêu:</strong> Measure performance, learn what works, optimize future content.
                  </p>

                  <div className="grid sm:grid-cols-3 gap-4">
                    <div className="p-3 rounded-lg bg-card border border-border/50">
                      <h4 className="font-semibold text-sm mb-2">Awareness Metrics</h4>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        <li>• Reach / Impressions</li>
                        <li>• Video views</li>
                        <li>• New followers</li>
                      </ul>
                    </div>
                    <div className="p-3 rounded-lg bg-card border border-border/50">
                      <h4 className="font-semibold text-sm mb-2">Engagement Metrics</h4>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        <li>• Likes, Comments, Shares</li>
                        <li>• Save rate</li>
                        <li>• Click-through rate</li>
                      </ul>
                    </div>
                    <div className="p-3 rounded-lg bg-card border border-border/50">
                      <h4 className="font-semibold text-sm mb-2">Conversion Metrics</h4>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        <li>• Link clicks</li>
                        <li>• Lead submissions</li>
                        <li>• Sales attributed</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </section>

              {/* Section 4 - Channel Cheat Sheets */}
              <section id="section-4" className="scroll-mt-24 mt-16">
                <h2 className="text-2xl lg:text-3xl font-bold mb-6 flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center text-lg font-bold">4</span>
                  Đặc Điểm Từng Kênh: Cheat Sheet Hoàn Chỉnh
                </h2>

                <div className="grid gap-6">
                  {/* Facebook */}
                  <div className="p-6 rounded-2xl border border-blue-500/30 bg-blue-500/5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-blue-500 text-white flex items-center justify-center">
                        <Facebook className="w-5 h-5" />
                      </div>
                      <h3 className="text-xl font-bold">Facebook Cheat Sheet</h3>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground mb-2"><strong>Audience:</strong> 25-54 tuổi, đa dạng</p>
                        <p className="text-muted-foreground mb-2"><strong>Algorithm loves:</strong> Comments, Shares, Watch time</p>
                        <p className="text-muted-foreground"><strong>Best times:</strong> 1-4pm weekdays, 12-1pm weekends</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-2"><strong>Post length:</strong> 100-250 words optimal</p>
                        <p className="text-muted-foreground mb-2"><strong>Hashtags:</strong> 1-3 (không quan trọng như IG)</p>
                        <p className="text-muted-foreground"><strong>Frequency:</strong> 1-2 posts/ngày</p>
                      </div>
                    </div>
                  </div>

                  {/* Instagram */}
                  <div className="p-6 rounded-2xl border border-pink-500/30 bg-pink-500/5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 text-white flex items-center justify-center">
                        <Instagram className="w-5 h-5" />
                      </div>
                      <h3 className="text-xl font-bold">Instagram Cheat Sheet</h3>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground mb-2"><strong>Audience:</strong> 18-34 tuổi, visual-oriented</p>
                        <p className="text-muted-foreground mb-2"><strong>Algorithm loves:</strong> Saves, Shares, Reels watch time</p>
                        <p className="text-muted-foreground"><strong>Best times:</strong> 11am-1pm, 7-9pm</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-2"><strong>Caption:</strong> 125 chars before "more"</p>
                        <p className="text-muted-foreground mb-2"><strong>Hashtags:</strong> 20-30 (mix popular + niche)</p>
                        <p className="text-muted-foreground"><strong>Frequency:</strong> 1 post/ngày, 5-10 stories</p>
                      </div>
                    </div>
                  </div>

                  {/* LinkedIn */}
                  <div className="p-6 rounded-2xl border border-blue-700/30 bg-blue-700/5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-blue-700 text-white flex items-center justify-center">
                        <Linkedin className="w-5 h-5" />
                      </div>
                      <h3 className="text-xl font-bold">LinkedIn Cheat Sheet</h3>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground mb-2"><strong>Audience:</strong> Professionals, B2B, 25-54 tuổi</p>
                        <p className="text-muted-foreground mb-2"><strong>Algorithm loves:</strong> Dwell time, Comments, Document posts</p>
                        <p className="text-muted-foreground"><strong>Best times:</strong> 8-10am, 12pm, 5-6pm (weekdays)</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-2"><strong>Post length:</strong> 150-300 words</p>
                        <p className="text-muted-foreground mb-2"><strong>Hashtags:</strong> 3-5</p>
                        <p className="text-muted-foreground"><strong>Frequency:</strong> 3-5 posts/tuần</p>
                      </div>
                    </div>
                  </div>

                  {/* TikTok */}
                  <div className="p-6 rounded-2xl border border-red-500/30 bg-red-500/5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-black text-white flex items-center justify-center">
                        <Smartphone className="w-5 h-5" />
                      </div>
                      <h3 className="text-xl font-bold">TikTok Cheat Sheet</h3>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground mb-2"><strong>Audience:</strong> 16-34 tuổi (đang mở rộng)</p>
                        <p className="text-muted-foreground mb-2"><strong>Algorithm loves:</strong> Watch time, Rewatches, Shares</p>
                        <p className="text-muted-foreground"><strong>Best times:</strong> 7-9am, 12-3pm, 7-11pm</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-2"><strong>Optimal length:</strong> 21-34 giây</p>
                        <p className="text-muted-foreground mb-2"><strong>Hashtags:</strong> 3-5 trending</p>
                        <p className="text-muted-foreground"><strong>Frequency:</strong> 1-4 videos/ngày</p>
                      </div>
                    </div>
                  </div>

                  {/* Email */}
                  <div className="p-6 rounded-2xl border border-green-500/30 bg-green-500/5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-green-500 text-white flex items-center justify-center">
                        <Mail className="w-5 h-5" />
                      </div>
                      <h3 className="text-xl font-bold">Email Newsletter Cheat Sheet</h3>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground mb-2"><strong>Audience:</strong> Opted-in subscribers (highest intent)</p>
                        <p className="text-muted-foreground mb-2"><strong>Subject line:</strong> 30-50 characters optimal</p>
                        <p className="text-muted-foreground"><strong>Best times:</strong> Tue-Thu, 10am hoặc 2pm</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-2"><strong>Body length:</strong> 200-500 words (short)</p>
                        <p className="text-muted-foreground mb-2"><strong>CTA:</strong> 1 primary, max 2 secondary</p>
                        <p className="text-muted-foreground"><strong>Frequency:</strong> 1-2 emails/tuần</p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Section 5 - Content Pillars */}
              <section id="section-5" className="scroll-mt-24 mt-16">
                <h2 className="text-2xl lg:text-3xl font-bold mb-6 flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center text-lg font-bold">5</span>
                  Content Pillars: Nền Tảng Của Mọi Chiến Lược
                </h2>

                <div className="p-6 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 mb-8">
                  <h3 className="text-xl font-bold mb-4">Content Pillars Là Gì?</h3>
                  <p className="text-muted-foreground mb-4">
                    <strong>Content Pillars</strong> là 3-5 chủ đề cốt lõi mà brand của bạn sẽ consistently tạo content xung quanh. Đây là "trụ cột" giúp:
                  </p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {[
                      'Xây dựng authority trong lĩnh vực cụ thể',
                      'Giúp audience biết expect gì từ bạn',
                      'Dễ dàng brainstorm ideas (có framework)',
                      'Đảm bảo content mix cân bằng',
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-cyan-500 shrink-0" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <h3 className="text-xl font-bold mb-4">Cách Xác Định Content Pillars</h3>

                <div className="space-y-4 mb-8">
                  <div className="p-4 rounded-xl bg-card border border-border/50">
                    <h4 className="font-semibold mb-2">Step 1: Liệt kê những gì brand có thể nói về</h4>
                    <p className="text-sm text-muted-foreground">
                      Ví dụ Brand Skincare: Ingredients, Skincare routines, Skin concerns, Behind-the-scenes, Customer stories, Industry trends, Lifestyle, Promotions, Team & culture, Sustainability...
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-card border border-border/50">
                    <h4 className="font-semibold mb-2">Step 2: Nhóm thành 3-5 pillars</h4>
                    <div className="grid grid-cols-5 gap-2 mt-3">
                      {[
                        { name: 'Education', percent: 40 },
                        { name: 'Community', percent: 20 },
                        { name: 'BTS', percent: 15 },
                        { name: 'Lifestyle', percent: 15 },
                        { name: 'Promotion', percent: 10 },
                      ].map((pillar, i) => (
                        <div key={i} className="text-center">
                          <div className="text-xs font-medium mb-1">{pillar.name}</div>
                          <div className="h-20 bg-muted rounded-lg relative overflow-hidden">
                            <div 
                              className="absolute bottom-0 left-0 right-0 bg-primary/30"
                              style={{ height: `${pillar.percent * 2}%` }}
                            />
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">{pillar.percent}%</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-muted/50 text-center">
                    <p className="text-sm font-medium">
                      Rule of thumb: <span className="text-primary">80% value, 20% promotion</span>
                    </p>
                  </div>
                </div>
              </section>

              {/* Section 6 - Repurpose */}
              <section id="section-6" className="scroll-mt-24 mt-16">
                <h2 className="text-2xl lg:text-3xl font-bold mb-6 flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-pink-500/10 text-pink-500 flex items-center justify-center text-lg font-bold">6</span>
                  Repurpose Content: Nghệ Thuật "1 Thành 10"
                </h2>

                <h3 className="text-xl font-bold mb-4">Tại Sao Repurpose Là Chiến Lược Thông Minh?</h3>

                <div className="grid sm:grid-cols-3 gap-4 mb-8">
                  {[
                    { title: 'Maximize ROI', desc: 'Một ý tưởng tốt mất 2-4 giờ để develop. Nếu chỉ dùng 1 lần = lãng phí.' },
                    { title: '80% không thấy', desc: 'Facebook reach ~2%, IG ~15%, Email ~25%. Repurpose = thêm cơ hội tiếp cận.' },
                    { title: 'Đa dạng format', desc: 'Người A thích đọc blog, người B xem video, người C scroll Instagram...' },
                  ].map((item, i) => (
                    <div key={i} className="p-4 rounded-xl bg-gradient-to-br from-pink-500/10 to-purple-500/10 border border-pink-500/20">
                      <h4 className="font-semibold mb-2">{item.title}</h4>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                  ))}
                </div>

                <h3 className="text-xl font-bold mb-4">Repurpose Playbook: Blog Post → Mọi Thứ Khác</h3>

                <div className="bg-card rounded-2xl p-6 border border-border/50 mb-8">
                  <div className="text-center mb-6">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary font-semibold">
                      <FileText className="w-4 h-4" />
                      BLOG POST (2000 từ)
                    </div>
                    <div className="text-2xl my-3">↓</div>
                  </div>

                  <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {[
                      { icon: Twitter, name: 'Twitter Thread', desc: '10 tweets' },
                      { icon: Layers, name: 'IG Carousel', desc: '10 slides' },
                      { icon: Linkedin, name: 'LinkedIn Post', desc: 'Summary' },
                      { icon: Smartphone, name: 'TikTok/Reels', desc: '60s video' },
                      { icon: Mail, name: 'Email', desc: 'Newsletter' },
                      { icon: BarChart3, name: 'Infographic', desc: 'Visual summary' },
                      { icon: MessageCircle, name: 'Quote Graphics', desc: '10 images' },
                      { icon: Youtube, name: 'Video Script', desc: 'For YouTube' },
                      { icon: BookOpen, name: 'FAQ Content', desc: 'From comments' },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                          <item.icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-medium text-sm">{item.name}</div>
                          <div className="text-xs text-muted-foreground">{item.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-primary/10 to-purple-500/10 text-center">
                    <p className="font-semibold text-lg">
                      = <span className="text-primary">10+ pieces of content</span> từ 1 idea
                    </p>
                  </div>
                </div>
              </section>

              {/* Section 7 - Tools */}
              <section id="section-7" className="scroll-mt-24 mt-16">
                <h2 className="text-2xl lg:text-3xl font-bold mb-6 flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center text-lg font-bold">7</span>
                  Tools & Resources Hỗ Trợ
                </h2>

                <h3 className="text-xl font-bold mb-4">Tool Stack Theo Budget</h3>

                <div className="space-y-4 mb-8">
                  <div className="p-4 rounded-xl border border-border/50">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      💰 Budget: Free (0 VNĐ)
                    </h4>
                    <div className="text-sm text-muted-foreground">
                      Google Docs (Writing) + Canva Free (Design) + Meta Business Suite (Scheduling) + Native Analytics
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-border/50">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      💰💰 Budget: Starter (500K-2M/tháng)
                    </h4>
                    <div className="text-sm text-muted-foreground">
                      ChatGPT Plus (~500K) + Canva Pro (~300K) + Buffer/Later (~400K) + Notion
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-primary/30 bg-primary/5">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      💰💰💰 Budget: Professional - <span className="text-primary">Recommended</span>
                    </h4>
                    <div className="text-sm text-muted-foreground">
                      <strong className="text-foreground">Flowa (499K+)</strong> - All-in-one: Content generation (12 kênh), Video scripts, Carousel prompts, Brand voice AI, Content calendar, Campaign management
                    </div>
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-gradient-to-br from-primary/10 via-purple-500/10 to-pink-500/10 border border-primary/20 mb-8">
                  <h3 className="text-xl font-bold mb-4">Tại Sao Flowa Là Lựa Chọn Tối Ưu?</h3>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="p-4 rounded-xl bg-card">
                      <h4 className="font-semibold mb-2 text-red-500">❌ Cách Truyền Thống:</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• ChatGPT: 500K</li>
                        <li>• Canva: 300K</li>
                        <li>• Buffer: 400K</li>
                        <li>• Notion: 200K</li>
                        <li>• + Thời gian switch giữa tools</li>
                        <li className="font-semibold text-foreground">Total: 1.4M + hidden costs</li>
                      </ul>
                    </div>
                    <div className="p-4 rounded-xl bg-card">
                      <h4 className="font-semibold mb-2 text-green-500">✓ Với Flowa:</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Content generation (12 kênh): ✅</li>
                        <li>• Video scripts: ✅</li>
                        <li>• Carousel prompts: ✅</li>
                        <li>• Brand voice AI: ✅</li>
                        <li>• Content calendar: ✅</li>
                        <li className="font-semibold text-foreground">Total: 499K (all-in-one)</li>
                      </ul>
                    </div>
                  </div>

                  <div className="mt-4 p-4 rounded-xl bg-green-500/10 text-center">
                    <p className="font-semibold text-green-600">
                      Tiết kiệm: 900K/tháng + 15 giờ/tuần
                    </p>
                  </div>
                </div>
              </section>

              {/* Section 8 - Case Study */}
              <section id="section-8" className="scroll-mt-24 mt-16">
                <h2 className="text-2xl lg:text-3xl font-bold mb-6 flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-500 flex items-center justify-center text-lg font-bold">8</span>
                  Case Study: Từ 1 Blog Post Thành 30 Pieces of Content
                </h2>

                <div className="p-6 rounded-2xl bg-muted/50 border border-border/50 mb-8">
                  <h3 className="text-xl font-bold mb-4">Bối Cảnh</h3>
                  <div className="grid sm:grid-cols-2 gap-4 text-sm">
                    <div><strong>Brand:</strong> Công ty SaaS B2B (phần mềm quản lý dự án)</div>
                    <div><strong>Team:</strong> 1 Content Marketer</div>
                    <div><strong>Challenge:</strong> Cần tăng content output mà không tăng headcount</div>
                    <div><strong>Goal:</strong> Tạo 30 pieces/tuần từ 1-2 blog posts</div>
                  </div>
                </div>

                <h3 className="text-xl font-bold mb-4">Kết Quả</h3>

                <div className="grid md:grid-cols-2 gap-6 mb-8">
                  <div className="p-5 rounded-xl bg-blue-500/10 border border-blue-500/20">
                    <h4 className="font-semibold mb-3">📥 INPUT</h4>
                    <ul className="text-sm space-y-2">
                      <li>• 1 Blog post</li>
                      <li>• 6 giờ viết gốc</li>
                      <li>• ~8 giờ repurpose (spread over 4 weeks)</li>
                    </ul>
                  </div>
                  <div className="p-5 rounded-xl bg-green-500/10 border border-green-500/20">
                    <h4 className="font-semibold mb-3">📤 OUTPUT</h4>
                    <ul className="text-sm space-y-2">
                      <li>• <strong>32 pieces</strong> of content</li>
                      <li>• <strong>12 platforms</strong> covered</li>
                      <li>• <strong>4 weeks</strong> of content từ 1 idea</li>
                    </ul>
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-gradient-to-br from-green-500/10 to-teal-500/10 border border-green-500/20">
                  <h4 className="font-semibold mb-4">📊 METRICS</h4>
                  <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {[
                      { metric: 'Blog traffic', value: '+340%' },
                      { metric: 'LinkedIn impressions', value: '45,000' },
                      { metric: 'Twitter thread', value: '2,300 likes' },
                      { metric: 'IG carousel save rate', value: '12%' },
                      { metric: 'TikTok views', value: '125,000' },
                      { metric: 'Total reach', value: '~500K' },
                    ].map((item, i) => (
                      <div key={i} className="p-3 rounded-lg bg-card">
                        <div className="text-xl font-bold text-primary">{item.value}</div>
                        <div className="text-xs text-muted-foreground">{item.metric}</div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 p-4 rounded-xl bg-card text-center">
                    <p className="text-sm text-muted-foreground mb-1">ROI</p>
                    <p className="font-bold text-lg">
                      Thời gian tiết kiệm: <span className="text-green-500">50 giờ (78%)</span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Cost per piece: ~26 phút (vs ~2 giờ traditional)
                    </p>
                  </div>
                </div>
              </section>

              {/* Section 9 - Templates */}
              <section id="section-9" className="scroll-mt-24 mt-16">
                <h2 className="text-2xl lg:text-3xl font-bold mb-6 flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center text-lg font-bold">9</span>
                  Templates Miễn Phí
                </h2>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                  {[
                    { title: 'Weekly Content Calendar', desc: 'Template lịch content theo tuần cho 7 kênh', icon: Calendar },
                    { title: 'Content Brief', desc: 'Template brief chi tiết cho từng piece of content', icon: FileText },
                    { title: 'Platform Optimization Checklist', desc: 'Checklist tối ưu cho từng platform', icon: CheckCircle2 },
                    { title: 'Content Pillars Framework', desc: 'Template xác định 3-5 content pillars', icon: Layers },
                    { title: 'Repurpose Checklist', desc: 'Checklist repurpose từ 1 content gốc', icon: RefreshCw },
                    { title: 'Weekly Review Template', desc: 'Template review hiệu quả content hàng tuần', icon: LineChart },
                  ].map((template, i) => (
                    <div key={i} className="p-4 rounded-xl bg-card border border-border/50 hover:border-primary/30 transition-colors">
                      <div className="w-10 h-10 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center mb-3">
                        <template.icon className="w-5 h-5" />
                      </div>
                      <h4 className="font-semibold mb-1">{template.title}</h4>
                      <p className="text-sm text-muted-foreground">{template.desc}</p>
                    </div>
                  ))}
                </div>

                <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 text-center">
                  <Download className="w-8 h-8 text-indigo-500 mx-auto mb-3" />
                  <h3 className="font-bold text-lg mb-2">Download Tất Cả Templates</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Nhận trọn bộ templates miễn phí để bắt đầu ngay hôm nay
                  </p>
                  <Button asChild>
                    <Link to="/auth">Đăng ký nhận templates</Link>
                  </Button>
                </div>
              </section>

              {/* Section 10 - Conclusion */}
              <section id="section-10" className="scroll-mt-24 mt-16">
                <h2 className="text-2xl lg:text-3xl font-bold mb-6 flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-lg font-bold">10</span>
                  Kết Luận & Next Steps
                </h2>

                <div className="p-6 rounded-2xl bg-gradient-to-br from-primary/10 via-purple-500/10 to-pink-500/10 border border-primary/20 mb-8">
                  <h3 className="text-xl font-bold mb-4">Tóm Tắt Những Điểm Chính</h3>
                  <div className="space-y-3">
                    {[
                      'Content đa kênh không phải copy-paste — mà là adapt thông minh cho từng platform',
                      'Framework CORE (Create → Optimize → Repurpose → Evaluate) giúp hệ thống hóa quy trình',
                      'Content Pillars là nền tảng để đảm bảo consistency và focus',
                      'Repurpose giúp maximize ROI từ mỗi ý tưởng — 1 thành 10+',
                      'Tools đúng có thể tiết kiệm 15+ giờ/tuần',
                    ].map((point, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                        <span>{point}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <h3 className="text-xl font-bold mb-4">Next Steps Cho Bạn</h3>

                <div className="space-y-4 mb-8">
                  {[
                    { step: 1, title: 'Audit Current State', desc: 'Đánh giá quy trình content hiện tại của bạn. Mất bao nhiêu giờ/tuần? Đang có mặt trên bao nhiêu kênh?' },
                    { step: 2, title: 'Define Content Pillars', desc: 'Xác định 3-5 pillars cho brand của bạn' },
                    { step: 3, title: 'Pick Your Tools', desc: 'Chọn tool stack phù hợp với budget và nhu cầu' },
                    { step: 4, title: 'Start Small', desc: 'Bắt đầu với 1 blog post → repurpose sang 5 kênh. Đo lường. Học hỏi. Lặp lại.' },
                  ].map((item) => (
                    <div key={item.step} className="flex gap-4 p-4 rounded-xl bg-card border border-border/50">
                      <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 font-bold">
                        {item.step}
                      </div>
                      <div>
                        <h4 className="font-semibold">{item.title}</h4>
                        <p className="text-sm text-muted-foreground">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Internal Links */}
                <div className="p-4 rounded-xl bg-muted/50 border border-border/50 mb-8">
                  <h4 className="font-semibold mb-3">📚 Đọc thêm:</h4>
                  <ul className="space-y-2 text-sm">
                    <li>
                      <Link to="/blog/flowa-content-marketing-da-kenh" className="text-primary hover:underline">
                        → Flowa: Giải Pháp Tạo Content Marketing Đa Kênh Trong 10 Phút
                      </Link>
                    </li>
                    <li>
                      <Link to="/blog/content-repurposing-chien-luoc" className="text-primary hover:underline">
                        → Content Repurposing: Biến 1 Ý Tưởng Thành 20+ Nội Dung Đa Kênh
                      </Link>
                    </li>
                  </ul>
                </div>

                {/* Final CTA */}
                <div className="p-8 rounded-3xl bg-gradient-to-br from-primary via-purple-500 to-pink-500 text-white text-center">
                  <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-90" />
                  <h3 className="text-2xl font-bold mb-3">
                    Sẵn Sàng Tự Động Hóa Content Marketing?
                  </h3>
                  <p className="text-white/80 mb-6 max-w-md mx-auto">
                    Flowa giúp bạn tạo content cho 12 kênh chỉ trong 10 phút. Áp dụng framework CORE một cách tự động.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button size="lg" variant="secondary" asChild>
                      <Link to="/auth">
                        Dùng thử miễn phí
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Link>
                    </Button>
                    <Button size="lg" variant="outline" className="bg-transparent border-white/30 text-white hover:bg-white/10" asChild>
                      <Link to="/landing">Tìm hiểu thêm</Link>
                    </Button>
                  </div>
                </div>
              </section>

              {/* Related Posts */}
              <RelatedPosts 
                currentSlug={POST_SLUG}
                currentCategory={POST_CATEGORY}
                posts={blogPostsData}
              />

              {/* Comments */}
              <BlogComments postSlug={POST_SLUG} />
            </article>
          </div>
        </div>
      </section>

      <FooterSection />
    </div>
  );
};

export default BlogPostMultiChannel;
