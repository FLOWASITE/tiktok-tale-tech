import { Link } from 'react-router-dom';
import { ArrowLeft, Clock, User, Calendar, ChevronDown, Zap, Target, Layers, Share2, Video, Mail, BarChart3, Lightbulb } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { LandingNav } from '@/components/landing/LandingNav';
import { FooterSection } from '@/components/landing/FooterSection';
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

const POST_SLUG = 'content-repurposing-chien-luoc';
const POST_CATEGORY = 'Strategy';

const BlogPostRepurposing = () => {
  const tableOfContents = [
    { id: 'section-1', title: '1. Sự Thật Đau Lòng: Tại Sao Bạn Luôn "Đói" Content?' },
    { id: 'section-2', title: '2. Content Repurposing Là Gì? (Không Phải Copy-Paste)' },
    { id: 'section-3', title: '3. Mô Hình "Content Waterfall": Dòng Chảy Nội Dung Thông Minh' },
    { id: 'section-4', title: '4. Quy Trình 4 Bước: Từ 1 Bài Blog Ra 12 Kênh' },
    { id: 'section-5', title: '5. Chiến Thuật Repurpose Cho Từng Nền Tảng' },
    { id: 'section-6', title: '6. Công Cụ Hỗ Trợ: Cách AI Tự Động Hóa 90% Công Việc' },
    { id: 'section-7', title: '7. Case Study: Phủ Sóng Đa Kênh Mà Không Cần Team Lớn' },
    { id: 'section-8', title: '8. Kết Luận' },
  ];

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Content Repurposing: Biến 1 Ý Tưởng Thành 20+ Nội Dung Đa Kênh"
        description="Đừng viết nhiều hơn, hãy viết thông minh hơn. Hướng dẫn chi tiết chiến lược Content Repurposing để thống trị mọi nền tảng."
        canonicalPath="/blog/content-repurposing-chien-luoc"
        ogType="article"
        ogImage="https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200&h=630&fit=crop"
        article={{ author: 'Võ Phương Duy', publishDate: '2026-01-15T00:00:00+07:00', section: 'Strategy', tags: ['content repurposing', 'đa kênh', 'chiến lược', 'tái sử dụng nội dung'], readingTime: 'PT15M', wordCount: 3500, authorUrl: 'https://flowa.vn', authorJobTitle: 'Founder Flowa', authorSameAs: ['https://linkedin.com/in/vophuongduy'] }}
        breadcrumbs={[
          { name: 'Trang chủ', url: '/' },
          { name: 'Blog', url: '/blog' },
          { name: 'Content Repurposing', url: '/blog/content-repurposing-chien-luoc' },
        ]}
      />
      <TOCSEOSchema
        items={tableOfContents.map((item) => ({
          name: item.title,
          url: `https://tiktok-tale-tech.lovable.app/blog/content-repurposing-chien-luoc#${item.id}`,
        }))}
      />
      {/* Reading Progress */}
      <ReadingProgress />

      {/* Navigation */}
      <LandingNav />

      {/* Secondary Nav - Back to Blog */}
      <header className="bg-card border-b border-border sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            <Link to="/blog" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" />
              <span className="font-medium">Blog</span>
            </Link>
            <div className="flex items-center gap-4">
              <BlogReactions postSlug={POST_SLUG} />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main Content */}
          <article className="flex-1 max-w-4xl">
            {/* Breadcrumb */}
            <div className="mb-6">
              <BlogBreadcrumb postTitle="Content Repurposing" />
            </div>

            {/* Article Header */}
            <header className="mb-8">
              <div className="flex items-center space-x-2 mb-4">
                <span className="px-3 py-1 bg-orange-500/10 text-orange-500 text-sm font-medium rounded-full">
                  Strategy
                </span>
                <span className="px-3 py-1 bg-primary/10 text-primary text-sm font-medium rounded-full">
                  Productivity
                </span>
              </div>
              
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4 leading-tight">
                Content Repurposing: Biến 1 Ý Tưởng Thành 20+ Nội Dung Đa Kênh Trong 5 Phút [2026]
              </h1>
              
              <p className="text-xl text-muted-foreground mb-6">
                Đừng viết nhiều hơn, hãy viết thông minh hơn. Hướng dẫn chi tiết chiến lược Content Repurposing để thống trị mọi nền tảng từ Facebook, TikTok đến LinkedIn chỉ từ 1 bài gốc.
              </p>

              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-6">
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4" />
                  <span>Võ Phương Duy</span>
                </div>
                <time dateTime="2026-01-15" className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4" />
                  <span>Tháng 1, 2026</span>
                </time>
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4" />
                  <span>15 phút đọc</span>
                </div>
              </div>

              <SocialShare 
                title="Content Repurposing: Biến 1 Ý Tưởng Thành 20+ Nội Dung"
                description="Đừng viết nhiều hơn, hãy viết thông minh hơn."
              />
            </header>

            {/* Mobile Table of Contents */}
            <div className="lg:hidden mb-8">
              <Accordion type="single" collapsible className="bg-card rounded-lg border border-border">
                <AccordionItem value="toc" className="border-none">
                  <AccordionTrigger className="px-4 py-3 hover:no-underline">
                    <div className="flex items-center space-x-2">
                      <ChevronDown className="w-4 h-4" />
                      <span className="font-semibold">Mục lục bài viết</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <nav className="space-y-2">
                      {tableOfContents.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => scrollToSection(item.id)}
                          className="block w-full text-left text-sm text-muted-foreground hover:text-primary transition-colors py-1"
                        >
                          {item.title}
                        </button>
                      ))}
                    </nav>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>

            {/* Article Content */}
            <div className="prose prose-lg max-w-none">
              
              {/* Section 1 */}
              <section id="section-1" className="mb-12 scroll-mt-24">
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
                  <Target className="w-8 h-8 text-red-500" />
                  1. Sự Thật Đau Lòng: Tại Sao Bạn Luôn "Đói" Content?
                </h2>

                <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-6 mb-6">
                  <p className="text-foreground mb-4 font-medium">Hãy tưởng tượng kịch bản này:</p>
                  <p className="text-muted-foreground mb-4">
                    Bạn dành <strong className="text-foreground">5 tiếng đồng hồ</strong> để viết một bài Blog tâm huyết dài 2.000 từ. Bạn đăng lên website.
                  </p>
                  <p className="text-muted-foreground">
                    <strong className="text-foreground">Kết quả?</strong> 100 lượt xem trong tuần đầu tiên. Sau đó... <em>chìm vào quên lãng.</em>
                  </p>
                </div>

                <p className="text-muted-foreground mb-4">
                  Trong khi đó, sếp (hoặc chính bạn) đòi hỏi:
                </p>

                <ul className="space-y-2 mb-6">
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 mt-1">•</span>
                    <span className="text-muted-foreground">"Sao Fanpage hôm nay chưa có bài?"</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 mt-1">•</span>
                    <span className="text-muted-foreground">"Kênh TikTok mốc meo rồi kìa!"</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 mt-1">•</span>
                    <span className="text-muted-foreground">"Phải đăng bài trên LinkedIn để xây dựng thương hiệu cá nhân chứ!"</span>
                  </li>
                </ul>

                <p className="text-muted-foreground mb-4">
                  Bạn lao vào guồng quay <strong className="text-foreground">"Hamster Wheel"</strong> – con chuột chạy trong lồng. Ngày nào cũng phải nghĩ ý tưởng mới cho từng kênh riêng lẻ.
                </p>

                <div className="bg-muted/50 rounded-lg p-4 mb-6 font-mono text-sm">
                  <p className="text-muted-foreground">• Sáng viết Facebook.</p>
                  <p className="text-muted-foreground">• Chiều quay TikTok.</p>
                  <p className="text-muted-foreground">• Tối viết Email.</p>
                </div>

                <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-xl p-6">
                  <p className="text-foreground font-semibold mb-2">Hậu quả:</p>
                  <p className="text-muted-foreground">
                    <strong className="text-red-500">Burn-out</strong> (kiệt sức), chất lượng nội dung đi xuống, và thông điệp thương hiệu rời rạc.
                  </p>
                  <p className="text-foreground font-semibold mt-4">
                    Giải pháp không phải là làm việc chăm chỉ hơn. Giải pháp là <span className="text-primary">Content Repurposing</span>.
                  </p>
                </div>
              </section>

              {/* Section 2 */}
              <section id="section-2" className="mb-12 scroll-mt-24">
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
                  <Lightbulb className="w-8 h-8 text-yellow-500" />
                  2. Content Repurposing Là Gì? (Không Phải Copy-Paste)
                </h2>

                <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 mb-6">
                  <p className="text-foreground font-medium">
                    <strong>Content Repurposing</strong> (Tái sử dụng nội dung) là quá trình lấy một nội dung "gốc" (thường là định dạng dài, chuyên sâu) và <strong>chế biến</strong> nó thành nhiều định dạng khác nhau để phục vụ các kênh khác nhau.
                  </p>
                </div>

                <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-6 mb-6">
                  <h4 className="font-bold text-foreground mb-4">⚠️ Lưu ý quan trọng: Repurposing ≠ Cross-posting</h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-red-500/10 rounded-lg p-4">
                      <p className="font-semibold text-red-500 mb-2">❌ Cross-posting (Sai)</p>
                      <p className="text-muted-foreground text-sm">
                        Copy y nguyên caption từ Facebook dán sang LinkedIn. (Vì khán giả và thuật toán mỗi kênh khác nhau)
                      </p>
                    </div>
                    <div className="bg-green-500/10 rounded-lg p-4">
                      <p className="font-semibold text-green-500 mb-2">✅ Repurposing (Đúng)</p>
                      <p className="text-muted-foreground text-sm">
                        Lấy ý tưởng cốt lõi từ Facebook, viết lại giọng văn chuyên nghiệp cho LinkedIn, biến thành video ngắn cho TikTok.
                      </p>
                    </div>
                  </div>
                </div>

                <h3 className="text-xl font-bold text-foreground mb-4">Tại sao phải Repurpose?</h3>

                <div className="grid sm:grid-cols-2 gap-4 mb-6">
                  <div className="bg-card border border-border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="w-5 h-5 text-primary" />
                      <span className="font-semibold text-foreground">Tiếp cận đa điểm chạm</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Khách hàng A thích đọc Blog, nhưng khách hàng B chỉ lướt TikTok. Repurposing giúp bạn gặp họ ở nơi họ thích.
                    </p>
                  </div>
                  <div className="bg-card border border-border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <BarChart3 className="w-5 h-5 text-green-500" />
                      <span className="font-semibold text-foreground">Tối ưu ROI</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      1 giờ nghiên cứu chủ đề = 20 nội dung đầu ra (thay vì 1).
                    </p>
                  </div>
                  <div className="bg-card border border-border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Share2 className="w-5 h-5 text-blue-500" />
                      <span className="font-semibold text-foreground">Tăng cường SEO</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Các bài đăng vệ tinh (social) kéo traffic về bài gốc (website), tín hiệu tốt cho Google.
                    </p>
                  </div>
                  <div className="bg-card border border-border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Layers className="w-5 h-5 text-purple-500" />
                      <span className="font-semibold text-foreground">Củng cố thông điệp (Rule of 7)</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Khách hàng cần thấy thông điệp 7 lần mới nhớ. Lặp lại dưới hình thức mới giúp "ghim" thương hiệu vào tâm trí.
                    </p>
                  </div>
                </div>
              </section>

              {/* Section 3 */}
              <section id="section-3" className="mb-12 scroll-mt-24">
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
                  <Layers className="w-8 h-8 text-blue-500" />
                  3. Mô Hình "Content Waterfall": Dòng Chảy Nội Dung Thông Minh
                </h2>

                <p className="text-muted-foreground mb-6">
                  Để làm Repurposing hiệu quả, bạn cần tư duy theo mô hình <strong className="text-foreground">Thác nước (Waterfall)</strong>.
                </p>

                <div className="space-y-4 mb-6">
                  <div className="bg-gradient-to-r from-blue-500/20 to-blue-500/5 border border-blue-500/30 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">1</div>
                      <h4 className="text-lg font-bold text-foreground">Tầng 1: The Pillar Content (Nội Dung Cột Trụ)</h4>
                    </div>
                    <p className="text-muted-foreground mb-2">
                      Đây là <strong className="text-foreground">nguồn suối</strong>. Nó phải là nội dung dài, chất lượng cao, chứa nhiều thông tin giá trị.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <strong>Ví dụ:</strong> Blog Post (2000 từ), Podcast (30 phút), Webinar (1 tiếng), Whitepaper.
                    </p>
                  </div>

                  <div className="bg-gradient-to-r from-purple-500/20 to-purple-500/5 border border-purple-500/30 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold">2</div>
                      <h4 className="text-lg font-bold text-foreground">Tầng 2: Micro-Content (Nội Dung Vi Mô)</h4>
                    </div>
                    <p className="text-muted-foreground mb-2">
                      Cắt nhỏ Pillar Content thành các <strong className="text-foreground">mẩu tin dễ tiêu thụ</strong>.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <strong>Ví dụ:</strong> Trích dẫn hay, đoạn video ngắn 1 phút, bài viết social ngắn, infographic.
                    </p>
                  </div>

                  <div className="bg-gradient-to-r from-green-500/20 to-green-500/5 border border-green-500/30 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-bold">3</div>
                      <h4 className="text-lg font-bold text-foreground">Tầng 3: Distribution (Phân Phối)</h4>
                    </div>
                    <p className="text-muted-foreground">
                      Đưa Micro-content lên <strong className="text-foreground">đúng kênh, đúng format</strong>.
                    </p>
                  </div>
                </div>
              </section>

              {/* Section 4 */}
              <section id="section-4" className="mb-12 scroll-mt-24">
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
                  <Zap className="w-8 h-8 text-yellow-500" />
                  4. Quy Trình 4 Bước: Từ 1 Bài Blog Ra 12 Kênh
                </h2>

                <div className="bg-muted/30 border border-border rounded-xl p-6 mb-6">
                  <p className="text-muted-foreground">
                    Giả sử bạn có 1 bài Blog gốc: <strong className="text-foreground">"5 Cách Quản Lý Tài Chính Cho Freelancer"</strong>. Đây là cách chúng ta "xẻ thịt" nó:
                  </p>
                </div>

                <div className="space-y-6">
                  <div className="bg-card border border-border rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-sm">1</div>
                      <h4 className="text-lg font-bold text-foreground">Bước 1: Trích xuất Key Takeaways (Ý chính)</h4>
                    </div>
                    <p className="text-muted-foreground mb-3">Đọc lại bài blog, gạch ra 5 phương pháp chính và các số liệu đắt giá.</p>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-sm text-muted-foreground font-mono">
                        <strong>Output:</strong> 5 luận điểm, 3 câu quote hay, 1 bảng so sánh.
                      </p>
                    </div>
                  </div>

                  <div className="bg-card border border-border rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-sm">2</div>
                      <h4 className="text-lg font-bold text-foreground">Bước 2: Chuyển thể sang dạng Text ngắn (Social Copy)</h4>
                    </div>
                    <ul className="space-y-2 text-muted-foreground">
                      <li>• <strong className="text-foreground">Facebook:</strong> Viết bài post thân thiện, dùng emoji, đặt câu hỏi tương tác.</li>
                      <li>• <strong className="text-foreground">LinkedIn:</strong> Viết lại với giọng văn chuyên gia, tập trung vào góc nhìn nghề nghiệp.</li>
                      <li>• <strong className="text-foreground">Twitter/Threads:</strong> Tách thành một chuỗi (thread) 6 tweets.</li>
                      <li>• <strong className="text-foreground">Email:</strong> Viết một teaser ngắn gọn mời người dùng click vào đọc bài full.</li>
                    </ul>
                  </div>

                  <div className="bg-card border border-border rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-sm">3</div>
                      <h4 className="text-lg font-bold text-foreground">Bước 3: Chuyển thể sang dạng Visual (Hình ảnh)</h4>
                    </div>
                    <ul className="space-y-2 text-muted-foreground">
                      <li>• <strong className="text-foreground">Instagram/LinkedIn:</strong> Tạo một Carousel 6 slides. Slide 1 là bìa, Slide 2-6 là 5 cách quản lý tài chính.</li>
                      <li>• <strong className="text-foreground">Pinterest:</strong> Tạo một Infographic dài tóm tắt quy trình.</li>
                    </ul>
                  </div>

                  <div className="bg-card border border-border rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-sm">4</div>
                      <h4 className="text-lg font-bold text-foreground">Bước 4: Chuyển thể sang dạng Video/Audio</h4>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <p className="text-muted-foreground mb-2"><strong className="text-foreground">TikTok/Reels/Shorts:</strong> Viết kịch bản video 60s.</p>
                        <div className="bg-muted/50 rounded-lg p-3 text-sm font-mono">
                          <p className="text-muted-foreground">• 0-3s: Hook ("Freelancer kiếm nhiều nhưng rỗng túi? Đây là lý do.")</p>
                          <p className="text-muted-foreground">• 3-50s: Đi nhanh qua 5 cách.</p>
                          <p className="text-muted-foreground">• 50-60s: CTA ("Đọc chi tiết tại link bio").</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-muted-foreground">
                          <strong className="text-foreground">Podcast:</strong> Đọc lại bài viết (hoặc dùng AI Voice) để tạo bản audio cho người thích nghe.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Section 5 */}
              <section id="section-5" className="mb-12 scroll-mt-24">
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
                  <Share2 className="w-8 h-8 text-purple-500" />
                  5. Chiến Thuật Repurpose Cho Từng Nền Tảng
                </h2>

                <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-6 mb-6">
                  <p className="text-foreground font-medium">
                    Mỗi nền tảng có "ngôn ngữ" riêng. Nếu bạn dùng Google Translate để dịch tiếng Việt sang tiếng Anh một cách thô thiển, người ta sẽ cười. <strong>Content cũng vậy.</strong>
                  </p>
                </div>

                <div className="space-y-6">
                  <div className="bg-card border border-blue-500/30 rounded-xl p-6">
                    <h4 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                      <span className="text-2xl">📘</span> Facebook & Zalo OA (The Community Builder)
                    </h4>
                    <div className="space-y-2 text-muted-foreground">
                      <p><strong className="text-foreground">Khẩu vị:</strong> Thân thiện, đời thường, dễ chia sẻ.</p>
                      <p><strong className="text-foreground">Chiến thuật:</strong> Dùng bài Blog để tạo ra một câu chuyện (Storytelling). "Hôm qua tôi gặp một bạn Freelancer mất trắng 50 triệu vì không quản lý tiền..." sau đó dẫn vào 5 bài học.</p>
                      <p><strong className="text-foreground">Format:</strong> Text + 1 Ảnh meme/ảnh thật hoặc Video ngắn.</p>
                    </div>
                  </div>

                  <div className="bg-card border border-blue-700/30 rounded-xl p-6">
                    <h4 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                      <span className="text-2xl">💼</span> LinkedIn (The Professional Authority)
                    </h4>
                    <div className="space-y-2 text-muted-foreground">
                      <p><strong className="text-foreground">Khẩu vị:</strong> Chuyên sâu, số liệu, bài học kinh doanh, không dùng ngôn ngữ teen.</p>
                      <p><strong className="text-foreground">Chiến thuật:</strong> Biến 5 cách quản lý tài chính thành "Framework Quản Trị Dòng Tiền Cá Nhân". Tập trung vào tư duy (mindset) hơn là thủ thuật (tips).</p>
                      <p><strong className="text-foreground">Format:</strong> PDF Document (Carousel) hoặc Text-only post dài.</p>
                    </div>
                  </div>

                  <div className="bg-card border border-pink-500/30 rounded-xl p-6">
                    <h4 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                      <span className="text-2xl">🎵</span> TikTok & Reels (The Attention Grabber)
                    </h4>
                    <div className="space-y-2 text-muted-foreground">
                      <p><strong className="text-foreground">Khẩu vị:</strong> Nhanh, giải trí, trực quan, nhạc trend.</p>
                      <p><strong className="text-foreground">Chiến thuật:</strong> Đừng đọc bài blog trước camera. Hãy diễn. Đóng vai 2 người (1 người tiêu hoang, 1 người biết quản lý) đối đáp nhau.</p>
                      <p><strong className="text-foreground">Format:</strong> Video dọc 9:16, dưới 60s.</p>
                    </div>
                  </div>

                  <div className="bg-card border border-green-500/30 rounded-xl p-6">
                    <h4 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                      <span className="text-2xl">🌐</span> Website (The SEO Hub)
                    </h4>
                    <div className="space-y-2 text-muted-foreground">
                      <p><strong className="text-foreground">Chiến thuật:</strong> Nhúng (Embed) tất cả các nội dung trên vào lại bài Blog gốc.</p>
                      <ul className="list-disc list-inside ml-4 text-sm">
                        <li>Chèn video TikTok vào giữa bài.</li>
                        <li>Chèn ảnh Infographic vào cuối bài.</li>
                      </ul>
                      <p><strong className="text-foreground">Lợi ích:</strong> Tăng Time-on-site của người đọc → Tốt cho SEO.</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Section 6 */}
              <section id="section-6" className="mb-12 scroll-mt-24">
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
                  <Zap className="w-8 h-8 text-primary" />
                  6. Công Cụ Hỗ Trợ: Cách AI Tự Động Hóa 90% Công Việc
                </h2>

                <p className="text-muted-foreground mb-6">
                  Cách thủ công ở trên nghe rất hay, nhưng... <strong className="text-foreground">tốn thời gian</strong>. Để làm hết đống đó (viết lại cho LinkedIn, vẽ Carousel, viết kịch bản TikTok), bạn mất ít nhất <strong className="text-red-500">1 ngày làm việc</strong>.
                </p>

                <p className="text-xl font-semibold text-foreground mb-6">Năm 2026, chúng ta có AI.</p>

                <div className="grid md:grid-cols-2 gap-6 mb-8">
                  <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-6">
                    <h4 className="font-bold text-foreground mb-4 flex items-center gap-2">
                      <span className="text-red-500">❌</span> Cách "Cũ" (Fragmented Tools)
                    </h4>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li>• Dùng ChatGPT để viết lại text.</li>
                      <li>• Dùng Canva để làm ảnh.</li>
                      <li>• Dùng CapCut để làm video.</li>
                      <li>• Copy paste qua lại giữa 3-4 tabs.</li>
                      <li className="text-red-500">→ Rất rối và dễ sai sót brand voice.</li>
                    </ul>
                  </div>

                  <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-6">
                    <h4 className="font-bold text-foreground mb-4 flex items-center gap-2">
                      <span className="text-green-500">✅</span> Cách "Mới" (All-in-One AI Platform)
                    </h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Các nền tảng thế hệ mới như <strong className="text-primary">Flowa</strong> được thiết kế chuyên biệt cho Repurposing.
                    </p>
                    <p className="text-sm text-green-500">→ Một workflow, tất cả output.</p>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/30 rounded-xl p-6 mb-6">
                  <h4 className="text-lg font-bold text-foreground mb-4">Workflow với Flowa:</h4>
                  <div className="space-y-4">
                    <div className="flex gap-4">
                      <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0">1</div>
                      <div>
                        <p className="font-semibold text-foreground">Input:</p>
                        <p className="text-muted-foreground text-sm">Bạn chỉ cần nhập 1 chủ đề (Topic) hoặc dán link bài Blog gốc vào.</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0">2</div>
                      <div>
                        <p className="font-semibold text-foreground">Xử lý:</p>
                        <ul className="text-muted-foreground text-sm space-y-1">
                          <li>• <strong>Module Multi-Channel:</strong> Tự động viết lại content cho 12 kênh cùng lúc.</li>
                          <li>• <strong>Module Script:</strong> Tự động trích xuất ý chính thành kịch bản phân cảnh.</li>
                          <li>• <strong>Module Carousel:</strong> Tự động tạo prompt để vẽ bộ ảnh slide.</li>
                        </ul>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0">3</div>
                      <div>
                        <p className="font-semibold text-foreground">Output:</p>
                        <p className="text-muted-foreground text-sm">Bạn nhận về bộ "Content Kit" hoàn chỉnh trong <strong className="text-primary">5 phút</strong>. Việc còn lại chỉ là duyệt và đăng.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-6">
                  <p className="text-foreground">
                    <strong>💡 Điểm đặc biệt:</strong> Với các ngành đặc thù (Y tế, Luật), Flowa có <strong className="text-primary">Industry Memory</strong> giúp đảm bảo khi AI viết lại nội dung sang các kênh khác, nó không vô tình vi phạm các từ cấm hay đưa ra lời khuyên sai lệch. Điều này ChatGPT thông thường không làm được.
                  </p>
                </div>
              </section>

              {/* Section 7 */}
              <section id="section-7" className="mb-12 scroll-mt-24">
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
                  <BarChart3 className="w-8 h-8 text-green-500" />
                  7. Case Study: Phủ Sóng Đa Kênh Mà Không Cần Team Lớn
                </h2>

                <div className="bg-card border border-border rounded-xl p-6 mb-6">
                  <h4 className="font-bold text-foreground mb-2">📋 Bối cảnh:</h4>
                  <p className="text-muted-foreground">Chị Lan, chủ một chuỗi Spa nhỏ.</p>
                  
                  <h4 className="font-bold text-foreground mt-4 mb-2">😓 Vấn đề:</h4>
                  <p className="text-muted-foreground">Chị rất giỏi chuyên môn, nhưng không có thời gian viết bài. Thuê Agency thì tốn 20 triệu/tháng.</p>
                </div>

                <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-xl p-6 mb-6">
                  <h4 className="font-bold text-foreground mb-4">✨ Áp dụng Repurposing với AI:</h4>
                  <ul className="space-y-3 text-muted-foreground">
                    <li className="flex gap-3">
                      <span className="text-green-500 font-bold">1.</span>
                      <span>Mỗi thứ 2, chị dành <strong className="text-foreground">15 phút</strong> nói vào điện thoại (Voice to Text) về một chủ đề chuyên môn (Ví dụ: "Cách trị mụn lưng").</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="text-green-500 font-bold">2.</span>
                      <span>Chị đưa văn bản đó vào AI.</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="text-green-500 font-bold">3.</span>
                      <div>
                        <span>AI tạo ra:</span>
                        <ul className="list-disc list-inside ml-4 mt-2 text-sm">
                          <li>1 bài Blog chuẩn SEO đăng web.</li>
                          <li>1 kịch bản video ngắn → Chị đưa nhân viên quay bằng điện thoại (30 phút).</li>
                          <li>1 bài Facebook chia sẻ kinh nghiệm → Đăng Fanpage.</li>
                          <li>1 Email gửi tập khách hàng cũ mời đến trải nghiệm liệu trình.</li>
                        </ul>
                      </div>
                    </li>
                  </ul>
                </div>

                <div className="bg-primary/5 border border-primary/20 rounded-xl p-6">
                  <h4 className="font-bold text-foreground mb-4">📈 Kết quả:</h4>
                  <ul className="space-y-2 text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <span className="text-green-500">✓</span>
                      <span>Chị Lan xuất hiện "mọi nơi" trong mắt khách hàng.</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-500">✓</span>
                      <span>Doanh thu từ khách cũ quay lại <strong className="text-foreground">tăng 30%</strong> nhờ Email và Zalo OA đều đặn.</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-500">✓</span>
                      <span>Chi phí Marketing: <strong className="text-foreground">Gần như bằng 0</strong> (chỉ tốn tiền phần mềm AI).</span>
                    </li>
                  </ul>
                </div>
              </section>

              {/* Section 8 */}
              <section id="section-8" className="mb-12 scroll-mt-24">
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-6">
                  8. Kết Luận
                </h2>

                <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/30 rounded-xl p-8 mb-6">
                  <p className="text-xl text-foreground font-medium mb-4">
                    Content Repurposing không phải là sự lười biếng. Đó là sự <strong className="text-primary">trân trọng chất xám</strong> của chính bạn.
                  </p>
                  <p className="text-muted-foreground">
                    Đừng để một ý tưởng hay chỉ sống được 24 giờ trên một nền tảng duy nhất. Hãy biến nó thành một <strong className="text-foreground">"đội quân" nội dung</strong> đi chinh phục mọi ngóc ngách trên internet.
                  </p>
                </div>

                <div className="bg-card border border-border rounded-xl p-6">
                  <h4 className="font-bold text-foreground mb-4">🚀 Hành động ngay hôm nay:</h4>
                  <ol className="space-y-3 text-muted-foreground">
                    <li className="flex gap-3">
                      <span className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0">1</span>
                      <span>Chọn ra <strong className="text-foreground">1 bài viết hay nhất</strong> của bạn trong quá khứ.</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0">2</span>
                      <span>Dùng tư duy Repurposing (hoặc dùng thử công cụ như <strong className="text-primary">Flowa</strong>) để biến nó thành <strong className="text-foreground">5 định dạng</strong> khác nhau.</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0">3</span>
                      <span>Đăng tải và xem điều kỳ diệu xảy ra với chỉ số tương tác (Engagement).</span>
                    </li>
                  </ol>
                </div>
              </section>

              {/* Internal Links */}
              <div className="p-4 rounded-xl bg-muted/50 border border-border mb-8">
                <h4 className="font-semibold text-foreground mb-3">📚 Đọc thêm:</h4>
                <ul className="space-y-2 text-sm">
                  <li>
                    <Link to="/blog/cach-tao-content-da-kenh" className="text-primary hover:underline">
                      → Cách Tạo Content Đa Kênh: Hướng Dẫn Toàn Diện Từ A-Z
                    </Link>
                  </li>
                  <li>
                    <Link to="/blog/ai-content-marketing-huong-dan" className="text-primary hover:underline">
                      → AI Content Marketing: Hướng Dẫn Toàn Diện Từ Cơ Bản Đến Nâng Cao
                    </Link>
                  </li>
                </ul>
              </div>

              {/* CTA */}
              <section className="bg-gradient-to-r from-primary to-primary/80 rounded-2xl p-8 text-center">
                <h3 className="text-2xl font-bold text-primary-foreground mb-4">
                  Sẵn sàng biến 1 ý tưởng thành 20+ nội dung?
                </h3>
                <p className="text-primary-foreground/80 mb-6">
                  Dùng thử Flowa miễn phí và trải nghiệm sức mạnh của Content Repurposing tự động.
                </p>
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 bg-background text-foreground px-8 py-3 rounded-full font-semibold hover:bg-background/90 transition-colors"
                >
                  <Zap className="w-5 h-5" />
                  Bắt Đầu Miễn Phí
                </Link>
              </section>

              {/* Author */}
              <div className="mt-12 pt-8 border-t border-border">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gradient-to-r from-primary to-primary/80 rounded-full flex items-center justify-center">
                    <span className="text-2xl font-bold text-primary-foreground">VD</span>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Võ Phương Duy</p>
                    <p className="text-sm text-muted-foreground">Founder Flowa - Chuyên gia tư vấn giải pháp AI Content Marketing</p>
                  </div>
                </div>
              </div>
            </div>
          </article>

          {/* Desktop Sidebar TOC */}
          <aside className="hidden lg:block w-72 shrink-0">
            <div className="sticky top-24">
              <div className="bg-card border border-border rounded-xl p-6">
                <h3 className="font-semibold text-foreground mb-4">Mục lục</h3>
                <nav className="space-y-2">
                  {tableOfContents.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => scrollToSection(item.id)}
                      className="block w-full text-left text-sm text-muted-foreground hover:text-primary transition-colors py-1.5 border-l-2 border-transparent hover:border-primary pl-3"
                    >
                      {item.title}
                    </button>
                  ))}
                </nav>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <FooterSection />
    </div>
  );
};

export default BlogPostRepurposing;
