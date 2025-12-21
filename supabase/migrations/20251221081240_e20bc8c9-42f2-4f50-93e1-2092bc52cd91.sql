-- Change industry from text to text array for multi-select
ALTER TABLE public.brand_templates 
ALTER COLUMN industry TYPE text[] 
USING CASE 
  WHEN industry IS NULL THEN NULL 
  ELSE ARRAY[industry] 
END;