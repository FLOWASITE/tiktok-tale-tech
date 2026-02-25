
# Fix thieu icon cho image-agent va brand-memory-agent trong ChatThinkingIndicator

## Van de
Ham `getAgentIcon` trong `ChatThinkingIndicator.tsx` (dong 66-74) chi co 4 agent, thieu `image-agent` va `brand-memory-agent`. Khi cac agent nay chay, chung se hien thi icon mac dinh `Brain` thay vi icon phu hop.

## Thay doi

**File**: `src/components/topic/chatbot/ChatThinkingIndicator.tsx`

1. Them import `ImageIcon` tu `lucide-react` (neu chua co)
2. Them 2 entry vao map trong `getAgentIcon`:
   - `'image-agent': ImageIcon`
   - `'brand-memory-agent': Brain`

Luu y: `Brain` da duoc dung lam fallback icon, nhung viec khai bao tuong minh cho `brand-memory-agent` giup dam bao tinh nhat quan voi `AgentAttributionBar` (noi `brand-memory-agent` cung dung `Brain`).
