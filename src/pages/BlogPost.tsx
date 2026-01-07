import { useParams, Navigate } from 'react-router-dom';
import BlogPostFlowa from './BlogPostFlowa';
import BlogPostMultiChannel from './BlogPostMultiChannel';
import BlogPostAIContent from './BlogPostAIContent';
import BlogPostRepurposing from './BlogPostRepurposing';

const BlogPost = () => {
  const { slug } = useParams();

  // Route to the appropriate blog post component based on slug
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
      // Redirect to blog list if slug not found
      return <Navigate to="/blog" replace />;
  }
};

export default BlogPost;
