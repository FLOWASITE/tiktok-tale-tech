

# Cải thiện độ rõ chữ trên ScriptCard

## Vấn đề

Nhiều text trên ScriptCard dùng opacity quá thấp (`/25`, `/40`, `/50`, `/60`), khiến chữ mờ khó đọc, đặc biệt trên mobile.

## Giải pháp: Tăng opacity cho tất cả text elements

### `src/components/ScriptCard.tsx`

| Dòng | Hiện tại | Sửa thành | Element |
|------|----------|-----------|---------|
| 111 | `text-muted-foreground/70` | `text-muted-foreground` | Purpose label |
| 153 | `text-muted-foreground/50` | `text-muted-foreground/70` | Content preview |
| 159 | `text-muted-foreground/60` | `text-muted-foreground/80` | Metadata line |
| 162 | `text-muted-foreground/25` | `text-muted-foreground/50` | Dot separator |
| 172 | `text-muted-foreground/25` | `text-muted-foreground/50` | Dot separator |
| 173 | `text-muted-foreground/50` | `text-muted-foreground/70` | Time text |
| 215 | `text-muted-foreground/40` | `text-muted-foreground/60` | Delete button |

Chỉ thay đổi 1 file, không ảnh hưởng logic.

