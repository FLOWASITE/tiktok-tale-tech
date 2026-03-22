import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4'
import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Category mapping rules based on industry_code patterns
const CATEGORY_RULES: Record<string, string[]> = {
  // finance - Tài chính & Bảo hiểm
  'finance': [
    'bank', 'insurance', 'credit', 'invest', 'fintech', 'payment', 'lending', 
    'wealth', 'asset_management', 'securities', 'stock', 'forex', 'crypto_exchange',
    'microfinance', 'neobank', 'regtech', 'wealthtech', 'insurtech', 'financial'
  ],
  
  // technology - Công nghệ
  'technology': [
    'software', 'it_', '_it', 'ai_', '_ai', 'data_', 'cyber', 'cloud', 'saas',
    'telecom', 'network', 'digital', 'tech', 'app_dev', 'coding', 'devops',
    'ml_', 'nlp', 'chatbot', 'rpa', 'automation', 'information_communication'
  ],
  
  // commerce - Thương mại
  'commerce': [
    'retail', 'ecommerce', 'e_commerce', 'wholesale', 'trade', 'market', 'shop',
    'store', 'mall', 'supermarket', 'convenience', 'grocery', 'distributor',
    'import', 'export', 'trading', 'merchandise'
  ],
  
  // services - Dịch vụ
  'services': [
    'service', 'consulting', 'agency', 'support', 'outsourcing', 'bpo',
    'cleaning', 'security_service', 'maintenance', 'repair', 'installation',
    'customer_service', 'call_center', 'administrative'
  ],
  
  // lifestyle - Phong cách sống
  'lifestyle': [
    'fashion', 'beauty', 'wellness', 'fitness', 'luxury', 'cosmetic', 'spa',
    'salon', 'jewelry', 'watch', 'apparel', 'clothing', 'footwear', 'accessories',
    'personal_care', 'skincare', 'haircare', 'fragrance'
  ],
  
  // realestate - Bất động sản
  'realestate': [
    'property', 'real_estate', 'realestate', 'housing', 'land', 'apartment',
    'villa', 'condo', 'residential', 'commercial_property', 'industrial_park',
    'leasing', 'rental', 'brokerage', 'interior', 'proptech'
  ],
  
  // manufacturing - Sản xuất
  'manufacturing': [
    'manufacturing', 'factory', 'production', 'industrial', 'assembly',
    'fabrication', 'processing', 'machinery', 'equipment', 'textile',
    'garment', 'furniture', 'plastic', 'rubber', 'metal', 'steel',
    'electronics_mfg', 'automotive_parts', 'chemical', 'pharma_mfg'
  ],
  
  // agriculture - Nông nghiệp & Lâm nghiệp
  'agriculture': [
    'agri', 'farm', 'forest', 'crop', 'livestock', 'fish', 'aquaculture',
    'poultry', 'dairy', 'organic', 'plantation', 'horticulture', 'seed',
    'fertilizer', 'pesticide', 'irrigation', 'agritech', 'agricultural'
  ],
  
  // mining - Khai khoáng & Tài nguyên
  'mining': [
    'mining', 'mineral', 'ore', 'quarry', 'oil', 'gas', 'petroleum',
    'coal', 'bauxite', 'copper', 'gold', 'iron', 'extraction', 'drilling',
    'exploration', 'refinery', 'natural_resource'
  ],
  
  // utilities - Điện, Nước, Năng lượng
  'utilities': [
    'electric', 'power', 'energy', 'water', 'solar', 'wind', 'hydro',
    'renewable', 'grid', 'utility', 'gas_distribution', 'biomass',
    'geothermal', 'nuclear', 'waste_to_energy', 'smart_grid', 'ev_charging'
  ],
  
  // construction - Xây dựng & Hạ tầng
  'construction': [
    'construction', 'building', 'infrastructure', 'civil', 'engineering',
    'contractor', 'developer', 'architecture', 'structural', 'renovation',
    'demolition', 'road', 'bridge', 'tunnel', 'port', 'airport_construction'
  ],
  
  // logistics - Vận tải & Kho vận
  'logistics': [
    'transport', 'logistics', 'shipping', 'freight', 'cargo', 'warehouse',
    'delivery', 'courier', 'express', 'trucking', 'rail', 'maritime',
    'aviation', 'airline', 'airport', 'seaport', 'supply_chain', 'forwarding',
    'cold_chain', '3pl', 'last_mile'
  ],
  
  // hospitality - Khách sạn & Ẩm thực
  'hospitality': [
    'hotel', 'restaurant', 'food', 'beverage', 'tourism', 'travel',
    'resort', 'hostel', 'cafe', 'bar', 'catering', 'bakery', 'f&b',
    'hospitality', 'accommodation', 'tour', 'destination', 'mice'
  ],
  
  // professional - Dịch vụ Chuyên nghiệp
  'professional': [
    'legal', 'accounting', 'audit', 'law', 'tax', 'notary', 'attorney',
    'consultant', 'advisory', 'management_consulting', 'hr_consulting',
    'recruitment', 'headhunter', 'executive_search', 'valuation'
  ],
  
  // public_admin - Hành chính Công
  'public_admin': [
    'government', 'public', 'civic', 'ngo', 'nonprofit', 'municipal',
    'regulatory', 'policy', 'social_service', 'charity', 'foundation',
    'association', 'union', 'cooperative', 'international_org'
  ],
  
  // education - Giáo dục & Đào tạo
  'education': [
    'education', 'training', 'school', 'university', 'edtech', 'academy',
    'college', 'institute', 'learning', 'tutoring', 'e_learning', 'lms',
    'vocational', 'certification', 'coaching', 'workshop'
  ],
  
  // healthcare - Y tế & Chăm sóc sức khỏe
  'healthcare': [
    'health', 'medical', 'pharma', 'clinic', 'hospital', 'dental',
    'diagnostic', 'laboratory', 'telemedicine', 'biotech', 'life_science',
    'nursing', 'elderly_care', 'rehabilitation', 'mental_health', 'healthtech'
  ],
  
  // entertainment - Giải trí & Sáng tạo
  'entertainment': [
    'entertainment', 'media', 'music', 'art', 'creative', 'film', 'movie',
    'television', 'broadcasting', 'streaming', 'gaming', 'esports', 'event',
    'concert', 'theater', 'publishing', 'photography', 'video', 'content_creation',
    'influencer', 'advertising', 'marketing', 'pr_agency', 'branding'
  ],
  
  // emerging_tech - Công nghệ Mới nổi
  'emerging_tech': [
    'blockchain', 'crypto', 'metaverse', 'ar_', 'vr_', 'xr_', 'quantum',
    'web3', 'nft', 'defi', 'dao', 'iot', 'smart_city', 'autonomous',
    'drone', 'space', 'satellite', 'robotics', '3d_printing', 'nanotechnology'
  ]
}

interface CategoryMatch {
  categoryCode: string
  score: number
  matchedKeywords: string[]
}

function classifyIndustry(industryCode: string, nameVi: string | null): CategoryMatch | null {
  const searchText = `${industryCode} ${nameVi || ''}`.toLowerCase()
  
  let bestMatch: CategoryMatch | null = null
  
  for (const [categoryCode, keywords] of Object.entries(CATEGORY_RULES)) {
    const matchedKeywords: string[] = []
    let score = 0
    
    for (const keyword of keywords) {
      // Check exact match in industry_code (higher weight)
      if (industryCode.includes(keyword)) {
        score += 3
        matchedKeywords.push(keyword)
      }
      // Check partial match in name
      else if (searchText.includes(keyword)) {
        score += 1
        matchedKeywords.push(keyword)
      }
    }
    
    if (score > 0 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { categoryCode, score, matchedKeywords }
    }
  }
  
  return bestMatch
}

Deno.Deno.serve(withPerf({ functionName: 'categorize-industries' }, async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Get all categories
    const { data: categories, error: catError } = await supabase
      .from('industry_categories')
      .select('id, code, label')
    
    if (catError) throw catError
    
    const categoryMap = new Map(categories.map(c => [c.code, c.id]))
    
    // Get uncategorized packs
    const { data: uncategorizedPacks, error: packError } = await supabase
      .from('industry_global_packs')
      .select(`
        id,
        industry_code,
        parent_pack_id,
        industry_pack_translations!inner(name, language_code)
      `)
      .is('category_id', null)
    
    if (packError) throw packError
    
    console.log(`Found ${uncategorizedPacks?.length || 0} uncategorized packs`)
    
    // Get parent categories for inheritance
    const parentIds = [...new Set(uncategorizedPacks?.filter(p => p.parent_pack_id).map(p => p.parent_pack_id))]
    
    let parentCategories = new Map<string, string>()
    if (parentIds.length > 0) {
      const { data: parents } = await supabase
        .from('industry_global_packs')
        .select('id, category_id')
        .in('id', parentIds)
        .not('category_id', 'is', null)
      
      if (parents) {
        parentCategories = new Map(parents.map(p => [p.id, p.category_id]))
      }
    }
    
    const results = {
      total: uncategorizedPacks?.length || 0,
      classified: 0,
      inheritedFromParent: 0,
      ruleMatched: 0,
      fallbackToOther: 0,
      updates: [] as { id: string, industry_code: string, category: string, method: string }[]
    }
    
    const updates: { id: string, category_id: string }[] = []
    
    for (const pack of uncategorizedPacks || []) {
      const nameVi = pack.industry_pack_translations?.find((t: any) => t.language_code === 'vi')?.name || null
      
      let categoryId: string | null = null
      let method = ''
      let categoryCode = ''
      
      // 1. Try inherit from parent
      if (pack.parent_pack_id && parentCategories.has(pack.parent_pack_id)) {
        categoryId = parentCategories.get(pack.parent_pack_id)!
        method = 'parent_inheritance'
        categoryCode = categories.find(c => c.id === categoryId)?.code || ''
        results.inheritedFromParent++
      }
      
      // 2. Try rule-based matching
      if (!categoryId) {
        const match = classifyIndustry(pack.industry_code, nameVi)
        if (match && categoryMap.has(match.categoryCode)) {
          categoryId = categoryMap.get(match.categoryCode)!
          categoryCode = match.categoryCode
          method = `rule_match (${match.matchedKeywords.join(', ')})`
          results.ruleMatched++
        }
      }
      
      // 3. Fallback to "other"
      if (!categoryId) {
        categoryId = categoryMap.get('other')!
        categoryCode = 'other'
        method = 'fallback'
        results.fallbackToOther++
      }
      
      if (categoryId) {
        updates.push({ id: pack.id, category_id: categoryId })
        results.updates.push({
          id: pack.id,
          industry_code: pack.industry_code,
          category: categoryCode,
          method
        })
        results.classified++
      }
    }
    
    // Batch update
    if (updates.length > 0) {
      // Update in batches of 50
      const batchSize = 50
      for (let i = 0; i < updates.length; i += batchSize) {
        const batch = updates.slice(i, i + batchSize)
        
        for (const update of batch) {
          const { error: updateError } = await supabase
            .from('industry_global_packs')
            .update({ category_id: update.category_id })
            .eq('id', update.id)
          
          if (updateError) {
            console.error(`Failed to update ${update.id}:`, updateError)
          }
        }
      }
    }
    
    return new Response(JSON.stringify(results, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
    
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error:', message)
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
