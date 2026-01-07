import { Link } from 'react-router-dom';
import { ArrowRight, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Post {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  readTime: string;
  image: string;
}

interface RelatedPostsProps {
  currentSlug: string;
  currentCategory: string;
  posts: Post[];
}

const RelatedPosts = ({ currentSlug, currentCategory, posts }: RelatedPostsProps) => {
  // Filter out current post and prioritize same category
  const relatedPosts = posts
    .filter(post => post.slug !== currentSlug)
    .sort((a, b) => {
      // Prioritize same category
      if (a.category === currentCategory && b.category !== currentCategory) return -1;
      if (b.category === currentCategory && a.category !== currentCategory) return 1;
      return 0;
    })
    .slice(0, 3);

  if (relatedPosts.length === 0) return null;

  return (
    <div className="mt-12 pt-8 border-t border-border/50">
      <h3 className="text-xl font-bold mb-6">Bài viết liên quan</h3>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {relatedPosts.map((post) => (
          <Link 
            key={post.slug} 
            to={`/blog/${post.slug}`}
            className="group block rounded-xl overflow-hidden bg-card border border-border/50 hover:border-primary/30 transition-all hover:shadow-lg"
          >
            <div className="aspect-video overflow-hidden">
              <img
                src={post.image}
                alt={post.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
            <div className="p-4">
              <Badge variant="outline" className="mb-2 text-xs">
                {post.category}
              </Badge>
              <h4 className="font-semibold text-sm mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                {post.title}
              </h4>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {post.readTime}
                </span>
                <span className="flex items-center gap-1 group-hover:text-primary transition-colors">
                  Đọc tiếp
                  <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default RelatedPosts;
