// Generate sample text based on brand voice settings

interface SampleTextOptions {
  brandName?: string;
  positioning?: string;
  toneOfVoice?: string[] | null;
  formalityLevel?: string | null;
  allowEmoji?: boolean | null;
  channel?: ChannelType;
}

export type ChannelType = 'facebook' | 'linkedin' | 'instagram' | 'tiktok' | 'email' | 'twitter' | 'pinterest' | 'general';

const CHANNEL_CONFIGS: Record<ChannelType, {
  emoji: boolean;
  hashtags: boolean;
  lengthHint: 'short' | 'medium' | 'long';
  style: 'casual' | 'professional' | 'trendy';
  cta: boolean;
}> = {
  facebook: { emoji: true, hashtags: false, lengthHint: 'medium', style: 'casual', cta: true },
  linkedin: { emoji: false, hashtags: true, lengthHint: 'long', style: 'professional', cta: true },
  instagram: { emoji: true, hashtags: true, lengthHint: 'short', style: 'trendy', cta: false },
  pinterest: { emoji: false, hashtags: true, lengthHint: 'short', style: 'professional', cta: true },
  tiktok: { emoji: true, hashtags: true, lengthHint: 'short', style: 'trendy', cta: false },
  twitter: { emoji: true, hashtags: true, lengthHint: 'short', style: 'casual', cta: false },
  email: { emoji: false, hashtags: false, lengthHint: 'long', style: 'professional', cta: true },
  general: { emoji: true, hashtags: false, lengthHint: 'medium', style: 'casual', cta: false },
};

export function generateSampleText(options: SampleTextOptions): string {
  const {
    brandName = 'Thương hiệu',
    positioning,
    toneOfVoice = [],
    formalityLevel = 'semi_formal',
    allowEmoji = true,
    channel = 'general',
  } = options;

  const name = brandName || 'Thương hiệu';
  const config = CHANNEL_CONFIGS[channel];
  const useEmoji = allowEmoji && config.emoji;
  const tones = toneOfVoice || [];
  
  // Channel-specific content generation
  if (channel === 'linkedin') {
    return generateLinkedInSample(name, tones, positioning, formalityLevel);
  }
  
  if (channel === 'instagram') {
    return generateInstagramSample(name, tones, positioning, useEmoji);
  }
  
  if (channel === 'tiktok') {
    return generateTikTokSample(name, tones, positioning, useEmoji);
  }
  
  if (channel === 'twitter') {
    return generateTwitterSample(name, tones, positioning, useEmoji);
  }
  
  if (channel === 'email') {
    return generateEmailSample(name, tones, positioning, formalityLevel);
  }
  
  if (channel === 'facebook') {
    return generateFacebookSample(name, tones, positioning, formalityLevel, useEmoji);
  }
  
  // General/default sample
  return generateGeneralSample(name, tones, formalityLevel, useEmoji);
}

function generateLinkedInSample(name: string, tones: string[], positioning: string | undefined, formalityLevel: string | null): string {
  const greeting = 'Xin chào các bạn,';
  let content = '';
  
  if (tones.includes('professional')) {
    content = `Trong hành trình phát triển doanh nghiệp, việc tìm kiếm giải pháp tối ưu luôn là ưu tiên hàng đầu.

Tại ${name}, chúng tôi tin rằng sự chuyên nghiệp và cam kết là nền tảng của mọi thành công.`;
  } else if (tones.includes('educational')) {
    content = `Bạn có biết rằng 80% doanh nghiệp thành công đều có chiến lược rõ ràng?

${name} chia sẻ với bạn những insights giá trị để phát triển bền vững.`;
  } else if (tones.includes('authoritative')) {
    content = `Với nhiều năm kinh nghiệm trong ngành, ${name} tự hào là đối tác tin cậy của hàng ngàn khách hàng.

Chúng tôi mang đến giải pháp đã được kiểm chứng và tối ưu hóa.`;
  } else {
    content = `${name} luôn đồng hành cùng bạn trên con đường phát triển sự nghiệp.

Hãy kết nối để khám phá những cơ hội mới!`;
  }
  
  const cta = '\n\n👉 Liên hệ với chúng tôi để tìm hiểu thêm.\n\n#Business #Growth #' + name.replace(/\s+/g, '');
  
  return `${greeting}\n\n${content}${cta}`;
}

function generateInstagramSample(name: string, tones: string[], positioning: string | undefined, useEmoji: boolean): string {
  const emoji = useEmoji ? '✨' : '';
  const fire = useEmoji ? '🔥' : '';
  const point = useEmoji ? '👉' : '→';
  
  let content = '';
  
  if (tones.includes('playful')) {
    content = `${fire} Bí mật đã được tiết lộ!\n\nĐiều gì khiến ${name} trở nên đặc biệt? Scroll để khám phá ${emoji}`;
  } else if (tones.includes('inspirational')) {
    content = `${emoji} Mỗi ngày là một cơ hội mới!\n\n${name} cùng bạn biến ước mơ thành hiện thực ${fire}`;
  } else if (tones.includes('friendly')) {
    content = `Hey! ${emoji}\n\n${name} muốn gửi đến bạn một thông điệp đặc biệt ${fire}\n\nSave lại để xem sau nhé!`;
  } else {
    content = `${fire} New drop alert!\n\n${name} vừa update điều thú vị ${emoji}\n\n${point} Link in bio`;
  }
  
  const hashtags = `\n\n#${name.replace(/\s+/g, '')} #trending #viral #fyp`;
  
  return content + hashtags;
}

function generateTikTokSample(name: string, tones: string[], positioning: string | undefined, useEmoji: boolean): string {
  const fire = useEmoji ? '🔥' : '';
  const eyes = useEmoji ? '👀' : '';
  const point = useEmoji ? '👉' : '→';
  
  let hook = '';
  let content = '';
  
  if (tones.includes('playful')) {
    hook = `POV: Bạn vừa khám phá ${name} ${eyes}`;
    content = `\n\nWait for it... ${fire}\n\nFollow để không bỏ lỡ content mới!`;
  } else if (tones.includes('educational')) {
    hook = `3 điều bạn CHƯA BIẾT về ${name} ${eyes}`;
    content = `\n\nNumber 3 will blow your mind ${fire}\n\nSave lại và share cho bạn bè!`;
  } else {
    hook = `${fire} Stop scrolling! ${name} có gì hot?`;
    content = `\n\nXem đến cuối để biết ${eyes}\n\nFollow ${point} @${name.toLowerCase().replace(/\s+/g, '')}`;
  }
  
  const hashtags = `\n\n#${name.replace(/\s+/g, '')} #foryou #viral #trending #tiktokvietnam`;
  
  return hook + content + hashtags;
}

function generateTwitterSample(name: string, tones: string[], positioning: string | undefined, useEmoji: boolean): string {
  const fire = useEmoji ? '🔥' : '';
  const thread = useEmoji ? '🧵' : '';
  
  let content = '';
  
  if (tones.includes('professional')) {
    content = `${thread} Thread: Những điều ${name} học được trong năm qua\n\n1/ Khách hàng luôn là ưu tiên số 1\n2/ Đổi mới liên tục để phát triển\n3/ Xây dựng team là chìa khóa thành công\n\nRT để chia sẻ!`;
  } else if (tones.includes('playful')) {
    content = `${name} entering the chat ${fire}\n\nAre you ready? 👀`;
  } else {
    content = `Big announcement coming from ${name} ${fire}\n\nStay tuned...`;
  }
  
  return content;
}

function generateEmailSample(name: string, tones: string[], positioning: string | undefined, formalityLevel: string | null): string {
  let subject = '';
  let greeting = '';
  let content = '';
  let closing = '';
  
  const isFormal = formalityLevel === 'formal' || formalityLevel === 'very_formal';
  
  if (isFormal) {
    subject = `[${name}] Thông tin quan trọng dành cho Quý khách`;
    greeting = 'Kính gửi Quý khách hàng,';
    closing = `Trân trọng,\n${name} Team`;
  } else {
    subject = `${name} gửi bạn điều đặc biệt ✨`;
    greeting = 'Xin chào bạn,';
    closing = `Thân ái,\n${name} Team`;
  }
  
  if (tones.includes('professional')) {
    content = `Chúng tôi xin thông báo về những cập nhật mới nhất từ ${name}.\n\nVới cam kết mang đến giá trị tốt nhất, chúng tôi đã cải tiến dịch vụ để phục vụ bạn tốt hơn.`;
  } else if (tones.includes('friendly')) {
    content = `Chúng tôi rất vui khi được đồng hành cùng bạn!\n\n${name} có tin vui muốn chia sẻ - hãy đọc tiếp để khám phá nhé.`;
  } else {
    content = `${name} gửi đến bạn những thông tin hữu ích.\n\nĐừng bỏ lỡ cơ hội đặc biệt dành riêng cho bạn.`;
  }
  
  const cta = '\n\n👉 Click vào đây để tìm hiểu thêm';
  
  return `📧 Subject: ${subject}\n\n${greeting}\n\n${content}${cta}\n\n${closing}`;
}

function generateFacebookSample(name: string, tones: string[], positioning: string | undefined, formalityLevel: string | null, useEmoji: boolean): string {
  const emoji = useEmoji ? '✨' : '';
  const fire = useEmoji ? '🔥' : '';
  const point = useEmoji ? '👉' : '→';
  
  let greeting = '';
  let content = '';
  let cta = '';
  
  // Greeting based on formality
  switch (formalityLevel) {
    case 'formal':
    case 'very_formal':
      greeting = 'Kính chào Quý khách,';
      break;
    case 'casual':
    case 'very_casual':
      greeting = `Hey các bạn ơi! ${emoji}`;
      break;
    default:
      greeting = `Xin chào các bạn! ${emoji}`;
  }
  
  // Content based on tone
  if (tones.includes('professional')) {
    content = `${name} xin gửi đến bạn những thông tin hữu ích nhất.\n\nChúng tôi cam kết mang đến giải pháp tối ưu cho doanh nghiệp của bạn.`;
    cta = `\n\n${point} Liên hệ ngay để được tư vấn miễn phí!`;
  } else if (tones.includes('friendly')) {
    content = `${name} rất vui được đồng hành cùng bạn! ${fire}\n\nHãy cùng khám phá những điều thú vị nhé.`;
    cta = `\n\n${point} Comment để nhận thêm thông tin!`;
  } else if (tones.includes('inspirational')) {
    content = `Mỗi ngày là một cơ hội mới! ${emoji}\n\n${name} tin rằng bạn có thể làm được mọi thứ bạn mong muốn.`;
    cta = `\n\n${point} Share để lan tỏa năng lượng tích cực!`;
  } else if (tones.includes('playful')) {
    content = `${fire} Tin HOT từ ${name}!\n\nBạn đã sẵn sàng chưa? Scroll xuống để xem nhé ${emoji}`;
    cta = `\n\n${point} Like nếu bạn thấy hay!`;
  } else {
    content = `${name} gửi đến bạn thông điệp đặc biệt! ${emoji}\n\nĐừng bỏ lỡ những cập nhật mới nhất từ chúng tôi.`;
    cta = `\n\n${point} Theo dõi page để nhận thông báo!`;
  }
  
  return `${greeting}\n\n${content}${cta}`;
}

function generateGeneralSample(name: string, tones: string[], formalityLevel: string | null, useEmoji: boolean): string {
  const emoji = useEmoji ? '✨' : '';
  
  let greeting = '';
  let style = '';
  let closing = '';
  
  // Determine greeting based on formality
  switch (formalityLevel) {
    case 'formal':
      greeting = `Kính chào Quý khách,`;
      closing = `Trân trọng,\n${name}`;
      break;
    case 'semi_formal':
      greeting = `Xin chào bạn,`;
      closing = `Thân ái,\n${name}`;
      break;
    case 'casual':
      greeting = `Hey bạn ơi! ${emoji}`;
      closing = `Cheers,\n${name} ${emoji}`;
      break;
    case 'friendly':
      greeting = `Chào bạn! ${emoji}`;
      closing = `Hẹn gặp lại bạn nhé!\n${name} ${emoji}`;
      break;
    default:
      greeting = `Xin chào,`;
      closing = `${name}`;
  }
  
  // Determine content style based on tone
  if (tones.includes('professional')) {
    style = 'Chúng tôi cam kết mang đến giải pháp tối ưu nhất cho doanh nghiệp của bạn.';
  } else if (tones.includes('friendly')) {
    style = 'Mình rất vui được đồng hành cùng bạn trong hành trình này!';
  } else if (tones.includes('inspirational')) {
    style = 'Hãy cùng biến ước mơ thành hiện thực - mọi thứ đều có thể!';
  } else if (tones.includes('educational')) {
    style = 'Hãy khám phá những kiến thức hữu ích giúp bạn phát triển mỗi ngày.';
  } else if (tones.includes('playful')) {
    style = `Cùng vui chơi và khám phá những điều thú vị nào! ${useEmoji ? '🎉' : ''}`;
  } else if (tones.includes('empathetic')) {
    style = 'Chúng tôi hiểu và luôn sẵn sàng lắng nghe câu chuyện của bạn.';
  } else if (tones.includes('authoritative')) {
    style = 'Với kinh nghiệm và chuyên môn, chúng tôi tự tin đem lại giá trị thực sự.';
  } else if (tones.includes('conversational')) {
    style = 'Bạn biết không, đôi khi những điều đơn giản lại mang lại hiệu quả nhất!';
  } else {
    style = 'Chúng tôi luôn sẵn sàng hỗ trợ bạn.';
  }
  
  return `${greeting}\n\n${style}\n\n${closing}`;
}

// Generate samples for all channels at once
export function generateAllChannelSamples(options: Omit<SampleTextOptions, 'channel'>): Record<ChannelType, string> {
  const channels: ChannelType[] = ['facebook', 'linkedin', 'instagram', 'tiktok', 'email', 'twitter'];
  const samples: Record<ChannelType, string> = {} as Record<ChannelType, string>;
  
  for (const channel of channels) {
    samples[channel] = generateSampleText({ ...options, channel });
  }
  
  samples.general = generateSampleText({ ...options, channel: 'general' });
  
  return samples;
}
