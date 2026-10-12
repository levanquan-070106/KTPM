ĐẠI HỌC BÁCH KHOA HÀ NỘI
TRƯỜNG ĐIỆN-ĐIỆN TỬ

BÁO CÁO MÔN HỌC
ĐỀ TÀI: HỆ THỐNG QUẢN LÝ TIẾN ĐỘ THỰC HIỆN
PROJECT MÔN KỸ THUẬT PHẦN MỀM ỨNG DỤN

Giảng viên hướng dẫn: TS. Hoàng Quang Huy

Nhóm thực hiện: nhóm 19

Sinh viên thực hiện: Lê Văn Quân - 202414324
                                   Đỗ Xuân Nguyện - 202414288

          Hà Nội, 9/2026

Lời nói đầu

Làm việc nhóm trong các dự án học tập luôn là một trong những kỹ năng quan
trọng và cũng đầy thách thức nhất đối với sinh viên, đặc biệt với những môn học
đòi hỏi triển khai dự án kéo dài suốt nhiều tuần như Kỹ thuật phần mềm ứng
dụng. Thực tế cho thấy, phần lớn các nhóm sinh viên hiện nay vẫn quản lý tiến
độ dự án theo cách thủ công, tự phát, thiếu một công cụ chuyên biệt để theo dõi
công việc. Việc phân công nhiệm vụ thường chỉ dừng lại ở lời nói hoặc vài dòng
tin nhắn, dẫn đến tình trạng chồng chéo công việc, đóng góp không đồng đều giữa
các thành viên, hoặc tệ hơn là cả nhóm chỉ phát hiện ra một phần việc bị bỏ sót
khi deadline đã cận kề.

Đặc biệt, đối với giảng viên hướng dẫn, việc đánh giá công bằng mức độ đóng
góp của từng cá nhân trong nhóm cũng gặp nhiều trở ngại khi chỉ có thể quan sát
qua kết quả cuối cùng, mà không nắm được quá trình triển khai thực tế diễn ra
như thế nào, ai là người thực sự đứng sau từng phần việc.

Sự thiếu vắng một nền tảng quản lý tiến độ trực quan, minh bạch và tập trung
chính là khoảng trống lớn giữa nhu cầu tổ chức công việc hiệu quả và cách làm
việc nhóm truyền thống hiện nay. Trong bối cảnh công nghệ phần mềm ngày càng
được ứng dụng rộng rãi để giải quyết các bài toán quản lý thực tiễn, việc xây dựng
một công cụ hỗ trợ đúng nhu cầu này không chỉ mang tính học thuật mà còn có
giá trị sử dụng lâu dài.

Xuất phát từ nhu cầu thực tiễn đó, nhóm em đã quyết định chọn đề tài: "Hệ thống
quản lý tiến độ thực hiện project môn Kỹ thuật phần mềm ứng dụng".

Mục tiêu cốt lõi của đề tài là vận dụng quy trình kỹ thuật phần mềm để phân tích
nhu cầu người dùng, thiết kế kiến trúc hệ thống và xây dựng một nền tảng Web
hỗ trợ quản lý nhiệm vụ theo mô hình trực quan. Hệ thống tập trung vào các tính
năng cốt lõi như: phân công công việc theo vai trò, theo dõi trạng thái từng đầu
việc, tự động đo lường phần trăm tiến độ và tổng hợp toàn bộ dữ liệu dự án về
một nền tảng duy nhất.

Thông qua đề tài này, chúng em mong muốn có thể góp phần giúp việc quản lý
tiến độ dự án nhóm của sinh viên trở nên minh bạch, chủ động và hiệu quả hơn.

Em xin chân thành cảm ơn!

Yêu cầu của người dùng

Hệ thống được xây dựng nhằm phục vụ ba nhóm đối tượng chính, tương ứng với
ba vai trò khác nhau trong quá trình thực hiện project môn học.

Đối với sinh viên, nhu cầu chính là nhận việc được phân công, cập nhật trạng thái
công việc, đính kèm tài liệu hoặc kết quả thực hiện và theo dõi tiến độ cá nhân
trong suốt quá trình làm việc.

Đối với nhóm trưởng, với vai trò quản lý đề tài, nhu cầu tập trung vào việc khởi
tạo dự án, phân chia nhiệm vụ cho từng thành viên, thiết lập deadline cụ thể và
giám sát tiến độ chung để kịp thời đốc thúc khi cần thiết.

Đối với giảng viên, với vai trò người đánh giá, nhu cầu chính là quản lý danh sách
các nhóm, xem tổng quan tiến độ triển khai và trích xuất báo cáo mức độ đóng
góp của từng thành viên để làm căn cứ chấm điểm.

Nhìn chung, cả ba nhóm đối tượng đều hướng đến một điểm chung là tính minh
bạch và khả năng theo dõi liên tục trong suốt quá trình thực hiện dự án, thay vì
chỉ đánh giá dựa trên kết quả cuối cùng.

Giải quyết vấn đề

Xuất phát từ những hạn chế đã trình bày ở phần đặt vấn đề, nhóm đề xuất xây
dựng một hệ thống quản lý tiến độ dự án dưới dạng nền tảng Web, cho phép quản
lý nhiệm vụ trực quan bằng mô hình Kanban và tự động tính toán phần trăm tiến
độ của từng thành viên dựa trên số lượng công việc đã hoàn thành.

Đối với giảng viên, hệ thống giúp theo dõi tiến độ triển khai của từng nhóm một
cách liên tục và minh bạch trong suốt quá trình thực hiện, thay vì chỉ đánh giá
dựa trên kết quả nộp cuối kỳ như trước đây. Bên cạnh đó, hệ thống có cơ chế cảnh
báo khi công việc trễ hạn hoặc tồn đọng quá lâu ở trạng thái đang thực hiện, hỗ
trợ phát hiện sớm các nhóm có nguy cơ chậm tiến độ.

Đối với nhóm sinh viên, việc mọi công việc và trạng thái thực hiện đều được ghi
nhận công khai trên cùng một hệ thống giúp hạn chế tình trạng phân công không
rõ ràng, đùn đẩy trách nhiệm hoặc đổ lỗi lẫn nhau giữa các thành viên khi có sự
cố phát sinh.

Ngoài ra, việc tập trung toàn bộ tài liệu, mã nguồn và thông tin dự án về một nền
tảng duy nhất giúp từng sinh viên chủ động theo dõi công việc của bản thân, đồng
thời tránh được tình trạng dữ liệu bị phân tán trên nhiều công cụ như hiện nay.

Timeline

Thời gian

Công việc

Tuần 1

Tuần 2

Chọn được topic, khảo sát nhu cầu
thực tế, làm slide giới thiệu
Chuẩn bị triển khai đề tài

Tuần 3 - Tuần 9  Thiết kế sản phẩm, làm báo cáo và

Tuần 10

Hoàn thiện báo cáo giữa kỳ

slide giữa kỳ

Tuần 11 - Tuần
13
Tuần 14

Hoàn thiện sản phẩm, chạy thử và sửa
lỗi
Hoàn thiện slide, báo cáo

Tuần 15

Báo cáo cuối kỳ

Tuần 2-3

Phân loại yêu cầu

Nhóm tách yêu cầu ra làm hai loại: những việc hệ thống phải làm được, và
những tiêu chuẩn mà hệ thống phải đạt, ví dụ tốc độ phản hồi hay mức độ an
toàn dữ liệu. Tách như vậy để sau này phân việc trong nhóm cũng dễ hơn, ai
làm phần chức năng nào thì cứ bám theo danh sách mà làm.

Yêu cầu chức năng

Mã

Yêu cầu chức năng

Phân hệ

FR-01  Đăng ký / đăng nhập, phân quyền theo vai trò
sinh viên, nhóm trưởng, giảng viên

Tài khoản

FR-02  Khởi tạo dự án, tạo và quản lý sprint

Dự án & sprint

FR-03  Phân công công việc cho từng thành viên, kèm

Công việc

deadline

FR-04  Cập nhật trạng thái công việc trên bảng Kanban

Công việc

(Todo/Doing/Review/Done)

FR-05  Đính kèm tài liệu hoặc link kết quả vào từng

Công việc

công việc

FR-06  Tự động tính % tiến độ của mỗi cá nhân và của

Báo cáo

cả dự án

FR-07  Cảnh báo khi công việc trễ hạn hoặc bị treo quá

Thông báo

lâu ở một trạng thái

FR-08  Giảng viên xem được tổng quan tiến độ của tất

Báo cáo

cả các nhóm

FR-09  Xuất báo cáo mức độ đóng góp của từng thành

Báo cáo

viên

Sơ đồ phân cấp chức năng

Hình 1. Sơ đồ phân cấp chức năng của hệ thống quản lý tiến độ project

Yêu cầu phi chức năng

Đặc tính

Hiệu năng

Độ tin cậy

Bảo mật

Mô tả cụ thể

API phản hồi trung bình dưới 300ms khi có khoảng 50
người dùng cùng lúc

Hệ thống hoạt động ổn định, không gián đoạn trong suốt
học kỳ

Mật khẩu được băm trước khi lưu, không lưu dữ liệu nhạy
cảm ở dạng thô

Khả năng sử dụng  Sinh viên cập nhật trạng thái công việc chỉ trong vài thao

tác, không cần hướng dẫn

Khả năng bảo trì  Code tuân theo một chuẩn lint chung, có test cho các phần

xử lý logic chính

Khả năng tương
thích

Chạy tốt trên Chrome/Edge/Firefox bản mới, xem được
trên tablet

User Story và tiêu chí nghiệm thu

US-01: Là sinh viên, mình muốn cập nhật trạng thái công việc của bản
thân để nhóm trưởng và giảng viên biết mình đang làm đến đâu.

Tiêu chí nghiệm thu:

Given công việc của mình đang ở trạng thái “Doing”
When mình kéo thẻ sang cột “Done”
Then hệ thống lưu lại thời gian hoàn thành và tính lại % tiến độ của mình

US-02: Là nhóm trưởng, mình muốn giao việc kèm deadline rõ ràng cho
từng bạn để không ai bị quên việc.

Tiêu chí nghiệm thu:

Given dự án đang có ít nhất một sprint đang chạy
When mình tạo công việc mới, chọn người làm và ngày hết hạn
Then công việc hiện lên bảng của bạn được giao, kèm thông báo

US-03: Là giảng viên, mình muốn xem mức độ đóng góp của từng sinh viên
để chấm điểm công bằng hơn.

Given nhóm đã hoàn thành
When mình mở trang chi tiết nhóm
Then hệ thống hiện số công việc mỗi người đã hoàn thành

Use Case và luồng dữ liệu

Để hình dung rõ ai làm gì trong hệ thống, nhóm vẽ Use Case Diagram cho toàn
bộ hệ thống, rồi chọn ra hai use case mà nhóm thấy dễ hiểu nhầm nhất khi code
để đặc tả kỹ hơn.

Hình 2. Use Case Diagram tổng thể

Mục

UC-02: Nhận và cập nhật trạng thái công việc

Tác nhân

Sinh viên

Điều kiện trước

Đã đăng nhập, và công việc đã được giao cho tài khoản
này

Điều kiện sau

Trạng thái công việc đổi, % tiến độ được tính lại

Luồng chính

Mở bảng Kanban → chọn công việc → kéo sang trạng
thái mới → hệ thống lưu và tính lại tiến độ

Luồng ngoại lệ

Nếu công việc không phải của mình, hệ thống từ chối
và báo lỗi phân quyền

Mục

UC-05: Phân công nhiệm vụ, đặt deadline

Tác nhân

Nhóm trưởng

Điều kiện trước

Dự án và sprint đã được tạo

Điều kiện sau

Công việc mới xuất hiện trên bảng của người được giao

Luồng chính

Chọn sprint → tạo công việc mới → chọn người làm,
deadline → hệ thống lưu và gửi thông báo

Luồng ngoại lệ

Nếu deadline vượt quá ngày kết thúc sprint, hệ thống
cảnh báo trước khi lưu

DFD mức ngữ cảnh

Hình 3. DFD mức 0 (Context)

DFD mức 1

Hình 4. DFD mức 1, tách thành 4 tiến trình và 3 kho dữ liệu chính

Tuần 3

3.1 Mô hình hóa kiến trúc theo C4 Model

Mức C1: System Context

Ở mức này, cả hệ thống được coi là một khối duy nhất. Nhóm chỉ quan tâm đến
những đối tượng nằm bên ngoài và có tương tác trực tiếp với nó. Ranh giới hệ
thống được xác định theo nguyên tắc: phần nào nhóm tự xây dựng và vận hành
thì nằm bên trong, phần nào dùng dịch vụ có sẵn thì nằm bên ngoài. Theo đó,
sinh viên, nhóm trưởng và giảng viên là ba tác nhân con người đã nêu ở phần
yêu cầu, còn dịch vụ Email và dịch vụ lưu trữ đám mây là hai hệ thống bên
ngoài mà hệ thống phải gọi tới.

Hình 5. C4 mức 1: System Context của hệ thống quản lý tiến độ

Đối tượng

Loại

Tương tác với hệ thống

Sinh viên

Người dùng

Nhóm trưởng

Người dùng

Giảng viên

Người dùng

Cập nhật trạng thái công việc trên bảng
Kanban, đính kèm tài liệu hoặc link kết quả,
xem % tiến độ của bản thân (FR-04, FR-05,
FR-06)

Tạo dự án và sprint, phân công công việc
kèm deadline, theo dõi tiến độ chung của
nhóm (FR-02, FR-03, FR-06)

Xem tổng quan tiến độ các nhóm, xuất báo
cáo đóng góp của từng thành viên (FR-08,
FR-09)

Dịch vụ Email

Hệ thống bên
ngoài

Nhận yêu cầu từ hệ thống để gửi thông báo
giao việc và cảnh báo trễ hạn (FR-07)

Dịch vụ lưu trữ
đám mây

Hệ thống bên
ngoài

Lưu các tệp sinh viên đính kèm, hệ thống chỉ
giữ đường dẫn tới tệp trong cơ sở dữ liệu
(FR-05)

Tài liệu tham khảo

[1]  Tài liệu môn học Kỹ thuật phần mềm ứng dụng, Chương 2: Yêu cầu và

thiết kế C4. https://fossbk-spec.github.io/ktpmud-
book/ch02_yeu_cau_thiet_ke_c4

