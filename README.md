# Hệ thống Quản lý Tiến độ Project Môn KTPMUD — ke_hoach_hoc_tap_173820_n19

> Nền tảng web hỗ trợ toàn diện quy trình thực hiện đồ án môn học Kỹ thuật phần mềm ứng dụng: quản lý đa lớp, phân công công việc qua bảng Kanban, nộp báo cáo tuần đính kèm minh chứng và đo lường tỷ lệ đóng góp của từng sinh viên.

- **Mã lớp:** 173820
- **Mã nhóm:** 173820_n19
- **Case Study:** ke_hoach_hoc_tap (CS-8)
- **Hệ thống Demo trực tuyến:** [https://ktpm-gwde.onrender.com](https://ktpm-gwde.onrender.com)
- **Mã nguồn GitHub:** [https://github.com/levanquan-070106/KTPM](https://github.com/levanquan-070106/KTPM)

---

## 1. Giới thiệu sản phẩm
- **Bài toán / người dùng đích:**
  - Giải quyết bài toán theo dõi tiến độ đồ án nhóm dài tuần trong môi trường đại học. Giúp giảm thiểu tình trạng phân công không rõ ràng, công việc chồng chéo và đánh giá đóng góp không đồng đều giữa các thành viên.
  - Người dùng đích gồm hai nhóm chính:
    1. **Giảng viên phụ trách:** Quản lý danh sách lớp học, phân nhóm đề tài, theo dõi tiến độ tổng thể của lớp, chấm điểm báo cáo tuần và nghiệm thu sản phẩm cuối kỳ.
    2. **Sinh viên / Nhóm trưởng:** Nhận đề tài, lập kế hoạch nhiệm vụ, cập nhật trạng thái công việc qua bảng Kanban, nộp báo cáo tuần kèm file tài liệu và theo dõi điểm số thành phần.
- **Tính năng chính của MVP (3–5):**
  1. **Xác thực và phân quyền:** Đăng nhập hệ thống phân tách 3 vai trò Giảng viên (GV), Nhóm trưởng (NT) và Sinh viên (SV); hỗ trợ đăng nhập Google và cơ chế duyệt vào lớp an toàn.
  2. **Quản lý đa lớp học & nhóm dự án:** Giảng viên linh hoạt chuyển đổi giữa các lớp học (K68A, KTPM sáng t4...), tạo nhóm, gán đề tài và phân công nhóm trưởng.
  3. **Bảng công việc Kanban trực quan:** Kéo thả và cập nhật trạng thái công việc (Todo, In Progress, Review, Done), gán người phụ trách, thiết lập hạn hoàn thành và tự động đo lường tỷ lệ % đóng góp.
  4. **Nộp và tổng hợp báo cáo tiến độ 16 tuần:** Nhóm nộp file báo cáo (.docx, .pdf, .pptx) theo từng tuần; giảng viên chấm điểm trực tiếp và phản hồi.
  5. **Bảng điểm và xuất báo cáo Excel:** Tổng hợp điểm quá trình (30%), điểm giữa kỳ (20%), điểm cuối kỳ (50%) và xuất file Excel (.xlsx) chuẩn định dạng.
- **Demo:** [https://ktpm-gwde.onrender.com](https://ktpm-gwde.onrender.com) · **Ảnh chụp:** Ảnh chụp màn hình và tài liệu được lưu trong thư mục `report/`.

---

## 2. Phạm vi MVP
| Trạng thái | Nội dung |
|---|---|
| ✅ Đã làm | Đăng nhập hệ thống & phân quyền đa vai trò (Giảng viên, Nhóm trưởng, Sinh viên) |
| ✅ Đã làm | Cơ chế duyệt tài khoản Google và phân vào lớp học / nhóm dự án tương ứng |
| ✅ Đã làm | Quản lý danh mục lớp học, nhóm đồ án, đề tài và phân công thành viên |
| ✅ Đã làm | Bảng Kanban quản lý công việc theo 4 trạng thái kèm đo lường tỷ lệ đóng góp |
| ✅ Đã làm | Nộp báo cáo tuần 1–16 kèm đính kèm tệp minh chứng (.docx, .pdf, .pptx) |
| ✅ Đã làm | Chấm điểm thành phần (ĐQT, ĐGK, ĐCK) và xuất file Excel (.xlsx) qua SheetJS |
| ✅ Đã làm | Triển khai phiên bản trực tuyến hoạt động liên tục trên nền tảng Render |
| 🚧 Đang làm | Bộ lọc thống kê nâng cao và cảnh báo tự động công việc sắp đến hạn qua email |
| 🚧 Đang làm | Bổ sung bộ kiểm thử tự động (Unit Test / Integration Test) cho các API trọng yếu |
| ⬜ Chưa làm | Tích hợp xác thực Single Sign-On (SSO) trực tiếp qua cổng thông tin trường |
| 🚫 Ngoài phạm vi | Hệ thống gọi video hoặc chat trực tuyến thời gian thực giữa các thành viên |

---

## 3. Kiến trúc & công nghệ
- **Mô hình kiến trúc:** Client - Server (RESTful API), kiến trúc dạng mô-đun phân tách rõ ràng giữa tầng giao diện (Frontend) và tầng xử lý nghiệp vụ/dữ liệu (Backend).
  - **Client (Frontend):** Ứng dụng web đa trang (MPA) tối ưu tốc độ tải trang, sử dụng HTML5, Modern CSS và Vanilla JavaScript (ES6+), tích hợp các thư viện UI (SheetJS, SortableJS).
  - **Server (Backend):** Xây dựng trên nền tảng Node.js với Express.js làm RESTful API engine, xử lý routing, authentication, upload file (Multer).
  - **Database:** SQLite3 / PostgreSQL lưu trữ cấu trúc bảng người dùng, lớp học, nhóm, nhiệm vụ Kanban, báo cáo tuần và điểm số.
- **Ngôn ngữ/framework + phiên bản:**
  - Node.js: >= 18.x
  - Express.js: 4.19+
  - SQLite3: 5.1+ / Database Engine
  - Multer: 1.4+ (quản lý tệp tải lên)
- **Cấu trúc thư mục chính:**
  - `server.js`: Khởi tạo máy chủ HTTP, thiết lập định tuyến REST API, middleware phân quyền và upload file.
  - `db.js`: Khởi tạo cấu trúc schema cơ sở dữ liệu SQLite và tập hợp các hàm xử lý dữ liệu.
  - `data.js`: Quản lý danh mục dữ liệu mẫu (synthetic), cấu hình mặc định và seed data.
  - `*.html`: Các trang giao diện chức năng (dashboard, kanban, reports, groups, users, gradebook...).
  - `uploads/`: Thư mục lưu trữ tệp đính kèm báo cáo tuần do sinh viên nộp.

---

## 4. Cài đặt & cách sử dụng
**Yêu cầu môi trường:** Node.js >= 18.x, npm >= 9.x.

```bash
# 1. Cài đặt các gói phụ thuộc
npm install

# 2. Khởi chạy máy chủ cục bộ
npm start
# Ứng dụng chạy tại địa chỉ: http://localhost:3000

# 3. Chạy kiểm tra hệ thống
node -e "require('./db'); console.log('Database connected successfully');"
```

**Dữ liệu/tài khoản mẫu (synthetic):**
- Tài khoản Giảng viên: `gv1@edu.vn` (Mật khẩu: `123456`)
- Tài khoản Nhóm trưởng: `nt1@edu.vn` (Mật khẩu: `123456`)
- Tài khoản Sinh viên: `sv1@edu.vn` (Mật khẩu: `123456`)

**Kịch bản sử dụng (≥ 3):**
1. **Quản lý công việc Kanban:** Nhóm trưởng đăng nhập hệ thống → truy cập mục "Kanban Board" → chọn nút "Thêm công việc" → nhập tên nhiệm vụ, gán người thực hiện (MSSV) và đặt hạn nộp → kéo thả thẻ giữa các cột Todo, Doing, Review, Done để cập nhật tiến độ.
2. **Nộp báo cáo tuần kèm tệp:** Thành viên/Nhóm trưởng vào mục "Báo cáo tuần" → chọn tuần tương ứng (ví dụ Tuần 12) → nhập tóm tắt công việc đã hoàn thành trong tuần → bấm tải lên tệp tài liệu báo cáo (.docx/.pdf) → nhấn "Nộp báo cáo" để ghi nhận vào hệ thống.
3. **Giảng viên theo dõi và xuất bảng điểm:** Giảng viên đăng nhập → chuyển đổi sang lớp cần xem (ví dụ KTPM sáng t4) → kiểm tra bảng danh sách nhóm và tỷ lệ nộp bài → vào mục "Bảng điểm" xem tổng quan kết quả học tập → nhấn "Xuất Excel" để tải file .xlsx về máy tính.

---

## 5. Hướng phát triển Tuần 11–15
| Tuần | Mục tiêu | Đầu việc chính | Phụ trách (MSSV) | Tiêu chí hoàn thành | Trạng thái |
|:---:|---|---|---|---|:---:|
| 11 (từ 18/11) | Chốt MVP & CI | Chuẩn hóa tài liệu README đủ 6 mục, cấu hình submission.json và CI nộp bài | 202414324, 202414288 | PR #1 hợp lệ, CI validate báo [PASSED] | ✅ |
| 12 | Kiểm thử & tích hợp | Xây dựng bộ kiểm thử API cho nộp báo cáo và Kanban; chuẩn bị Test Report v1 | 202414324 | Hoàn thành Test Report v1 trong thư mục report/ | 🚧 |
| 13 | Bảo mật, hiệu năng & AI | Rà soát bảo mật (XSS, SQL Injection, Auth), phân tích tính năng với AI | 202414288 | Hoàn thiện báo cáo bảo mật và đánh giá AI trong report/ | ⬜ |
| 14 | Review chéo & code freeze | Đóng băng mã nguồn (code freeze), hoàn thiện video demo 3–5 phút, review chéo nhóm bạn | 202414324, 202414288 | Link video demo hoạt động, hoàn thành review chéo 1 nhóm | ⬜ |
| 15 | Nghiệm thu & bảo vệ | Tổng hợp slide báo cáo, chuẩn bị bài thuyết trình và hoàn tất nghiệm thu sản phẩm | 202414324, 202414288 | Bộ slide hoàn chỉnh, bảo vệ đồ án thành công | ⬜ |

---

## 6. Nhóm & tuân thủ
- **Mã nhóm:** 173820_n19
- **Thành viên:**
  - `202414324` – Nhóm trưởng (Phụ trách kiến trúc hệ thống, Backend API, CSDL SQLite).
  - `202414288` – Thành viên (Phụ trách giao diện Frontend, Bảng Kanban, Quản lý báo cáo tuần).
- **Zero PII/PHI:** Toàn bộ dữ liệu thành viên, người dùng thử nghiệm và nội dung báo cáo là dữ liệu mô phỏng (synthetic), tuân thủ tuyệt đối quy định bảo mật quyền riêng tư cá nhân.
- **Công cụ AI đã dùng & phạm vi:** Sử dụng AI hỗ trợ gợi ý cấu trúc code JavaScript, tối ưu hóa các câu lệnh truy vấn SQLite và hỗ trợ định dạng chuẩn tài liệu Markdown.
- **Dữ liệu lớn (>10MB):** Không có tệp dữ liệu lớn vượt quá 10MB lưu trực tiếp trong repository.

## Cấu trúc thư mục bài nộp
- `report/` — SRS, C4 Model, Test Report, báo cáo cuối kỳ
- `src/` — mã nguồn hệ thống
- `slides/` — slide thuyết trình
