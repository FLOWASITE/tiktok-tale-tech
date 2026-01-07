-- Create blog_comments table for anonymous comments
CREATE TABLE public.blog_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_slug TEXT NOT NULL,
  author_name TEXT NOT NULL,
  author_email TEXT NOT NULL,
  content TEXT NOT NULL,
  is_approved BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create blog_reactions table for anonymous likes
CREATE TABLE public.blog_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_slug TEXT NOT NULL,
  reaction_type TEXT NOT NULL DEFAULT 'like',
  visitor_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(post_slug, visitor_id, reaction_type)
);

-- Enable RLS
ALTER TABLE public.blog_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_reactions ENABLE ROW LEVEL SECURITY;

-- Public read access for comments (approved only)
CREATE POLICY "Anyone can view approved comments" 
ON public.blog_comments 
FOR SELECT 
USING (is_approved = true);

-- Anyone can insert comments
CREATE POLICY "Anyone can add comments" 
ON public.blog_comments 
FOR INSERT 
WITH CHECK (true);

-- Public read access for reactions (for counting)
CREATE POLICY "Anyone can view reactions" 
ON public.blog_reactions 
FOR SELECT 
USING (true);

-- Anyone can insert reactions
CREATE POLICY "Anyone can add reactions" 
ON public.blog_reactions 
FOR INSERT 
WITH CHECK (true);

-- Anyone can delete their own reaction (by visitor_id)
CREATE POLICY "Anyone can remove their reaction" 
ON public.blog_reactions 
FOR DELETE 
USING (true);

-- Create indexes for performance
CREATE INDEX idx_blog_comments_post_slug ON public.blog_comments(post_slug);
CREATE INDEX idx_blog_reactions_post_slug ON public.blog_reactions(post_slug);