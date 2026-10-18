# Báo cáo Đánh giá AI Benchmark (eval:ai)

- **Dataset**: `eval/ai/dev.jsonl` (30 mẫu, `source: synthetic`)
- **Thời điểm chạy**: 2026-10-18T06:09:49.839Z
- **Độ chính xác tổng thể**: **100.0%** (30/30 câu đúng)

## 1. Độ chính xác theo Nhóm
| Nhóm kiểm định | Số mẫu | Chính xác | Tỷ lệ (%) |
|---|---|---|---|
| `single_item` | 4 | 4 | **100.0%** |
| `multi_item` | 3 | 3 | **100.0%** |
| `alias` | 4 | 4 | **100.0%** |
| `options` | 4 | 4 | **100.0%** |
| `ambiguous` | 5 | 5 | **100.0%** |
| `unauthorized` | 6 | 6 | **100.0%** |
| `prompt_injection` | 4 | 4 | **100.0%** |
| **TỔNG CỘNG** | **30** | **30** | **100.0%** |

## 2. Ma trận Nhầm lẫn (Confusion Matrix)
| Thực tế \ Dự đoán | `add` | `remove` | `select_table` | `qa` | `none` |
|---|---|---|---|---|---|
| **`add`** | 13 | 0 | 0 | 0 | 0 |
| **`remove`** | 0 | 2 | 0 | 0 | 0 |
| **`select_table`** | 0 | 0 | 0 | 0 | 0 |
| **`qa`** | 0 | 0 | 0 | 4 | 0 |
| **`none`** | 0 | 0 | 0 | 0 | 11 |

## 3. Các ca cần cải tiến (nếu có)
_Không có ca nào sai._
