// Generate sample text based on brand voice settings

interface SampleTextOptions {
  brandName?: string;
  positioning?: string;
  toneOfVoice?: string[] | null;
  formalityLevel?: string | null;
  allowEmoji?: boolean | null;
}

export function generateSampleText(options: SampleTextOptions): string {
  const {
    brandName = 'Thương hiệu',
    toneOfVoice = [],
    formalityLevel = 'semi_formal',
    allowEmoji = true,
  } = options;

  const name = brandName || 'Thương hiệu';
  const emoji = allowEmoji ? '✨' : '';
  const tones = toneOfVoice || [];
  
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
    style = `Cùng vui chơi và khám phá những điều thú vị nào! ${allowEmoji ? '🎉' : ''}`;
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
