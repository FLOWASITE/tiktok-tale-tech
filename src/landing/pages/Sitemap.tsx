import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { Map, FileText, Building2, Mail, Briefcase, Tag, BookOpen, Shield, ScrollText } from 'lucide-react';
import { LandingNav } from '@/landing/components/LandingNav';
import { FooterSection } from '@/landing/components/FooterSection';
import { supabase } from '@/integrations/supabase/client';
import { blogPostsData } from '@/components/blog';

interface DBPost {
  slug: string;
  title: string;
  published_at: string | null;
}

const mainPages = [
  { to: '/', label: 'Trang chủ', icon: Map, desc: 'Giới thiệu Flowa — AI Marketing Agent' },
  { to: '/about', label: 'Về chúng tôi', icon: Building2, desc: 'Câu chuyện và sứ mệnh của Flowa' },
  { to: '/pricing', label: 'Bảng giá', icon: Tag, desc: 'Free / Starter / Pro / Enterprise' },
  { to: '/contact', label: 'Liên hệ', icon: Mail, desc: 'Kết nối với đội ngũ Flowa' },
  { to: '/careers', label: 'Tuyển dụng', icon: Briefcase, desc: 'Cơ hội nghề nghiệp tại Flowa' },
  { to: '/blog', label: 'Blog', icon: BookOpen, desc: 'Kiến thức content marketing đa kênh' },
];

const legalPages = [
  { to: '/terms', label: 'Điều khoản sử dụng', icon: ScrollText },
  { to: '/privacy', label: 'Chính sách bảo mật', icon: Shield },
];

export default function Sitemap() {
  const { data: dbPosts = [] } = useQuery<DBPost[]>({
    queryKey: ['sitemap-public-posts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('slug,title,published_at')
        .eq('status', 'published')
        .eq('is_public', true)
        .order('published_at', { ascending: false });
      if (error) throw error;
      return (data || []) as DBPost[];
    },
  });

  // Merge static + dynamic, dedupe by slug
  const allPosts = [
    ...blogPostsData.map((p) => ({ slug: p.slug, title: p.title, published_at: null as string | null })),
    ...dbPosts.filter((d) => !blogPostsData.find((s) => s.slug === d.slug)),
  ];

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Sitemap — Flowa | Bản đồ trang web</title>
        <meta
          name="description"
          content="Bản đồ tất cả các trang trên Flowa: trang chủ, bảng giá, blog, liên hệ và các bài viết về content marketing đa kênh."
        />
        <link rel="canonical" href="https://flowa.one/sitemap" />
      </Helmet>

      <LandingNav />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-16">
        <header className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4">
            <Map className="w-3.5 h-3.5" />
            Bản đồ trang web
          </div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">Sitemap</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Tất cả các trang công khai trên Flowa. Dùng trang này để khám phá nhanh hoặc giúp công cụ tìm kiếm hiểu cấu trúc website.
          </p>
        </header>

        {/* Main pages */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-5 flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" /> Trang chính
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {mainPages.map(({ to, label, icon: Icon, desc }) => (
              <Link
                key={to}
                to={to}
                className="group flex items-start gap-3 p-4 rounded-xl border border-border/60 bg-card hover:border-primary/40 hover:shadow-sm transition-all"
              >
                <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-medium group-hover:text-primary transition-colors">{label}</div>
                  <div className="text-sm text-muted-foreground mt-0.5">{desc}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Blog posts */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-5 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" /> Bài viết blog
            <span className="text-sm font-normal text-muted-foreground">({allPosts.length})</span>
          </h2>
          <ul className="divide-y divide-border/50 rounded-xl border border-border/60 bg-card">
            {allPosts.map((post) => (
              <li key={post.slug}>
                <Link
                  to={`/blog/${post.slug}`}
                  className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-muted/40 transition-colors group"
                >
                  <span className="text-sm font-medium group-hover:text-primary transition-colors line-clamp-1">
                    {post.title}
                  </span>
                  {post.published_at && (
                    <time className="text-xs text-muted-foreground shrink-0">
                      {new Date(post.published_at).toLocaleDateString('vi-VN')}
                    </time>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* Legal */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-5 flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" /> Pháp lý
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {legalPages.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className="flex items-center gap-3 p-4 rounded-xl border border-border/60 bg-card hover:border-primary/40 transition-all group"
              >
                <Icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="text-sm font-medium group-hover:text-primary transition-colors">{label}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* XML sitemap link */}
        <section className="text-center pt-8 border-t border-border/50">
          <p className="text-sm text-muted-foreground">
            Dành cho công cụ tìm kiếm:{' '}
            <a
              href="/sitemap.xml"
              className="text-primary hover:underline font-medium"
              target="_blank"
              rel="noopener"
            >
              sitemap.xml
            </a>
          </p>
        </section>
      </main>

      <FooterSection />
    </div>
  );
}
