# 📐 Hệ Thống Quản Lý Tiến Độ Project – Môn Kỹ Thuật Phần Mềm Ứng Dụng (KTPMUD)

> **Trường Điện - Điện tử · Đại học Bách khoa Hà Nội**  
> **Đề tài:** Hệ thống quản lý tiến độ thực hiện project môn KTPMUD  
> **GVHD:** TS. Hoàng Quang Huy  
> **Sinh viên:** Lê Văn Quân (202414324) – Đỗ Xuân Nguyện (202414288)

---

## 🎨 Điểm nổi bật theo yêu cầu thiết kế mới

1. **Tông màu chủ đạo:** Trắng & Đen tối giản, thanh lịch, chuẩn giao diện học thuật/công nghệ.
2. **Nộp báo cáo tuần:** Hỗ trợ kéo thả và đính kèm file tài liệu `.docx`, `.doc`, `.pptx`, `.ppt`, `.pdf`.
3. **Xuất file điểm định dạng Excel:** Sử dụng thư viện **SheetJS (xlsx)** xuất trực tiếp file Excel `.xlsx` chuẩn (Bảng điểm nhóm, Bảng điểm sinh viên, Chi tiết 16 tuần, Báo cáo đóng góp).
4. **Quản lý đa lớp học:** Giảng viên có thể tạo và quản lý nhiều lớp học khác nhau (`K68A`, `K68B`,...), chuyển đổi lớp linh hoạt ngay trên thanh điều hướng đầu trang (Topbar).
5. **Bảng công việc Kanban trực quan:** Phân công nhiệm vụ (Todo, Doing, Review, Done), đo lường tự động % đóng góp của từng cá nhân và cảnh báo công việc trễ hạn (theo đúng đặc tả trong `baocao.md`).

---

## 🚀 Hướng dẫn khởi chạy

### Cách 1: Chạy bằng Node.js Server (Khuyên dùng - Đã cấu hình sẵn)
Máy tính của bạn đã được cài đặt sẵn Node.js và các gói phụ thuộc (`express`, `multer`).
Chỉ cần mở Terminal / PowerShell tại thư mục `E:\KTPMUD` và gõ:
```bash
npm start
# hoặc:
node server.js
```
Sau đó mở trình duyệt và truy cập: **[http://localhost:3000](http://localhost:3000)**  
> 🌟 *Ưu điểm khi chạy qua Node.js:* Có thể tải lên và lưu trữ file thật (`.docx`, `.pptx`, `.pdf`) vào thư mục `uploads/`, đồng thời cho phép tải file về trực tiếp.

### Cách 2: Mở trực tiếp bằng trình duyệt (Không cần server)
Mở trực tiếp file [`index.html`](file:///e:/KTPMUD/index.html) bằng trình duyệt (Chrome, Edge, Firefox). Dữ liệu được lưu trữ tự động trong `localStorage`.

---

## 🔐 Tài khoản Demo dùng thử

Hệ thống có sẵn các nút đăng nhập 1-click ngay tại trang đăng nhập:

| Vai trò | Họ và tên | Email | Mật khẩu | Chú thích |
|---|---|---|---|---|
| **👨‍🏫 Giảng viên** | TS. Hoàng Quang Huy | `gv1@edu.vn` | `123456` | Quản lý 2 lớp: K68A, K68B; chấm điểm, xuất Excel |
| **👑 Nhóm trưởng** | Lê Văn Quân | `nt1@edu.vn` | `123456` | Nhóm 19 (Lớp K68A): giao việc Kanban, nộp báo cáo, nộp sản phẩm CK |
| **🎓 Sinh viên** | Đỗ Xuân Nguyện | `sv1@edu.vn` | `123456` | Nhóm 19 (Lớp K68A): cập nhật tiến độ việc, xem điểm và báo cáo |

---

## 📁 Cấu trúc các trang hệ thống

| Trang | Tên file | Đối tượng & Chức năng |
|---|---|---|
| **Đăng nhập** | [`login.html`](file:///e:/KTPMUD/login.html) | Đăng nhập tài khoản, có 3 nút demo 1-click |
| **Tổng quan** | [`dashboard.html`](file:///e:/KTPMUD/dashboard.html) | Dashboard riêng biệt cho GV, NT và SV |
| **Lớp học** | [`classes.html`](file:///e:/KTPMUD/classes.html) | **Giảng viên:** Tạo nhiều lớp học, quản lý học kỳ, số tuần |
| **Nhóm dự án** | [`groups.html`](file:///e:/KTPMUD/groups.html) | **Giảng viên:** Quản lý nhóm theo từng lớp học, gán nhóm trưởng |
| **Sinh viên** | [`students.html`](file:///e:/KTPMUD/students.html) | **Giảng viên:** Xem đóng góp từng cá nhân, xuất danh sách ra Excel |
| **Báo cáo tuần** | [`reports.html`](file:///e:/KTPMUD/reports.html) | **Tất cả:** Nộp file `.docx`/`.pptx`, GV xem và chấm điểm 16 tuần |
| **Kanban Board** | [`kanban.html`](file:///e:/KTPMUD/kanban.html) | **NT & SV:** Bảng kéo thả Todo/Doing/Review/Done, cảnh báo trễ hạn |
| **Nhập điểm** | [`grading.html`](file:///e:/KTPMUD/grading.html) | **Giảng viên:** Nhập ĐQT (30%), ĐGK (20%), ĐCK (50%), xuất file `.xlsx` |
| **Bảng điểm** | [`gradebook.html`](file:///e:/KTPMUD/gradebook.html) | **Giảng viên:** Phân bố xếp loại (A+, A, B+, B,...), xuất Excel đầy đủ |
| **Nhóm của tôi** | [`mygroup.html`](file:///e:/KTPMUD/mygroup.html) | **NT & SV:** Thông tin đề tài, thành viên, tiến độ 16 tuần |
| **Thành viên** | [`members.html`](file:///e:/KTPMUD/members.html) | **Nhóm trưởng:** Thêm/xóa thành viên, chuyển quyền nhóm trưởng |
| **Sản phẩm CK** | [`product.html`](file:///e:/KTPMUD/product.html) | **NT & GV:** Nộp link GitHub, Demo, Video; GV chấm điểm cuối kỳ |
| **Điểm cá nhân** | [`grades.html`](file:///e:/KTPMUD/grades.html) | **Sinh viên:** Tra cứu điểm thành phần, biểu đồ điểm tuần, xuất Excel |
| **Quản lý tài khoản**| [`users.html`](file:///e:/KTPMUD/users.html) | **Giảng viên:** Quản trị danh sách tài khoản người dùng (CRUD) |
