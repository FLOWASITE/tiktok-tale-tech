import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Clock, User, ArrowRight, Calendar, TrendingUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LandingNav } from '@/landing/components/LandingNav';
import { BlogBreadcrumb, BlogPagination } from '@/components/blog';
import { SEOHead, CollectionPageSchema } from '@/components/SEOHead';
import { supabase } from '@/integrations/supabase/client';

const POSTS_PER_PAGE = 6;

// Static fallback posts (used when DB has no data yet)
const STATIC_POSTS = [
  {
    id: 'flowa-content-marketing-da-kenh',
    slug: 'flowa-content-marketing-da-kenh',
    title: 'Flowa: Giải Pháp Tạo Content Marketing Đa Kênh Trong 10 Phút Thay Vì 10 Giờ',
    excerpt: 'Flowa giúp Marketing Team tạo content cho 12 kênh chỉ trong 10 phút. Tự động hóa 90% quy trình.',
    cover_image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=400&fit=crop',
    author_name: 'Flowa Team',
    published_at: '2026-01-15',
    read_time: '15 phút đọc',
    category: 'Product',
  },
  {
    id: 'cach-tao-content-da-kenh',
    slug: 'cach-tao-content-da-kenh',
    title: 'Cách Tạo Content Đa Kênh: Hướng Dẫn Toàn Diện Từ A-Z [2026]',
    excerpt: 'Học cách tạo content cho 10+ kênh từ 1 ý tưởng duy nhất. Bao gồm framework, templates, tools và case studies.',
    cover_image: 'https://images.unsplash.com/photo-1432888622747-4eb9a8efeb07?w=400&h=250&fit=crop',
    author_name: 'Flowa Team',
    published_at: '2026-01-15',
    read_time: '25 phút',
    category: 'Guide',
  },
  {
    id: 'ai-content-marketing-huong-dan',
    slug: 'ai-content-marketing-huong-dan',
    title: 'AI Content Marketing: Hướng Dẫn Toàn Diện Từ Cơ Bản Đến Nâng Cao [2026]',
    excerpt: 'Tìm hiểu cách sử dụng AI trong content marketing hiệu quả. Bao gồm workflow, tools, prompts, và case studies thực tế.',
    cover_image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400&h=250&fit=crop',
    author_name: 'Flowa Team',
    published_at: '2026-01-15',
    read_time: '25 phút',
    category: 'AI Marketing',
  },
  {
    id: 'content-repurposing-chien-luoc',
    slug: 'content-repurposing-chien-luoc',
    title: 'Content Repurposing: Biến 1 Ý Tưởng Thành 20+ Nội Dung Đa Kênh Trong 5 Phút [2026]',
    excerpt: 'Đừng viết nhiều hơn, hãy viết thông minh hơn. Hướng dẫn chi tiết chiến lược Content Repurposing.',
    cover_image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=250&fit=crop',
    author_name: 'Võ Phương Duy',
    published_at: '2026-01-15',
    read_time: '15 phút',
    category: 'Strategy',
  },
];

const Blog = () => {
  const { t } = useTranslation();
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch published posts from DB
  const { data: dbPosts } = useQuery({
    queryKey: ['blog-posts-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('id, slug, title, excerpt, cover_image, author_name, published_at, read_time, category')
        .eq('status', 'published')
        .eq('is_public', true)
        .order('published_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Merge: DB posts first, then static fallback for posts not in DB
  const dbSlugs = new Set((dbPosts || []).map((p) => p.slug));
  const fallbackPosts = STATIC_POSTS.filter((p) => !dbSlugs.has(p.slug));
  const allPosts = [...(dbPosts || []), ...fallbackPosts];

  const featuredPost = allPosts[0];
  const totalPages = Math.ceil(allPosts.length / POSTS_PER_PAGE);
  const startIndex = (currentPage - 1) * POSTS_PER_PAGE;
  const paginatedPosts = allPosts.slice(startIndex, startIndex + POSTS_PER_PAGE);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('vi-VN', { year: 'numeric', month: 'long' });
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Blog | Flowa - Chiến Lược Content Marketing & AI"
        description="Chia sẻ kiến thức, trends và chiến lược content marketing từ đội ngũ Flowa."
        canonicalPath="/blog"
        breadcrumbs={[
          { name: 'Trang chủ', url: '/' },
          { name: 'Blog', url: '/blog' },
        ]}
      />
      <CollectionPageSchema
        posts={allPosts.map((post) => ({
          title: post.title,
          url: `/blog/${post.slug}`,
          image: post.cover_image || '',
          description: post.excerpt || '',
        }))}
      />
      <LandingNav />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <BlogBreadcrumb />
      </div>

      {/* Hero */}
      <section className="relative py-12 lg:py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
            <Badge variant="outline" className="mb-4 border-primary/30 text-primary">
              <TrendingUp className="w-3 h-3 mr-1" />
              Insights & Updates
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              Khám Phá Thế Giới{' '}
              <span className="bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
                Content Marketing
              </span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Chia sẻ kiến thức, trends và chiến lược content marketing từ đội ngũ Flowa
            </p>
          </motion.div>
        </div>
      </section>

      {/* Featured Post */}
      {featuredPost && (
        <section className="py-8 lg:py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Link to={`/blog/${featuredPost.slug}`} className="group block">
                <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-card to-card/50 border border-border/50 hover:border-primary/30 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/10">
                  <div className="grid lg:grid-cols-2 gap-0">
                    <div className="relative aspect-[16/9] lg:aspect-auto lg:h-full overflow-hidden">
                      <img
                        src={featuredPost.cover_image || ''}
                        alt={featuredPost.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        loading="lazy"
                        width={800}
                        height={400}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent lg:bg-gradient-to-r lg:from-transparent lg:to-black/20" />
                      <Badge className="absolute top-4 left-4 bg-primary text-primary-foreground">Featured</Badge>
                    </div>
                    <div className="p-8 lg:p-12 flex flex-col justify-center">
                      <Badge variant="outline" className="w-fit mb-4 border-primary/30 text-primary">
                        {featuredPost.category}
                      </Badge>
                      <h2 className="text-2xl lg:text-3xl xl:text-4xl font-bold mb-4 group-hover:text-primary transition-colors line-clamp-3">
                        {featuredPost.title}
                      </h2>
                      <p className="text-muted-foreground text-lg mb-6 line-clamp-2">{featuredPost.excerpt}</p>
                      <div className="flex items-center gap-6 text-sm text-muted-foreground mb-6">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          {featuredPost.author_name}
                        </div>
                        <time className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          {formatDate(featuredPost.published_at)}
                        </time>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          {featuredPost.read_time}
                        </div>
                      </div>
                      <Button className="w-fit group/btn">
                        Đọc bài viết
                        <ArrowRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          </div>
        </section>
      )}

      {/* All Posts */}
      <section className="py-12 lg:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={containerVariants} initial="hidden" animate="visible">
            <motion.div variants={itemVariants} className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold">Tất cả bài viết</h2>
              <span className="text-sm text-muted-foreground">{allPosts.length} bài viết</span>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {paginatedPosts.map((post) => (
                <motion.div key={post.slug} variants={itemVariants}>
                  <Link to={`/blog/${post.slug}`} className="group block h-full">
                    <div className="h-full rounded-2xl overflow-hidden bg-card border border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5">
                      <div className="relative aspect-[16/10] overflow-hidden">
                        <img
                          src={post.cover_image || ''}
                          alt={post.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                          width={400}
                          height={250}
                        />
                        <Badge className="absolute top-3 left-3 bg-background/90 text-foreground text-xs">
                          {post.category}
                        </Badge>
                      </div>
                      <div className="p-6">
                        <h3 className="font-bold text-lg mb-2 group-hover:text-primary transition-colors line-clamp-2">
                          {post.title}
                        </h3>
                        <p className="text-muted-foreground text-sm mb-4 line-clamp-2">{post.excerpt}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <time className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(post.published_at)}
                          </time>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {post.read_time}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>

            {totalPages > 1 && (
              <motion.div variants={itemVariants} className="mt-12">
                <BlogPagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
              </motion.div>
            )}
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 lg:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="p-8 lg:p-12 rounded-3xl bg-gradient-to-br from-primary/10 via-purple-500/10 to-pink-500/10 border border-primary/20"
          >
            <h2 className="text-2xl lg:text-3xl font-bold mb-4">Sẵn sàng tự động hóa content marketing?</h2>
            <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
              Tạo content cho 12 kênh chỉ trong 10 phút. Dùng thử miễn phí ngay hôm nay.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <Link to="/auth">Dùng thử miễn phí</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/contact">Liên hệ tư vấn</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <footer className="py-8 border-t border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-muted-foreground">
          © 2026 Flowa. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default Blog;
