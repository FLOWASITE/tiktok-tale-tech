-- Phase 2.1: Add label column for display names
ALTER TABLE industry_categories 
ADD COLUMN IF NOT EXISTS label TEXT;

-- Update existing categories with labels
UPDATE industry_categories SET label = 'Tài chính & Bảo hiểm' WHERE code = 'finance';
UPDATE industry_categories SET label = 'Công nghệ' WHERE code = 'technology';
UPDATE industry_categories SET label = 'Thương mại' WHERE code = 'commerce';
UPDATE industry_categories SET label = 'Dịch vụ' WHERE code = 'services';
UPDATE industry_categories SET label = 'Phong cách sống' WHERE code = 'lifestyle';
UPDATE industry_categories SET label = 'Bất động sản' WHERE code = 'realestate';
UPDATE industry_categories SET label = 'Sản xuất' WHERE code = 'manufacturing';
UPDATE industry_categories SET label = 'Khác' WHERE code = 'other';