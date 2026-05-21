/**
 * Feature flags — tắt/bật nhanh các tính năng mà không cần xoá code.
 */

// Tạm tắt chấm GEO (geo-score-content) do DashScope arrears + IDLE_TIMEOUT.
// Bật lại bằng cách đặt = true.
export const GEO_SCORING_ENABLED = false;

// Tạm khoá toàn bộ thao tác xoá ảnh/video trên app (Gallery, Carousel, Channel image history).
// Bật lại bằng cách đặt = true. UI sẽ ẩn nút Xóa, hook sẽ no-op + toast.
export const IMAGE_DELETION_ENABLED = false;
