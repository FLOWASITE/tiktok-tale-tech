
-- Update Industry Pack "Kế toán – Thuế – Việt Nam" to version 2.0
UPDATE public.industry_templates
SET
  version = '2.0',
  updated_at = now(),
  
  -- Updated Brand Voice
  brand_voice = '{
    "tone_of_voice": ["expert", "calm", "neutral", "cautious", "empathetic"],
    "formality_level": "professional",
    "language_style": ["clear", "structured", "no_exaggeration", "no_emotion", "educational"],
    "allow_emoji": false,
    "cta_policy": "soft"
  }'::jsonb,
  
  -- Expanded Compliance Rules (25 rules)
  compliance_rules = '[
    {"rule": "Khi nhắc đến quy định thuế, phải dùng ngôn ngữ điều kiện (ví dụ: theo quy định hiện hành, tùy trường hợp cụ thể)", "severity": "high", "category": "language"},
    {"rule": "Mọi giải pháp thuế phải gắn với điều kiện áp dụng cụ thể", "severity": "high", "category": "language"},
    {"rule": "Không được đơn giản hóa quá mức các vấn đề pháp lý phức tạp", "severity": "medium", "category": "accuracy"},
    {"rule": "Không được sử dụng ngôn ngữ cảm xúc để mô tả rủi ro pháp lý", "severity": "high", "category": "tone"},
    {"rule": "Khi trích dẫn quy định, phải ưu tiên diễn giải thay vì khẳng định tuyệt đối", "severity": "medium", "category": "language"},
    {"rule": "Không sử dụng ngôn ngữ gây hiểu lầm rằng kế toán có thể thay thế quyết định của cơ quan thuế", "severity": "high", "category": "ethics"},
    {"rule": "Khi đề cập Luật GTGT mới (48/2024/QH15), phải ghi rõ có hiệu lực từ 01/07/2025", "severity": "high", "category": "vat"},
    {"rule": "Không được khẳng định chắc chắn thuế suất áp dụng mà không xem xét loại hàng hóa/dịch vụ cụ thể", "severity": "medium", "category": "vat"},
    {"rule": "Phải phân biệt rõ đối tượng không chịu thuế và đối tượng chịu thuế 0%", "severity": "medium", "category": "vat"},
    {"rule": "Khi đề cập thuế suất TNDN mới (15%, 17%), phải ghi rõ điều kiện về doanh thu áp dụng", "severity": "high", "category": "cit"},
    {"rule": "Phải đề cập đến thuế tối thiểu toàn cầu 15% khi tư vấn cho doanh nghiệp đa quốc gia", "severity": "high", "category": "cit"},
    {"rule": "Không được cam kết tối ưu thuế vượt quá phạm vi pháp luật cho phép", "severity": "critical", "category": "cit"},
    {"rule": "Phải cập nhật mức giảm trừ gia cảnh theo Nghị quyết 110/2025 từ năm 2026", "severity": "high", "category": "pit"},
    {"rule": "Khi đề cập người phụ thuộc, phải ghi rõ điều kiện đăng ký và thời điểm áp dụng", "severity": "medium", "category": "pit"},
    {"rule": "Khi đề cập hóa đơn điện tử, phải căn cứ theo Nghị định 70/2025/NĐ-CP (thay thế NĐ 123/2020)", "severity": "high", "category": "invoice"},
    {"rule": "Phải ghi rõ thời điểm xuất hóa đơn theo quy định mới", "severity": "medium", "category": "invoice"},
    {"rule": "Không được hướng dẫn các hành vi có thể bị coi là gian lận hóa đơn", "severity": "critical", "category": "invoice"},
    {"rule": "Khi đề cập mức phạt, phải căn cứ theo Nghị định 125/2020 và 310/2025", "severity": "high", "category": "penalty"},
    {"rule": "Không được đưa ra lời khuyên nhằm trốn tránh xử phạt vi phạm", "severity": "critical", "category": "penalty"},
    {"rule": "Tuân thủ Thông tư 70/2015/TT-BTC về Chuẩn mực đạo đức nghề nghiệp kế toán, kiểm toán", "severity": "high", "category": "ethics"},
    {"rule": "Không được quảng cáo dịch vụ theo cách gây hiểu lầm về năng lực hoặc phạm vi hành nghề", "severity": "high", "category": "ethics"},
    {"rule": "Không được tiết lộ thông tin khách hàng trong case study mà không có sự đồng ý", "severity": "critical", "category": "ethics"},
    {"rule": "Mọi tư vấn phải kèm disclaimer về việc cần tham khảo chuyên gia cho trường hợp cụ thể", "severity": "medium", "category": "disclaimer"},
    {"rule": "Phải ghi rõ thời điểm cập nhật thông tin khi đề cập đến quy định pháp luật", "severity": "medium", "category": "disclaimer"},
    {"rule": "Không được cam kết về kết quả thanh tra, kiểm tra thuế của cơ quan có thẩm quyền", "severity": "critical", "category": "disclaimer"}
  ]'::jsonb,
  
  -- Expanded Claim Restrictions (20 restrictions)
  claim_restrictions = '[
    {"claim": "Cam kết hoàn thuế 100%", "alternative": "Hỗ trợ tối đa trong phạm vi pháp luật để tối ưu hoàn thuế"},
    {"claim": "Đảm bảo không bị phạt thuế", "alternative": "Hỗ trợ tuân thủ đúng quy định để giảm thiểu rủi ro vi phạm"},
    {"claim": "Cam kết kết quả thanh tra thuế có lợi", "alternative": "Hỗ trợ chuẩn bị hồ sơ đầy đủ và giải trình minh bạch khi được thanh tra"},
    {"claim": "100% an toàn thuế", "alternative": "Tối ưu tuân thủ theo quy định hiện hành"},
    {"claim": "Không lo bị truy thu", "alternative": "Hỗ trợ kê khai đúng quy định để giảm thiểu rủi ro truy thu"},
    {"claim": "Công ty kế toán số 1 Việt Nam", "alternative": "Đơn vị có nhiều năm kinh nghiệm trong lĩnh vực kế toán thuế"},
    {"claim": "Giải quyết mọi vấn đề thuế", "alternative": "Hỗ trợ đa dạng các nghiệp vụ kế toán thuế phổ biến"},
    {"claim": "Kế toán trưởng giỏi nhất", "alternative": "Đội ngũ kế toán viên có chứng chỉ hành nghề"},
    {"claim": "Tư vấn chắc chắn đúng", "alternative": "Tư vấn dựa trên quy định hiện hành, khuyến nghị xác nhận với cơ quan thuế"},
    {"claim": "Giá rẻ nhất thị trường", "alternative": "Mức phí cạnh tranh, phù hợp với quy mô doanh nghiệp"},
    {"claim": "Miễn phí trọn đời", "alternative": "Gói dịch vụ với chi phí hợp lý, có hỗ trợ dài hạn"},
    {"claim": "Hoàn thành trong 1 ngày", "alternative": "Thời gian xử lý tùy thuộc độ phức tạp hồ sơ"},
    {"claim": "Xử lý nhanh nhất", "alternative": "Quy trình làm việc chuyên nghiệp, đảm bảo tiến độ cam kết"},
    {"claim": "Hợp thức hóa chi phí", "alternative": "Hỗ trợ sắp xếp chứng từ đúng quy định pháp luật"},
    {"claim": "Làm sổ sách theo yêu cầu", "alternative": "Lập sổ sách kế toán đúng chuẩn mực và quy định hiện hành"},
    {"claim": "Xử lý thuế không cần hóa đơn", "alternative": "Hướng dẫn quy trình lập hóa đơn đúng quy định"},
    {"claim": "Tối ưu thuế bằng mọi cách", "alternative": "Tối ưu thuế trong khuôn khổ pháp luật cho phép"},
    {"claim": "Tốt hơn mọi đơn vị khác", "alternative": "Dịch vụ chuyên nghiệp với quy trình chuẩn"},
    {"claim": "Không ai làm được như chúng tôi", "alternative": "Giải pháp phù hợp với đặc thù từng doanh nghiệp"},
    {"claim": "Duy nhất tại Việt Nam", "alternative": "Giải pháp được phát triển riêng cho thị trường Việt Nam"}
  ]'::jsonb,
  
  -- Expanded Forbidden Terms (35 terms)
  forbidden_terms = ARRAY[
    'lách thuế', 'né thuế', 'trốn thuế', 'hợp thức hóa chi phí', 'bao đậu thuế',
    'xử lý thuế', 'làm sổ sách theo yêu cầu', 'không cần sổ sách', 'không cần chứng từ',
    'không cần hóa đơn', 'hóa đơn khống', 'mua hóa đơn', 'bán hóa đơn',
    'cam kết hoàn thuế', 'đảm bảo không bị phạt', 'an toàn tuyệt đối', '100% thành công',
    'chắc chắn được hoàn', 'đảm bảo qua thanh tra', 'cam kết kết quả',
    'số 1', 'tốt nhất', 'rẻ nhất', 'nhanh nhất', 'duy nhất', 'tuyệt đối',
    'hoàn hảo', 'không đối thủ', 'siêu', 'cực kỳ', 'hot', 'sốc',
    'miễn thuế', 'không phải nộp thuế', 'được miễn hoàn toàn', 'thoát thuế',
    'qua mặt cơ quan thuế'
  ],
  
  -- Expanded System Rules (15 rules)
  system_rules = '[
    "Industry Memory này OVERRIDE mọi Brand Voice nếu có xung đột",
    "Forbidden Terms KHÔNG được merge, KHÔNG được rewrite dưới mọi hình thức",
    "Claim Restrictions phải được enforce TRƯỚC khi generate content",
    "Nếu user yêu cầu vi phạm → từ chối mềm + giải thích lý do pháp lý",
    "Mọi nội dung tạo ra phải lưu industry_template_version để truy vết",
    "Luôn sử dụng ngôn ngữ điều kiện: theo quy định, trong trường hợp, tùy thuộc",
    "Khi trích dẫn số văn bản pháp luật, phải ghi đầy đủ số hiệu và ngày hiệu lực",
    "Phải thêm disclaimer cuối mỗi bài viết tư vấn thuế: Thông tin mang tính tham khảo",
    "Không đưa ra con số thuế phải nộp cụ thể khi chưa có đủ dữ liệu",
    "Ưu tiên storytelling về case study thành công (đã được đồng ý) thay vì claim trực tiếp",
    "Giữ giọng điệu chuyên gia, bình tĩnh, không gây hoang mang",
    "Khi đề cập rủi ro pháp lý, đưa ra giải pháp phòng ngừa thay vì chỉ cảnh báo",
    "Không sử dụng emoji trong nội dung chuyên môn về thuế",
    "Với nội dung cập nhật luật mới, phải so sánh với quy định cũ",
    "Luôn khuyến khích tham vấn chuyên gia cho các trường hợp phức tạp"
  ]'::jsonb,
  
  -- New Metadata
  metadata = '{
    "applies_to": [
      "Dịch vụ kế toán",
      "Dịch vụ thuế",
      "Tư vấn tài chính doanh nghiệp",
      "Kiểm toán",
      "Dịch vụ khai thuế điện tử",
      "Phần mềm kế toán",
      "Đào tạo kế toán thuế"
    ],
    "legal_basis": [
      "Luật Kế toán 88/2015/QH13 (sửa đổi)",
      "Luật Kiểm toán độc lập 67/2011/QH12",
      "Luật Quản lý thuế 38/2019/QH14",
      "Luật Thuế GTGT 48/2024/QH15 (hiệu lực 01/07/2025)",
      "Luật Thuế TNDN 67/2025/QH15 (hiệu lực 01/10/2025)",
      "Luật Thuế TNCN 04/2007/QH12 (sửa đổi)",
      "Nghị định 70/2025/NĐ-CP về hóa đơn điện tử",
      "Nghị định 125/2020/NĐ-CP + 310/2025/NĐ-CP về xử phạt",
      "Thông tư 70/2015/TT-BTC về Chuẩn mực đạo đức nghề nghiệp",
      "Nghị định 236/2025/NĐ-CP về thuế tối thiểu toàn cầu",
      "Luật Quảng cáo 2012 (sửa đổi 2024)"
    ],
    "risk_note": "Ngành có rủi ro pháp lý cao, cần tuân thủ nghiêm ngặt các quy định về đạo đức nghề nghiệp và không được đưa ra cam kết về kết quả phụ thuộc cơ quan nhà nước"
  }'::jsonb,
  
  -- New Argument Patterns
  argument_patterns = '{
    "valid_patterns": [
      "Theo quy định tại [số văn bản] có hiệu lực từ [ngày], [nội dung]",
      "Trong trường hợp [điều kiện], doanh nghiệp cần [hành động]",
      "Với doanh thu [mức], thuế suất áp dụng có thể là [%] theo Luật [tên luật]",
      "Để tuân thủ [quy định], cần thực hiện [các bước]",
      "Hạn nộp [loại báo cáo] là ngày [ngày], theo quy định hiện hành",
      "Đã hỗ trợ [số lượng] doanh nghiệp trong lĩnh vực [ngành]",
      "Đội ngũ kế toán viên có [số năm] năm kinh nghiệm, có chứng chỉ hành nghề",
      "Quy trình làm việc theo chuẩn [tên chuẩn mực], được kiểm soát chất lượng"
    ],
    "forbidden_patterns": [
      "Cam kết [kết quả cụ thể] khi thanh tra thuế",
      "Đảm bảo hoàn [số tiền/tỷ lệ] thuế",
      "Không bao giờ bị phạt nếu sử dụng dịch vụ của chúng tôi",
      "Hợp thức hóa [loại chi phí] cho doanh nghiệp",
      "Xử lý [vấn đề thuế] mà không cần [chứng từ/hóa đơn]",
      "Làm sổ sách theo yêu cầu của khách hàng",
      "Tối ưu thuế bằng mọi cách/mọi giá",
      "Giá rẻ nhất/tốt nhất/số 1 thị trường"
    ]
  }'::jsonb,
  
  -- New Seasonal Events (15 events)
  seasonal_events = '[
    {"name": "Hạn nộp thuế Môn bài", "date_range": "01-30", "description": "Hạn nộp thuế môn bài năm mới (30/01)", "content_angles": ["Nhắc nhở nộp thuế môn bài", "Mức thuế môn bài mới", "Hướng dẫn kê khai"]},
    {"name": "Quyết toán thuế TNCN", "date_range": "03-01 - 03-31", "description": "Hạn quyết toán thuế TNCN năm trước (31/03)", "content_angles": ["Hướng dẫn quyết toán", "Các khoản giảm trừ", "Hồ sơ hoàn thuế"]},
    {"name": "Nộp BCTC năm", "date_range": "03-01 - 03-31", "description": "Hạn nộp BCTC và quyết toán thuế TNDN (31/03)", "content_angles": ["Checklist BCTC", "Sai sót thường gặp", "Công cụ hỗ trợ"]},
    {"name": "Thuế TNDN Quý 1", "date_range": "04-01 - 04-30", "description": "Hạn nộp tờ khai TNDN tạm tính Quý 1 (30/04)", "content_angles": ["Cách tính tạm nộp", "Chứng từ cần chuẩn bị"]},
    {"name": "Luật GTGT mới hiệu lực", "date_range": "07-01", "description": "Luật Thuế GTGT 48/2024/QH15 có hiệu lực từ 01/07/2025", "content_angles": ["Điểm mới của luật", "Tác động đến DN", "Hướng dẫn áp dụng"]},
    {"name": "Thuế TNDN Quý 2", "date_range": "07-01 - 07-30", "description": "Hạn nộp tờ khai TNDN tạm tính Quý 2 (30/07)", "content_angles": ["Cập nhật thuế suất mới", "Lưu ý kê khai"]},
    {"name": "Ngày Kế toán Việt Nam", "date_range": "09-10", "description": "Ngày Kế toán Việt Nam (10/09)", "content_angles": ["Tri ân nghề kế toán", "Xu hướng nghề nghiệp", "Công nghệ mới"]},
    {"name": "Luật TNDN mới hiệu lực", "date_range": "10-01", "description": "Luật Thuế TNDN 67/2025/QH15 có hiệu lực từ 01/10/2025", "content_angles": ["Thuế suất mới 15%-17%", "Thuế tối thiểu toàn cầu", "Hướng dẫn chuyển đổi"]},
    {"name": "Thuế TNDN Quý 3", "date_range": "10-01 - 10-30", "description": "Hạn nộp tờ khai TNDN tạm tính Quý 3 (30/10)", "content_angles": ["Áp dụng luật mới", "Chuẩn bị cuối năm"]},
    {"name": "Kiểm kê cuối năm", "date_range": "12-01 - 12-31", "description": "Mùa kiểm kê tài sản, hàng tồn kho cuối năm", "content_angles": ["Quy trình kiểm kê", "Xử lý chênh lệch", "Lưu ý thuế"]},
    {"name": "Đóng sổ kế toán", "date_range": "12-15 - 12-31", "description": "Chuẩn bị đóng sổ kế toán năm", "content_angles": ["Checklist cuối năm", "Điều chỉnh bút toán", "Chuẩn bị quyết toán"]},
    {"name": "Thuế TNDN Quý 4", "date_range": "01-01 - 01-30", "description": "Hạn nộp tờ khai TNDN tạm tính Quý 4 (30/01 năm sau)", "content_angles": ["Tổng kết năm tài chính", "Chuẩn bị quyết toán"]},
    {"name": "Mùa kiểm toán", "date_range": "01-01 - 03-31", "description": "Mùa cao điểm kiểm toán BCTC", "content_angles": ["Chuẩn bị kiểm toán", "Tài liệu cần thiết", "Xử lý phát hiện kiểm toán"]},
    {"name": "Gia hạn nộp thuế", "date_range": "Variable", "description": "Các đợt gia hạn thuế theo Nghị định Chính phủ", "content_angles": ["Đối tượng được gia hạn", "Thủ tục đăng ký", "Lịch nộp mới"]},
    {"name": "Cập nhật phần mềm HĐĐT", "date_range": "Variable", "description": "Các đợt cập nhật quy định hóa đơn điện tử", "content_angles": ["Điểm mới cần lưu ý", "Nâng cấp phần mềm", "Tránh lỗi thường gặp"]}
  ]'::jsonb,
  
  -- New Channel Settings
  channel_settings = '{
    "facebook": {"risk_level": "medium", "notes": "Phù hợp chia sẻ kiến thức, cập nhật luật mới. Tránh cam kết kết quả, không đưa số liệu thuế cụ thể"},
    "instagram": {"risk_level": "low", "notes": "Phù hợp infographic tóm tắt quy định, tips nhanh. Không emoji quá mức, giữ tone chuyên nghiệp"},
    "youtube": {"risk_level": "low", "notes": "Ideal cho video giải thích luật mới, hướng dẫn kê khai. Phải có disclaimer ở mô tả"},
    "tiktok": {"risk_level": "medium", "notes": "Nội dung ngắn gọn về tips thuế, nhưng phải thêm disclaimer. Tránh đơn giản hóa quá mức"},
    "zalo_oa": {"risk_level": "low", "notes": "Phù hợp nhắc lịch nộp thuế, gửi thông tin cập nhật cho khách hàng"},
    "website": {"risk_level": "high", "notes": "Cần đầy đủ disclaimer, thông tin về chứng chỉ hành nghề, điều kiện áp dụng"},
    "email": {"risk_level": "low", "notes": "Newsletter cập nhật luật mới, nhắc deadline. Phải có footer disclaimer"},
    "linkedin": {"risk_level": "low", "notes": "Phù hợp chia sẻ chuyên môn, networking B2B, tuyển dụng kế toán"}
  }'::jsonb

WHERE id = '5905bf3f-8bef-4c13-aa71-6118d3c09eb7';

-- Update Translation for Vietnamese
UPDATE public.industry_template_translations
SET
  name = 'Kế toán – Thuế – Việt Nam',
  short_name = 'Kế toán Thuế VN',
  brand_positioning = 'Đối tác kế toán thuế đáng tin cậy, giúp doanh nghiệp tuân thủ pháp luật, tối ưu chi phí thuế trong khuôn khổ cho phép, cập nhật liên tục các quy định mới nhất từ Luật GTGT 2024, Luật TNDN 2025 và các văn bản hướng dẫn',
  preferred_words = ARRAY[
    'theo quy định hiện hành', 'trong một số trường hợp', 'cần xem xét hồ sơ cụ thể',
    'phụ thuộc vào tình hình thực tế', 'theo hướng dẫn của cơ quan thuế', 'khuyến nghị', 'lưu ý',
    'tuân thủ', 'minh bạch', 'chính xác', 'đúng quy định', 'kịp thời', 'chuyên nghiệp',
    'hỗ trợ', 'tư vấn', 'đồng hành', 'tối ưu trong khuôn khổ pháp luật',
    'cập nhật liên tục', 'theo Luật mới', 'có hiệu lực từ', 'căn cứ theo',
    'trong phạm vi quy định', 'giảm thiểu rủi ro', 'quy trình chuẩn'
  ],
  forbidden_words = ARRAY[
    'lách thuế', 'né thuế', 'trốn thuế', 'hợp thức hóa chi phí', 'bao đậu thuế',
    'cam kết hoàn thuế', 'đảm bảo không bị phạt', 'không cần sổ sách', 'không cần chứng từ',
    'xử lý thuế', 'không cần hóa đơn', 'làm sổ sách theo yêu cầu',
    'số 1', 'tốt nhất', 'rẻ nhất', 'tuyệt đối', 'hoàn hảo'
  ],
  updated_at = now()
WHERE industry_template_id = '5905bf3f-8bef-4c13-aa71-6118d3c09eb7' AND language_code = 'vi';
