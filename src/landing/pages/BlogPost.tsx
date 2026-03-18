import { useParams, Navigate } from 'react-router-dom';
import BlogPostFlowa from '@/landing/pages/BlogPostFlowa';
import BlogPostMultiChannel from '@/landing/pages/BlogPostMultiChannel';
import BlogPostAIContent from '@/landing/pages/BlogPostAIContent';
import BlogPostRepurposing from '@/landing/pages/BlogPostRepurposing';

const BlogPost = () => {
  const { slug } = useParams();

  switch (slug) {
    case 'flowa-content-marketing-da-kenh':
      return <BlogPostFlowa />;
    case 'cach-tao-content-da-kenh':
      return <BlogPostMultiChannel />;
    case 'ai-content-marketing-huong-dan':
      return <BlogPostAIContent />;
    case 'content-repurposing-chien-luoc':
      return <BlogPostRepurposing />;
    default:
      return <Navigate to="/blog" replace />;
  }
};

export default BlogPost;
