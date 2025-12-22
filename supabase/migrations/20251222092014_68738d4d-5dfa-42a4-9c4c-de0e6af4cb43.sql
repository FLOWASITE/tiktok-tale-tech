-- Add status column to scripts table
ALTER TABLE public.scripts 
ADD COLUMN status text DEFAULT 'draft';

-- Add status column to carousels table  
ALTER TABLE public.carousels
ADD COLUMN status text DEFAULT 'draft';

-- Create index for faster filtering
CREATE INDEX idx_scripts_status ON public.scripts(status);
CREATE INDEX idx_carousels_status ON public.carousels(status);