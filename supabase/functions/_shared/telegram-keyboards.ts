// Inline keyboard builders for Telegram campaign wizard.
// Callback data convention: cw:<step>:<value>
// - cw = campaign wizard
// - step = duration | channels | freq | approval | confirm | cancel | edit
// - value = step-specific payload

export const ALL_CHANNELS: { id: string; label: string }[] = [
  { id: "facebook", label: "Facebook" },
  { id: "instagram", label: "Instagram" },
  { id: "website", label: "Website" },
  { id: "tiktok", label: "TikTok" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "threads", label: "Threads" },
  { id: "x", label: "X" },
  { id: "zalo", label: "Zalo" },
];

export function buildDurationKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: "7 ngày", callback_data: "cw:duration:7" },
        { text: "14 ngày", callback_data: "cw:duration:14" },
        { text: "30 ngày", callback_data: "cw:duration:30" },
      ],
      [{ text: "❌ Hủy", callback_data: "cw:cancel:1" }],
    ],
  };
}

export function buildChannelsKeyboard(selected: string[], available?: string[]) {
  const list = (available && available.length > 0)
    ? ALL_CHANNELS.filter(c => available.includes(c.id))
    : ALL_CHANNELS;
  const rows: { text: string; callback_data: string }[][] = [];
  for (let i = 0; i < list.length; i += 2) {
    rows.push(list.slice(i, i + 2).map(c => ({
      text: `${selected.includes(c.id) ? "✅ " : ""}${c.label}`,
      callback_data: `cw:channels:${c.id}`,
    })));
  }
  rows.push([
    { text: "✅ Xong", callback_data: "cw:channels:__done" },
    { text: "❌ Hủy", callback_data: "cw:cancel:1" },
  ]);
  return { inline_keyboard: rows };
}

export function buildFrequencyKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: "2 bài/tuần", callback_data: "cw:freq:weekly:2" },
        { text: "3 bài/tuần", callback_data: "cw:freq:weekly:3" },
      ],
      [
        { text: "5 bài/tuần", callback_data: "cw:freq:weekly:5" },
        { text: "Hàng ngày", callback_data: "cw:freq:daily:7" },
      ],
      [{ text: "❌ Hủy", callback_data: "cw:cancel:1" }],
    ],
  };
}

export function buildApprovalKeyboard() {
  return {
    inline_keyboard: [
      [{ text: "📋 Duyệt kế hoạch", callback_data: "cw:approval:approve_plan" }],
      [{ text: "📝 Duyệt từng bài", callback_data: "cw:approval:approve_each" }],
      [{ text: "🤖 Tự động hoàn toàn", callback_data: "cw:approval:full_auto" }],
      [{ text: "❌ Hủy", callback_data: "cw:cancel:1" }],
    ],
  };
}

export function buildConfirmKeyboard() {
  return {
    inline_keyboard: [
      [{ text: "🚀 Tạo campaign", callback_data: "cw:confirm:go" }],
      [
        { text: "✏️ Sửa lại", callback_data: "cw:confirm:edit" },
        { text: "❌ Hủy", callback_data: "cw:cancel:1" },
      ],
    ],
  };
}

// Footer for /generate quick-mode result message — lets user jump into guided edit.
export function buildQuickEditKeyboard(goalId: string) {
  return {
    inline_keyboard: [
      [{ text: "✏️ Sửa kênh / thời lượng", callback_data: `cw:edit:${goalId}` }],
      [{ text: "🗑️ Hủy goal này", callback_data: `cw:cancel:${goalId}` }],
    ],
  };
}
