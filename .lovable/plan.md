

## Debug Carousel Image Pipeline — Simulation Plan

This is a data task, not a UI feature. I will run a script to simulate the entire carousel generation pipeline with your test parameters and output all intermediate data.

### What I'll do

**BƯỚC 1**: Using the system prompt and tool schema from `generate-carousel/index.ts`, I (Lovable AI) will generate a complete `slides_content` JSON for your test case:
- Topic: "5 Lý do Doanh nghiệp cần chuyển đổi số"
- Platform: facebook, 5 slides, educational style, gradient preset
- Brand: "TechViet Solutions", primary #2563EB, secondary #10B981
- Show all fields: slideNumber, objective, textContent (structured), fullPrompt, designStyle, colorLayout

**BƯỚC 2**: Take the fullPrompt from slide 1 and run it through `buildBackgroundPrompt()` logic (from `generate-carousel-image/index.ts` lines 868-1035) with:
- platform=facebook, carouselStyle=educational, slideNumber=1, totalSlides=5, slideRole=hook
- brandColors: { backgroundColor: "#2563EB", textColor: "#10B981" }
- No DB tokens (simulate fallback), no seamlessContext
- Show the FINAL string that would be sent to the AI image model

**BƯỚC 3**: Compute overlayConfig for slide 1 using:
- FALLBACK_OVERLAY_MATRIX['gradient']['hook'] (lines 197-199)
- adjustOverlayForTextDensity with the textContent
- parseTextLayers with structured textContent + slideRole='hook'
- Show: position, fontWeight, fontSize, textAlign, background, textLayers, decorations

### Output format
A single document with all 3 steps clearly labeled, written to `/mnt/documents/carousel-debug-output.md`

### Technical approach
Run a Node.js script that replicates the exact logic from the edge functions (regex cleaning, prompt assembly order, overlay matrix lookup) — no API calls needed.

