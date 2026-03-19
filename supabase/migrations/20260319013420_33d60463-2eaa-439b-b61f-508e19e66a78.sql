
-- Create carousel_style_presets table
CREATE TABLE public.carousel_style_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  preset_key text UNIQUE NOT NULL,
  display_name text NOT NULL,
  tokens jsonb NOT NULL,
  overlay_config jsonb NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.carousel_style_presets ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read
CREATE POLICY "Authenticated users can read style presets"
  ON public.carousel_style_presets
  FOR SELECT
  TO authenticated
  USING (true);

-- Only service_role can write
CREATE POLICY "Service role can manage style presets"
  ON public.carousel_style_presets
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Auto-update updated_at
CREATE TRIGGER update_carousel_style_presets_updated_at
  BEFORE UPDATE ON public.carousel_style_presets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed 6 presets
INSERT INTO public.carousel_style_presets (preset_key, display_name, tokens, overlay_config) VALUES

-- MINIMALIST
('minimalist', 'Clean Modern', 
'{"colors":{"background":{"primary":"#FFFFFF","secondary":"#F8F9FA","tertiary":"#F1F3F5"},"text":{"primary":"#1A1A1A","secondary":"#6B7280","muted":"#9CA3AF"},"accent":"#2563EB"},"typography":{"fontFamily":{"heading":"''Inter'', ''Helvetica Neue'', sans-serif","body":"''Inter'', sans-serif"},"fontWeight":{"heading":500,"body":400},"fontSize":{"hero":"2.5rem","heading":"1.75rem","body":"1rem"}},"layout":{"padding":"64px","borderRadius":"4px","negativeSpaceRatio":0.45,"alignment":"left"},"effects":{"shadow":"none","border":"1px solid rgba(0,0,0,0.06)"},"safeZone":{"top":"15%","bottom":"20%","left":"12%","right":"12%"}}'::jsonb,
'{"hook":{"position":"center","fontWeight":500,"fontSize":"2.5rem","textAlign":"center","maxWidth":"70%","textTransform":"none","background":"none","textColor":"#1A1A1A"},"body":{"position":"bottom-left","fontWeight":400,"fontSize":"1rem","textAlign":"left","maxWidth":"80%","background":"none","textColor":"#1A1A1A"},"cta":{"position":"center","fontWeight":500,"fontSize":"1.5rem","textAlign":"center","maxWidth":"60%","background":"none","textColor":"#1A1A1A"},"dataPoint":{"position":"center","fontWeight":500,"fontSize":"3rem","textAlign":"center","maxWidth":"70%","background":"none","textColor":"#2563EB"},"quote":{"position":"center","fontWeight":400,"fontSize":"1.75rem","textAlign":"center","maxWidth":"65%","background":"none","textColor":"#6B7280","fontFamily":"heading"},"visual":{"skipOverlay":true}}'::jsonb),

-- FLAT_DESIGN
('flat_design', 'Bold Infographic',
'{"colors":{"background":{"primary":"#1A1A2E","secondary":"#16213E","tertiary":"#0F3460"},"text":{"primary":"#FFFFFF","secondary":"#E2E8F0"},"accent":"#E94560","secondary_accent":"#FFC107","dataPalette":["#E94560","#FFC107","#00D2FF","#7C3AED","#10B981"]},"typography":{"fontFamily":{"heading":"''Montserrat'', sans-serif","body":"''Montserrat'', sans-serif"},"fontWeight":{"heading":800,"body":500,"dataPoint":900},"fontSize":{"hero":"4.5rem","heading":"2.5rem","body":"1rem","dataPoint":"6rem"}},"layout":{"padding":"40px","borderRadius":"0px","negativeSpaceRatio":0.2,"alignment":"center","gridType":"blocky"},"effects":{"shadow":"none","border":"3px solid"},"safeZone":{"top":"10%","bottom":"15%","left":"8%","right":"8%"}}'::jsonb,
'{"hook":{"position":"center","fontWeight":900,"fontSize":"4rem","textAlign":"center","maxWidth":"90%","textTransform":"uppercase","background":"solid-block","textColor":"#FFFFFF"},"body":{"position":"top-left","fontWeight":700,"fontSize":"1.25rem","textAlign":"left","maxWidth":"85%","background":"solid-block","textColor":"#FFFFFF"},"cta":{"position":"bottom-center","fontWeight":800,"fontSize":"2rem","textAlign":"center","maxWidth":"90%","textTransform":"uppercase","background":"solid-block","textColor":"#FFFFFF"},"dataPoint":{"position":"center","fontWeight":900,"fontSize":"6rem","textAlign":"center","maxWidth":"90%","background":"none","textColor":"#FFC107"},"quote":{"position":"center","fontWeight":700,"fontSize":"2rem","textAlign":"center","maxWidth":"80%","background":"solid-block","textColor":"#FFFFFF"},"visual":{"skipOverlay":true}}'::jsonb),

-- GRADIENT
('gradient', 'Gradient Flow',
'{"colors":{"background":{"primary":"linear-gradient(135deg, #667eea 0%, #764ba2 100%)","secondary":"linear-gradient(135deg, #f093fb 0%, #f5576c 100%)","tertiary":"linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"},"text":{"primary":"#FFFFFF","secondary":"rgba(255,255,255,0.85)"},"accent":"#00f2fe"},"typography":{"fontFamily":{"heading":"''Plus Jakarta Sans'', sans-serif","body":"''Plus Jakarta Sans'', sans-serif"},"fontWeight":{"heading":700,"body":400},"fontSize":{"hero":"3rem","heading":"2rem","body":"1rem"}},"layout":{"padding":"48px","borderRadius":"20px","negativeSpaceRatio":0.35,"alignment":"center","gridType":"floating"},"effects":{"shadow":"0 8px 32px rgba(31,38,135,0.37)","backdrop":"blur(12px) saturate(180%)","glassBg":"rgba(255,255,255,0.1)","glow":"0 0 40px rgba(102,126,234,0.4)"},"safeZone":{"top":"12%","bottom":"18%","left":"10%","right":"10%"}}'::jsonb,
'{"hook":{"position":"center","fontWeight":700,"fontSize":"3rem","textAlign":"center","maxWidth":"75%","background":"glass","textColor":"#FFFFFF"},"body":{"position":"center","fontWeight":400,"fontSize":"1.1rem","textAlign":"center","maxWidth":"70%","background":"glass","textColor":"#FFFFFF"},"cta":{"position":"bottom-center","fontWeight":700,"fontSize":"1.75rem","textAlign":"center","maxWidth":"65%","background":"glass","textColor":"#FFFFFF"},"dataPoint":{"position":"center","fontWeight":700,"fontSize":"4rem","textAlign":"center","maxWidth":"75%","background":"glass","textColor":"#00f2fe"},"quote":{"position":"center","fontWeight":400,"fontSize":"1.75rem","textAlign":"center","maxWidth":"70%","background":"glass","textColor":"#FFFFFF","fontFamily":"heading"},"visual":{"skipOverlay":true}}'::jsonb),

-- GEOMETRIC
('geometric', 'Corporate',
'{"colors":{"background":{"primary":"#0A1628","secondary":"#1B2A4A","tertiary":"#FFFFFF"},"text":{"primary":"#FFFFFF","secondary":"#CBD5E1","onLight":"#0A1628"},"accent":"#C9A84C"},"typography":{"fontFamily":{"heading":"''Playfair Display'', serif","body":"''Open Sans'', sans-serif"},"fontWeight":{"heading":700,"body":400},"fontSize":{"hero":"2.75rem","heading":"2rem","body":"1rem"}},"layout":{"padding":"56px","borderRadius":"2px","negativeSpaceRatio":0.3,"alignment":"left","gridType":"strict-columns"},"effects":{"shadow":"0 4px 16px rgba(0,0,0,0.2)","diagonalLine":"2px solid rgba(201,168,76,0.4)"},"safeZone":{"top":"12%","bottom":"18%","left":"10%","right":"10%"}}'::jsonb,
'{"hook":{"position":"left-column","fontWeight":700,"fontSize":"2.75rem","textAlign":"left","maxWidth":"55%","background":"none","textColor":"#FFFFFF","fontFamily":"heading"},"body":{"position":"left-column","fontWeight":400,"fontSize":"1rem","textAlign":"left","maxWidth":"55%","background":"none","textColor":"#CBD5E1","fontFamily":"body"},"cta":{"position":"bottom-left","fontWeight":600,"fontSize":"1.5rem","textAlign":"left","maxWidth":"50%","textTransform":"uppercase","background":"none","textColor":"#C9A84C"},"dataPoint":{"position":"center","fontWeight":700,"fontSize":"3.5rem","textAlign":"center","maxWidth":"60%","background":"none","textColor":"#C9A84C","fontFamily":"heading"},"quote":{"position":"center","fontWeight":700,"fontSize":"2rem","textAlign":"center","maxWidth":"65%","background":"none","textColor":"#FFFFFF","fontFamily":"heading"},"visual":{"skipOverlay":true}}'::jsonb),

-- ILLUSTRATION
('illustration', 'Story Visual',
'{"colors":{"background":{"primary":"#FFF8F0","secondary":"#FEF3E2","tertiary":"#FEECD2"},"text":{"primary":"#3D2C2E","secondary":"#6B5352"},"accent":"#E07A5F","secondary_accent":"#81B29A"},"typography":{"fontFamily":{"heading":"''Playfair Display'', serif","body":"''Lora'', serif","handwriting":"''Caveat'', cursive"},"fontWeight":{"heading":700,"body":400,"handwriting":400},"fontSize":{"hero":"2.75rem","heading":"2rem","body":"1rem","quote":"1.75rem"}},"layout":{"padding":"48px","borderRadius":"16px","negativeSpaceRatio":0.35,"alignment":"asymmetric","gridType":"freeform"},"effects":{"shadow":"0 4px 20px rgba(224,122,95,0.15)","border":"2px dashed rgba(61,44,46,0.15)"},"safeZone":{"top":"12%","bottom":"18%","left":"10%","right":"10%"}}'::jsonb,
'{"hook":{"position":"asymmetric-left","fontWeight":700,"fontSize":"2.5rem","textAlign":"left","maxWidth":"65%","background":"none","textColor":"#3D2C2E","fontFamily":"heading"},"body":{"position":"bottom-left","fontWeight":400,"fontSize":"1rem","textAlign":"left","maxWidth":"75%","background":"none","textColor":"#3D2C2E","fontFamily":"body"},"cta":{"position":"center","fontWeight":600,"fontSize":"1.5rem","textAlign":"center","maxWidth":"60%","background":"none","textColor":"#E07A5F"},"dataPoint":{"position":"center","fontWeight":700,"fontSize":"3rem","textAlign":"center","maxWidth":"65%","background":"none","textColor":"#E07A5F","fontFamily":"heading"},"quote":{"position":"center","fontWeight":400,"fontSize":"1.75rem","textAlign":"center","maxWidth":"70%","background":"none","textColor":"#6B5352","fontFamily":"handwriting"},"visual":{"skipOverlay":true}}'::jsonb),

-- PRODUCT_ONLY
('product_only', 'Product Focus',
'{"colors":{"background":{"primary":"#FFFFFF","secondary":"#F5F5F5"},"text":{"primary":"#111111","secondary":"#444444","price":"#E53E3E"},"accent":"#E53E3E","cta":"#E53E3E","ctaText":"#FFFFFF","badge":{"hot":"#E53E3E","new":"#3B82F6","sale":"#F59E0B"}},"typography":{"fontFamily":{"heading":"''Montserrat'', sans-serif","body":"''Montserrat'', sans-serif"},"fontWeight":{"heading":800,"body":500,"price":900,"badge":700},"fontSize":{"hero":"3rem","heading":"2rem","price":"2.5rem","discount":"3.5rem","badge":"0.75rem"}},"layout":{"padding":"40px","borderRadius":"12px","negativeSpaceRatio":0.25,"alignment":"center","gridType":"center-focus","splitRatio":"50-50"},"effects":{"shadow":"0 20px 40px rgba(0,0,0,0.15)","contactShadow":"0 4px 8px rgba(0,0,0,0.3)"},"safeZone":{"top":"8%","bottom":"22%","left":"8%","right":"8%"}}'::jsonb,
'{"hook":{"position":"top-center","fontWeight":800,"fontSize":"2.5rem","textAlign":"center","maxWidth":"85%","background":"none","textColor":"#111111"},"body":{"position":"center-left","fontWeight":800,"fontSize":"2rem","textAlign":"left","maxWidth":"45%","background":"none","textColor":"#111111"},"cta":{"position":"bottom-center","fontWeight":700,"fontSize":"1.25rem","textAlign":"center","maxWidth":"90%","textTransform":"uppercase","background":"cta-button","textColor":"#FFFFFF"},"dataPoint":{"position":"center","fontWeight":900,"fontSize":"3.5rem","textAlign":"center","maxWidth":"80%","background":"none","textColor":"#E53E3E"},"quote":{"position":"center","fontWeight":500,"fontSize":"1.5rem","textAlign":"center","maxWidth":"70%","background":"none","textColor":"#444444"},"visual":{"skipOverlay":true}}'::jsonb);
