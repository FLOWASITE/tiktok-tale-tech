import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BlogReactionsProps {
  postSlug: string;
}

// Generate or retrieve visitor ID from localStorage
const getVisitorId = (): string => {
  const key = 'flowa_visitor_id';
  let visitorId = localStorage.getItem(key);
  if (!visitorId) {
    visitorId = crypto.randomUUID();
    localStorage.setItem(key, visitorId);
  }
  return visitorId;
};

const BlogReactions = ({ postSlug }: BlogReactionsProps) => {
  const [likeCount, setLikeCount] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchReactions();
  }, [postSlug]);

  const fetchReactions = async () => {
    try {
      const visitorId = getVisitorId();
      
      // Get total count
      const { count } = await supabase
        .from('blog_reactions')
        .select('*', { count: 'exact', head: true })
        .eq('post_slug', postSlug)
        .eq('reaction_type', 'like');
      
      setLikeCount(count || 0);

      // Check if current visitor has liked
      const { data: existingLike } = await supabase
        .from('blog_reactions')
        .select('id')
        .eq('post_slug', postSlug)
        .eq('visitor_id', visitorId)
        .eq('reaction_type', 'like')
        .maybeSingle();
      
      setHasLiked(!!existingLike);
    } catch (error) {
      console.error('Error fetching reactions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLike = async () => {
    const visitorId = getVisitorId();
    
    try {
      if (hasLiked) {
        // Remove like
        await supabase
          .from('blog_reactions')
          .delete()
          .eq('post_slug', postSlug)
          .eq('visitor_id', visitorId)
          .eq('reaction_type', 'like');
        
        setLikeCount(prev => Math.max(0, prev - 1));
        setHasLiked(false);
      } else {
        // Add like
        await supabase
          .from('blog_reactions')
          .insert({
            post_slug: postSlug,
            visitor_id: visitorId,
            reaction_type: 'like'
          });
        
        setLikeCount(prev => prev + 1);
        setHasLiked(true);
        toast.success('Cảm ơn bạn đã thích bài viết!');
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      toast.error('Có lỗi xảy ra. Vui lòng thử lại.');
    }
  };

  return (
    <Button
      variant={hasLiked ? 'default' : 'outline'}
      size="sm"
      onClick={handleLike}
      disabled={isLoading}
      className={`gap-2 ${hasLiked ? 'bg-pink-500 hover:bg-pink-600 border-pink-500' : 'hover:border-pink-500/50 hover:text-pink-500'}`}
    >
      <Heart className={`w-4 h-4 ${hasLiked ? 'fill-current' : ''}`} />
      <span>{likeCount}</span>
    </Button>
  );
};

export default BlogReactions;
