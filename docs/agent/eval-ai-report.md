# Báo cáo Đánh giá AI Benchmark (eval:ai)

- **Dataset**: `eval/ai/test.jsonl` (55 mẫu, `source: synthetic`)
- **Thời điểm chạy**: 2026-10-19T01:25:35.603Z
- **Độ chính xác tổng thể**: **100.0%** (55/55 câu đúng)

## 1. Độ chính xác theo Nhóm
| Nhóm kiểm định | Số mẫu | Chính xác | Tỷ lệ (%) |
|---|---|---|---|
| `single_item` | 8 | 8 | **100.0%** |
| `multi_item` | 7 | 7 | **100.0%** |
| `alias` | 8 | 8 | **100.0%** |
| `options` | 7 | 7 | **100.0%** |
| `ambiguous` | 8 | 8 | **100.0%** |
| `unauthorized` | 8 | 8 | **100.0%** |
| `prompt_injection` | 9 | 9 | **100.0%** |
| **TỔNG CỘNG** | **55** | **55** | **100.0%** |

## 2. Ma trận Nhầm lẫn (Confusion Matrix)
| Thực tế \ Dự đoán | `add` | `remove` | `select_table` | `qa` | `none` |
|---|---|---|---|---|---|
| **`add`** | 26 | 0 | 0 | 0 | 0 |
| **`remove`** | 0 | 4 | 0 | 0 | 0 |
| **`select_table`** | 0 | 0 | 0 | 0 | 0 |
| **`qa`** | 0 | 0 | 0 | 6 | 0 |
| **`none`** | 0 | 0 | 0 | 0 | 19 |

## 3. Các ca cần cải tiến (nếu có)
_Không có ca nào sai._
