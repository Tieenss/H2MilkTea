# Antigravity Agent Guidelines

## 1. Tính minh bạch & Cập nhật tiến độ liên tục (Progressive Transparency)
- **Luôn thông báo trước khi hành động**: Trước khi thực hiện các tác vụ (đọc file, tìm kiếm, chạy terminal, sửa code), hãy xuất tin nhắn giải thích ngắn gọn cho người dùng biết bạn đang chuẩn bị làm gì và lý do.
- **Thông báo phát hiện trung gian**: Sau khi nhận được kết quả từ một công cụ (ví dụ: tìm thấy file lỗi, test thất bại, kết quả build), hãy tóm tắt ngay phát hiện đó trên khung chat trước khi bước sang hành động tiếp theo.
- **Không thực hiện tác vụ trong im lặng**: Tránh gọi liên tục nhiều công cụ ngầm mà không có phản hồi trao đổi. Giúp người dùng nắm bắt được logic và tiến độ xử lý theo thời gian thực.
- **Ngôn ngữ phản hồi**: Ưu tiên giao tiếp bằng tiếng Việt tự nhiên, rõ ràng, xúc tích.

## 2. Quản lý tác vụ Terminal & Script kiểm tra
- **Ưu tiên chạy đồng bộ (Synchronous)**: Khi chạy các lệnh kiểm tra, script test, build, luôn đặt thời gian chờ đủ lớn để lệnh thực thi và trả kết quả ngay trong cùng một lượt phản hồi, tránh đưa vào background task ngầm khiến giao diện chat dừng lại làm người dùng lầm tưởng AI đã kết thúc cuộc trò chuyện.
- **Chỉ rõ vị trí theo dõi nếu chạy ngầm**: Trường hợp tác vụ bắt buộc phải chạy nền trong thời gian dài (như dev server), phải hướng dẫn người dùng mở tab **Background Tasks** hoặc **Terminals** trên thanh công cụ để cùng theo dõi tiến độ realtime.
