import { motion } from 'framer-motion';
import { Link, useParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  Clock, 
  User, 
  Calendar,
  Share2,
  Bookmark,
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

const BlogPost = () => {
  const { slug } = useParams();

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
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/blog" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" />
              <span className="font-medium">Blog</span>
            </Link>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon">
                <Share2 className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon">
                <Bookmark className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative py-12 lg:py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative">
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
            <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Flowa Team
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Tháng 1, 2026
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                15 phút đọc
              </div>
            </div>
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
              alt="Flowa Content Marketing Platform"
              className="w-full h-auto"
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
                  <span className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center text-lg font-bold">3</span>
                  6 Tính Năng Cốt Lõi Của Flowa
                </h2>

                {/* Feature 3.1 */}
                <div className="mb-12 p-6 rounded-2xl bg-card border border-border/50">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">3.1. Multi-Channel Content Generator</h3>
                      <p className="text-muted-foreground">Tạo content cho 12 kênh từ 1 topic duy nhất</p>
                    </div>
                  </div>

                  <div className="bg-muted/50 rounded-xl p-4 mb-6">
                    <p className="font-medium text-orange-500 mb-2">Vấn đề giải quyết:</p>
                    <p>Mở 12 tab, copy-paste 12 lần, vẫn sai format trên Instagram.</p>
                  </div>

                  <h4 className="font-semibold mb-3">12 kênh được hỗ trợ:</h4>
                  <div className="flex flex-wrap gap-2 mb-6">
                    {['Facebook Post', 'Instagram Caption', 'Instagram Story', 'LinkedIn Post', 'Twitter/X', 'TikTok Caption', 'YouTube Description', 'Blog Article', 'Email Newsletter', 'Website Copy', 'Threads', 'Zalo OA'].map((channel, i) => (
                      <Badge key={i} variant="outline">{channel}</Badge>
                    ))}
                  </div>

                  <h4 className="font-semibold mb-3">Tính năng độc quyền:</h4>
                  <ul className="space-y-2 mb-6">
                    <li className="flex items-start gap-2">
                      <Zap className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                      <span><strong>Self-Critique AI:</strong> Tự động đánh giá content (0-10 điểm), regenerate nếu dưới 7 điểm</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Palette className="w-5 h-5 text-purple-500 shrink-0 mt-0.5" />
                      <span><strong>Brand Voice Sync:</strong> Áp dụng tone của bạn trên mọi kênh tự động</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                      <span><strong>Industry Compliance:</strong> Tự động filter các từ ngữ bị cấm (ngành y tế, tài chính, etc.)</span>
                    </li>
                  </ul>

                  <div className="grid sm:grid-cols-3 gap-4">
                    {[
                      { metric: 'Thời gian/topic', before: '2-3 giờ', after: '10 phút', improvement: '-95%' },
                      { metric: 'Độ chính xác format', before: '70%', after: '99%', improvement: '+41%' },
                      { metric: 'Team burnout', before: 'Cao', after: 'Thấp', improvement: '↓↓' },
                    ].map((item, i) => (
                      <div key={i} className="p-4 rounded-xl bg-muted/50 text-center">
                        <div className="text-sm text-muted-foreground mb-1">{item.metric}</div>
                        <div className="text-xs text-red-500 line-through">{item.before}</div>
                        <div className="text-lg font-bold text-primary">{item.after}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Feature 3.2 */}
                <div className="mb-12 p-6 rounded-2xl bg-card border border-border/50">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-pink-500/10 text-pink-500 flex items-center justify-center shrink-0">
                      <Video className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">3.2. TikTok Video Script Generator</h3>
                      <p className="text-muted-foreground">Kịch bản video với timing, visual cues, character actions</p>
                    </div>
                  </div>

                  <div className="bg-muted/50 rounded-xl p-4 mb-6">
                    <p className="font-medium text-orange-500 mb-2">Vấn đề giải quyết:</p>
                    <p>Quay 10 videos, 9 cái flop vì không có kịch bản chuẩn.</p>
                  </div>

                  <p className="mb-4">
                    Theo thống kê của TikTok, <strong>70% viewers quyết định xem tiếp hay skip trong 3 giây đầu tiên</strong>.
                  </p>

                  <div className="bg-muted/30 rounded-xl p-4 mb-6 font-mono text-sm">
                    <div className="text-muted-foreground mb-2">// Ví dụ Output:</div>
                    <div className="space-y-3">
                      <div className="p-3 bg-card rounded-lg">
                        <div className="text-xs text-muted-foreground">⏱️ 0-3s | HOOK</div>
                        <div className="font-medium">"Bạn đang giết chết cà phê mỗi sáng mà không biết!"</div>
                        <div className="text-xs text-blue-500 mt-1">Visual: Close-up đổ nước sôi • Expression: Shocked face</div>
                      </div>
                      <div className="p-3 bg-card rounded-lg">
                        <div className="text-xs text-muted-foreground">⏱️ 3-15s | PROBLEM</div>
                        <div className="font-medium">"Sai lầm số 1: Dùng nước sôi 100°C..."</div>
                        <div className="text-xs text-blue-500 mt-1">Visual: Nhiệt kế đo nước • Action: Giơ 1 ngón tay</div>
                      </div>
                      <div className="p-3 bg-card rounded-lg">
                        <div className="text-xs text-muted-foreground">⏱️ 55-60s | CTA</div>
                        <div className="font-medium">"Follow để xem phần 2!"</div>
                        <div className="text-xs text-blue-500 mt-1">Visual: Point to follow button • Trending Sound: [Gợi ý]</div>
                      </div>
                    </div>
                  </div>

                  <h4 className="font-semibold mb-3">Tính năng độc quyền:</h4>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <Lightbulb className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                      <span><strong>Hook Library 50+:</strong> Templates hook đã proven viral</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Clock className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                      <span><strong>Timing Calculator:</strong> Tự động chia sections theo duration</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Video className="w-5 h-5 text-pink-500 shrink-0 mt-0.5" />
                      <span><strong>Visual Cues:</strong> Gợi ý B-roll, transitions, text overlays</span>
                    </li>
                  </ul>
                </div>

                {/* Feature 3.3 */}
                <div className="mb-12 p-6 rounded-2xl bg-card border border-border/50">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">3.3. Carousel Prompt Generator</h3>
                      <p className="text-muted-foreground">Tạo carousel hoàn chỉnh với AI image prompts</p>
                    </div>
                  </div>

                  <div className="bg-muted/50 rounded-xl p-4 mb-6">
                    <p className="font-medium text-orange-500 mb-2">Vấn đề giải quyết:</p>
                    <p>Thiết kế 10 slides carousel mất nguyên 1 ngày làm việc.</p>
                  </div>

                  <p className="mb-6">
                    Carousel là content type có <strong>engagement cao nhất</strong> trên Instagram và LinkedIn. 
                    Theo Later, carousel posts có engagement rate cao hơn 1.4x so với single image posts.
                  </p>

                  <div className="bg-muted/30 rounded-xl p-4 mb-6 font-mono text-sm">
                    <div className="text-muted-foreground mb-2">// Ví dụ Output:</div>
                    <div className="space-y-3">
                      <div className="p-3 bg-card rounded-lg">
                        <div className="text-xs text-purple-500 font-semibold">📱 SLIDE 1 - HOOK</div>
                        <div className="font-medium mt-1">"Làn da bạn đang 'khóc' mỗi đêm vì 7 sai lầm này"</div>
                        <div className="text-xs text-muted-foreground mt-2">
                          🎨 Midjourney Prompt: "Close-up of woman's face with tired skin, 
                          soft bathroom lighting, minimal aesthetic, pastel pink tones, --ar 4:5 --v 6"
                        </div>
                        <div className="text-xs text-blue-500 mt-1">📐 Layout: Text bottom-center, logo top-right</div>
                      </div>
                    </div>
                  </div>

                  <h4 className="font-semibold mb-3">Hỗ trợ 4 AI Image Tools:</h4>
                  <div className="flex flex-wrap gap-2 mb-6">
                    {['Midjourney', 'DALL-E', 'Ideogram', 'Flux'].map((tool, i) => (
                      <Badge key={i} className="bg-purple-500/10 text-purple-500 border-purple-500/30">{tool}</Badge>
                    ))}
                  </div>
                </div>

                {/* Feature 3.4 */}
                <div className="mb-12 p-6 rounded-2xl bg-card border border-border/50">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-yellow-500/10 text-yellow-500 flex items-center justify-center shrink-0">
                      <Lightbulb className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">3.4. Topics Hub + AI Chatbot</h3>
                      <p className="text-muted-foreground">Không bao giờ hết ý tưởng content</p>
                    </div>
                  </div>

                  <div className="bg-muted/50 rounded-xl p-4 mb-6">
                    <p className="font-medium text-orange-500 mb-2">Vấn đề giải quyết:</p>
                    <p>Ngồi 2 tiếng trước màn hình trắng — "Tháng này viết gì đây?"</p>
                  </div>

                  <div className="grid sm:grid-cols-3 gap-4 mb-6">
                    {[
                      { title: 'AI Chatbot Brainstorm', desc: 'Chat để lấy ý tưởng theo context brand', icon: MessageCircle },
                      { title: 'Discovery Feed', desc: 'Ngày lễ, tin tức ngành, trends mới', icon: TrendingUp },
                      { title: 'Topic Bank', desc: 'Lưu trữ, tag, track performance', icon: Bookmark },
                    ].map((item, i) => (
                      <div key={i} className="p-4 rounded-xl bg-muted/50 text-center">
                        <item.icon className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
                        <h4 className="font-semibold text-sm mb-1">{item.title}</h4>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Feature 3.5 */}
                <div className="mb-12 p-6 rounded-2xl bg-card border border-border/50">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-green-500/10 text-green-500 flex items-center justify-center shrink-0">
                      <Palette className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">3.5. Brand Voice AI Engine</h3>
                      <p className="text-muted-foreground">Giữ brand voice nhất quán 100%</p>
                    </div>
                  </div>

                  <div className="bg-muted/50 rounded-xl p-4 mb-6">
                    <p className="font-medium text-orange-500 mb-2">Vấn đề giải quyết:</p>
                    <p>Facebook vui vẻ, LinkedIn nghiêm túc, Website như người khác viết.</p>
                  </div>

                  <p className="mb-6">
                    Theo nghiên cứu của Lucidpress, <strong>brand consistency có thể tăng revenue lên 23%</strong>.
                  </p>

                  <div className="bg-muted/30 rounded-xl p-4 font-mono text-sm">
                    <div className="text-muted-foreground mb-2">// Setup 1 lần (5 phút):</div>
                    <div className="space-y-2 text-sm">
                      <div>1. Brand Positioning: Agency / Expert / Business / Consultant</div>
                      <div>2. Tone: ☑ Expert ☑ Friendly ☑ Confident</div>
                      <div>3. Formality: Very Formal → Professional → Neutral → Casual</div>
                      <div>4. Preferred words: "giải pháp", "chuyên sâu", "tối ưu"</div>
                      <div>5. Forbidden words: "rẻ nhất", "số 1", "cam kết 100%"</div>
                    </div>
                  </div>
                </div>

                {/* Feature 3.6 */}
                <div className="p-6 rounded-2xl bg-card border border-border/50">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center shrink-0">
                      <Calendar className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">3.6. Unified Content Calendar</h3>
                      <p className="text-muted-foreground">Quản lý 12 kênh từ 1 dashboard</p>
                    </div>
                  </div>

                  <div className="bg-muted/50 rounded-xl p-4 mb-6">
                    <p className="font-medium text-orange-500 mb-2">Vấn đề giải quyết:</p>
                    <p>Lỡ deadline, đăng nhầm kênh, post trùng lặp 3 lần.</p>
                  </div>

                  <div className="grid sm:grid-cols-3 gap-4">
                    {[
                      { metric: 'Số lần login/tháng', before: '360 (12 dashboards)', after: '30 (1 dashboard)' },
                      { metric: 'Missed deadlines', before: '40%', after: '0%' },
                      { metric: 'Duplicate posts', before: '10%', after: '0%' },
                    ].map((item, i) => (
                      <div key={i} className="p-4 rounded-xl bg-muted/50 text-center">
                        <div className="text-sm text-muted-foreground mb-1">{item.metric}</div>
                        <div className="text-xs text-red-500 line-through">{item.before}</div>
                        <div className="text-lg font-bold text-primary">{item.after}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* Section 4 */}
              <section id="section-4" className="scroll-mt-24 mt-16">
                <h2 className="text-2xl lg:text-3xl font-bold mb-6 flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-green-500/10 text-green-500 flex items-center justify-center text-lg font-bold">4</span>
                  Flowa Hoạt Động Như Thế Nào?
                </h2>

                <h3 className="text-xl font-bold mb-4">Quy Trình 3 Bước</h3>

                <div className="grid md:grid-cols-3 gap-6 mb-8">
                  {[
                    { step: 1, title: 'Setup Brand', time: '1 lần • 10 phút', desc: 'Basic info, brand voice, channel settings, compliance rules', icon: Settings },
                    { step: 2, title: 'Generate Content', time: 'Daily • 10 phút/topic', desc: 'Nhập topic → Chọn kênh → Generate → Done', icon: Zap },
                    { step: 3, title: 'Review & Schedule', time: '5 phút', desc: 'Preview, edit, AI score check, schedule all', icon: CheckCircle2 },
                  ].map((item, i) => (
                    <div key={i} className="p-6 rounded-2xl bg-card border border-border/50 hover:border-primary/30 transition-colors">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                          {item.step}
                        </div>
                        <div>
                          <h4 className="font-bold">{item.title}</h4>
                          <p className="text-xs text-muted-foreground">{item.time}</p>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                  ))}
                </div>

                <h3 className="text-xl font-bold mb-4">Công Nghệ Đằng Sau</h3>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="p-6 rounded-2xl bg-muted/50">
                    <h4 className="font-semibold mb-3">Self-Critique AI Loop</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <ChevronRight className="w-4 h-4 text-primary" />
                        <span>Generate Content</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <ChevronRight className="w-4 h-4 text-primary" />
                        <span>AI Self-Evaluate (0-10)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <ChevronRight className="w-4 h-4 text-primary" />
                        <span>Score &lt; 7? → Regenerate</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <ChevronRight className="w-4 h-4 text-primary" />
                        <span>Score ≥ 7? → Present to user</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 rounded-2xl bg-muted/50">
                    <h4 className="font-semibold mb-3">Context Enrichment Pipeline</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <span>+ Brand Voice Settings</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <span>+ Industry Memory</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <span>+ Persona Context</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <span>+ Channel Requirements</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <span>+ Compliance Rules</span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Section 5 */}
              <section id="section-5" className="scroll-mt-24 mt-16">
                <h2 className="text-2xl lg:text-3xl font-bold mb-6 flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center text-lg font-bold">5</span>
                  So Sánh: Trước và Sau Khi Dùng Flowa
                </h2>

                <div className="grid md:grid-cols-2 gap-6 mb-8">
                  <div className="p-6 rounded-2xl bg-red-500/5 border border-red-500/20">
                    <h3 className="font-bold mb-4 flex items-center gap-2 text-red-500">
                      <span className="text-2xl">❌</span> TRƯỚC FLOWA
                    </h3>
                    <div className="space-y-2 text-sm">
                      {[
                        '09:00 - Brainstorm topic (45 phút)',
                        '09:45 - Viết bài Facebook (45 phút)',
                        '10:30 - Adapt cho Instagram (30 phút)',
                        '11:00 - Adapt cho LinkedIn (30 phút)',
                        '11:30 - Viết blog article (90 phút)',
                        '13:00 - Nghỉ trưa',
                        '14:00 - Viết email newsletter (45 phút)',
                        '14:45 - Viết TikTok script (60 phút)',
                        '15:45 - Design carousel brief (30 phút)',
                        '16:15 - Schedule trên từng platform (45 phút)',
                      ].map((item, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <Clock className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 p-3 rounded-lg bg-red-500/10 text-center font-bold text-red-500">
                      1 topic = 8 giờ
                    </div>
                  </div>

                  <div className="p-6 rounded-2xl bg-green-500/5 border border-green-500/20">
                    <h3 className="font-bold mb-4 flex items-center gap-2 text-green-500">
                      <span className="text-2xl">✅</span> VỚI FLOWA
                    </h3>
                    <div className="space-y-2 text-sm">
                      {[
                        '09:00 - Mở Flowa, chọn topic từ AI suggestions (2 phút)',
                        '09:02 - Click "Generate All Channels" (1 phút)',
                        '09:03 - Review 12 outputs, minor edits (15 phút)',
                        '09:18 - Click "Schedule All" (1 phút)',
                        '09:19 - Done!',
                      ].map((item, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 p-3 rounded-lg bg-green-500/10 text-center font-bold text-green-500">
                      1 topic = 19 phút
                    </div>
                    <div className="mt-2 text-center text-sm text-muted-foreground">
                      → Còn 7 giờ 41 phút để làm việc khác!
                    </div>
                  </div>
                </div>

                <h3 className="text-xl font-bold mb-4">Metrics Comparison</h3>

                <div className="overflow-x-auto mb-8">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="p-3 text-left font-semibold border-b border-border">Metric</th>
                        <th className="p-3 text-left font-semibold border-b border-border">Trước Flowa</th>
                        <th className="p-3 text-left font-semibold border-b border-border">Với Flowa</th>
                        <th className="p-3 text-left font-semibold border-b border-border">Improvement</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { metric: 'Thời gian/topic', before: '2-8 giờ', after: '15-30 phút', improvement: '-90%' },
                        { metric: 'Topics/tuần', before: '3-5', after: '15-20', improvement: '+400%' },
                        { metric: 'Brand consistency', before: '60%', after: '100%', improvement: '+67%' },
                        { metric: 'Missed deadlines', before: '40%', after: '0%', improvement: '-100%' },
                        { metric: 'Team burnout', before: 'High', after: 'Low', improvement: 'Significant' },
                      ].map((row, i) => (
                        <tr key={i} className="hover:bg-muted/30">
                          <td className="p-3 border-b border-border/50 font-medium">{row.metric}</td>
                          <td className="p-3 border-b border-border/50 text-red-500">{row.before}</td>
                          <td className="p-3 border-b border-border/50 text-green-500 font-medium">{row.after}</td>
                          <td className="p-3 border-b border-border/50 text-primary font-bold">{row.improvement}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="p-6 rounded-2xl bg-gradient-to-r from-primary/10 to-purple-500/10 border border-primary/20">
                  <h3 className="font-bold mb-4">ROI Calculation</h3>
                  <div className="grid sm:grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-sm text-muted-foreground">Giá trị thời gian tiết kiệm</div>
                      <div className="text-2xl font-bold text-primary">5,113,636 VNĐ/tháng</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Chi phí Flowa Pro</div>
                      <div className="text-2xl font-bold">499,000 VNĐ/tháng</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">ROI</div>
                      <div className="text-3xl font-bold text-green-500">925%</div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Section 6 */}
              <section id="section-6" className="scroll-mt-24 mt-16">
                <h2 className="text-2xl lg:text-3xl font-bold mb-6 flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center text-lg font-bold">6</span>
                  Ai Nên Sử Dụng Flowa?
                </h2>

                <div className="grid md:grid-cols-2 gap-6 mb-8">
                  {[
                    { 
                      icon: User, 
                      title: 'Solo Marketer / Freelancer',
                      pains: ['Làm tất cả một mình', 'Không có budget thuê thêm người', 'Burnout vì workload quá lớn'],
                      benefits: ['Tự động hóa 80% công việc', 'Output như có team 3-4 người', 'Có thời gian focus vào strategy'],
                    },
                    { 
                      icon: Users, 
                      title: 'Marketing Team (2-5 người)',
                      pains: ['Mỗi người viết 1 style khác nhau', 'Khó coordinate lịch đăng bài', 'Không có process chuẩn'],
                      benefits: ['Brand voice nhất quán cho cả team', 'Calendar chung, assignment rõ ràng', 'Workflow chuẩn hóa'],
                    },
                    { 
                      icon: BarChart3, 
                      title: 'Marketing Agency',
                      pains: ['Quản lý 10+ brands cùng lúc', 'Mỗi brand có voice khác nhau', 'Deadline gấp'],
                      benefits: ['Multi-brand management', 'Switch brand voice trong 1 click', 'Scale output không scale headcount'],
                    },
                    { 
                      icon: Target, 
                      title: 'E-commerce / D2C Brand',
                      pains: ['Cần content liên tục', 'Nhiều SKUs, nhiều campaigns', 'Seasonal peaks'],
                      benefits: ['Bulk generate cho nhiều products', 'Campaign templates có sẵn', 'Handle volume cao trong peak'],
                    },
                  ].map((profile, i) => (
                    <div key={i} className="p-6 rounded-2xl bg-card border border-border/50">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center">
                          <profile.icon className="w-5 h-5" />
                        </div>
                        <h3 className="font-bold">{profile.title}</h3>
                      </div>
                      <div className="mb-4">
                        <p className="text-xs text-red-500 font-medium mb-2">Pain Points:</p>
                        <ul className="space-y-1">
                          {profile.pains.map((pain, j) => (
                            <li key={j} className="text-sm text-muted-foreground flex items-start gap-2">
                              <span className="text-red-500">•</span> {pain}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-xs text-green-500 font-medium mb-2">Flowa giúp:</p>
                        <ul className="space-y-1">
                          {profile.benefits.map((benefit, j) => (
                            <li key={j} className="text-sm flex items-start gap-2">
                              <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                              {benefit}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Section 7 */}
              <section id="section-7" className="scroll-mt-24 mt-16">
                <h2 className="text-2xl lg:text-3xl font-bold mb-6 flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-pink-500/10 text-pink-500 flex items-center justify-center text-lg font-bold">7</span>
                  Case Study: Kết Quả Thực Tế
                </h2>

                <div className="space-y-8">
                  {/* Case Study 1 */}
                  <div className="p-6 rounded-2xl bg-card border border-border/50">
                    <Badge className="mb-3 bg-pink-500/10 text-pink-500 border-pink-500/30">Case Study 1</Badge>
                    <h3 className="text-xl font-bold mb-2">Startup Beauty Brand</h3>
                    <p className="text-muted-foreground mb-4">
                      Brand mỹ phẩm thiên nhiên, 2 năm tuổi • Team marketing: 2 người
                    </p>

                    <div className="grid sm:grid-cols-2 gap-4 mb-4">
                      <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20">
                        <h4 className="font-semibold text-red-500 mb-2">Trước Flowa</h4>
                        <ul className="text-sm space-y-1">
                          <li>12 posts/tuần (target 28)</li>
                          <li>Engagement rate: 2.1%</li>
                          <li>Thời gian tạo content: 25 giờ/tuần</li>
                        </ul>
                      </div>
                      <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/20">
                        <h4 className="font-semibold text-green-500 mb-2">Sau 3 tháng</h4>
                        <ul className="text-sm space-y-1">
                          <li>35 posts/tuần (+192%)</li>
                          <li>Engagement rate: 4.8% (+129%)</li>
                          <li>Thời gian tạo content: 8 giờ/tuần (-68%)</li>
                        </ul>
                      </div>
                    </div>

                    <blockquote className="border-l-4 border-primary pl-4 italic text-muted-foreground">
                      "Trước đây tôi dành cả ngày chỉ để viết content. Giờ tôi có thời gian để nghĩ strategy, 
                      analyze data, và thực sự sáng tạo thay vì chỉ execute."
                    </blockquote>
                  </div>

                  {/* Case Study 2 */}
                  <div className="p-6 rounded-2xl bg-card border border-border/50">
                    <Badge className="mb-3 bg-purple-500/10 text-purple-500 border-purple-500/30">Case Study 2</Badge>
                    <h3 className="text-xl font-bold mb-2">Marketing Agency</h3>
                    <p className="text-muted-foreground mb-4">
                      Agency với 15 clients • Team: 8 content writers
                    </p>

                    <div className="grid sm:grid-cols-2 gap-4 mb-4">
                      <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20">
                        <h4 className="font-semibold text-red-500 mb-2">Trước Flowa</h4>
                        <ul className="text-sm space-y-1">
                          <li>Capacity: 10 clients max</li>
                          <li>Turnaround time: 3-5 ngày</li>
                          <li>Client satisfaction: 7.2/10</li>
                          <li>Team overtime: 15 giờ/tuần/người</li>
                        </ul>
                      </div>
                      <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/20">
                        <h4 className="font-semibold text-green-500 mb-2">Sau 6 tháng</h4>
                        <ul className="text-sm space-y-1">
                          <li>Capacity: 22 clients (+120%)</li>
                          <li>Turnaround time: 1-2 ngày (-60%)</li>
                          <li>Client satisfaction: 9.1/10 (+26%)</li>
                          <li>Team overtime: 3 giờ/tuần/người (-80%)</li>
                        </ul>
                      </div>
                    </div>

                    <blockquote className="border-l-4 border-primary pl-4 italic text-muted-foreground">
                      "Flowa không thay thế team của tôi — nó amplify họ. 
                      Mỗi writer giờ có output như 3 người, và quality còn consistent hơn."
                    </blockquote>
                  </div>
                </div>
              </section>

              {/* Section 8 */}
              <section id="section-8" className="scroll-mt-24 mt-16">
                <h2 className="text-2xl lg:text-3xl font-bold mb-6 flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-yellow-500/10 text-yellow-500 flex items-center justify-center text-lg font-bold">8</span>
                  Bảng Giá Flowa 2026
                </h2>

                <div className="grid md:grid-cols-3 gap-6 mb-8">
                  {[
                    { 
                      name: 'Free', 
                      price: '0', 
                      period: '',
                      features: ['10 content generations/tháng', '5 kênh', '1 brand template', '1 team member', 'Basic AI Chatbot'],
                      cta: 'Bắt đầu miễn phí',
                      highlight: false,
                    },
                    { 
                      name: 'Pro', 
                      price: '499,000', 
                      period: 'VNĐ/tháng',
                      features: ['Unlimited generations', '12 kênh', '5 brand templates', '5 team members', 'TikTok scripts', 'Carousel generator', 'Advanced AI Chatbot', 'Full Content Calendar', 'Industry Compliance', 'Priority Email Support'],
                      cta: 'Dùng thử Pro',
                      highlight: true,
                    },
                    { 
                      name: 'Enterprise', 
                      price: 'Liên hệ', 
                      period: '',
                      features: ['Unlimited everything', '12 kênh + Custom', 'Unlimited brand templates', 'Unlimited team members', 'Custom AI training', 'API access', 'Dedicated Manager', '1-on-1 Onboarding'],
                      cta: 'Liên hệ Sales',
                      highlight: false,
                    },
                  ].map((plan, i) => (
                    <div 
                      key={i} 
                      className={`p-6 rounded-2xl border ${
                        plan.highlight 
                          ? 'bg-gradient-to-br from-primary/10 to-purple-500/10 border-primary/30 shadow-lg shadow-primary/10' 
                          : 'bg-card border-border/50'
                      }`}
                    >
                      {plan.highlight && (
                        <Badge className="mb-3 bg-primary text-primary-foreground">Most Popular</Badge>
                      )}
                      <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                      <div className="mb-4">
                        <span className="text-3xl font-bold">{plan.price}</span>
                        {plan.period && <span className="text-muted-foreground text-sm ml-1">{plan.period}</span>}
                      </div>
                      <ul className="space-y-2 mb-6">
                        {plan.features.map((feature, j) => (
                          <li key={j} className="flex items-start gap-2 text-sm">
                            <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                      <Button 
                        className={`w-full ${plan.highlight ? '' : 'variant-outline'}`}
                        variant={plan.highlight ? 'default' : 'outline'}
                        asChild
                      >
                        <Link to="/auth">{plan.cta}</Link>
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="p-6 rounded-2xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20">
                    <h3 className="font-bold mb-3 flex items-center gap-2">
                      🎁 Ưu Đãi Early Adopter
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">Đăng ký trong tháng 1/2026:</p>
                    <ul className="space-y-2">
                      {[
                        'Giảm 30% năm đầu tiên',
                        'Lifetime access to new features',
                        'Priority support queue',
                        '1-on-1 onboarding session (30 phút)',
                      ].map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-6 rounded-2xl bg-card border border-border/50">
                    <h3 className="font-bold mb-3 flex items-center gap-2">
                      💯 Cam Kết Hoàn Tiền 14 Ngày
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Dùng thử Flowa Pro trong 14 ngày. Nếu không hài lòng vì BẤT KỲ lý do gì, 
                      chúng tôi hoàn 100% tiền — không hỏi lý do.
                    </p>
                  </div>
                </div>
              </section>

              {/* Section 9 - FAQ */}
              <section id="section-9" className="scroll-mt-24 mt-16">
                <h2 className="text-2xl lg:text-3xl font-bold mb-6 flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center text-lg font-bold">9</span>
                  Câu Hỏi Thường Gặp (FAQ)
                </h2>

                <Accordion type="single" collapsible className="space-y-4">
                  {[
                    { 
                      q: 'Flowa có hỗ trợ tiếng Việt không?', 
                      a: 'Có. Flowa được xây dựng native cho tiếng Việt, không phải dịch từ tiếng Anh. AI hiểu ngữ cảnh, văn hóa, và cách diễn đạt của người Việt.' 
                    },
                    { 
                      q: 'Content do AI tạo có bị trùng lặp không?', 
                      a: 'Không. Mỗi output được generate unique dựa trên brand voice, context, và topic của bạn. Flowa cũng có Self-Critique AI để đảm bảo quality và originality.' 
                    },
                    { 
                      q: 'Tôi có thể chỉnh sửa content sau khi generate không?', 
                      a: 'Hoàn toàn có thể. Flowa cung cấp editor cho phép bạn chỉnh sửa, regenerate từng phần, hoặc yêu cầu AI điều chỉnh theo feedback.' 
                    },
                    { 
                      q: 'Flowa có tự động đăng bài lên social media không?', 
                      a: 'Hiện tại Flowa focus vào content creation và scheduling. Tính năng direct publishing đang trong roadmap và sẽ ra mắt Q2/2026.' 
                    },
                    { 
                      q: 'Data của tôi có được bảo mật không?', 
                      a: 'Có. Flowa sử dụng encryption end-to-end, và data được lưu trữ trên servers tuân thủ chuẩn bảo mật quốc tế. Chúng tôi không bao giờ share data của bạn với bên thứ ba.' 
                    },
                    { 
                      q: 'Có thể thanh toán bằng những hình thức nào?', 
                      a: 'Chúng tôi chấp nhận: Thẻ tín dụng/debit (Visa, Mastercard, JCB), Chuyển khoản ngân hàng, Ví điện tử (MoMo, ZaloPay, VNPay).' 
                    },
                    { 
                      q: 'Có thể hủy subscription bất cứ lúc nào không?', 
                      a: 'Có. Bạn có thể hủy subscription bất cứ lúc nào từ dashboard. Không có phí hủy, không có commitment dài hạn.' 
                    },
                    { 
                      q: 'Có xuất hóa đơn VAT không?', 
                      a: 'Có. Chúng tôi xuất hóa đơn VAT đầy đủ cho tất cả giao dịch. Vui lòng cung cấp thông tin công ty khi đăng ký.' 
                    },
                  ].map((faq, i) => (
                    <AccordionItem key={i} value={`faq-${i}`} className="border border-border/50 rounded-xl px-4">
                      <AccordionTrigger className="text-left font-medium hover:no-underline">
                        {faq.q}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">
                        {faq.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </section>

              {/* Section 10 */}
              <section id="section-10" className="scroll-mt-24 mt-16">
                <h2 className="text-2xl lg:text-3xl font-bold mb-6 flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-lg font-bold">10</span>
                  Kết Luận: Tại Sao Nên Bắt Đầu Ngay Hôm Nay
                </h2>

                <div className="mb-8">
                  <h3 className="text-xl font-bold mb-4">Tóm Tắt Giá Trị</h3>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                      'Tiết kiệm 90% thời gian tạo content đa kênh',
                      'Tăng 400% output mà không tăng headcount',
                      'Đảm bảo 100% brand consistency trên mọi kênh',
                      'Loại bỏ hoàn toàn missed deadlines và duplicate posts',
                      'Giải phóng team để focus vào strategy và creativity',
                    ].map((value, i) => (
                      <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
                        <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                        <span className="text-sm">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-8 rounded-3xl bg-gradient-to-br from-primary/10 via-purple-500/10 to-pink-500/10 border border-primary/20 text-center">
                  <h3 className="text-2xl font-bold mb-4">🚀 Bắt Đầu Miễn Phí Ngay Hôm Nay</h3>
                  <div className="flex flex-wrap justify-center gap-4 mb-6">
                    {[
                      '10 content generations miễn phí',
                      'Không cần thẻ tín dụng',
                      'Setup trong 5 phút',
                      'Cancel bất cứ lúc nào',
                    ].map((item, i) => (
                      <span key={i} className="flex items-center gap-1 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-primary" />
                        {item}
                      </span>
                    ))}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button size="lg" className="gap-2" asChild>
                      <Link to="/auth">
                        Tạo Tài Khoản Miễn Phí
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </Button>
                    <Button size="lg" variant="outline" asChild>
                      <Link to="/contact">Đặt Lịch Demo 1-1</Link>
                    </Button>
                  </div>
                </div>
              </section>

              {/* About */}
              <section className="mt-16 pt-8 border-t border-border/50">
                <h3 className="font-bold mb-4">Về Flowa</h3>
                <p className="text-muted-foreground mb-4">
                  Flowa là sản phẩm của đội ngũ đam mê marketing và công nghệ tại Việt Nam. 
                  Sứ mệnh của chúng tôi là giúp mọi Marketing Team — từ 1 người đến 100 người — 
                  có thể tạo content chất lượng cao một cách hiệu quả và nhất quán.
                </p>
                <div className="flex flex-wrap gap-4 text-sm">
                  <span>🌐 flowa.one</span>
                  <span>📧 support@flowa.vn</span>
                  <span>📞 0838226363</span>
                </div>
                <p className="text-xs text-muted-foreground mt-4">
                  Bài viết được cập nhật lần cuối: Tháng 1/2026
                </p>
              </section>
            </article>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-muted-foreground">
          © 2026 Flowa. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default BlogPost;
