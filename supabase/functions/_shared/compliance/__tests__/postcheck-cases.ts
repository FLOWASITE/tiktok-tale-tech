// Test fixtures + Deno tests for postCheckCarouselCompliance.
// Run with: deno test --allow-net --allow-env supabase/functions/_shared/compliance/__tests__/postcheck-cases.ts
import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  postCheckCarouselCompliance,
  type PostCheckRulesSource,
  type PostCheckSlide,
} from "../compliance-postcheck.ts";

// Aesthetic / medical industry rules (Vietnam — Nghị định 38)
const aestheticRules: PostCheckRulesSource = {
  forbidden_terms: [
    "không tác dụng phụ",
    "an toàn tuyệt đối",
    "chữa khỏi hoàn toàn",
  ],
  forbidden_patterns: [
    "hiệu quả 100%",
    "giảm 10kg trong 7 ngày",
    "trẻ ra 10 tuổi",
    "đẹp như sao hàn ngay sau 1 buổi",
  ],
  claim_restrictions: [
    { claim: "cam kết kết quả", alternative: "có thể giúp cải thiện" },
    { claim: "bác sĩ #1 việt nam", alternative: "đội ngũ bác sĩ giàu kinh nghiệm" },
  ],
  high_risk_keywords: ["fda chứng nhận"],
};

function makeSlide(num: number, headline: string, fullPrompt = ""): PostCheckSlide {
  return {
    slideNumber: num,
    objective: `Slide ${num} objective`,
    textContent: { headline },
    fullPrompt: fullPrompt || "A clean modern design with soft pastel colors and minimalist typography on a beige background. Studio lighting. High resolution photography style suitable for social media carousel.",
  };
}

// ============== VIOLATION CASES ==============

Deno.test("postcheck: detects 'hiệu quả 100%' pattern → blocked", () => {
  const result = postCheckCarouselCompliance(
    [makeSlide(1, "Sản phẩm hiệu quả 100% sau 1 tuần")],
    aestheticRules,
  );
  assert(result.violations.some((v) => v.match === "hiệu quả 100%"));
  assertEquals(result.passed, false);
});

Deno.test("postcheck: detects 'chữa khỏi hoàn toàn' forbidden term → blocked", () => {
  const result = postCheckCarouselCompliance(
    [makeSlide(1, "Liệu trình chữa khỏi hoàn toàn mọi vấn đề da")],
    aestheticRules,
  );
  assert(result.violations.some((v) => v.type === "forbidden_term"));
  assertEquals(result.riskLevel, "blocked");
});

Deno.test("postcheck: detects 'không tác dụng phụ' → error severity", () => {
  const result = postCheckCarouselCompliance(
    [makeSlide(1, "Hoàn toàn không tác dụng phụ")],
    aestheticRules,
  );
  assert(result.violations.some((v) => v.severity === "error"));
});

Deno.test("postcheck: detects 'cam kết kết quả' claim restriction → warning", () => {
  const result = postCheckCarouselCompliance(
    [makeSlide(1, "Chúng tôi cam kết kết quả cho mọi khách hàng")],
    aestheticRules,
  );
  const v = result.violations.find((x) => x.type === "claim_restriction");
  assert(v, "Should detect claim restriction");
  assertEquals(v!.severity, "warning");
});

Deno.test("postcheck: detects 'đẹp như sao Hàn ngay sau 1 buổi'", () => {
  const result = postCheckCarouselCompliance(
    [makeSlide(1, "Đẹp như sao Hàn ngay sau 1 buổi điều trị")],
    aestheticRules,
  );
  assert(result.violations.length > 0);
});

Deno.test("postcheck: detects 'FDA chứng nhận' high-risk keyword", () => {
  const result = postCheckCarouselCompliance(
    [makeSlide(1, "Sản phẩm FDA chứng nhận cho mọi loại da")],
    aestheticRules,
  );
  assert(result.violations.some((v) => v.type === "high_risk_keyword"));
});

Deno.test("postcheck: detects 'giảm 10kg trong 7 ngày'", () => {
  const result = postCheckCarouselCompliance(
    [makeSlide(1, "Giảm 10kg trong 7 ngày, không cần ăn kiêng")],
    aestheticRules,
  );
  assert(result.violations.some((v) => v.match === "giảm 10kg trong 7 ngày"));
});

Deno.test("postcheck: detects 'an toàn tuyệt đối' forbidden term", () => {
  const result = postCheckCarouselCompliance(
    [makeSlide(1, "Liệu pháp an toàn tuyệt đối cho mọi đối tượng")],
    aestheticRules,
  );
  assert(result.violations.some((v) => v.type === "forbidden_term"));
});

Deno.test("postcheck: detects 'bác sĩ #1 Việt Nam' claim restriction", () => {
  const result = postCheckCarouselCompliance(
    [makeSlide(1, "Bác sĩ #1 Việt Nam tư vấn miễn phí")],
    aestheticRules,
  );
  assert(result.violations.some((v) => v.type === "claim_restriction"));
});

Deno.test("postcheck: detects 'trẻ ra 10 tuổi'", () => {
  const result = postCheckCarouselCompliance(
    [makeSlide(1, "Trẻ ra 10 tuổi sau liệu trình 1 tháng")],
    aestheticRules,
  );
  assert(result.violations.length > 0);
});

// ============== CLEAN CASES (false positive guard) ==============

Deno.test("postcheck: clean lifestyle copy → low risk", () => {
  const result = postCheckCarouselCompliance(
    [makeSlide(1, "Chăm sóc da mỗi ngày với routine đơn giản")],
    aestheticRules,
  );
  assertEquals(result.riskLevel, "low");
  assertEquals(result.passed, true);
});

Deno.test("postcheck: educational content → low risk", () => {
  const result = postCheckCarouselCompliance(
    [makeSlide(1, "5 bước skincare buổi tối được chuyên gia khuyên dùng")],
    aestheticRules,
  );
  assertEquals(result.passed, true);
});

Deno.test("postcheck: tip carousel → low risk", () => {
  const result = postCheckCarouselCompliance(
    [
      makeSlide(1, "Mẹo dưỡng ẩm da khô vào mùa đông"),
      makeSlide(2, "Chọn serum theo loại da của bạn"),
    ],
    aestheticRules,
  );
  assertEquals(result.passed, true);
});

Deno.test("postcheck: brand story → low risk", () => {
  const result = postCheckCarouselCompliance(
    [makeSlide(1, "Hành trình 10 năm xây dựng thương hiệu chăm sóc da Việt")],
    aestheticRules,
  );
  assertEquals(result.passed, true);
});

Deno.test("postcheck: product showcase without claims → low risk", () => {
  const result = postCheckCarouselCompliance(
    [makeSlide(1, "Bộ sưu tập serum mới ra mắt tháng 12")],
    aestheticRules,
  );
  assertEquals(result.passed, true);
});

// ============== EDGE CASES ==============

Deno.test("postcheck: scans fullPrompt field (text-in-image)", () => {
  const result = postCheckCarouselCompliance(
    [{
      slideNumber: 1,
      textContent: { headline: "Clean headline" },
      fullPrompt: "A poster reading 'hiệu quả 100%' in bold yellow on dark background",
    }],
    aestheticRules,
  );
  const v = result.violations.find((x) => x.field === "fullPrompt");
  assert(v, "Must scan fullPrompt — text rendered into image");
});

Deno.test("postcheck: no rules → passes (backward compat)", () => {
  const result = postCheckCarouselCompliance(
    [makeSlide(1, "hiệu quả 100% chữa khỏi hoàn toàn")],
    null,
  );
  assertEquals(result.passed, true);
  assertEquals(result.riskLevel, "low");
});

Deno.test("postcheck: empty slides → passes", () => {
  const result = postCheckCarouselCompliance([], aestheticRules);
  assertEquals(result.passed, true);
});

Deno.test("postcheck: multiple violations across slides accumulate score", () => {
  const result = postCheckCarouselCompliance(
    [
      makeSlide(1, "Hiệu quả 100% đảm bảo"),
      makeSlide(2, "Chữa khỏi hoàn toàn"),
      makeSlide(3, "An toàn tuyệt đối"),
    ],
    aestheticRules,
  );
  assertEquals(result.riskLevel, "blocked");
  assert(result.violations.length >= 3);
});
