import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ArrowRight, Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LandingNav } from '@/landing/components/LandingNav';
import { BlogBreadcrumb, BlogPagination } from '@/components/blog';
import { FooterSection } from '@/components/landing';
import { SEOHead, CollectionPageSchema } from '@/components/SEOHead';
import { supabase } from '@/integrations/supabase/client';

const POSTS_PER_PAGE = 6;

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
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

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

  const dbSlugs = new Set((dbPosts || []).map((p) => p.slug));
  const fallbackPosts = STATIC_POSTS.filter((p) => !dbSlugs.has(p.slug));
  const allPosts = [...(dbPosts || []), ...fallbackPosts];

  // Extract categories
  const categories = useMemo(() => {
    const cats = new Set(allPosts.map((p) => p.category).filter(Boolean));
    return ['All', ...Array.from(cats)];
  }, [allPosts]);

  // Filter
  const filteredPosts = useMemo(() => {
    return allPosts.filter((post) => {
      const matchesCategory = selectedCategory === 'All' || post.category === selectedCategory;
      const matchesSearch = !searchQuery || post.title.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [allPosts, selectedCategory, searchQuery]);

  const featuredPost = filteredPosts[0];
  const remainingPosts = filteredPosts.slice(1);
  const totalPages = Math.ceil(remainingPosts.length / POSTS_PER_PAGE);
  const startIndex = (currentPage - 1) * POSTS_PER_PAGE;
  const paginatedPosts = remainingPosts.slice(startIndex, startIndex + POSTS_PER_PAGE);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Reset page when filter changes
  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat);
    setCurrentPage(1);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric' });
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

      {/* Hero — Minimal, monochromatic */}
      <section className="pt-28 pb-10 lg:pt-36 lg:pb-14">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <BlogBreadcrumb />
          </div>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground">
              Blog
            </h1>
            <p className="mt-3 text-muted-foreground text-base sm:text-lg max-w-xl">
              Kiến thức, chiến lược và xu hướng content marketing mới nhất.
            </p>
          </motion.div>

          {/* Search + Category filters */}
          <div className="mt-8 flex flex-col gap-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Tìm bài viết..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="pl-9 h-9 bg-muted/30 border-border/50 text-sm"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => handleCategoryChange(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    selectedCategory === cat
                      ? 'bg-foreground text-background'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  {cat === 'All' ? 'Tất cả' : cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Featured Post */}
      {featuredPost && (
        <section className="pb-10 lg:pb-14">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <Link to={`/blog/${featuredPost.slug}`} className="group block">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.4 }}
                className="rounded-2xl overflow-hidden border border-border/50 bg-card hover:border-border transition-colors duration-300"
              >
                <div className="grid lg:grid-cols-2">
                  <div className="aspect-[16/9] lg:aspect-auto lg:h-full overflow-hidden">
                    <img
                      src={featuredPost.cover_image || ''}
                      alt={featuredPost.title}
                      className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
                      loading="eager"
                      width={800}
                      height={450}
                    />
                  </div>
                  <div className="p-6 sm:p-8 lg:p-10 flex flex-col justify-center">
                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
                      {featuredPost.category}
                    </span>
                    <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground group-hover:text-primary transition-colors line-clamp-3 mb-3">
                      {featuredPost.title}
                    </h2>
                    <p className="text-muted-foreground text-sm sm:text-base line-clamp-2 mb-5">
                      {featuredPost.excerpt}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{featuredPost.author_name}</span>
                      <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                      <time>{formatDate(featuredPost.published_at)}</time>
                      <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                      <span>{featuredPost.read_time}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </Link>
          </div>
        </section>
      )}

      {/* Posts Grid */}
      {paginatedPosts.length > 0 && (
        <section className="pb-14 lg:pb-20">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedPosts.map((post, i) => (
                <motion.div
                  key={post.slug}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.3 }}
                >
                  <Link to={`/blog/${post.slug}`} className="group block h-full">
                    <article className="h-full rounded-xl overflow-hidden border border-border/50 bg-card hover:border-border hover:-translate-y-0.5 transition-all duration-300">
                      <div className="aspect-[16/9] overflow-hidden">
                        <img
                          src={post.cover_image || ''}
                          alt={post.title}
                          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                          loading="lazy"
                          width={400}
                          height={225}
                        />
                      </div>
                      <div className="p-5">
                        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                          {post.category}
                        </span>
                        <h3 className="mt-2 font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2 text-sm leading-snug">
                          {post.title}
                        </h3>
                        <p className="mt-2 text-muted-foreground text-xs line-clamp-2 leading-relaxed">
                          {post.excerpt}
                        </p>
                        <div className="mt-4 flex items-center gap-1.5 text-[10px] text-muted-foreground/70">
                          <time>{formatDate(post.published_at)}</time>
                          <span className="w-0.5 h-0.5 rounded-full bg-muted-foreground/30" />
                          <span>{post.read_time}</span>
                        </div>
                      </div>
                    </article>
                  </Link>
                </motion.div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-12">
                <BlogPagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
              </div>
            )}
          </div>
        </section>
      )}

      {/* Empty state */}
      {filteredPosts.length === 0 && (
        <section className="pb-20">
          <div className="max-w-5xl mx-auto px-4 text-center py-16">
            <p className="text-muted-foreground">Không tìm thấy bài viết nào.</p>
          </div>
        </section>
      )}

      {/* CTA — Monochromatic */}
      <section className="pb-16 lg:pb-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center p-8 sm:p-10 rounded-2xl bg-muted/30 border border-border/50">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-3">
              Sẵn sàng tự động hóa content marketing?
            </h2>
            <p className="text-muted-foreground text-sm mb-6 max-w-md mx-auto">
              Tạo content cho 12 kênh chỉ trong 10 phút. Dùng thử miễn phí.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button size="sm" asChild>
                <Link to="/auth">
                  Bắt đầu miễn phí
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Link>
              </Button>
              <Button size="sm" variant="outline" asChild>
                <Link to="/contact">Liên hệ tư vấn</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <FooterSection />
    </div>
  );
};

export default Blog;
