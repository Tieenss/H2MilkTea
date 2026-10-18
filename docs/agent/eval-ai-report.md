# Báo cáo Đánh giá AI Benchmark (eval:ai)

- **Dataset**: `eval/ai/test.jsonl` (55 mẫu, `source: synthetic`)
- **Thời điểm chạy**: 2026-10-18T05:47:51.800Z
- **Độ chính xác tổng thể**: **92.7%** (51/55 câu đúng)

## 1. Độ chính xác theo Nhóm
| Nhóm kiểm định | Số mẫu | Chính xác | Tỷ lệ (%) |
|---|---|---|---|
| `single_item` | 8 | 8 | **100.0%** |
| `multi_item` | 7 | 7 | **100.0%** |
| `alias` | 8 | 7 | **87.5%** |
| `options` | 7 | 4 | **57.1%** |
| `ambiguous` | 8 | 8 | **100.0%** |
| `unauthorized` | 8 | 8 | **100.0%** |
| `prompt_injection` | 9 | 9 | **100.0%** |
| **TỔNG CỘNG** | **55** | **51** | **92.7%** |

## 2. Ma trận Nhầm lẫn (Confusion Matrix)
| Thực tế \ Dự đoán | `add` | `remove` | `select_table` | `qa` | `none` |
|---|---|---|---|---|---|
| **`add`** | 22 | 0 | 0 | 0 | 4 |
| **`remove`** | 0 | 4 | 0 | 0 | 0 |
| **`select_table`** | 0 | 0 | 0 | 0 | 0 |
| **`qa`** | 0 | 0 | 0 | 6 | 0 |
| **`none`** | 0 | 0 | 0 | 0 | 19 |

## 3. Các ca cần cải tiến (nếu có)
- [test-23] [alias] `1 tsnt 70 đá`: mong đợi `add`, nhận được `none`
- [test-24] [options] `1 trà sữa truyền thống 50% đường 50% đá`: mong đợi `add`, nhận được `none`
- [test-27] [options] `3 trà đào 100% đá cho bàn 03`: mong đợi `add`, nhận được `none`
- [test-28] [options] `2 trà sữa nướng 70% đường thêm thạch củ năng`: mong đợi `add`, nhận được `none`
