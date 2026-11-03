# BÁO CÁO CÔNG NGHỆ — TTeamFlow

> Hệ thống quản lý dự án nhóm trực quan theo mô hình Kanban
> Stack: React + NestJS + Prisma + PostgreSQL, triển khai bằng Docker Compose (3 container)

---

## 1. Tổng quan hệ thống

| Thành phần | Công nghệ | Phiên bản |
|---|---|---|
| Frontend | React + Vite + TypeScript | React 19, Vite 7, TS 5.9 |
| Quản lý dữ liệu server | TanStack Query | 5 |
| Quản lý trạng thái client | Zustand | 5 |
| Kéo thả | dnd-kit | core 6, sortable 10 |
| Form & validation | React Hook Form + Zod | RHF 7, Zod 4 |
| Điều hướng | React Router | 7 |
| HTTP client | Axios | 1.11 |
| Backend | NestJS (Node.js + TypeScript) | 11 |
| ORM | Prisma | 6 |
| Xác thực | JWT + Passport + bcrypt | @nestjs/jwt 11, passport-jwt 4 |
| Cơ sở dữ liệu | PostgreSQL | 17 |
| Reverse proxy / web server | Nginx | (container frontend) |
| Đóng gói & triển khai | Docker Compose | 3 container |
| Kiểm thử | tsx (spec thực thi trực tiếp) | 9 bộ test, 83 ca |
| Quản lý mã nguồn | Git Flow (feature → develop → main) | — |

Số liệu tổng thể: **52 endpoint REST · 11 bảng dữ liệu · 12 module backend · 83 ca kiểm thử đạt · ~20.000 dòng TypeScript · 95 commit**.

---

## 2. Kiến trúc tổng thể

### 2.1 Sơ đồ kiến trúc

```text
┌──────────────────────────┐
│  Trình duyệt (React SPA) │
└────────────┬─────────────┘
             │  http://localhost (cổng 80)
┌────────────▼─────────────┐
│  CONTAINER 1: frontend   │
│  Nginx                   │
│  ├─ /        → React SPA │  (file tĩnh)
│  └─ /api/*   ──proxy────┐│
└─────────────────────────┼┘
                          │  mạng nội bộ Docker
┌─────────────────────────▼┐
│  CONTAINER 2: backend    │
│  NestJS API (cổng 3000,  │
│  chỉ expose, không publish)│
│  ├─ Guards (Jwt/System/Project) │
│  ├─ Controller → Service        │
│  └─ Prisma Client               │
└────────────┬─────────────┘
             │ hostname "postgres":5432
┌────────────▼─────────────┐
│  CONTAINER 3: postgres   │
│  PostgreSQL 17           │
│  volume: postgres_data   │
│  publish: 127.0.0.1:5432 │
└──────────────────────────┘
```

### 2.2 Nguyên tắc kiến trúc

1. **Một cổng vào duy nhất**: trình duyệt chỉ nói chuyện với Nginx. Backend không publish cổng ra ngoài (chỉ `expose` nội bộ) → giảm bề mặt tấn công, CORS/giới hạn tập trung ở một điểm.
2. **Chiều phụ thuộc nghiêm ngặt** (tài liệu `docs/ARCHITECTURE.md`):
   ```
   HTTP → Controller → Service → PrismaService → PostgreSQL
   ```
   Cấm: Controller gọi Prisma trực tiếp; feature A đọc DB của feature B; component frontend gọi axios ngoài `api/` của feature.
3. **Module theo tính năng (business capability)**, không chia theo loại file: `auth, users, admin, projects, project-members, kanban, tasks, checklists, comments, dashboard, activity-logs, notifications`.
4. **Không tin giao diện**: mọi kiểm tra quyền diễn ra ở backend (Guard + Service); frontend ẩn/hiện nút chỉ là trải nghiệm.
5. **Transaction bắt buộc** cho các thao tác chạm nhiều bảng: tạo Project, xoá member + unassign task, reorder Kanban hàng loạt, xoá Project, đổi OWNER, refresh-token rotation.

---

## 3. Các luồng chính (flows)

### 3.1 Luồng request API chuẩn

```text
Request
 → Nginx (proxy /api/* → backend:3000)
 → Helmet + CORS            (header bảo mật, giới hạn origin)
 → ValidationPipe           (DTO whitelist: thừa trường là từ chối)
 → JwtGuard                 (xác thực Access Token)
 → SystemRoleGuard          (ADMIN / USER)
 → ProjectRoleGuard         (OWNER/MANAGER/MEMBER/VIEWER theo dự án)
 → Controller               (chỉ HTTP: parse, gọi service)
 → Service                  (business logic, transaction, Prisma)
 → PostgreSQL
 → Response thống nhất:
    thành công  { success: true,  data: ... }
    lỗi         { success: false, statusCode, message }
```

### 3.2 Luồng xác thực (JWT hai token)

```text
Đăng nhập  → Access Token (15 phút) + Refresh Token (7 ngày, cookie HttpOnly)
Gọi API    → gắn Authorization: Bearer <accessToken>
401        → interceptor axios bắt lỗi, gọi POST /auth/refresh tự động
           → nhận token mới → TỰ GỬI LẠI request gốc (user không hay biết)
```

Các lớp bảo vệ kèm theo:
- bcrypt băm mật khẩu, bắt buộc độ mạnh;
- Refresh Token **chỉ lưu bản băm** trong DB;
- Đổi mật khẩu → thu hồi mọi phiên đang có; tài khoản bị khoá → token cũ vô hiệu;
- Giới hạn đăng nhập 10 lần / 15 phút;
- DTO whitelist, Helmet, CORS giới hạn nguồn, kiểm tra chữ ký ảnh đại diện.

### 3.3 Luồng kéo thả Kanban (optimistic update)

```text
User kéo thẻ → dnd-kit bắt sự kiện
 → giao diện đổi vị trí NGAY (không chờ server)
 → PATCH /tasks/:id/move gửi lên
 → Service: transaction + khóa dòng, tính position (khoảng cách 1000,
   chèn giữa = midpoint; sát nhau = normalize lại toàn cột)
 → thành công: server trả trạng thái chuẩn, query cache được đồng bộ
 → thất bại: rollback giao diện về trạng thái cũ
```

Vị trí lưu **số nguyên cách nhau 1000** (1000, 2000, 3000…) — chèn giữa chỉ cần gán 1500, không đụng thẻ khác.

### 3.4 Luồng trạng thái hoàn thành

- Cột có cờ `isCompleted` (không dựa vào tên cột "DONE" — người dùng có thể đổi tên);
- Task vào cột hoàn thành → `completedAt = NOW()`; rời khỏi → `completedAt = null`;
- Toàn bộ thống kê dashboard dựa trên `completedAt`, đảm bảo đúng ngay cả khi có nhiều cột hoàn thành.

### 3.5 Luồng dữ liệu frontend

```text
Component
 → useQuery/useMutation (TanStack Query: cache, retry, invalidate)
 → hàm trong features/*/*.api.ts
 → axios instance (api/http.ts): gắn token, tự refresh khi 401
 → NestJS API

Trạng thái toàn cục (Zustand): user đăng nhập, dự án đang chọn, theme sáng/tối
Form (React Hook Form + Zod): validate phía client trước khi gửi
```

### 3.6 Luồng nhật ký & thông báo

- `ActivityLog` là **append-only** — không có API sửa/xoá log; metadata không chứa password/token;
- Thông báo sinh từ 3 nguồn: giao việc, nhắc tên @ trong bình luận, task đổi trạng thái — frontend polling số chưa đọc mỗi vài giây (hạn chế đã ghi nhận, hướng phát triển là WebSocket).

---

## 4. Lý do chọn từng công nghệ

### 4.1 Frontend

| Công nghệ | Lý do chọn |
|---|---|
| **React 19** | Hệ sinh thái lớn nhất, team đã quen, ưu tiên tuyển người/reuse thư viện; phiên bản mới có cải thiện hiệu năng concurrent rendering |
| **TypeScript** | Kiểu chặt giúp bắt lỗi lúc biên dịch; **chia sẻ kiểu (type) với backend** qua DTO — hợp đồng API rõ ràng, refactor an toàn |
| **Vite 7** | Dev server khởi động nóng gần như tức thời (ESM native), HMR nhanh hơn hẳn Webpack; build production dùng esbuild + Rollup |
| **TanStack Query 5** | Giải quyết trọn "vấn đề server-state": caching, dedupe request, retry, optimistic update, invalidation — thay vì tự viết useEffect + loading/error flags rải rác. Là nền tảng cho kéo thả optimistic |
| **Zustand 5** | State toàn cục gọn nhẹ (~1KB), API dạng hook không boilerplate; đủ dùng cho user/theme/dự án đang chọn mà không cần Redux phức tạp |
| **dnd-kit** | Thư viện kéo thả hiện đại cho React: hỗ trợ sortable list, accessible (bàn phím), hiệu năng tốt — đúng nhu cầu Kanban |
| **React Hook Form + Zod** | RHF render lại tối thiểu (form nhanh); Zod dùng **một schema** validate cả client lẫn (tương tự DTO backend) — không viết validate 2 lần bằng 2 ngôn ngữ khác nhau |
| **React Router 7** | Chuẩn de-facto điều hướng SPA, hỗ trợ nested routes — khớp cấu trúc dự án → kanban → task |
| **Axios** | Interceptor thuận tiện để **gắn token + tự refresh khi 401** tập trung tại một file (`api/http.ts`) |

### 4.2 Backend

| Công nghệ | Lý do chọn |
|---|---|
| **NestJS 11** | Kiến trúc module + DI bắt buộc code có cấu trúc — phù hợp team 6+ người, ai vào cũng hiểu quy ước; tích hợp sẵn Guards, Pipes, Interceptors — đúng các khái niệm cần cho RBAC 2 tầng và validation |
| **TypeScript (toàn stack)** | Một ngôn ngữ cả 2 đầu → chia sẻ type, chuẩn hoá tooling (ESLint/Prettier), giảm lỗi giao tiếp API |
| **Passport + @nestjs/jwt** | Chuẩn xác thực của NestJS; tách Access/Refresh token, chiến lược passport-jwt cắm vào Guard dễ mở rộng (sau này thêm OAuth) |
| **bcrypt** | Thuật toán băm mật khẩu chuẩn ngành, có salt tự động, độ phí tính toán chống brute-force |
| **class-validator + class-transformer** | DTO khai báo dạng decorator, kết hợp ValidationPipe whitelist — **từ chối trường thừa** ngay cửa, không cho payload lạ vào Service |
| **Helmet + CORS + cookie-parser** | Bảo mật nền: header HTTP an toàn, giới hạn origin đúng `FRONTEND_ORIGIN`, đọc cookie HttpOnly cho refresh token |
| **Prisma 6** | (xem 4.3) |

### 4.3 Cơ sở dữ liệu & ORM

| Công nghệ | Lý do chọn |
|---|---|
| **PostgreSQL 17** | RDBMS mạnh cho dữ liệu **quan hệ chặt** (User→Project→Column→Task→…): khóa ngoại, chỉ mục, transaction ACID; `pg_isready` làm healthcheck cho Docker; kiểu JSONB phục vụ metadata log nếu cần |
| **Prisma 6** | Schema là **nguồn sự thật duy nhất** (`schema.prisma`); migration có lịch sử theo phiên bản — cả nhóm đồng bộ DB bằng `migrate deploy`; type-safe 100% (truy vấn sai tên field là lỗi biên dịch); relation query giảm N+1 |
| **Soft delete (`deletedAt`)** | Dự án/task xoá mềm — giữ lịch sử, khôi phục được, ActivityLog vẫn có nghĩa |

### 4.4 Triển khai & vận hành

| Công nghệ | Lý do chọn |
|---|---|
| **Docker Compose (3 container)** | **Chạy được bằng đúng một lệnh `docker compose up`** trên bất kỳ máy nào — khắc phục "máy tôi chạy được"; môi trường đồng nhất giữa các thành viên và khi chấm bài |
| **Nginx (chung container frontend)** | Một container kiêm 2 vai trò: phục vụ file tĩnh React + reverse proxy `/api/*` → backend. Browser chỉ cần biết 1 origin → hết lỗi CORS, đơn giản hoá cấu hình |
| **Backend không publish cổng** | Chỉ `expose: 3000` nội bộ — request ngoài bắt buộc qua Nginx; PostgreSQL cũng chỉ gắn `127.0.0.1` |
| **`depends_on` + healthcheck** | Backend chỉ khởi động khi PostgreSQL sẵn sàng nhận kết nối (`pg_isready`) — tránh lỗi connect lúc container mới bật |
| **Volume `postgres_data`** | Dữ liệu sống độc lập với vòng đời container — `down` không mất data, `down -v` mới xoá |
| **Multi-stage build** | Image production chỉ chứa dist + node_modules sản xuất (không devDependencies) → image nhỏ,attack surface thấp |
| **tsx (kiểm thử)** | Chạy spec TypeScript trực tiếp, không cần biên dịch — 9 bộ test (83 ca) bọc nghiệp vụ trọng yếu: guards, kanban-reorder, task-move, members, admin, dashboard, comments, notifications, activity-logs |
| **Git Flow + convention** | `feature/*` → PR vào `develop` → review bắt buộc 1 approver; commit `feat(scope): ...`; ESLint + TS 0 lỗi là "cổng chất lượng" trước merge |

---

## 5. Đánh giá: ưu điểm & đánh đổi

### Ưu điểm đạt được
- **Toàn vẹn dữ liệu**: transaction bắt buộc + khóa dòng + RBAC kiểm tra ở DB-adjacent layer (Service);
- **Trải nghiệm mượt**: optimistic update, tự refresh token vô cảm, skeleton loading, dark mode;
- **Bảo mật nhiều lớp**: bcrypt, token băm trong DB, HttpOnly cookie, rate limit, whitelist DTO, Helmet/CORS;
- **Kiểm thử nghiệp vụ**: 83 ca đạt trên các luồng dễ vỡ nhất (phân quyền, reorder, move task);
- **Tái lập môi trường**: 1 lệnh chạy toàn hệ thống.

### Đánh đổi đã chấp nhận (và hướng phát triển)
| Hạn chế | Lý do chấp nhận | Hướng giải quyết |
|---|---|---|
| Thông báo polling, chưa real-time | Đơn giản, ổn định, đủ với quy mô đồ án | WebSocket (Socket.IO) |
| Kéo thả chỉ thả cuối cột | Position 1000 đã sẵn sàng cho midpoint | Cho chọn vị trí thả |
| Chưa có quên mật khẩu / xác minh email | Phạm vi ưu tiên nghiệp vụ chính | Gửi email (nodemailer), nhắc hạn chót |
| Ảnh đại diện lưu ổ đĩa server | Không phụ thuộc dịch vụ ngoài | Lưu cloud storage (S3/Cloudinary) |
| Chưa có e2e/UI test | Ưu tiên unit test nghiệp vụ | Playwright/Cypress |

---

*Người soạn: nhóm phát triển TTeamFlow — tài liệu đối chiếu: `README.md`, `docs/ARCHITECTURE.md`, `docker-compose.yml`.*
