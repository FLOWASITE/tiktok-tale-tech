export type ProductRefLabel = 'front' | 'back' | 'side' | 'in-use' | 'packaging';

export interface ProductReferenceImage {
  url: string;
  label: ProductRefLabel;
}

export interface ProductAppearance {
  color?: string;
  material?: string;
  size?: string;
  distinctive_features?: string;
}

export const PRODUCT_REF_LABELS: { value: ProductRefLabel; label: string }[] = [
  { value: 'front', label: 'Mặt trước' },
  { value: 'back', label: 'Mặt sau' },
  { value: 'side', label: 'Mặt bên' },
  { value: 'in-use', label: 'Đang dùng' },
  { value: 'packaging', label: 'Bao bì/Hộp' },
];

export interface BrandProduct {
  id: string;
  brand_template_id: string;
  organization_id: string | null;
  user_id: string | null;
  
  // Product Info
  name: string;
  sku: string | null;
  category: string | null;
  description: string | null;
  price_display: string | null;
  image_url: string | null;

  // Visual consistency
  reference_images: ProductReferenceImage[];
  appearance: ProductAppearance;
  
  // Marketing Data for AI
  unique_selling_points: string[];
  target_audience: string | null;
  pain_points_solved: string[];
  benefits: string[];
  keywords: string[];
  
  // Content Hints
  suggested_content_angles: string[];
  best_channels: string[];
  
  // Status
  is_featured: boolean;
  is_active: boolean;
  sort_order: number;
  
  created_at: string;
  updated_at: string;
}

export interface ProductFormData {
  name: string;
  sku: string;
  category: string;
  description: string;
  price_display: string;
  image_url: string;
  reference_images?: ProductReferenceImage[];
  appearance?: ProductAppearance;
  unique_selling_points: string[];
  target_audience: string;
  pain_points_solved: string[];
  benefits: string[];
  keywords: string[];
  suggested_content_angles: string[];
  best_channels: string[];
  is_featured: boolean;
  is_active: boolean;
}

export const PRODUCT_CATEGORIES = [
  { value: 'product', label: 'Sản phẩm vật lý' },
  { value: 'service', label: 'Dịch vụ' },
  { value: 'course', label: 'Khóa học' },
  { value: 'digital', label: 'Sản phẩm số' },
  { value: 'subscription', label: 'Gói đăng ký' },
  { value: 'consulting', label: 'Tư vấn' },
  { value: 'other', label: 'Khác' },
] as const;

export const CONTENT_ANGLES = [
  { value: 'product_intro', label: 'Giới thiệu sản phẩm' },
  { value: 'benefits', label: 'Lợi ích sản phẩm' },
  { value: 'comparison', label: 'So sánh với đối thủ' },
  { value: 'tutorial', label: 'Hướng dẫn sử dụng' },
  { value: 'review', label: 'Đánh giá/Testimonial' },
  { value: 'behind_scenes', label: 'Behind the scenes' },
  { value: 'use_cases', label: 'Tình huống sử dụng' },
  { value: 'faq', label: 'FAQ/Giải đáp' },
  { value: 'promotion', label: 'Khuyến mãi' },
  { value: 'unboxing', label: 'Unboxing/Mở hộp' },
] as const;

export const BEST_CHANNELS = [
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'twitter', label: 'Twitter/X' },
  { value: 'email', label: 'Email' },
  { value: 'website', label: 'Website/Blog' },
  { value: 'zalo', label: 'Zalo OA' },
] as const;
