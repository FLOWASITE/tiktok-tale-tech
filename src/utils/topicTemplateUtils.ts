/**
 * Topic Template Utilities
 * Provides industry-specific topic suggestions for Quick Start templates
 */

// Industry-specific topic suggestions mapped by template ID
const TEMPLATE_TOPIC_SUGGESTIONS: Record<string, Record<string, string[]>> = {
  // EDUCATION templates
  howto_guide: {
    default: [
      'Hướng dẫn cơ bản cho người mới bắt đầu',
      'Quy trình từ A-Z dành cho người mới',
      'Bí quyết thành công cho người mới',
    ],
    'Kế toán': [
      'Kế toán cơ bản cho doanh nghiệp nhỏ: Hướng dẫn từ A-Z',
      'Cách lập báo cáo tài chính cho người mới',
      'Hướng dẫn kê khai thuế GTGT đơn giản',
    ],
    'Tài chính': [
      'Quản lý tài chính cá nhân: Hướng dẫn từ A-Z',
      'Cách đầu tư chứng khoán cho người mới',
      'Hướng dẫn lập kế hoạch tài chính gia đình',
    ],
    'Bất động sản': [
      'Mua nhà lần đầu: Hướng dẫn từ A-Z',
      'Quy trình đầu tư bất động sản cho người mới',
      'Hướng dẫn chọn căn hộ phù hợp túi tiền',
    ],
    'Công nghệ': [
      'Lập trình cơ bản: Hướng dẫn từ A-Z',
      'Cách sử dụng AI trong công việc hàng ngày',
      'Hướng dẫn bảo mật thông tin cá nhân',
    ],
    'Y tế': [
      'Chăm sóc sức khỏe hàng ngày: Hướng dẫn từ A-Z',
      'Cách đọc hiểu kết quả xét nghiệm máu',
      'Hướng dẫn phòng ngừa bệnh thường gặp',
    ],
    'Giáo dục': [
      'Phương pháp học hiệu quả: Hướng dẫn từ A-Z',
      'Cách chuẩn bị hồ sơ du học',
      'Hướng dẫn chọn ngành nghề phù hợp',
    ],
  },
  
  mistakes_avoid: {
    default: [
      '5 sai lầm phổ biến và cách tránh',
      'Những lỗi người mới thường mắc phải',
      'Bẫy thường gặp và cách phòng tránh',
    ],
    'Kế toán': [
      '5 sai lầm kế toán thường gặp và cách tránh',
      'Lỗi kê khai thuế khiến doanh nghiệp bị phạt',
      'Sai sót trong báo cáo tài chính cần tránh',
    ],
    'Tài chính': [
      '5 sai lầm quản lý tiền bạc phổ biến',
      'Những lỗi đầu tư khiến bạn mất tiền',
      'Bẫy tài chính người trẻ thường mắc phải',
    ],
    'Bất động sản': [
      '5 sai lầm mua nhà lần đầu cần tránh',
      'Những lỗi pháp lý khi giao dịch BĐS',
      'Bẫy đầu tư đất nền bạn nên biết',
    ],
  },
  
  faq_explainer: {
    default: [
      'Giải đáp 10 câu hỏi thường gặp nhất',
      'Q&A: Những thắc mắc phổ biến',
      'Hỏi đáp nhanh cho người mới',
    ],
    'Kế toán': [
      'Giải đáp 10 câu hỏi về thuế TNCN thường gặp',
      'Q&A: Thắc mắc về sổ sách kế toán',
      'Hỏi đáp nhanh về quyết toán thuế cuối năm',
    ],
    'Tài chính': [
      'Giải đáp 10 câu hỏi về đầu tư thường gặp',
      'Q&A: Thắc mắc về bảo hiểm nhân thọ',
      'Hỏi đáp nhanh về vay ngân hàng',
    ],
  },
  
  // AWARENESS templates
  brand_story: {
    default: [
      'Câu chuyện đằng sau thương hiệu của chúng tôi',
      'Vì sao chúng tôi ra đời và sứ mệnh đặc biệt',
      'Hành trình xây dựng thương hiệu từ con số 0',
    ],
  },
  
  behind_scenes: {
    default: [
      'Một ngày làm việc tại công ty chúng tôi',
      'Hậu trường quy trình làm việc thực tế',
      'Bí mật đằng sau sản phẩm/dịch vụ của chúng tôi',
    ],
  },
  
  team_intro: {
    default: [
      'Gặp gỡ đội ngũ tạo nên thành công',
      'Những con người đằng sau thương hiệu',
      'Câu chuyện của founder và đội ngũ sáng lập',
    ],
  },
  
  // ENGAGEMENT templates
  poll_question: {
    default: [
      'Bạn thuộc team nào? [Khảo sát]',
      'Bình chọn: Xu hướng nào hot nhất?',
      'Quiz: Bạn biết gì về chủ đề này?',
    ],
  },
  
  trending_react: {
    default: [
      '[Góc nhìn] Xu hướng mới nhất: Chúng tôi nghĩ gì?',
      'Hot topic: Phân tích từ chuyên gia',
      'Trend đang viral: Quan điểm của chúng tôi',
    ],
  },
  
  challenge_ugc: {
    default: [
      'Thử thách 7 ngày cùng cộng đồng',
      'Challenge: Chia sẻ câu chuyện của bạn',
      'Cuộc thi: Cơ hội nhận quà hấp dẫn',
    ],
  },
  
  // EXPERTISE templates
  industry_insight: {
    default: [
      '[Phân tích] Xu hướng ngành 2025: Dự báo từ chuyên gia',
      'Deep-dive: Những thay đổi lớn trong ngành',
      'Báo cáo chuyên sâu: Tương lai của ngành',
    ],
    'Kế toán': [
      '[Phân tích] Thay đổi chính sách thuế 2025',
      'Deep-dive: Xu hướng chuyển đổi số trong kế toán',
      'Báo cáo: Tương lai ngành kế toán Việt Nam',
    ],
  },
  
  case_study: {
    default: [
      '[Case Study] Làm sao khách hàng đạt kết quả vượt trội',
      'Câu chuyện thành công: Từ 0 đến đỉnh cao',
      'Phân tích case thực tế: Bài học rút ra',
    ],
  },
  
  myth_busting: {
    default: [
      'Quan điểm phổ biến - Sự thật hay ngộ nhận?',
      'Đập tan 5 hiểu lầm phổ biến nhất',
      'Góc nhìn khác: Điều bạn chưa biết',
    ],
  },
  
  // CONVERSION templates
  service_intro: {
    default: [
      'Dịch vụ trọn gói: Giải pháp toàn diện cho bạn',
      'Giới thiệu dịch vụ: Lợi ích vượt trội',
      'Tại sao nên chọn dịch vụ của chúng tôi?',
    ],
    'Kế toán': [
      'Dịch vụ kế toán trọn gói cho doanh nghiệp nhỏ',
      'Tư vấn thuế chuyên nghiệp - Tiết kiệm thời gian',
      'Dịch vụ quyết toán thuế cuối năm uy tín',
    ],
    'Tài chính': [
      'Dịch vụ tư vấn đầu tư cá nhân hóa',
      'Giải pháp quản lý tài chính doanh nghiệp',
      'Dịch vụ lập kế hoạch tài chính toàn diện',
    ],
  },
  
  product_launch: {
    default: [
      '[NEW] Giới thiệu sản phẩm mới: Tính năng nổi bật',
      'Ra mắt phiên bản mới: Nâng cấp toàn diện',
      'Sản phẩm độc quyền: Chỉ có tại đây',
    ],
  },
  
  promotion: {
    default: [
      '[Ưu đãi hôm nay] Giảm giá đặc biệt',
      'Flash Sale: Cơ hội không thể bỏ lỡ',
      'Combo tiết kiệm: Mua nhiều lợi nhiều',
    ],
  },
  
  lead_generation: {
    default: [
      '[Miễn phí] Tư vấn 1-1 với chuyên gia',
      'Đăng ký nhận ebook/checklist miễn phí',
      'Dùng thử miễn phí 7 ngày không giới hạn',
    ],
  },
  
  testimonial_request: {
    default: [
      '[Feedback] Khách hàng nói gì về chúng tôi?',
      'Câu chuyện thành công từ khách hàng thực',
      'Review chân thực từ người đã trải nghiệm',
    ],
  },
  
  upsell: {
    default: [
      'Nâng cấp gói dịch vụ: Nhận thêm quyền lợi',
      'Combo đặc biệt: Tiết kiệm hơn khi mua kèm',
      'Ưu đãi độc quyền cho khách hàng thân thiết',
    ],
  },
};

/**
 * Get topic suggestions for a specific template and industry
 */
export function getTopicSuggestionsForTemplate(
  templateId: string,
  brandIndustry?: string
): string[] {
  const templateSuggestions = TEMPLATE_TOPIC_SUGGESTIONS[templateId];
  
  if (!templateSuggestions) {
    return [];
  }
  
  // Try to find industry-specific suggestions
  if (brandIndustry) {
    // Check for exact match or partial match
    const industries = brandIndustry.split(',').map(i => i.trim());
    
    for (const ind of industries) {
      if (templateSuggestions[ind]) {
        return templateSuggestions[ind];
      }
      
      // Partial match
      const matchedKey = Object.keys(templateSuggestions).find(
        key => key !== 'default' && (key.includes(ind) || ind.includes(key))
      );
      
      if (matchedKey) {
        return templateSuggestions[matchedKey];
      }
    }
  }
  
  // Return default suggestions
  return templateSuggestions.default || [];
}

/**
 * Replace placeholders in topic template with actual values
 */
export function fillTopicTemplate(
  template: string,
  replacements: Record<string, string>
): string {
  let result = template;
  
  for (const [key, value] of Object.entries(replacements)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'gi'), value);
  }
  
  return result;
}
