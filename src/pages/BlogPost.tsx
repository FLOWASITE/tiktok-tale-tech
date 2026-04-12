import { useParams, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import BlogPostFlowa from './BlogPostFlowa';
import BlogPostMultiChannel from './BlogPostMultiChannel';
import BlogPostAIContent from './BlogPostAIContent';
import BlogPostRepurposing from './BlogPostRepurposing';
import DynamicBlogPost from '@/landing/components/DynamicBlogPost';

const STATIC_POSTS: Record<string, React.ComponentType> = {
  'flowa-content-marketing-da-kenh': BlogPostFlowa,
  'cach-tao-content-da-kenh': BlogPostMultiChannel,
  'ai-content-marketing-huong-dan': BlogPostAIContent,
  'content-repurposing-chien-luoc': BlogPostRepurposing,
};

const BlogPost = () => {
  const { slug } = useParams();
  const StaticComponent = slug ? STATIC_POSTS[slug] : undefined;

  const { data: post, isLoading, error } = useQuery({
    queryKey: ['blog-post', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('slug', slug!)
        .eq('status', 'published')
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!slug && !StaticComponent,
  });

  if (StaticComponent) return <StaticComponent />;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error || !post) return <Navigate to="/blog" replace />;

  return <DynamicBlogPost post={post} />;
};

export default BlogPost;
