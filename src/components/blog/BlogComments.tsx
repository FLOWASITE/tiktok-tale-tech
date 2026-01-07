import { useState, useEffect } from 'react';
import { MessageCircle, Send, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

interface Comment {
  id: string;
  author_name: string;
  content: string;
  created_at: string;
}

interface BlogCommentsProps {
  postSlug: string;
}

const BlogComments = ({ postSlug }: BlogCommentsProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    content: ''
  });

  useEffect(() => {
    fetchComments();
  }, [postSlug]);

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from('blog_comments')
        .select('id, author_name, content, created_at')
        .eq('post_slug', postSlug)
        .eq('is_approved', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.email.trim() || !formData.content.trim()) {
      toast.error('Vui lòng điền đầy đủ thông tin');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error('Email không hợp lệ');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('blog_comments')
        .insert({
          post_slug: postSlug,
          author_name: formData.name.trim(),
          author_email: formData.email.trim(),
          content: formData.content.trim()
        });

      if (error) throw error;

      toast.success('Bình luận đã được gửi!');
      setFormData({ name: '', email: '', content: '' });
      setShowForm(false);
      fetchComments();
    } catch (error) {
      console.error('Error submitting comment:', error);
      toast.error('Không thể gửi bình luận. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mt-12 pt-8 border-t border-border/50">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          Bình luận ({comments.length})
        </h3>
        {!showForm && (
          <Button onClick={() => setShowForm(true)} variant="outline" size="sm">
            Viết bình luận
          </Button>
        )}
      </div>

      {/* Comment Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="mb-8 p-4 rounded-xl bg-muted/50 border border-border/50">
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div>
              <Input
                placeholder="Tên của bạn *"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                disabled={isSubmitting}
              />
            </div>
            <div>
              <Input
                type="email"
                placeholder="Email *"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                disabled={isSubmitting}
              />
            </div>
          </div>
          <Textarea
            placeholder="Viết bình luận của bạn..."
            value={formData.content}
            onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
            disabled={isSubmitting}
            rows={4}
            className="mb-4"
          />
          <div className="flex items-center gap-2">
            <Button type="submit" disabled={isSubmitting} className="gap-2">
              <Send className="w-4 h-4" />
              {isSubmitting ? 'Đang gửi...' : 'Gửi bình luận'}
            </Button>
            <Button 
              type="button" 
              variant="ghost" 
              onClick={() => setShowForm(false)}
              disabled={isSubmitting}
            >
              Hủy
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Email của bạn sẽ không được hiển thị công khai.
          </p>
        </form>
      )}

      {/* Comments List */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">
          Đang tải bình luận...
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          Chưa có bình luận nào. Hãy là người đầu tiên!
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div key={comment.id} className="p-4 rounded-xl bg-card border border-border/50">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">{comment.author_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(comment.created_at), { 
                      addSuffix: true,
                      locale: vi 
                    })}
                  </p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {comment.content}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BlogComments;
