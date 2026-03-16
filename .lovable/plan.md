

# Tính chi phí AI thực tế -- Phân tích & Kế hoạch sửa

## Phát hiện chính: 3 vấn đề lớn về tính cost

### Vấn đề 1: `generate-multichannel` -- Cost hoàn toàn sai (hardcode)
**Dòng 4886-4898** hardcode token estimates thay vì lấy từ API response:
```text
inputTokensEstimated = 2000 + (channelCount * 500)  // HARDCODE
outputTokensEstimated = channelCount * 800            // HARDCODE
modelsUsed[ch] = 'google/gemini-2.5-flash'            // HARDCODE, không lấy model thực tế
```
-