import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowLeft, Clock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Blog = () => {
  const posts = [
    {
      id: 'flowa-giai-phap-content-marketing',
      title: 'Flowa: Giải Pháp Tạo Content Marketing Đa Kênh Trong 10 Phút',
      excerpt: 'Flowa giúp Marketing Team tạo content cho 12 kênh chỉ trong 10 phút. Tự động hóa 90% quy trình.',
      image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=400&fit=crop',
      date: 'Tháng 1, 2026',
      readTime: '15 phút',
      category: 'Product',
    },
    {
      id: 'cach-tao-content-da-kenh',
      title: 'Cách Tạo Content Đa Kênh: Hướng Dẫn Toàn Diện Từ A-Z',
      excerpt: 'Học cách tạo content cho 10+ kênh từ 1 ý tưởng duy nhất. Bao gồm framework, templates và case studies.',
      image: 'https://images.unsplash.com/photo-1432888622747-4eb9a8efeb07?w=600&h=400&fit=crop',
      date: 'Tháng 1, 2026',
      readTime: '25 phút',
      category: 'Guide',
    },
    {
      id: 'ai-content-marketing-huong-dan',
      title: 'AI Content Marketing: Hướng Dẫn Toàn Diện Từ Cơ Bản Đến Nâng Cao',
      excerpt: 'Tìm hiểu cách sử dụng AI trong content marketing hiệu quả. Bao gồm workflow, tools và prompts.',
      image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=600&h=400&fit=crop',
      date: 'Tháng 1, 2026',
      readTime: '25 phút',
      category: 'AI Marketing',
    },
    {
      id: 'content-repurposing-chien-luoc',
      title: 'Content Repurposing: Biến 1 Ý Tưởng Thành 20+ Nội Dung Đa Kênh',
      excerpt: 'Đừng viết nhiều hơn, hãy viết thông minh hơn. Hướng dẫn chi tiết chiến lược Content Repurposing.',
      image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=600&h=400&fit=crop',
      date: 'Tháng 1, 2026',
      readTime: '15 phút',
      category: 'Strategy',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Simple Navigation */}
      <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border/40">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex items-center justify-between h-14">
            <Link 
              to="/landing" 
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Trang chủ</span>
            </Link>
            <span className="text-sm font-medium text-foreground">Blog</span>
            <div className="w-20" />
          </div>
        </div>
      </nav>

      {/* Hero - Clean & Minimal */}
      <section className="py-16 md:py-20">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-4"
          >
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight">
              Khám Phá Thế Giới
              <br />
              <span className="text-gradient">Content Marketing</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-xl">
              Kiến thức, chiến lược và insights từ đội ngũ Flowa.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Posts Grid */}
      <section className="pb-24">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-8">
            {posts.map((post, index) => (
              <motion.article
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
              >
                <Link to={`/blog/${post.id}`} className="group block">
                  {/* Image */}
                  <div className="aspect-[3/2] rounded-xl overflow-hidden mb-4 bg-muted">
                    <img
                      src={post.image}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  
                  {/* Content */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="px-2.5 py-1 bg-muted rounded-full font-medium">
                        {post.category}
                      </span>
                      <span>{post.date}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {post.readTime}
                      </span>
                    </div>
                    
                    <h2 className="text-xl font-semibold group-hover:text-primary transition-colors leading-snug line-clamp-2">
                      {post.title}
                    </h2>
                    
                    <p className="text-muted-foreground text-sm leading-relaxed line-clamp-2">
                      {post.excerpt}
                    </p>
                    
                    <div className="flex items-center gap-1 text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity pt-1">
                      <span>Đọc tiếp</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* CTA - Minimal */}
      <section className="py-16 border-t border-border/40">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="flex flex-col md:flex-row md:items-center justify-between gap-6"
          >
            <div>
              <h2 className="text-xl font-semibold mb-1">
                Sẵn sàng bắt đầu?
              </h2>
              <p className="text-muted-foreground text-sm">
                Tạo content cho 12 kênh chỉ trong 10 phút.
              </p>
            </div>
            <div className="flex gap-3">
              <Button asChild>
                <Link to="/auth">Dùng thử miễn phí</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/contact">Liên hệ</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer - Simple */}
      <footer className="py-6 border-t border-border/40">
        <div className="max-w-5xl mx-auto px-6 text-center text-xs text-muted-foreground">
          © 2026 Flowa. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default Blog;
