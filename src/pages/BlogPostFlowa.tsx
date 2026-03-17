import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { LandingNav } from '@/components/landing/LandingNav';
import { FooterSection } from '@/components/landing/FooterSection';
import { 
  ArrowLeft, 
  Clock, 
  User, 
  Calendar,
  MessageCircle,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Target,
  Users,
  BarChart3,
  FileText,
  Video,
  Image as ImageIcon,
  Lightbulb,
  Palette,
  Settings,
  ArrowRight,
  TrendingUp
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
import { SEOHead, TOCSEOSchema } from '@/components/SEOHead';

const POST_SLUG = 'flowa-content-marketing-da-kenh';
const POST_CATEGORY = 'Product';

const BlogPostFlowa = () => {
  // Table of Contents
  const tableOfContents = [
    { id: 'section-1', title: '1. Marketing Team Đang "Chết Dần" Vì Content' },
    { id: 'section-2', title: '2. Flowa Là Gì? Tổng Quan Về Nền Tảng' },
    { id: 'section-3', title: '3. 6 Tính Năng Cốt Lõi Của Flowa' },
    { id: 'section-4', title: '4. Flowa Hoạt Động Như Thế Nào?' },
    { id: 'section-5', title: '5. So Sánh: Trước và Sau Khi Dùng Flowa' },
    { id: 'section-6', title: '6. Ai Nên Sử Dụng Flowa?' },
    { id: 'section-7', title: '7. Case Study: Kết Quả Thực Tế' },
    { id: 'section-8', title: '8. Bảng Giá Flowa 2026' },
    { id: 'section-9', title: '9. Câu Hỏi Thường Gặp (FAQ)' },
    { id: 'section-10', title: '10. Kết Luận' },
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
        title="Flowa: Giải Pháp Tạo Content Marketing Đa Kênh Trong 10 Phút"
        description="Flowa giúp Marketing Team tạo content cho 12 kênh chỉ trong 10 phút. Tự động hóa 90% quy trình, giữ brand voice nhất quán."
        canonicalPath="/blog/flowa-content-marketing-da-kenh"
        ogType="article"
        ogImage="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&h=630&fit=crop"
        article={{ author: 'Flowa Team', publishDate: '2026-01-15T00:00:00+07:00', section: 'Product', tags: ['content marketing', 'đa kênh', 'AI', 'flowa'], readingTime: 'PT15M', wordCount: 4500, authorUrl: 'https://flowa.vn', authorJobTitle: 'Content Marketing Team' }}
        breadcrumbs={[
          { name: 'Trang chủ', url: '/' },
          { name: 'Blog', url: '/blog' },
          { name: 'Flowa: Content Marketing Đa Kênh', url: '/blog/flowa-content-marketing-da-kenh' },
        ]}
      />
      <TOCSEOSchema
        items={tableOfContents.map((item) => ({
          name: item.title,
          url: `https://tiktok-tale-tech.lovable.app/blog/flowa-content-marketing-da-kenh#${item.id}`,
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
            <BlogBreadcrumb postTitle="Flowa: Content Marketing Đa Kênh" />
          </div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Badge variant="outline" className="mb-4 border-primary/30 text-primary">
              Product
            </Badge>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 leading-tight">
              Flowa: Giải Pháp Tạo Content Marketing Đa Kênh Trong{' '}
              <span className="bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
                10 Phút
              </span>{' '}
              Thay Vì 10 Giờ
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Flowa giúp Marketing Team tạo content cho 12 kênh chỉ trong 10 phút. 
              Tự động hóa 90% quy trình, giữ brand voice nhất quán.
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
                15 phút đọc
              </div>
            </div>
            <SocialShare 
              title="Flowa: Giải Pháp Tạo Content Marketing Đa Kênh Trong 10 Phút"
              description="Flowa giúp Marketing Team tạo content cho 12 kênh chỉ trong 10 phút."
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
              src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&h=600&fit=crop"
              alt="Flowa Content Marketing Platform - Nền tảng tạo content đa kênh"
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
                  <h4 className="font-semibold mb-2">Dùng thử miễn phí</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Tạo content cho 12 kênh trong 10 phút
                  </p>
                  <Button size="sm" className="w-full" asChild>
                    <Link to="/auth">Bắt đầu ngay</Link>
                  </Button>
                </div>
              </div>
            </aside>

            {/* Main Content */}
            <article className="prose prose-lg dark:prose-invert max-w-none">
              {/* Section 1 */}
              <section id="section-1" className="scroll-mt-24">
                <h2 className="text-2xl lg:text-3xl font-bold mb-6 flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center text-lg font-bold">1</span>
                  Marketing Team Đang "Chết Dần" Vì Content
                </h2>
                
                <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                  Nếu bạn đang đọc bài viết này, có lẽ bạn đã quá quen thuộc với cảnh tượng sau:
                </p>

                <div className="bg-muted/50 rounded-2xl p-6 mb-8 border-l-4 border-orange-500">
                  <p className="font-medium mb-4">
                    <strong>Sáng thứ Hai</strong>, bạn mở laptop và nhìn vào content calendar tuần này. 
                    15 bài posts cho Facebook, 10 bài cho Instagram, 5 bài LinkedIn, 3 bài blog, 2 email campaigns... 
                    Tổng cộng <span className="text-primary font-bold">35 pieces of content</span> cần hoàn thành trong 5 ngày.
                  </p>
                  <p className="text-muted-foreground">
                    Bạn bắt đầu viết bài đầu tiên cho Facebook. Mất 45 phút. Sau đó bạn copy sang Instagram — 
                    nhưng caption quá dài, hashtags không đúng format, emoji không phù hợp. Mất thêm 20 phút để adapt.
                    <br /><br />
                    Rồi đến LinkedIn — tone quá casual, phải viết lại hoàn toàn. Thêm 30 phút nữa.
                    <br /><br />
                    <strong className="text-foreground">Chỉ 1 topic, bạn đã mất gần 2 giờ.</strong> Và còn 34 pieces nữa đang chờ.
                  </p>
                </div>

                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                  Những Con Số Đáng Báo Động
                </h3>

                <p className="mb-4">Theo nghiên cứu của HubSpot năm 2025:</p>

                <div className="grid sm:grid-cols-2 gap-4 mb-8">
                  {[
                    { value: '80%', label: 'thời gian dành cho tạo và adapt content' },
                    { value: '67%', label: 'marketers bị "creative burnout"' },
                    { value: '45%', label: 'posts không đạt engagement kỳ vọng' },
                    { value: '3.2 giờ/ngày', label: 'thời gian tạo content thủ công' },
                  ].map((stat, i) => (
                    <div key={i} className="p-4 rounded-xl bg-card border border-border/50">
                      <div className="text-2xl font-bold text-primary">{stat.value}</div>
                      <div className="text-sm text-muted-foreground">{stat.label}</div>
                    </div>
                  ))}
                </div>

                <h3 className="text-xl font-bold mb-4">6 "Thủ Phạm" Ngốn Thời Gian Marketing Team</h3>

                <div className="overflow-x-auto mb-8">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="p-3 text-left font-semibold border-b border-border">#</th>
                        <th className="p-3 text-left font-semibold border-b border-border">Vấn Đề</th>
                        <th className="p-3 text-left font-semibold border-b border-border">Thời Gian Lãng Phí</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { num: 1, issue: 'Adapt content cho nhiều kênh', time: '2-3 giờ/topic' },
                        { num: 2, issue: 'Viết kịch bản video TikTok/Reels', time: '1-2 giờ/video' },
                        { num: 3, issue: 'Thiết kế carousel (idea → design)', time: '4-5 giờ/carousel' },
                        { num: 4, issue: 'Brainstorm ý tưởng content', time: '2+ giờ/tuần' },
                        { num: 5, issue: 'Đảm bảo brand voice nhất quán', time: 'Ongoing struggle' },
                        { num: 6, issue: 'Quản lý lịch đăng bài đa kênh', time: '1+ giờ/ngày' },
                      ].map((row) => (
                        <tr key={row.num} className="hover:bg-muted/30">
                          <td className="p-3 border-b border-border/50 font-medium">{row.num}</td>
                          <td className="p-3 border-b border-border/50">{row.issue}</td>
                          <td className="p-3 border-b border-border/50 text-orange-500 font-medium">{row.time}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <p className="text-lg font-medium text-center p-4 bg-gradient-to-r from-orange-500/10 to-red-500/10 rounded-xl border border-orange-500/20">
                  Tổng cộng: <strong>15-20 giờ/tuần</strong> chỉ cho những công việc lặp đi lặp lại, 
                  không tạo ra giá trị sáng tạo thực sự.
                </p>
              </section>

              {/* Section 2 */}
              <section id="section-2" className="scroll-mt-24 mt-16">
                <h2 className="text-2xl lg:text-3xl font-bold mb-6 flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center text-lg font-bold">2</span>
                  Flowa Là Gì? Tổng Quan Về Nền Tảng
                </h2>

                <div className="p-6 rounded-2xl bg-gradient-to-br from-primary/10 via-purple-500/5 to-pink-500/10 border border-primary/20 mb-8">
                  <h3 className="text-xl font-bold mb-4">Định Nghĩa Ngắn Gọn</h3>
                  <p className="text-lg leading-relaxed">
                    <strong>Flowa</strong> là nền tảng tạo content marketing đa kênh được hỗ trợ bởi AI, giúp Marketing Team:
                  </p>
                  <ul className="mt-4 space-y-2">
                    {[
                      'Tạo content cho 12 kênh khác nhau chỉ từ 1 topic',
                      'Giữ brand voice nhất quán trên mọi nền tảng',
                      'Giảm 90% thời gian tạo content thủ công',
                      'Quản lý toàn bộ content operations từ 1 dashboard duy nhất',
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <h3 className="text-xl font-bold mb-4">Flowa Ecosystem</h3>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                  {[
                    { icon: FileText, title: 'Text Content', desc: 'Multi-Channel Generator (12 platforms)', color: 'text-blue-500 bg-blue-500/10' },
                    { icon: Video, title: 'Video Content', desc: 'TikTok Scripts, Reels Scripts, Voice-over Ready', color: 'text-pink-500 bg-pink-500/10' },
                    { icon: ImageIcon, title: 'Visual Content', desc: 'Carousel Generator, AI Image Prompts', color: 'text-purple-500 bg-purple-500/10' },
                    { icon: Target, title: 'Brand Engine', desc: 'Brand Voice AI, Industry Memory, Compliance', color: 'text-green-500 bg-green-500/10' },
                    { icon: Settings, title: 'Operations', desc: 'Content Calendar, Campaign Management', color: 'text-orange-500 bg-orange-500/10' },
                    { icon: Users, title: 'Collaboration', desc: 'Team Collaboration, Approval Workflow', color: 'text-cyan-500 bg-cyan-500/10' },
                  ].map((item, i) => (
                    <div key={i} className="p-4 rounded-xl bg-card border border-border/50 hover:border-primary/30 transition-colors">
                      <div className={`w-10 h-10 rounded-lg ${item.color} flex items-center justify-center mb-3`}>
                        <item.icon className="w-5 h-5" />
                      </div>
                      <h4 className="font-semibold mb-1">{item.title}</h4>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                  ))}
                </div>

                <h3 className="text-xl font-bold mb-4">Điều Gì Khiến Flowa Khác Biệt?</h3>

                <div className="overflow-x-auto mb-8">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="p-3 text-left font-semibold border-b border-border">Tiêu Chí</th>
                        <th className="p-3 text-left font-semibold border-b border-border">Tools Khác</th>
                        <th className="p-3 text-left font-semibold border-b border-border">Flowa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { criteria: 'Output', other: '1 input → 1 output', flowa: '1 input → 12 outputs (đa kênh)' },
                        { criteria: 'Brand Voice', other: 'Generic tone', flowa: 'Custom brand voice + enforcement' },
                        { criteria: 'Video Scripts', other: 'Không có hoặc basic', flowa: 'Full script với timing, visual cues' },
                        { criteria: 'Carousel', other: 'Không có', flowa: 'Prompts cho Midjourney/DALL-E + caption' },
                        { criteria: 'Compliance', other: 'Không có', flowa: 'Industry-specific rules' },
                        { criteria: 'Tiếng Việt', other: 'Dịch từ tiếng Anh', flowa: 'Native Vietnamese, hiểu context' },
                      ].map((row, i) => (
                        <tr key={i} className="hover:bg-muted/30">
                          <td className="p-3 border-b border-border/50 font-medium">{row.criteria}</td>
                          <td className="p-3 border-b border-border/50 text-muted-foreground">{row.other}</td>
                          <td className="p-3 border-b border-border/50 text-primary font-medium">{row.flowa}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 text-center">
                  <strong>Flowa không chỉ là "AI viết content". Flowa là hệ sinh thái content marketing hoàn chỉnh.</strong>
                </div>
              </section>

              {/* Section 3 */}
              <section id="section-3" className="scroll-mt-24 mt-16">
                <h2 className="text-2xl lg:text-3xl font-bold mb-6 flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-green-500/10 text-green-500 flex items-center justify-center text-lg font-bold">3</span>
                  6 Tính Năng Cốt Lõi Của Flowa
                </h2>

                {/* Feature 1 */}
                <div className="mb-12">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                      <Zap className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-2">3.1. Multi-Channel Content Generator</h3>
                      <p className="text-muted-foreground">
                        Từ 1 topic → content cho 12 kênh khác nhau, mỗi kênh được tối ưu riêng.
                      </p>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-2xl p-6 border border-blue-500/10">
                    <h4 className="font-semibold mb-4">12 Kênh Được Hỗ Trợ:</h4>
                    <div className="grid sm:grid-cols-3 gap-3">
                      {[
                        'Facebook Post', 'Instagram Caption', 'LinkedIn Post',
                        'TikTok Script', 'YouTube Description', 'Twitter/X Thread',
                        'Blog Article', 'Email Newsletter', 'Threads Post',
                        'Zalo Article', 'Press Release', 'Landing Page Copy'
                      ].map((channel, i) => (
                        <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-background/50">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          <span className="text-sm">{channel}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Feature 2 */}
                <div className="mb-12">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-pink-500/10 text-pink-500 flex items-center justify-center shrink-0">
                      <Video className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-2">3.2. TikTok & Reels Script Generator</h3>
                      <p className="text-muted-foreground">
                        Script hoàn chỉnh với scene breakdown, camera angles, và voice-over timing.
                      </p>
                    </div>
                  </div>

                  <div className="bg-muted/30 rounded-xl p-4 font-mono text-sm overflow-x-auto">
                    <pre className="text-muted-foreground">
{`[SCENE 1: 0-3s]
Visual: Close-up sản phẩm, xoay chậm
Audio: Sound trending "Oh no, oh no..."
Text overlay: "POV: Bạn vừa phát hiện..."

[SCENE 2: 3-8s]  
Visual: Reaction face, zoom in
Audio: Voice-over bắt đầu
Script: "...cách tạo content 10x nhanh hơn"

[SCENE 3: 8-15s]
Visual: Screen recording demo Flowa
Audio: Tiếp tục voice-over
Script: "Chỉ cần 1 click, có ngay 12 bài..."

[CTA: 15-17s]
Visual: Logo + CTA button
Audio: "Link trong bio nha!"
Text: "Dùng thử FREE → Bio"`}</pre>
                  </div>
                </div>

                {/* Feature 3 */}
                <div className="mb-12">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-2">3.3. Carousel Generator</h3>
                      <p className="text-muted-foreground">
                        Tạo carousel Instagram/LinkedIn với prompts cho AI image generation.
                      </p>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-card border border-border/50">
                      <h4 className="font-semibold mb-2">Output Bao Gồm:</h4>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> Slide structure (5-10 slides)</li>
                        <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> Text content cho mỗi slide</li>
                        <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> Image prompts (Midjourney/DALL-E)</li>
                        <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> Caption + Hashtags</li>
                      </ul>
                    </div>
                    <div className="p-4 rounded-xl bg-card border border-border/50">
                      <h4 className="font-semibold mb-2">Ví Dụ Prompt:</h4>
                      <p className="text-sm text-muted-foreground italic">
                        "Minimalist infographic slide, white background, bold Vietnamese text saying '80% marketers struggle with content', 
                        accent color #FF6B35, modern sans-serif font, clean data visualization"
                      </p>
                    </div>
                  </div>
                </div>

                {/* Feature 4 */}
                <div className="mb-12">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-green-500/10 text-green-500 flex items-center justify-center shrink-0">
                      <Palette className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-2">3.4. Brand Voice AI Engine</h3>
                      <p className="text-muted-foreground">
                        Học và áp dụng brand voice của bạn cho mọi content được tạo ra.
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-muted/50">
                          <th className="p-3 text-left font-semibold border-b border-border">Yếu Tố</th>
                          <th className="p-3 text-left font-semibold border-b border-border">Mô Tả</th>
                          <th className="p-3 text-left font-semibold border-b border-border">Ví Dụ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { factor: 'Tone of Voice', desc: 'Friendly, Professional, Playful...', example: 'Casual nhưng vẫn chuyên nghiệp' },
                          { factor: 'Vocabulary', desc: 'Từ vựng đặc trưng của brand', example: 'Dùng "bạn" thay vì "quý khách"' },
                          { factor: 'Emoji Usage', desc: 'Có/không, loại nào, tần suất', example: '2-3 emoji/post, ưu tiên 🚀💡✨' },
                          { factor: 'Hashtag Style', desc: 'Branded, trending, niche', example: '#FlowaVN #ContentMarketing' },
                          { factor: 'CTA Patterns', desc: 'Cách kêu gọi hành động', example: 'Luôn có benefit cho user' },
                        ].map((row, i) => (
                          <tr key={i} className="hover:bg-muted/30">
                            <td className="p-3 border-b border-border/50 font-medium">{row.factor}</td>
                            <td className="p-3 border-b border-border/50 text-muted-foreground">{row.desc}</td>
                            <td className="p-3 border-b border-border/50">{row.example}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Feature 5 */}
                <div className="mb-12">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center shrink-0">
                      <Lightbulb className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-2">3.5. Topic Ideas Generator</h3>
                      <p className="text-muted-foreground">
                        Không bao giờ hết ý tưởng với Topic Ideas được cá nhân hóa theo ngành.
                      </p>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-3 gap-4">
                    {[
                      { title: 'Trending Topics', desc: 'Theo dõi xu hướng real-time', icon: TrendingUp },
                      { title: 'Industry Insights', desc: 'Ý tưởng theo ngành cụ thể', icon: BarChart3 },
                      { title: 'Content Calendar', desc: 'Lập lịch tự động theo sự kiện', icon: Calendar },
                    ].map((item, i) => (
                      <div key={i} className="p-4 rounded-xl bg-card border border-border/50 text-center">
                        <item.icon className="w-8 h-8 mx-auto mb-3 text-orange-500" />
                        <h4 className="font-semibold mb-1">{item.title}</h4>
                        <p className="text-sm text-muted-foreground">{item.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Feature 6 */}
                <div className="mb-8">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center shrink-0">
                      <Users className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-2">3.6. Campaign Management</h3>
                      <p className="text-muted-foreground">
                        Quản lý campaigns với content calendar tích hợp.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20">
                    <div className="grid sm:grid-cols-2 gap-4">
                      {[
                        'Drag-and-drop calendar',
                        'Multi-brand management',
                        'Team collaboration',
                        'Approval workflow',
                        'Performance tracking',
                        'Export & scheduling'
                      ].map((feature, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-cyan-500" />
                          <span className="text-sm">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              {/* Section 4 */}
              <section id="section-4" className="scroll-mt-24 mt-16">
                <h2 className="text-2xl lg:text-3xl font-bold mb-6 flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center text-lg font-bold">4</span>
                  Flowa Hoạt Động Như Thế Nào?
                </h2>

                <div className="space-y-8">
                  {[
                    { step: 1, title: 'Chọn Topic', desc: 'Nhập topic hoặc chọn từ gợi ý. Ví dụ: "5 cách tăng tương tác Instagram 2026"', color: 'bg-blue-500' },
                    { step: 2, title: 'Chọn Kênh', desc: 'Tick chọn các kênh muốn tạo content: Facebook, Instagram, LinkedIn, TikTok...', color: 'bg-green-500' },
                    { step: 3, title: 'Review & Customize', desc: 'AI tạo draft cho từng kênh → bạn review, chỉnh sửa nếu cần', color: 'bg-purple-500' },
                    { step: 4, title: 'Export & Schedule', desc: 'Xuất content hoặc lên lịch đăng trực tiếp từ Flowa', color: 'bg-orange-500' },
                  ].map((item) => (
                    <div key={item.step} className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-full ${item.color} text-white flex items-center justify-center font-bold shrink-0`}>
                        {item.step}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold mb-1">{item.title}</h3>
                        <p className="text-muted-foreground">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-8 p-6 rounded-2xl bg-gradient-to-br from-primary/10 to-purple-500/10 border border-primary/20 text-center">
                  <p className="text-lg font-medium">
                    ⏱️ Thời gian trung bình: <strong className="text-primary">8-12 phút</strong> cho 12 kênh
                  </p>
                  <p className="text-muted-foreground mt-2">
                    So với 6-8 giờ nếu làm thủ công
                  </p>
                </div>
              </section>

              {/* Section 5 */}
              <section id="section-5" className="scroll-mt-24 mt-16">
                <h2 className="text-2xl lg:text-3xl font-bold mb-6 flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center text-lg font-bold">5</span>
                  So Sánh: Trước và Sau Khi Dùng Flowa
                </h2>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="p-4 text-left font-semibold border-b border-border">Tiêu Chí</th>
                        <th className="p-4 text-left font-semibold border-b border-border text-red-500">❌ Trước Flowa</th>
                        <th className="p-4 text-left font-semibold border-b border-border text-green-500">✅ Sau Flowa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { criteria: 'Thời gian/topic', before: '2-3 giờ', after: '10-15 phút' },
                        { criteria: 'Số kênh cover', before: '2-3 kênh', after: '12 kênh' },
                        { criteria: 'Brand consistency', before: 'Không đều', after: 'Luôn nhất quán' },
                        { criteria: 'Video scripts', before: 'Tự viết từ đầu', after: 'Có sẵn + suggestions' },
                        { criteria: 'Creative burnout', before: 'Cao', after: 'Thấp' },
                        { criteria: 'Output/tuần', before: '10-15 posts', after: '50+ posts' },
                      ].map((row, i) => (
                        <tr key={i} className="hover:bg-muted/30">
                          <td className="p-4 border-b border-border/50 font-medium">{row.criteria}</td>
                          <td className="p-4 border-b border-border/50 text-red-500">{row.before}</td>
                          <td className="p-4 border-b border-border/50 text-green-500 font-medium">{row.after}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Section 6 */}
              <section id="section-6" className="scroll-mt-24 mt-16">
                <h2 className="text-2xl lg:text-3xl font-bold mb-6 flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center text-lg font-bold">6</span>
                  Ai Nên Sử Dụng Flowa?
                </h2>

                <div className="grid sm:grid-cols-2 gap-6">
                  {[
                    { title: 'Marketing Managers', desc: 'Cần quản lý content cho nhiều kênh, đảm bảo brand consistency', icon: Target },
                    { title: 'Content Creators', desc: 'Muốn tăng output mà không tăng effort, focus vào creative strategy', icon: Lightbulb },
                    { title: 'Agency Teams', desc: 'Handle nhiều brands, cần efficiency và quality đồng thời', icon: Users },
                    { title: 'Solo Entrepreneurs', desc: 'Một mình làm marketing, cần tool "all-in-one" tiết kiệm thời gian', icon: Zap },
                  ].map((item, i) => (
                    <div key={i} className="p-6 rounded-2xl bg-card border border-border/50 hover:border-primary/30 transition-colors">
                      <item.icon className="w-8 h-8 text-primary mb-4" />
                      <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                      <p className="text-muted-foreground">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Section 7 */}
              <section id="section-7" className="scroll-mt-24 mt-16">
                <h2 className="text-2xl lg:text-3xl font-bold mb-6 flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-green-500/10 text-green-500 flex items-center justify-center text-lg font-bold">7</span>
                  Case Study: Kết Quả Thực Tế
                </h2>

                <div className="p-6 rounded-2xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 mb-8">
                  <h3 className="text-xl font-bold mb-4">Case Study: Startup E-commerce Fashion</h3>
                  
                  <div className="grid sm:grid-cols-3 gap-4 mb-6">
                    {[
                      { label: 'Thời gian content/tuần', before: '25 giờ', after: '5 giờ', change: '-80%' },
                      { label: 'Số posts/tuần', before: '12', after: '45', change: '+275%' },
                      { label: 'Engagement rate', before: '2.3%', after: '4.8%', change: '+109%' },
                    ].map((stat, i) => (
                      <div key={i} className="p-4 rounded-xl bg-background/50 text-center">
                        <p className="text-sm text-muted-foreground mb-2">{stat.label}</p>
                        <div className="flex items-center justify-center gap-2 text-lg">
                          <span className="text-red-500 line-through">{stat.before}</span>
                          <ArrowRight className="w-4 h-4" />
                          <span className="text-green-500 font-bold">{stat.after}</span>
                        </div>
                        <Badge variant="outline" className="mt-2 border-green-500/30 text-green-500">
                          {stat.change}
                        </Badge>
                      </div>
                    ))}
                  </div>

                  <blockquote className="border-l-4 border-green-500 pl-4 italic text-muted-foreground">
                    "Trước đây team 2 người làm không xuể content cho 4 kênh. Giờ 1 người quản được 8 kênh 
                    với quality tốt hơn. Flowa literally saved our marketing."
                    <footer className="mt-2 text-sm font-medium text-foreground">
                      — Marketing Lead, Fashion Startup
                    </footer>
                  </blockquote>
                </div>
              </section>

              {/* Section 8 */}
              <section id="section-8" className="scroll-mt-24 mt-16">
                <h2 className="text-2xl lg:text-3xl font-bold mb-6 flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center text-lg font-bold">8</span>
                  Bảng Giá Flowa 2026
                </h2>

                <div className="grid sm:grid-cols-3 gap-6">
                  {[
                    { 
                      name: 'Starter', 
                      price: '499K', 
                      period: '/tháng',
                      features: ['50 content/tháng', '6 kênh', '1 brand', 'Email support'],
                      highlight: false
                    },
                    { 
                      name: 'Professional', 
                      price: '1.299K', 
                      period: '/tháng',
                      features: ['200 content/tháng', '12 kênh', '3 brands', 'Video scripts', 'Priority support'],
                      highlight: true
                    },
                    { 
                      name: 'Enterprise', 
                      price: 'Liên hệ', 
                      period: '',
                      features: ['Unlimited content', 'Unlimited brands', 'API access', 'Custom training', 'Dedicated support'],
                      highlight: false
                    },
                  ].map((plan, i) => (
                    <div 
                      key={i} 
                      className={`p-6 rounded-2xl border transition-colors ${
                        plan.highlight 
                          ? 'bg-primary/5 border-primary/30 shadow-lg shadow-primary/10' 
                          : 'bg-card border-border/50'
                      }`}
                    >
                      {plan.highlight && (
                        <Badge className="mb-4 bg-primary">Phổ biến nhất</Badge>
                      )}
                      <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                      <div className="flex items-baseline gap-1 mb-4">
                        <span className="text-3xl font-bold">{plan.price}</span>
                        <span className="text-muted-foreground">{plan.period}</span>
                      </div>
                      <ul className="space-y-2 mb-6">
                        {plan.features.map((feature, j) => (
                          <li key={j} className="flex items-center gap-2 text-sm">
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                      <Button 
                        className="w-full" 
                        variant={plan.highlight ? 'default' : 'outline'}
                        asChild
                      >
                        <Link to="/auth">Bắt đầu ngay</Link>
                      </Button>
                    </div>
                  ))}
                </div>
              </section>

              {/* Section 9 */}
              <section id="section-9" className="scroll-mt-24 mt-16">
                <h2 className="text-2xl lg:text-3xl font-bold mb-6 flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center text-lg font-bold">9</span>
                  Câu Hỏi Thường Gặp (FAQ)
                </h2>

                <div className="space-y-4">
                  {[
                    { q: 'Flowa có hỗ trợ tiếng Việt không?', a: 'Có! Flowa được optimize cho tiếng Việt, hiểu ngữ cảnh và văn hóa Việt Nam.' },
                    { q: 'Có thể dùng thử miễn phí không?', a: 'Có, Flowa có gói dùng thử với đầy đủ tính năng trong 7 ngày.' },
                    { q: 'Content có bị trùng lặp không?', a: 'Không. AI tạo content unique cho mỗi lần, được optimize theo brand voice riêng.' },
                    { q: 'Có cần kỹ năng kỹ thuật không?', a: 'Không. Giao diện drag-and-drop, ai cũng có thể sử dụng được.' },
                    { q: 'Hỗ trợ những ngành nào?', a: 'Tất cả ngành! Có industry templates cho: E-commerce, F&B, Beauty, Tech, Education, Real Estate...' },
                  ].map((item, i) => (
                    <div key={i} className="p-4 rounded-xl bg-card border border-border/50">
                      <h3 className="font-bold mb-2 flex items-start gap-2">
                        <MessageCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                        {item.q}
                      </h3>
                      <p className="text-muted-foreground pl-7">{item.a}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Section 10 */}
              <section id="section-10" className="scroll-mt-24 mt-16">
                <h2 className="text-2xl lg:text-3xl font-bold mb-6 flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-lg font-bold">10</span>
                  Kết Luận
                </h2>

                <div className="p-6 rounded-2xl bg-gradient-to-br from-primary/10 via-purple-500/5 to-pink-500/10 border border-primary/20 mb-8">
                  <p className="text-lg leading-relaxed mb-4">
                    <strong>Flowa</strong> không chỉ là một tool — đó là cách tiếp cận mới cho content marketing trong kỷ nguyên AI.
                  </p>
                  <p className="text-muted-foreground mb-6">
                    Thay vì dành 80% thời gian cho công việc lặp lại, hãy để Flowa handle phần "mechanical" 
                    để bạn focus vào creative strategy và customer insights.
                  </p>

                  {/* Internal Links */}
                  <div className="p-4 rounded-xl bg-muted/50 border border-border/50 mb-6">
                    <h4 className="font-semibold mb-3">📚 Đọc thêm:</h4>
                    <ul className="space-y-2 text-sm">
                      <li>
                        <Link to="/blog/content-repurposing-chien-luoc" className="text-primary hover:underline">
                          → Content Repurposing: Biến 1 Ý Tưởng Thành 20+ Nội Dung Đa Kênh
                        </Link>
                      </li>
                      <li>
                        <Link to="/blog/ai-content-marketing-huong-dan" className="text-primary hover:underline">
                          → AI Content Marketing: Hướng Dẫn Toàn Diện Từ Cơ Bản Đến Nâng Cao
                        </Link>
                      </li>
                      <li>
                        <Link to="/blog/cach-tao-content-da-kenh" className="text-primary hover:underline">
                          → Cách Tạo Content Đa Kênh: Hướng Dẫn Toàn Diện Từ A-Z
                        </Link>
                      </li>
                    </ul>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Button size="lg" className="flex-1" asChild>
                      <Link to="/auth">
                        Bắt Đầu Dùng Thử Miễn Phí
                        <ArrowRight className="ml-2 w-4 h-4" />
                      </Link>
                    </Button>
                    <Button size="lg" variant="outline" className="flex-1" asChild>
                      <Link to="/contact">
                        Liên Hệ Tư Vấn
                        <ChevronRight className="ml-2 w-4 h-4" />
                      </Link>
                    </Button>
                  </div>
                </div>

                <p className="text-center text-muted-foreground">
                  <strong>10 phút đầu tiên với Flowa</strong> sẽ thay đổi cách bạn nghĩ về content marketing mãi mãi.
                </p>
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

export default BlogPostFlowa;
