# Kế hoạch nâng cấp giao diện Dashboard theo mẫu thiết kế

## Tổng quan
Tái thiết kế toàn diện giao diện **Dashboard** (Tổng quan phân tích) và hệ thống khung giao diện (Top Header + Sidebar) của ứng dụng **TTeamFlow** để giống với ảnh mẫu:
- **Khung giao diện (Layout)**: Bổ sung Topbar (thanh tìm kiếm `Cmd + K`, nút `+ Tạo nhiệm vụ`, thông báo, avatar) và Sidebar hiện đại (chọn workspace `Acme Global`, menu `Tổng quan`, `Bảng Kanban`, `Dự án yêu thích`, profile user ở chân trang).
- **Trang Dashboard**:
  1. **Header Dashboard**: Nhãn `• CHỈ SỐ TRỰC TIẾP`, tiêu đề `Tổng quan phân tích`, bộ lọc thời gian `30 ngày qua` và nút `⬇ Xuất báo cáo`.
  2. **4 Thẻ số liệu thống kê (Metric Cards)**:
     - *Tổng số nhiệm vụ*: số 240, badge tăng trưởng `~ 12%`, biểu đồ sóng sparkline.
     - *Hoàn thành dự án*: Gauge hình tròn 68%, mục tiêu 80%, nhãn `↑ Đúng tiến độ`.
     - *Khối lượng công việc đang xử lý*: số 45, nhãn `Nhiệm vụ đang hoạt động`.
     - *Nhiệm vụ quá hạn*: Thẻ cảnh báo nền đỏ nhạt, số 3 màu đỏ, nút `Cần xử lý Xem danh sách`.
  3. **Biểu đồ phân bổ trạng thái (Status Distribution)**:
     - Donut Chart dạng SVG sắc nét với nhãn trung tâm `240 TỔNG`.
     - Chú thích màu sắc: `Cần làm (30%)`, `Đang làm (20%)`, `Hoàn thành (50%)`.
  4. **Ma trận khối lượng công việc (Workload Matrix)**:
     - Danh sách thành viên (Sarah Jenkins, Marcus Johnson [Tải cao], David Chen, Elena Rodriguez).
     - Thanh phân bổ tiến độ đa đoạn (Hoàn thành / Đang làm / Cần làm).
     - Chú thích màu sắc dưới chân thẻ.

---

## Đề xuất thay đổi

### 1. Router & Layout (`frontend/src/app/router/` & `frontend/src/components/layout/`)

#### [MODIFY] [router.tsx](file:///d:/GitHub/TTeamFlow/frontend/src/app/router/router.tsx)
- Thêm route trực tiếp `/dashboard` trỏ vào `<DashboardPage />` để người dùng có thể truy cập ngay từ menu "Tổng quan" ở Sidebar.
- Giữ nguyên route `/projects/:projectId/dashboard` để tương thích khi xem dashboard theo từng dự án.

#### [MODIFY] [AppLayout.tsx](file:///d:/GitHub/TTeamFlow/frontend/src/components/layout/AppLayout.tsx)
- Bổ sung **Top Header Bar**:
  - Ô tìm kiếm: `Tìm kiếm nhiệm vụ, dự án, thành viên... (Cmd + K)` với badge `⌘K`.
  - Nút bấm chính `+ Tạo nhiệm vụ` (màu tím gradient).
  - Các icon trợ giúp (?), chuông thông báo (kèm chấm đỏ), avatar người dùng.
- Nâng cấp **Sidebar**:
  - Hộp chọn workspace: `KHÔNG GIAN LÀM VIỆC: Acme Global ⌵`.
  - Các mục điều hướng:
    - `Tổng quan` (Active state màu tím nổi bật như mẫu).
    - `Dự án của tôi` (`/projects`).
    - `Bảng Kanban`.
    - `Thành viên`.
    - `Nhật ký hoạt động`.
    - `Quản trị hệ thống` (kèm huy hiệu `PRO`).
  - Danh mục `DỰ ÁN YÊU THÍCH` với dấu chấm trạng thái màu sắc (`TTeamFlow Web`, `Mobile Refactor`).
  - Widget thông tin tài khoản ở chân Sidebar (`Alex Rivera - Quản trị hệ thống` hoặc thông tin user đang đăng nhập).

---

### 2. Feature Dashboard (`frontend/src/features/dashboard/`)

#### [MODIFY] [dashboard.types.ts](file:///d:/GitHub/TTeamFlow/frontend/src/features/dashboard/types/dashboard.types.ts)
- Bổ sung các trường tùy chọn phục vụ hiển thị chi tiết (ví dụ: `targetProgress`, `growthRate`, phân bổ chi tiết theo thành viên `completedCount`, `inProgressCount`, `isOverloaded`) mà vẫn tương thích với API contract chuẩn.

#### [MODIFY] [dashboard.api.ts](file:///d:/GitHub/TTeamFlow/frontend/src/features/dashboard/api/dashboard.api.ts)
- Cập nhật bộ dữ liệu mẫu (mock data) chuẩn theo các chỉ số trong ảnh mẫu:
  - Tổng nhiệm vụ: 240, Tăng trưởng: 12%, Hoàn thành: 120 (50%), Đang làm: 48 (20%), Cần làm: 72 (30%).
  - Tiến độ: 68%, Mục tiêu: 80%, Quá hạn: 3, Đang hoạt động: 45.
  - Dữ liệu 4 thành viên: Sarah Jenkins (18 tasks), Marcus Johnson (24 tasks, tải cao), David Chen (12 tasks), Elena Rodriguez (9 tasks).

#### [MODIFY] [DashboardStats.tsx](file:///d:/GitHub/TTeamFlow/frontend/src/features/dashboard/components/DashboardStats.tsx)
- Xây dựng 4 thẻ thống kê chuẩn thiết kế:
  1. Thẻ 1: Tổng số nhiệm vụ (240, badge `~ 12%`, sparkline SVG).
  2. Thẻ 2: Hoàn thành dự án (Gauge circular SVG 68%, nhãn mục tiêu 80% & `↑ Đúng tiến độ`).
  3. Thẻ 3: Khối lượng công việc đang xử lý (45, nhãn nhiệm vụ đang hoạt động).
  4. Thẻ 4: Nhiệm vụ quá hạn (Nền đỏ cảnh báo, số 3 đỏ nổi bật, nút pill `Cần xử lý Xem danh sách`).

#### [MODIFY] [DashboardCharts.tsx](file:///d:/GitHub/TTeamFlow/frontend/src/features/dashboard/components/DashboardCharts.tsx)
- **Biểu đồ bên trái (Phân bổ trạng thái)**:
  - SVG Donut Chart tính toán tọa độ stroke-dasharray chính xác, ở tâm có chữ `240 TỔNG`.
  - Chú thích danh mục có tỷ lệ % và màu tương ứng.
- **Biểu đồ bên phải (Ma trận khối lượng công việc)**:
  - Header có tiêu đề, mô tả và nút lọc icon.
  - Danh sách thành viên kèm avatar/chữ cái đầu, tên, số lượng nhiệm vụ, nhãn cảnh báo `Tải cao` nếu vượt tải.
  - Thanh tiến độ ngang chia làm 3 phân đoạn màu: Xanh lá (Hoàn thành), Cam (Đang làm), Xám xanh (Cần làm).
  - Chú thích trạng thái màu ở góc dưới bên phải.

#### [MODIFY] [DashboardPage.tsx](file:///d:/GitHub/TTeamFlow/frontend/src/features/dashboard/pages/DashboardPage.tsx)
- Nâng cấp Header trang:
  - Huy hiệu `• CHỈ SỐ TRỰC TIẾP`.
  - Tiêu đề `Tổng quan phân tích` và mô tả.
  - Bộ chọn thời gian `📅 30 ngày qua ⌵` và nút `⬇ Xuất báo cáo`.
- Gắn kết 2 phần `DashboardStats` và `DashboardCharts` với layout responsive, mượt mà.

---

### 3. Styling & CSS Tokens (`frontend/src/styles.css`)

#### [MODIFY] [styles.css](file:///d:/GitHub/TTeamFlow/frontend/src/styles.css)
- Bổ sung các biến màu tím chủ đạo (`--brand-600: #4f46e5`, gradient tím, các màu pastel cho badge).
- Định nghĩa styles cho Top Header Bar (ô search `⌘K`, avatar, notification).
- Định nghĩa styles cho Sidebar nâng cao (dropdown workspace, badge `PRO`, danh sách dự án yêu thích).
- Định nghĩa styles cho thẻ Dashboard Metric, Donut SVG animation, Workload Progress bar, và Overdue Card.

---

## Kế hoạch kiểm thử & Xác thực

### 1. Kiểm tra hiển thị giao diện
- Mở trang `http://localhost:5173/dashboard` và `http://localhost:5173/projects/1/dashboard`.
- Kiểm tra độ sắc nét của SVG Donut Chart, Circular Gauge, Sparkline.
- Kiểm tra tính tương thích trên các kích thước màn hình khác nhau (desktop, tablet).

### 2. Kiểm tra tương tác người dùng
- Nhấp chọn các mục trên Sidebar (chuyển đổi giữa `Tổng quan`, `Dự án`).
- Thao tác các nút `Tạo nhiệm vụ`, `Xuất báo cáo`, dropdown `30 ngày qua`.
- Đảm bảo không có lỗi TypeScript hay console error trong browser.
