-- =============================================
-- THAILAND INDUSTRY MEMORY PACKS
-- Created: 2024-12-23
-- =============================================

-- 1. Finance Thailand (การเงิน)
INSERT INTO public.industry_templates (
  id, code, country_id, category_id, target_audience, status, version, is_active, sort_order,
  metadata, forbidden_terms, compliance_rules, claim_restrictions, system_rules, argument_patterns, brand_voice, channel_settings
) VALUES (
  gen_random_uuid(),
  'finance_th',
  '01964080-bbc9-468c-8bcb-5a1d769ebac1',
  '65ea8ac4-742c-49f5-b32f-c58716f926ff',
  'B2C',
  'stable',
  '1.0',
  true,
  1,
  '{"applies_to": ["banks", "investment_funds", "insurance", "fintech"], "legal_basis": ["พ.ร.บ.ธุรกิจสถาบันการเงิน", "พ.ร.บ.หลักทรัพย์และตลาดหลักทรัพย์", "ประกาศ ก.ล.ต."]}'::jsonb,
  ARRAY['รับประกันผลตอบแทน', 'ไม่มีความเสี่ยง', 'รวยแน่นอน', 'กำไร 100%', 'ปลอดภัยที่สุด', 'ดีที่สุดในโลก', 'การันตีเงินต้น'],
  '[
    {"rule": "ต้องเปิดเผยความเสี่ยงในการลงทุนอย่างชัดเจน", "severity": "critical"},
    {"rule": "ห้ามอ้างผลตอบแทนในอดีตเป็นการรับประกันอนาคต", "severity": "critical"},
    {"rule": "ต้องระบุข้อจำกัดและเงื่อนไขของผลิตภัณฑ์", "severity": "high"},
    {"rule": "ต้องมีใบอนุญาตประกอบธุรกิจจาก ธปท. หรือ ก.ล.ต.", "severity": "critical"}
  ]'::jsonb,
  '[
    {"claim": "ผลตอบแทนสูงกว่าตลาด", "alternative": "ผลตอบแทนที่คาดหวังขึ้นอยู่กับสภาวะตลาด"},
    {"claim": "ไม่มีค่าธรรมเนียม", "alternative": "ค่าธรรมเนียมตามที่ระบุในเงื่อนไข"},
    {"claim": "เงินต้นปลอดภัย", "alternative": "การลงทุนมีความเสี่ยง กรุณาศึกษารายละเอียดก่อนตัดสินใจ"}
  ]'::jsonb,
  '["ปฏิบัติตามหลักเกณฑ์ของ ก.ล.ต. และ ธปท.", "ต้องแสดงคำเตือนความเสี่ยงในทุกเนื้อหา", "ห้ามใช้ภาษาที่ทำให้เข้าใจผิดเกี่ยวกับความเสี่ยง"]'::jsonb,
  '{"valid_patterns": ["ข้อมูลอ้างอิงจาก...", "ตามประกาศของ ก.ล.ต.", "คำนวณจากผลการดำเนินงานในอดีต"], "forbidden_patterns": ["รวยเร็ว", "ไม่ต้องทำอะไร", "passive income ง่ายๆ"]}'::jsonb,
  '{"tone_of_voice": ["น่าเชื่อถือ", "มืออาชีพ", "โปร่งใส"], "formality_level": "formal", "language_style": ["ภาษาราชการ", "ชัดเจน"], "allow_emoji": false, "cta_policy": "soft"}'::jsonb,
  '{"facebook": {"risk_level": "medium", "notes": "ต้องมี disclaimer"}, "instagram": {"risk_level": "medium", "notes": "ต้องมี disclaimer ในรูปภาพ"}, "tiktok": {"risk_level": "high", "notes": "ไม่แนะนำ - ยากต่อการใส่ข้อกำหนด"}, "linkedin": {"risk_level": "low", "notes": "เหมาะสำหรับ B2B"}, "website": {"risk_level": "low", "notes": "สามารถใส่ disclaimer ครบถ้วน"}}'::jsonb
);

-- 2. Healthcare Thailand (สุขภาพและการแพทย์)
INSERT INTO public.industry_templates (
  id, code, country_id, category_id, target_audience, status, version, is_active, sort_order,
  metadata, forbidden_terms, compliance_rules, claim_restrictions, system_rules, argument_patterns, brand_voice, channel_settings
) VALUES (
  gen_random_uuid(),
  'healthcare_th',
  '01964080-bbc9-468c-8bcb-5a1d769ebac1',
  '0097ee4e-f779-446f-8a3b-fbef4f17992c',
  'B2C',
  'stable',
  '1.0',
  true,
  2,
  '{"applies_to": ["hospitals", "clinics", "pharmacies", "supplements", "medical_devices"], "legal_basis": ["พ.ร.บ.อาหาร พ.ศ.2522", "พ.ร.บ.ยา พ.ศ.2510", "พ.ร.บ.เครื่องมือแพทย์ พ.ศ.2551", "ประกาศ อย."]}'::jsonb,
  ARRAY['รักษาหายขาด', 'หายแน่นอน', 'ไม่มีผลข้างเคียง', 'ดีกว่ายา', 'ทดแทนยา', 'อย.รับรอง', 'ผ่าน อย.', 'ป้องกันโรค', 'รักษาโรคมะเร็ง', 'ลดน้ำหนักเร็ว'],
  '[
    {"rule": "ห้ามอ้างสรรพคุณเกินจริงหรือรักษาโรค", "severity": "critical"},
    {"rule": "ผลิตภัณฑ์เสริมอาหารห้ามอ้างว่าเป็นยา", "severity": "critical"},
    {"rule": "ต้องระบุ อย. เฉพาะผลิตภัณฑ์ที่ได้รับอนุญาตเท่านั้น", "severity": "high"},
    {"rule": "ห้ามใช้ภาพก่อน-หลังที่เกินจริง", "severity": "high"},
    {"rule": "ต้องระบุคำเตือนสำหรับกลุ่มเสี่ยง", "severity": "medium"}
  ]'::jsonb,
  '[
    {"claim": "รักษาโรคได้", "alternative": "ช่วยดูแลสุขภาพ / เสริมการทำงานของร่างกาย"},
    {"claim": "ผ่าน อย.", "alternative": "จดแจ้งต่อ อย. แล้ว (เลขที่...)"},
    {"claim": "ลดน้ำหนัก 10 กก.", "alternative": "ช่วยควบคุมน้ำหนักควบคู่กับการออกกำลังกาย"},
    {"claim": "หมอแนะนำ", "alternative": "ปรึกษาแพทย์ก่อนใช้"}
  ]'::jsonb,
  '["ปฏิบัติตามประกาศสำนักงานคณะกรรมการอาหารและยา (อย.)", "ห้ามอ้างสรรพคุณรักษาโรคสำหรับผลิตภัณฑ์เสริมอาหาร", "ต้องระบุคำเตือนตามที่กฎหมายกำหนด"]'::jsonb,
  '{"valid_patterns": ["จากการวิจัย...", "ผลการศึกษาพบว่า...", "ปรึกษาแพทย์ก่อนใช้"], "forbidden_patterns": ["หายขาด", "รักษาได้ 100%", "ไม่ต้องพบแพทย์"]}'::jsonb,
  '{"tone_of_voice": ["ใส่ใจ", "เชื่อถือได้", "เป็นมิตร"], "formality_level": "semi-formal", "language_style": ["ภาษาที่เข้าใจง่าย", "หลีกเลี่ยงศัพท์แพทย์ที่ยาก"], "allow_emoji": true, "cta_policy": "soft"}'::jsonb,
  '{"facebook": {"risk_level": "high", "notes": "ต้องระวังการถูกแบน"}, "instagram": {"risk_level": "high", "notes": "ต้องระวังภาพ before/after"}, "tiktok": {"risk_level": "high", "notes": "ไม่แนะนำสำหรับ health claims"}, "line": {"risk_level": "medium", "notes": "เหมาะสำหรับข้อมูลสุขภาพทั่วไป"}, "website": {"risk_level": "low", "notes": "สามารถใส่รายละเอียดครบถ้วน"}}'::jsonb
);

-- 3. Real Estate Thailand (อสังหาริมทรัพย์)
INSERT INTO public.industry_templates (
  id, code, country_id, category_id, target_audience, status, version, is_active, sort_order,
  metadata, forbidden_terms, compliance_rules, claim_restrictions, system_rules, argument_patterns, brand_voice, channel_settings
) VALUES (
  gen_random_uuid(),
  'realestate_th',
  '01964080-bbc9-468c-8bcb-5a1d769ebac1',
  'b806e298-75ec-4706-80ce-2da35ad71f8a',
  'B2C',
  'stable',
  '1.0',
  true,
  3,
  '{"applies_to": ["property_developers", "real_estate_agents", "condos", "housing_estates"], "legal_basis": ["พ.ร.บ.อาคารชุด", "พ.ร.บ.การจัดสรรที่ดิน", "ประกาศคณะกรรมการคุ้มครองผู้บริโภค"]}'::jsonb,
  ARRAY['ราคาต่ำสุดในย่าน', 'รับประกันผลตอบแทน', 'ขายหมดแล้ว', 'เหลือห้องสุดท้าย', 'ราคาพิเศษวันนี้เท่านั้น', 'ไม่มีค่าส่วนกลาง'],
  '[
    {"rule": "ราคาที่โฆษณาต้องตรงกับราคาขายจริง", "severity": "critical"},
    {"rule": "ต้องระบุค่าใช้จ่ายส่วนกลางและค่าธรรมเนียมทั้งหมด", "severity": "high"},
    {"rule": "ห้ามใช้ภาพที่ทำให้เข้าใจผิดเกี่ยวกับขนาดหรือวิว", "severity": "high"},
    {"rule": "ต้องระบุสถานะโครงการ (EIA อนุมัติ/อยู่ระหว่างก่อสร้าง)", "severity": "medium"}
  ]'::jsonb,
  '[
    {"claim": "ใกล้รถไฟฟ้า 5 นาที", "alternative": "ระยะ xxx เมตรจากสถานี xxx (ประมาณ x นาทีเดิน)"},
    {"claim": "Fully furnished", "alternative": "ตกแต่งพร้อมอยู่ตามรายการที่ระบุในสัญญา"},
    {"claim": "ราคาเริ่มต้น", "alternative": "ราคาเริ่มต้น xxx บาท (ยูนิตที่ระบุ)"}
  ]'::jsonb,
  '["ต้องแสดงข้อมูลโครงการที่ถูกต้องตามความเป็นจริง", "ราคาต้องรวมค่าใช้จ่ายที่จำเป็นทั้งหมด", "ต้องระบุระยะเวลาการก่อสร้างที่แน่นอน"]'::jsonb,
  '{"valid_patterns": ["ตามแบบที่ได้รับอนุญาต", "EIA อนุมัติแล้ว", "คาดว่าแล้วเสร็จ..."], "forbidden_patterns": ["จองด่วน", "หมดแล้วหมดเลย", "ราคานี้วันนี้วันเดียว"]}'::jsonb,
  '{"tone_of_voice": ["น่าเชื่อถือ", "มืออาชีพ", "อบอุ่น"], "formality_level": "semi-formal", "language_style": ["สุภาพ", "ให้ข้อมูลครบถ้วน"], "allow_emoji": true, "cta_policy": "medium"}'::jsonb,
  '{"facebook": {"risk_level": "low", "notes": "เหมาะสำหรับ lead generation"}, "instagram": {"risk_level": "low", "notes": "เหมาะสำหรับ showcase"}, "line": {"risk_level": "low", "notes": "เหมาะสำหรับ CRM"}, "tiktok": {"risk_level": "medium", "notes": "ต้องระวังข้อมูลที่เกินจริง"}, "website": {"risk_level": "low", "notes": "ต้องมีรายละเอียดครบ"}}'::jsonb
);

-- 4. Food & Beverage Thailand (อาหารและเครื่องดื่ม)
INSERT INTO public.industry_templates (
  id, code, country_id, category_id, target_audience, status, version, is_active, sort_order,
  metadata, forbidden_terms, compliance_rules, claim_restrictions, system_rules, argument_patterns, brand_voice, channel_settings
) VALUES (
  gen_random_uuid(),
  'fnb_th',
  '01964080-bbc9-468c-8bcb-5a1d769ebac1',
  '3ced7aac-4d8b-4732-9890-62ddeebf6600',
  'B2C',
  'stable',
  '1.0',
  true,
  4,
  '{"applies_to": ["restaurants", "cafes", "food_delivery", "food_manufacturers", "beverages"], "legal_basis": ["พ.ร.บ.อาหาร พ.ศ.2522", "ประกาศกระทรวงสาธารณสุข", "มาตรฐาน อย."]}'::jsonb,
  ARRAY['อาหารเพื่อสุขภาพ', 'ลดน้ำหนัก', 'บำรุงร่างกาย', 'ช่วยย่อย', 'ดีท็อกซ์', 'ออร์แกนิค 100%', 'ไม่มีสารเคมี', 'ปลอดสารพิษ'],
  '[
    {"rule": "ห้ามอ้างสรรพคุณทางยาหรือรักษาโรค", "severity": "critical"},
    {"rule": "คำว่า ออร์แกนิค ต้องได้รับการรับรองตามมาตรฐาน", "severity": "high"},
    {"rule": "ต้องระบุส่วนประกอบที่ก่อภูมิแพ้", "severity": "high"},
    {"rule": "ต้องระบุวันผลิต/วันหมดอายุ", "severity": "medium"}
  ]'::jsonb,
  '[
    {"claim": "ออร์แกนิค", "alternative": "ใช้วัตถุดิบจากธรรมชาติ / ได้รับการรับรอง (ระบุหน่วยงาน)"},
    {"claim": "ไม่มีผงชูรส", "alternative": "ไม่เติมผงชูรส"},
    {"claim": "ดีต่อสุขภาพ", "alternative": "ให้พลังงาน xxx แคลอรี"}
  ]'::jsonb,
  '["ข้อมูลโภชนาการต้องถูกต้องตามที่ระบุบนฉลาก", "ห้ามอ้างสรรพคุณทางยา", "ต้องระบุสารก่อภูมิแพ้"]'::jsonb,
  '{"valid_patterns": ["ใช้วัตถุดิบคัดสรร", "สูตรดั้งเดิม", "ปรุงสดใหม่ทุกวัน"], "forbidden_patterns": ["รักษาโรค", "ช่วยลดน้ำหนัก", "บำรุงร่างกาย"]}'::jsonb,
  '{"tone_of_voice": ["เป็นมิตร", "น่ารับประทาน", "ใกล้ชิด"], "formality_level": "casual", "language_style": ["สนุกสนาน", "กระตุ้นความอยาก"], "allow_emoji": true, "cta_policy": "medium"}'::jsonb,
  '{"facebook": {"risk_level": "low", "notes": "เหมาะสำหรับ promotion"}, "instagram": {"risk_level": "low", "notes": "เหมาะสำหรับ food photography"}, "tiktok": {"risk_level": "low", "notes": "เหมาะสำหรับ viral content"}, "line": {"risk_level": "low", "notes": "เหมาะสำหรับ loyalty program"}, "grab": {"risk_level": "low", "notes": "เหมาะสำหรับ food delivery"}}'::jsonb
);

-- =============================================
-- THAI TRANSLATIONS (th)
-- =============================================

-- Finance Thai Translation
INSERT INTO public.industry_template_translations (
  industry_template_id, language_code, name, short_name, brand_positioning, preferred_words, forbidden_words
)
SELECT id, 'th', 'การเงินและการลงทุน', 'การเงิน', 
  'บริการทางการเงินที่น่าเชื่อถือ โปร่งใส และปฏิบัติตามกฎระเบียบ ก.ล.ต. และ ธปท.',
  ARRAY['ความน่าเชื่อถือ', 'ความโปร่งใส', 'มืออาชีพ', 'ผลตอบแทนที่คาดหวัง', 'การบริหารความเสี่ยง', 'การลงทุนระยะยาว'],
  ARRAY['รวยเร็ว', 'รับประกันกำไร', 'ไม่มีความเสี่ยง']
FROM public.industry_templates WHERE code = 'finance_th';

-- Healthcare Thai Translation
INSERT INTO public.industry_template_translations (
  industry_template_id, language_code, name, short_name, brand_positioning, preferred_words, forbidden_words
)
SELECT id, 'th', 'สุขภาพและการแพทย์', 'สุขภาพ',
  'บริการสุขภาพที่ใส่ใจ ปลอดภัย และปฏิบัติตามมาตรฐาน อย.',
  ARRAY['ดูแลสุขภาพ', 'คุณภาพชีวิต', 'ความปลอดภัย', 'ปรึกษาแพทย์', 'มาตรฐานการผลิต', 'ผ่านการรับรอง'],
  ARRAY['รักษาหาย', 'ทดแทนยา', 'ไม่มีผลข้างเคียง']
FROM public.industry_templates WHERE code = 'healthcare_th';

-- Real Estate Thai Translation
INSERT INTO public.industry_template_translations (
  industry_template_id, language_code, name, short_name, brand_positioning, preferred_words, forbidden_words
)
SELECT id, 'th', 'อสังหาริมทรัพย์', 'อสังหาฯ',
  'โครงการคุณภาพ ทำเลดี โปร่งใสเรื่องราคาและข้อมูล',
  ARRAY['ทำเลศักยภาพ', 'คุณภาพการก่อสร้าง', 'สิ่งอำนวยความสะดวก', 'ผ่อนสบาย', 'โปรโมชั่นพิเศษ', 'ยูนิตที่เหลือ'],
  ARRAY['ราคาต่ำสุด', 'หมดแล้วหมดเลย', 'วันนี้วันเดียว']
FROM public.industry_templates WHERE code = 'realestate_th';

-- F&B Thai Translation
INSERT INTO public.industry_template_translations (
  industry_template_id, language_code, name, short_name, brand_positioning, preferred_words, forbidden_words
)
SELECT id, 'th', 'อาหารและเครื่องดื่ม', 'อาหาร',
  'อาหารอร่อย สดใหม่ คุณภาพดี ปลอดภัย',
  ARRAY['สดใหม่', 'คัดสรร', 'สูตรพิเศษ', 'รสชาติ', 'วัตถุดิบคุณภาพ', 'ปรุงสดใหม่'],
  ARRAY['รักษาโรค', 'ลดน้ำหนัก', 'ดีท็อกซ์']
FROM public.industry_templates WHERE code = 'fnb_th';

-- =============================================
-- ENGLISH TRANSLATIONS (en)
-- =============================================

-- Finance English Translation
INSERT INTO public.industry_template_translations (
  industry_template_id, language_code, name, short_name, brand_positioning, preferred_words, forbidden_words
)
SELECT id, 'en', 'Finance & Investment', 'Finance',
  'Trustworthy, transparent financial services compliant with SEC and BOT regulations.',
  ARRAY['trust', 'transparency', 'professional', 'expected returns', 'risk management', 'long-term investment'],
  ARRAY['get rich quick', 'guaranteed profit', 'no risk']
FROM public.industry_templates WHERE code = 'finance_th';

-- Healthcare English Translation
INSERT INTO public.industry_template_translations (
  industry_template_id, language_code, name, short_name, brand_positioning, preferred_words, forbidden_words
)
SELECT id, 'en', 'Healthcare & Medical', 'Healthcare',
  'Caring, safe healthcare services compliant with Thai FDA standards.',
  ARRAY['wellness', 'quality of life', 'safety', 'consult doctor', 'manufacturing standards', 'certified'],
  ARRAY['cure', 'replace medicine', 'no side effects']
FROM public.industry_templates WHERE code = 'healthcare_th';

-- Real Estate English Translation
INSERT INTO public.industry_template_translations (
  industry_template_id, language_code, name, short_name, brand_positioning, preferred_words, forbidden_words
)
SELECT id, 'en', 'Real Estate', 'Property',
  'Quality projects, prime locations, transparent pricing and information.',
  ARRAY['prime location', 'construction quality', 'amenities', 'easy installment', 'special promotion', 'remaining units'],
  ARRAY['lowest price', 'last chance', 'today only']
FROM public.industry_templates WHERE code = 'realestate_th';

-- F&B English Translation
INSERT INTO public.industry_template_translations (
  industry_template_id, language_code, name, short_name, brand_positioning, preferred_words, forbidden_words
)
SELECT id, 'en', 'Food & Beverage', 'F&B',
  'Delicious, fresh, quality food that is safe and healthy.',
  ARRAY['fresh', 'selected', 'special recipe', 'taste', 'quality ingredients', 'freshly prepared'],
  ARRAY['cure disease', 'weight loss', 'detox']
FROM public.industry_templates WHERE code = 'fnb_th';