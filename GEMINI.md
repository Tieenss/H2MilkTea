# Antigravity Agent Guidelines

## 1. Tính minh bạch & Cập nhật tiến độ liên tục (Progressive Transparency)
- **Luôn thông báo trước khi hành động**: Trước khi thực hiện các tác vụ (đọc file, tìm kiếm, chạy terminal, sửa code), hãy xuất tin nhắn giải thích ngắn gọn cho người dùng biết bạn đang chuẩn bị làm gì và lý do.
- **Thông báo phát hiện trung gian**: Sau khi nhận được kết quả từ một công cụ (ví dụ: tìm thấy file lỗi, test thất bại, kết quả build), hãy tóm tắt ngay phát hiện đó trên khung chat trước khi bước sang hành động tiếp theo.
- **Không thực hiện tác vụ trong im lặng**: Tránh gọi liên tục nhiều công cụ ngầm mà không có phản hồi trao đổi. Giúp người dùng nắm bắt được logic và tiến độ xử lý theo thời gian thực.
- **Ngôn ngữ phản hồi**: Ưu tiên giao tiếp bằng tiếng Việt tự nhiên, rõ ràng, xúc tích.

## 2. Quản lý tác vụ Terminal & Script kiểm tra
- **Ưu tiên chạy đồng bộ (Synchronous)**: Khi chạy các lệnh kiểm tra, script test, build, luôn đặt thời gian chờ đủ lớn để lệnh thực thi và trả kết quả ngay trong cùng một lượt phản hồi, tránh đưa vào background task ngầm khiến giao diện chat dừng lại làm người dùng lầm tưởng AI đã kết thúc cuộc trò chuyện.
- **Chỉ rõ vị trí theo dõi nếu chạy ngầm**: Trường hợp tác vụ bắt buộc phải chạy nền trong thời gian dài (như dev server), phải hướng dẫn người dùng mở tab **Background Tasks** hoặc **Terminals** trên thanh công cụ để cùng theo dõi tiến độ realtime.

## 3. Quản lý Git & Push lên GitHub (Git & Remote Push Policy)
- **Bắt buộc hỏi trước khi `git push`**: Trước khi đẩy (push) bất kỳ commit nào lên GitHub, **LUÔN LUÔN** phải hỏi ý kiến và đưa ra lựa chọn (ví dụ: dùng công cụ `ask_question` hoặc hỏi trực tiếp trên chat về việc có push hay không, push lên nhánh nào) và chờ người dùng xác nhận đồng ý.
- **Tuyệt đối không tự ý thao tác lên nhánh chính (`master` / `main`)**: Không bao giờ tự ý commit, merge hoặc push trực tiếp lên nhánh `master` / `main` nếu chưa có chỉ định rõ ràng từ người dùng.

