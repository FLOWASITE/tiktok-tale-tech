

## Cấu trúc JSON để update Industry "Dịch vụ AI & Tự động"

Khi chuyên gia nghiên cứu xong, hãy copy kết quả theo đúng 3 phần dưới đây. Tôi sẽ dùng nó để cập nhật vào database.

---

### Phần 1: Global Pack (thông tin chung toàn cầu)

```json
{
  "industry_code": "ai_automation_services",
  "target_audience": "B2B",
  "version": "2.0",

  "global_brand_voice": {
    "tone_of_voice": ["professional", "innovative", "trustworthy"],
    "formality_level": "semi-formal",
    "language_style": ["data-driven", "solution-oriented"],
    "cta_policy": "moderate",
    "allow_emoji": false,
    "emoji_policy": "Chỉ dùng emoji kỹ thuật như ⚡🤖 khi cần"
  },

  "global_terminology": {
    "forbidden_terms_global": ["thay thế con người", "AI thông minh hơn người"],
    "preferred_terms": {
      "vi": ["tự động hóa", "trí tuệ nhân tạo", "giải pháp AI"],
      "en": ["automation", "artificial intelligence", "AI solution"]
    },
    "forbidden_words_by_lang": {
      "vi": ["hack", "siêu trí tuệ"],
      "en": ["superintelligence", "replace humans"]
    }
  },

  "global_compliance_rules": [
    {
      "rule": "Phải ghi rõ AI chỉ hỗ trợ, không thay thế quyết định con người",
      "category": "ethics",
      "severity": "high",
      "source": "EU AI Act"
    }
  ],

  "global_claim_restrictions": [
    {
      "claim": "AI chính xác 100%",
      "alternative": "AI đạt độ chính xác cao trong điều kiện thử nghiệm",
      "reason": "Không model nào đạt 100%",
      "severity": "critical"
    }
  ],

  "global_argument_patterns": {
    "valid_patterns": [
      "Tiết kiệm X% thời gian xử lý",
      "Giảm X% sai sót thủ công"
    ],
    "forbidden_patterns": [
      "AI sẽ thay thế nhân viên",
      "Không cần con người nữa"
    ]
  },

  "global_system_rules": [
    "Luôn nhấn mạnh AI là công cụ hỗ trợ con người",
    "Tránh hứa hẹn kết quả tuyệt đối"
  ],

  "risk_guidelines": {
    "high_risk_keywords": ["thay thế", "tự động hoàn toàn", "không cần giám sát"],
    "scoring_weights": {
      "forbidden_term_match": 30,
      "claim_restriction_match": 25,
      "forbidden_pattern_match": 20,
      "high_risk_keyword_match": 15
    },
    "risk_thresholds": {
      "low": 20,
      "medium": 40,
      "high": 60,
      "blocked": 80
    }
  },

  "related_industries": ["saas", "digital_marketing", "data_analytics"]
}
```

### Phần 2: Jurisdiction Profile VN (quy tắc riêng cho Việt Nam)

```json
{
  "jurisdiction_code": "VN",
  "validity_status": "current",
  "disclaimer": "Nội dung tuân thủ quy định pháp luật Việt Nam về AI và dữ liệu cá nhân",

  "resolved_rules": {
    "industry_code": "ai_automation_services",
    "jurisdiction_code": "VN",
    "names": {
      "vi": "Dịch vụ AI & Tự động",
      "en": "AI & Automation Services"
    },
    "target_audience": "B2B",

    "brand_voice": {
      "tone_of_voice": ["professional", "innovative"],
      "formality_level": "semi-formal",
      "language_style": ["data-driven", "solution-oriented"],
      "cta_policy": "moderate",
      "allow_emoji": false,
      "emoji_policy": ""
    },

    "terminology": {
      "forbidden_terms": ["thay thế con người", "siêu trí tuệ"],
      "preferred_terms": ["tự động hóa", "trí tuệ nhân tạo", "giải pháp AI"],
      "forbidden_words_local": ["hack", "deepfake"]
    },

    "compliance_rules": [
      {
        "rule": "Tuân thủ Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân",
        "category": "data_privacy",
        "severity": "critical",
        "effective_date": "2023-07-01",
        "source": "Nghị định 13/2023/NĐ-CP"
      }
    ],

    "claim_restrictions": [
      {
        "claim": "AI chính xác 100%",
        "alternative": "AI đạt độ chính xác cao theo benchmark",
        "reason": "Không thể cam kết tuyệt đối",
        "severity": "critical"
      }
    ],

    "argument_patterns": {
      "valid_patterns": ["Tiết kiệm X% thời gian", "Tăng hiệu suất X%"],
      "forbidden_patterns": ["Thay thế hoàn toàn con người"]
    },

    "system_rules": [
      "Nhấn mạnh AI hỗ trợ, không thay thế con người",
      "Ghi rõ nguồn dữ liệu khi đưa số liệu"
    ],

    "key_regulations": [
      {
        "name": "Nghị định 13/2023/NĐ-CP về Bảo vệ dữ liệu cá nhân",
        "effective_date": "2023-07-01",
        "summary": "Quy định về xử lý, bảo vệ dữ liệu cá nhân",
        "source_url": "https://thuvienphapluat.vn/...",
        "validity_status": "current",
        "last_verified_date": "2026-04-01"
      }
    ],

    "industry_trends": [
      "Generative AI cho doanh nghiệp SME",
      "RPA kết hợp AI trong quy trình nội bộ"
    ],

    "risk_guidelines": {
      "high_risk_keywords": ["thay thế", "tự động hoàn toàn"],
      "scoring_weights": {
        "forbidden_term_match": 30,
        "claim_restriction_match": 25,
        "forbidden_pattern_match": 20,
        "high_risk_keyword_match": 15
      },
      "risk_thresholds": { "low": 20, "medium": 40, "high": 60, "blocked": 80 }
    },

    "related_industries": ["saas", "digital_marketing"],
    "disclaimer": "Nội dung tuân thủ pháp luật Việt Nam về AI và dữ liệu cá nhân"
  }
}
```

### Phần 3: Translations (tên hiển thị đa ngôn ngữ)

```json
{
  "translations": [
    {
      "language_code": "vi",
      "name": "Dịch vụ AI & Tự động",
      "short_name": "AI & Tự động",
      "preferred_terms": ["tự động hóa", "trí tuệ nhân tạo", "giải pháp AI", "chatbot"],
      "forbidden_terms": ["hack", "deepfake", "siêu trí tuệ"]
    },
    {
      "language_code": "en",
      "name": "AI & Automation Services",
      "short_name": "AI & Automation",
      "preferred_terms": ["automation", "artificial intelligence", "AI solution"],
      "forbidden_terms": ["superintelligence", "replace humans"]
    }
  ]
}
```

---

### Hướng dẫn cho Chuyên gia

- **Phần 1** chứa thông tin **toàn cầu** — áp dụng cho mọi quốc gia
- **Phần 2** chứa quy tắc **riêng Việt Nam** — luật pháp, xu hướng, thuật ngữ địa phương
- **Phần 3** chứa **tên hiển thị** theo ngôn ngữ

Chuyên gia chỉ cần **điền nội dung vào các mảng** (compliance_rules, claim_restrictions, forbidden_terms, v.v.) — giữ nguyên cấu trúc key. Tôi sẽ nhận JSON và cập nhật trực tiếp vào database.

