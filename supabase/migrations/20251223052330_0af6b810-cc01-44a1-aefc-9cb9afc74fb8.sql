-- Insert 4 Industry Memory Packs for Singapore
-- Country ID: 29f88d9b-67ba-4070-9831-df60e9958d14

-- 1. Financial Services - Singapore
INSERT INTO public.industry_templates (
  code, country_id, category_id, status, version, target_audience, is_active, sort_order,
  metadata, forbidden_terms, compliance_rules, claim_restrictions, system_rules, argument_patterns,
  brand_voice, channel_settings
) VALUES (
  'finance_sg',
  '29f88d9b-67ba-4070-9831-df60e9958d14',
  '65ea8ac4-742c-49f5-b32f-c58716f926ff',
  'stable',
  '1.0',
  'both',
  true,
  10,
  '{"applies_to": ["banks and financial institutions", "investment firms", "insurance companies", "wealth management", "financial advisors", "fintech companies"], "legal_basis": ["Monetary Authority of Singapore (MAS) Guidelines", "Securities and Futures Act (SFA)", "Financial Advisers Act (FAA)", "Insurance Act", "Personal Data Protection Act (PDPA)", "MAS Fair Dealing Guidelines"]}'::jsonb,
  ARRAY['guaranteed returns', 'risk-free investment', '100% safe', 'sure win', 'insider tips', 'secret strategy', 'beat the market guaranteed', 'no loss possible', 'double your money', 'get rich quick', 'cannot lose', 'foolproof investment', 'guaranteed profit', 'zero risk'],
  '[
    {"rule": "All investment content must include appropriate risk disclaimers", "severity": "high"},
    {"rule": "Past performance statements must include: past performance is not indicative of future results", "severity": "high"},
    {"rule": "Product recommendations must be suitable for target audience risk profile", "severity": "high"},
    {"rule": "No misleading comparisons with competitors without substantiation", "severity": "medium"},
    {"rule": "Interest rates and returns must be clearly stated with all conditions", "severity": "high"},
    {"rule": "Must distinguish between guaranteed and non-guaranteed products clearly", "severity": "high"},
    {"rule": "All fees and charges must be disclosed transparently", "severity": "high"},
    {"rule": "Insurance content must not guarantee claims approval", "severity": "high"}
  ]'::jsonb,
  '[
    {"claim": "Cannot promise specific investment returns", "alternative": "Present historical returns with clear disclaimers about future uncertainty"},
    {"claim": "Cannot guarantee capital preservation for non-guaranteed products", "alternative": "Explain capital risk appropriately based on product type"},
    {"claim": "Cannot use testimonials implying guaranteed results", "alternative": "Use case studies with proper context and disclaimers"},
    {"claim": "Cannot make comparative claims without evidence", "alternative": "Provide factual comparisons with verifiable sources"},
    {"claim": "Cannot imply urgency for investment decisions", "alternative": "Encourage informed decision-making with adequate time"},
    {"claim": "Cannot guarantee insurance claim outcomes", "alternative": "Explain claims process and factors affecting approval"}
  ]'::jsonb,
  '["This Industry Memory OVERRIDES any Brand Voice if there is a conflict", "Forbidden Terms cannot be merged, rewritten, or paraphrased", "All financial content must include MAS disclaimer where applicable", "If user requests content that violates rules - soft decline with neutral explanation", "All generated content must log industry_template_version for audit", "Content targeting retail investors requires additional risk warnings"]'::jsonb,
  '{"valid_patterns": ["[Product Feature] - [Clear explanation] - [Benefits with conditions] - [Risk disclaimer]", "[Market insight] - [Neutral analysis] - [Actionable suggestion with caveats]", "[Service offering] - [Value proposition] - [Terms and conditions reference]"], "forbidden_patterns": ["Urgency-first messaging without substance", "Emotional manipulation about financial fears", "Oversimplified claims about complex products", "Comparison without factual basis", "FOMO-inducing language for investments"]}'::jsonb,
  '{"tone_of_voice": ["professional", "trustworthy", "clear", "balanced", "authoritative"], "formality_level": "professional", "language_style": ["precise", "transparent", "jargon-free when possible", "educational"], "allow_emoji": false, "cta_policy": "soft"}'::jsonb,
  '{"linkedin": {"risk_level": "low", "notes": "B2B professional content, suitable for thought leadership"}, "facebook": {"risk_level": "medium", "notes": "Avoid sensational headlines, include disclaimers"}, "instagram": {"risk_level": "medium", "notes": "Visual disclaimers required, avoid performance claims"}, "tiktok": {"risk_level": "high", "notes": "Short format risky for compliance, avoid investment advice"}, "website": {"risk_level": "low", "notes": "Full disclaimers possible, ideal for detailed content"}, "email": {"risk_level": "low", "notes": "Personalized disclaimers based on client segment"}}'::jsonb
);

-- 2. Real Estate - Singapore
INSERT INTO public.industry_templates (
  code, country_id, category_id, status, version, target_audience, is_active, sort_order,
  metadata, forbidden_terms, compliance_rules, claim_restrictions, system_rules, argument_patterns,
  brand_voice, channel_settings
) VALUES (
  'realestate_sg',
  '29f88d9b-67ba-4070-9831-df60e9958d14',
  'b806e298-75ec-4706-80ce-2da35ad71f8a',
  'stable',
  '1.0',
  'both',
  true,
  11,
  '{"applies_to": ["property developers", "real estate agencies", "property agents", "property portals", "property management companies", "REIT marketing"], "legal_basis": ["Estate Agents Act", "Council for Estate Agencies (CEA) Code of Ethics", "Housing and Development Act", "Urban Redevelopment Authority (URA) Guidelines", "Personal Data Protection Act (PDPA)"]}'::jsonb,
  ARRAY['guaranteed rental yield', 'sure profit', '100% sold', 'last unit', 'exclusive deal', 'guaranteed capital appreciation', 'cannot lose money', 'best investment ever', 'prices only go up', 'sold out soon', 'once in a lifetime', 'secret launch', 'insider price'],
  '[
    {"rule": "All property prices must be accurate and updated", "severity": "high"},
    {"rule": "Cannot create false sense of scarcity without factual basis", "severity": "high"},
    {"rule": "Must clearly state property type: HDB, EC, Private Condo, Landed", "severity": "high"},
    {"rule": "Tenure type must be clearly stated: Freehold, 99-year, 999-year", "severity": "high"},
    {"rule": "Floor area must specify: strata area vs built-up area", "severity": "medium"},
    {"rule": "Rental yield projections must include calculation basis and disclaimers", "severity": "high"},
    {"rule": "New launch content must comply with URA advertising guidelines", "severity": "high"},
    {"rule": "Agent must be CEA-registered for property transactions", "severity": "high"}
  ]'::jsonb,
  '[
    {"claim": "Cannot guarantee rental income or yields", "alternative": "Present historical rental data for comparable properties with disclaimers"},
    {"claim": "Cannot promise capital appreciation", "alternative": "Show historical price trends with market context"},
    {"claim": "Cannot claim property is sold out without verification", "alternative": "State current availability status with date"},
    {"claim": "Cannot use false urgency tactics", "alternative": "Provide factual timeline for launches or offers"},
    {"claim": "Cannot guarantee loan approval", "alternative": "Recommend consultation with banks for eligibility"},
    {"claim": "Cannot misrepresent property features or views", "alternative": "Use actual photos and accurate descriptions"}
  ]'::jsonb,
  '["This Industry Memory OVERRIDES any Brand Voice if there is a conflict", "Forbidden Terms cannot be merged, rewritten, or paraphrased", "All property content must include accurate pricing and availability", "If user requests content that violates rules - soft decline with neutral explanation", "All generated content must log industry_template_version for audit", "HDB-related content must comply with HDB advertising guidelines"]'::jsonb,
  '{"valid_patterns": ["[Property feature] - [Factual description] - [Location benefits] - [Price/availability info]", "[Market trend] - [Data-backed analysis] - [Neutral recommendation]", "[Lifestyle benefit] - [Actual amenities] - [Proximity facts]"], "forbidden_patterns": ["False scarcity creation", "Unverified superlatives", "Emotional pressure tactics", "Misleading comparison with different property types", "Guaranteed returns messaging"]}'::jsonb,
  '{"tone_of_voice": ["professional", "informative", "aspirational", "trustworthy"], "formality_level": "professional", "language_style": ["clear", "descriptive", "factual", "engaging"], "allow_emoji": true, "cta_policy": "moderate"}'::jsonb,
  '{"linkedin": {"risk_level": "low", "notes": "B2B content, market insights, thought leadership"}, "facebook": {"risk_level": "medium", "notes": "Property listings with accurate info"}, "instagram": {"risk_level": "medium", "notes": "Visual content with proper descriptions"}, "tiktok": {"risk_level": "medium", "notes": "Property tours, avoid price guarantees"}, "website": {"risk_level": "low", "notes": "Full property details with disclaimers"}, "email": {"risk_level": "low", "notes": "Personalized property recommendations"}}'::jsonb
);

-- 3. Healthcare & Medical - Singapore
INSERT INTO public.industry_templates (
  code, country_id, category_id, status, version, target_audience, is_active, sort_order,
  metadata, forbidden_terms, compliance_rules, claim_restrictions, system_rules, argument_patterns,
  brand_voice, channel_settings
) VALUES (
  'healthcare_sg',
  '29f88d9b-67ba-4070-9831-df60e9958d14',
  'c50bf6a8-e7c5-4c64-b50a-f8806a140cb7',
  'stable',
  '1.0',
  'B2C',
  true,
  12,
  '{"applies_to": ["hospitals and clinics", "medical aesthetics", "dental practices", "pharmacies", "health supplements", "medical devices", "telehealth services"], "legal_basis": ["Medicines Act", "Health Products Act", "Singapore Medical Council (SMC) Ethical Code", "Health Sciences Authority (HSA) Guidelines", "Therapeutic Products Regulations", "Personal Data Protection Act (PDPA)"]}'::jsonb,
  ARRAY['cure', 'guaranteed cure', '100% effective', 'no side effects', 'miracle treatment', 'instant results', 'permanent solution', 'risk-free procedure', 'doctor recommended', 'clinically proven', 'FDA approved', 'scientifically proven'],
  '[
    {"rule": "Cannot make unsubstantiated therapeutic claims", "severity": "high"},
    {"rule": "Medical testimonials must not claim cure or guaranteed results", "severity": "high"},
    {"rule": "Before/after images must include appropriate disclaimers", "severity": "high"},
    {"rule": "Health supplement claims must comply with HSA guidelines", "severity": "high"},
    {"rule": "Cannot provide medical diagnosis or advice in marketing content", "severity": "high"},
    {"rule": "Must include This is not medical advice disclaimer for health content", "severity": "medium"},
    {"rule": "Pricing for medical procedures must be transparent", "severity": "medium"},
    {"rule": "Doctor qualifications must be accurately stated", "severity": "high"}
  ]'::jsonb,
  '[
    {"claim": "Cannot claim to cure any disease or condition", "alternative": "Describe treatment options and encourage professional consultation"},
    {"claim": "Cannot guarantee treatment outcomes", "alternative": "Explain typical results with individual variation disclaimer"},
    {"claim": "Cannot use patient testimonials claiming cure", "alternative": "Share patient experience stories with appropriate disclaimers"},
    {"claim": "Cannot claim supplements treat or prevent diseases", "alternative": "Describe general wellness benefits within HSA guidelines"},
    {"claim": "Cannot claim procedures are risk-free", "alternative": "Outline benefits while mentioning that all procedures carry some risk"},
    {"claim": "Cannot use before/after without context", "alternative": "Include treatment details, timeline, and results may vary disclaimer"}
  ]'::jsonb,
  '["This Industry Memory OVERRIDES any Brand Voice if there is a conflict", "Forbidden Terms cannot be merged, rewritten, or paraphrased", "All health content must recommend professional medical consultation", "If user requests content that violates rules - soft decline with neutral explanation", "All generated content must log industry_template_version for audit", "Content must not create health anxiety or fear-based marketing"]'::jsonb,
  '{"valid_patterns": ["[Health topic] - [Educational information] - [Professional consultation CTA]", "[Treatment option] - [How it works] - [Benefits and considerations] - [Consult doctor]", "[Wellness tip] - [Supporting information] - [Lifestyle recommendation]"], "forbidden_patterns": ["Fear-based health messaging", "Unverified cure claims", "Pressure tactics for medical decisions", "Comparison denigrating other treatments", "Urgency for non-emergency procedures"]}'::jsonb,
  '{"tone_of_voice": ["caring", "professional", "reassuring", "educational", "empathetic"], "formality_level": "professional", "language_style": ["clear", "accessible", "non-alarmist", "supportive"], "allow_emoji": true, "cta_policy": "soft"}'::jsonb,
  '{"linkedin": {"risk_level": "low", "notes": "Medical professional content, health education"}, "facebook": {"risk_level": "medium", "notes": "Health tips with disclaimers, avoid treatment claims"}, "instagram": {"risk_level": "medium", "notes": "Wellness content, before/after with disclaimers"}, "tiktok": {"risk_level": "high", "notes": "Health tips only, no medical advice"}, "website": {"risk_level": "low", "notes": "Detailed service info with full disclaimers"}, "email": {"risk_level": "low", "notes": "Health newsletters with educational focus"}}'::jsonb
);

-- 4. F&B / Food Services - Singapore
INSERT INTO public.industry_templates (
  code, country_id, category_id, status, version, target_audience, is_active, sort_order,
  metadata, forbidden_terms, compliance_rules, claim_restrictions, system_rules, argument_patterns,
  brand_voice, channel_settings
) VALUES (
  'fnb_sg',
  '29f88d9b-67ba-4070-9831-df60e9958d14',
  'c50bf6a8-e7c5-4c64-b50a-f8806a140cb7',
  'stable',
  '1.0',
  'B2C',
  true,
  13,
  '{"applies_to": ["restaurants and cafes", "food manufacturers", "food delivery services", "catering companies", "food retail", "beverage companies"], "legal_basis": ["Sale of Food Act", "Singapore Food Agency (SFA) Regulations", "Health Promotion Board (HPB) Nutrition Guidelines", "Food Regulations", "Consumer Protection (Fair Trading) Act", "Halal Certification requirements"]}'::jsonb,
  ARRAY['healthiest', 'cures disease', 'prevents illness', 'medicinal properties', 'doctor recommended', 'clinically proven', 'weight loss guaranteed', 'all-natural', 'chemical-free', '100% organic', 'zero calories', 'superfood'],
  '[
    {"rule": "Nutrition claims must comply with HPB guidelines", "severity": "high"},
    {"rule": "Allergen information must be clearly stated", "severity": "high"},
    {"rule": "Halal claims must have valid MUIS certification", "severity": "high"},
    {"rule": "Cannot make unsubstantiated health claims about food", "severity": "high"},
    {"rule": "Organic claims must have valid certification", "severity": "high"},
    {"rule": "Calorie and nutrition information must be accurate", "severity": "medium"},
    {"rule": "Food images must reasonably represent actual product", "severity": "medium"},
    {"rule": "Price must include GST or clearly state if exclusive", "severity": "medium"}
  ]'::jsonb,
  '[
    {"claim": "Cannot claim food cures or prevents diseases", "alternative": "Describe nutritional benefits and ingredients"},
    {"claim": "Cannot use unverified organic or natural claims", "alternative": "State actual certifications held"},
    {"claim": "Cannot guarantee weight loss from food consumption", "alternative": "Describe as part of balanced diet and lifestyle"},
    {"claim": "Cannot claim superfood status without basis", "alternative": "Highlight specific nutritional content"},
    {"claim": "Cannot misrepresent portion sizes in images", "alternative": "Use representative images with size context"},
    {"claim": "Cannot claim Halal without MUIS certification", "alternative": "State Muslim-owned or Halal-certified as applicable"}
  ]'::jsonb,
  '["This Industry Memory OVERRIDES any Brand Voice if there is a conflict", "Forbidden Terms cannot be merged, rewritten, or paraphrased", "All food content must be accurate about ingredients and nutrition", "If user requests content that violates rules - soft decline with neutral explanation", "All generated content must log industry_template_version for audit", "Allergen warnings are mandatory for relevant products"]'::jsonb,
  '{"valid_patterns": ["[Food item] - [Appetizing description] - [Key ingredients] - [Dietary info if relevant]", "[Restaurant feature] - [Unique selling point] - [Menu highlights] - [CTA]", "[Food story] - [Origin/inspiration] - [Taste experience] - [Availability]"], "forbidden_patterns": ["Unverified health claims", "Misleading portion representation", "False certification claims", "Comparison denigrating competitors", "Pressure tactics for dining decisions"]}'::jsonb,
  '{"tone_of_voice": ["appetizing", "friendly", "passionate", "inviting", "authentic"], "formality_level": "casual", "language_style": ["descriptive", "sensory", "engaging", "warm"], "allow_emoji": true, "cta_policy": "moderate"}'::jsonb,
  '{"linkedin": {"risk_level": "low", "notes": "B2B content, industry insights"}, "facebook": {"risk_level": "low", "notes": "Menu updates, promotions, events"}, "instagram": {"risk_level": "low", "notes": "Food photography, behind-the-scenes"}, "tiktok": {"risk_level": "low", "notes": "Food videos, recipes, trends"}, "website": {"risk_level": "low", "notes": "Full menu with dietary information"}, "email": {"risk_level": "low", "notes": "Promotions, loyalty programs"}}'::jsonb
);

-- Insert English translations for all 4 packs
INSERT INTO public.industry_template_translations (industry_template_id, language_code, name, short_name, brand_positioning, preferred_words, forbidden_words)
SELECT 
  id,
  'en',
  'Financial Services – Singapore',
  'Finance SG',
  'Trusted financial partner committed to transparent, compliant, and client-centric services in Singapore regulated market',
  ARRAY['wealth management', 'financial planning', 'investment advisory', 'risk-adjusted returns', 'diversified portfolio', 'regulatory compliant', 'MAS-regulated', 'fiduciary duty', 'transparent fees'],
  ARRAY['guaranteed returns', 'risk-free', 'sure win', 'insider tips', 'beat the market', 'double your money', 'get rich quick', 'no loss', 'foolproof']
FROM public.industry_templates WHERE code = 'finance_sg';

INSERT INTO public.industry_template_translations (industry_template_id, language_code, name, short_name, brand_positioning, preferred_words, forbidden_words)
SELECT 
  id,
  'en',
  'Real Estate – Singapore',
  'Property SG',
  'Professional property services with transparent, accurate information for informed property decisions in Singapore',
  ARRAY['prime location', 'well-connected', 'freehold', 'leasehold', 'en bloc potential', 'rental yield', 'capital appreciation potential', 'MRT accessible', 'reputable developer'],
  ARRAY['guaranteed profit', 'sure sell', '100% sold', 'last unit', 'prices only go up', 'cannot lose', 'best investment', 'secret launch']
FROM public.industry_templates WHERE code = 'realestate_sg';

INSERT INTO public.industry_template_translations (industry_template_id, language_code, name, short_name, brand_positioning, preferred_words, forbidden_words)
SELECT 
  id,
  'en',
  'Healthcare & Medical – Singapore',
  'Healthcare SG',
  'Patient-centric healthcare services focused on education, transparency, and professional medical guidance',
  ARRAY['consultation', 'treatment options', 'patient care', 'medical expertise', 'qualified specialists', 'evidence-based', 'personalized care', 'holistic approach', 'wellness journey'],
  ARRAY['cure', 'guaranteed results', '100% effective', 'no side effects', 'miracle treatment', 'instant results', 'permanent solution', 'risk-free']
FROM public.industry_templates WHERE code = 'healthcare_sg';

INSERT INTO public.industry_template_translations (industry_template_id, language_code, name, short_name, brand_positioning, preferred_words, forbidden_words)
SELECT 
  id,
  'en',
  'Food & Beverage – Singapore',
  'F&B SG',
  'Quality food and dining experiences with authentic flavors and transparent ingredient sourcing',
  ARRAY['freshly prepared', 'locally sourced', 'signature dish', 'chef special', 'authentic recipe', 'quality ingredients', 'handcrafted', 'house-made', 'seasonal menu'],
  ARRAY['healthiest', 'cures disease', 'medicinal', 'weight loss guaranteed', 'all-natural', 'chemical-free', 'superfood', 'zero calories']
FROM public.industry_templates WHERE code = 'fnb_sg';