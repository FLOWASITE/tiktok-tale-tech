-- =============================================
-- CUSTOMER PERSONAS ENHANCEMENT
-- Add extended demographics, behavioral, journey, visual, and data source fields
-- =============================================

-- 1. Extended Demographics
ALTER TABLE public.customer_personas 
ADD COLUMN IF NOT EXISTS education_level TEXT,
ADD COLUMN IF NOT EXISTS family_status TEXT,
ADD COLUMN IF NOT EXISTS device_usage TEXT DEFAULT 'mobile-first',
ADD COLUMN IF NOT EXISTS tech_savviness TEXT DEFAULT 'medium';

-- 2. Behavioral & Priority
ALTER TABLE public.customer_personas 
ADD COLUMN IF NOT EXISTS buying_motivation TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS priority_score INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS segment_size DECIMAL(5,2);

-- 3. Journey Map (JSONB array of steps)
ALTER TABLE public.customer_personas 
ADD COLUMN IF NOT EXISTS journey_map JSONB DEFAULT '[]';

-- 4. Visual fields
ALTER TABLE public.customer_personas 
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS color_theme TEXT;

-- 5. Data Source & Confidence
ALTER TABLE public.customer_personas 
ADD COLUMN IF NOT EXISTS data_source TEXT,
ADD COLUMN IF NOT EXISTS confidence_level TEXT DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS last_researched_date DATE;

-- 6. Country Variants (for multi-country support)
ALTER TABLE public.customer_personas 
ADD COLUMN IF NOT EXISTS country_variants JSONB DEFAULT '{}';

-- =============================================
-- INDUSTRY PERSONAS (same columns for templates)
-- =============================================

-- 1. Extended Demographics
ALTER TABLE public.industry_personas 
ADD COLUMN IF NOT EXISTS education_level TEXT,
ADD COLUMN IF NOT EXISTS family_status TEXT,
ADD COLUMN IF NOT EXISTS device_usage TEXT DEFAULT 'mobile-first',
ADD COLUMN IF NOT EXISTS tech_savviness TEXT DEFAULT 'medium';

-- 2. Behavioral & Priority
ALTER TABLE public.industry_personas 
ADD COLUMN IF NOT EXISTS buying_motivation TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS priority_score INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS segment_size DECIMAL(5,2);

-- 3. Journey Map
ALTER TABLE public.industry_personas 
ADD COLUMN IF NOT EXISTS journey_map JSONB DEFAULT '[]';

-- 4. Visual fields
ALTER TABLE public.industry_personas 
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS color_theme TEXT;

-- 5. Data Source & Confidence
ALTER TABLE public.industry_personas 
ADD COLUMN IF NOT EXISTS data_source TEXT,
ADD COLUMN IF NOT EXISTS confidence_level TEXT DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS last_researched_date DATE;

-- 6. Country Variants
ALTER TABLE public.industry_personas 
ADD COLUMN IF NOT EXISTS country_variants JSONB DEFAULT '{}';