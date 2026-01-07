import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

interface BlogBreadcrumbProps {
  postTitle?: string;
}

const BlogBreadcrumb = ({ postTitle }: BlogBreadcrumbProps) => {
  return (
    <nav className="flex items-center gap-1.5 text-sm flex-wrap" aria-label="Breadcrumb">
      <Link 
        to="/" 
        className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
      >
        <Home className="h-4 w-4" />
        <span className="hidden sm:inline">Trang chủ</span>
      </Link>
      
      <ChevronRight className="h-3 w-3 text-muted-foreground" />
      
      {postTitle ? (
        <>
          <Link 
            to="/blog" 
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Blog
          </Link>
          <ChevronRight className="h-3 w-3 text-muted-foreground" />
          <span className="font-medium text-foreground line-clamp-1 max-w-[200px] sm:max-w-[300px]">
            {postTitle}
          </span>
        </>
      ) : (
        <span className="font-medium text-foreground">Blog</span>
      )}
    </nav>
  );
};

export default BlogBreadcrumb;
