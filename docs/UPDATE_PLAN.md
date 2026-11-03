# KẾ HOẠCH CẬP NHẬT TTeamFlow — 4 HẠNG MỤC

> Phạm vi: (P1) Thông báo real-time WebSocket · (P2) Quên mật khẩu + xác minh email bằng Gmail SMTP free · (P3) Tích hợp MinIO — upload attachment cho task · (P4) E2E/UI test
> Nguyên tắc: mỗi hạng mục 1 nhánh `feature/*` riêng, PR vào `develop`, không đụng dữ liệu cũ.

---

## Tổng quan tiến độ đề xuất

| Pha | Hạng mục | Nhánh | Độ ưu tiên | Ước lượng | Phụ thuộc |
|---|---|---|---|---|---|
| P3 | MinIO + attachment | `feature/attachments` | 🔴 Cao (nền cho P2 về hạ tầng env) | 3–4 ngày | — |
| P2 | Email: quên mật khẩu + xác minh | `feature/email-auth` | 🔴 Cao | 3–4 ngày | — |
| P1 | WebSocket real-time | `feature/realtime-notifications` | 🟡 Trung bình | 2–3 ngày | — |
| P4 | E2E/UI test (Playwright) | `feature/e2e-tests` | 🟢 Cuối cùng | 2–3 ngày | P1–P3 ổn định |

Có thể chạy **song song P2 và P3** (2 người), P1 một người; P4 gom cuối.

---

# P3 — MinIO: lưu ảnh & tệp, upload attachment cho task

## P3.1. Hạ tầng Docker

Thêm 2 service vào `docker-compose.yml`:

```yaml
  minio:
    image: minio/minio:latest
    container_name: pm-minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER:-minioadmin}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD:?Thiếu MINIO_ROOT_PASSWORD}
    ports:
      - "127.0.0.1:9000:9000"   # S3 API — chỉ nội bộ/localhost
      - "127.0.0.1:9001:9001"   # Console quản trị
    volumes:
      - minio_data:/data
    healthcheck:
      test: ["CMD", "mc", "ready", "local"]
      interval: 5s
      retries: 10

  minio-init:
    image: minio/mc:latest
    depends_on:
      minio:
        condition: service_healthy
    entrypoint: >
      /bin/sh -c "
      mc alias set local http://minio:9000 $$MINIO_ROOT_USER $$MINIO_ROOT_PASSWORD &&
      mc mb --ignore-existing local/tteamflow &&
      mc anonymous set none local/tteamflow;
      exit 0"
```

Thêm vào `.env.example`:
```env
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=
S3_ENDPOINT=http://minio:9000
S3_BUCKET=tteamflow
S3_ACCESS_KEY=   # = MINIO_ROOT_USER
S3_SECRET_KEY=   # = MINIO_ROOT_PASSWORD
PRESIGN_URL_TTL=900
```
Volumes: thêm `minio_data` vào mục `volumes:`.

> ⚠️ Bucket **private** — không set public; mọi download đi qua **presigned URL** (hạn 15 phút).

## P3.2. Database — migration mới

```prisma
model Attachment {
  id         String   @id @default(uuid()) @db.Uuid
  taskId     String   @map("task_id") @db.Uuid
  uploaderId String   @map("uploader_id") @db.Uuid
  objectKey  String   @map("object_key") @db.VarChar(300)  // attachments/{taskId}/{uuid}/{ten-file}
  fileName   String   @map("file_name") @db.VarChar(255)
  mimeType   String   @map("mime_type") @db.VarChar(100)
  sizeBytes  Int      @map("size_bytes")
  createdAt  DateTime @default(now()) @map("created_at")

  task     Task @relation("TaskAttachments", fields: [taskId], references: [id], onDelete: Cascade)
  uploader User @relation("AttachmentUploader", fields: [uploaderId], references: [id])

  @@index([taskId])
}
```
- User: thêm relation `attachments Attachment[] @relation("AttachmentUploader")`.
- `avatarUrl` về sau: thay "lưu path ổ đĩa" bằng objectKey/presigned URL — **không migrate data cũ** (đồ án giữ nguyên avatar cũ vẫn hoạt động).

## P3.3. Backend — module `attachments`

Cấu trúc chuẩn theo quy ước dự án:
```text
modules/attachments/
  attachments.module.ts
  attachments.controller.ts
  attachments.service.ts
  dto/create-attachment.dto.ts
  common/s3/s3.service.ts        (dùng chung, chỗ khác cũng gọi được — ví dụ avatar)
```

API — dùng **presigned URL** để file đi thẳng browser ↔ MinIO, không ngờ qua backend:

| Endpoint | Ý nghĩa |
|---|---|
| `POST /api/v1/tasks/:id/attachments/presign` | Body: `{fileName, mimeType, sizeBytes}` → kiểm quyền MEMBER+ (không nhận VIEWER/ARCHIVED), validate loại & kích thước → tạo record `Attachment` (chưa xác nhận) → trả `{attachmentId, uploadUrl, objectKey}` |
| `PATCH /api/v1/attachments/:id/complete` | Client báo upload xong → server HEAD object xác nhận tồn tại, ghi trạng thái OK |
| `GET /api/v1/tasks/:id/attachments` | Danh sách tệp của task + presigned download URL từng tệp |
| `DELETE /api/v1/attachments/:id` | Chỉ người upload hoặc MANAGER+ → xoá record + xoá object S3 |

Quy tắc:
- **Giới hạn**: size ≤ 10MB/tệp, task tối đa 20 tệp; MIME cho phép: ảnh (png/jpg/webp/gif), pdf, docx/xlsx/pptx, txt, zip.
- Ghi **ActivityLog** kiểu `ATTACHMENT_ADDED` / `ATTACHMENT_REMOVED`.
- Gửi **Notification** cho các assignee (tái dùng cơ chế có sẵn).
- Upload record chưa "complete" quá 1 giờ → dọn (cron đơn giản hoặc dọn khi list).

## P3.4. Frontend

- `features/tasks/` thêm `components/attachments/`: nút đính kèm, danh sách tệp (icon theo loại, dung lượng), progress bar khi PUT lên MinIO, preview ảnh lightbox, nút xoá theo quyền.
- TanStack Query: `useTaskAttachments(taskId)`, mutation presign → `axios.put(uploadUrl, file)` → `complete`.
- Sửa `update-profile`: đổi avatar đi qua MinIO luôn (cùng flow presign, objectKey `avatars/{userId}/...`).

## P3.5. Chấp nhận (DoD)
- [ ] `docker compose up` đủ 4 service, bucket `tteamflow` tự tạo, private
- [ ] Upload tệp 10MB vào task thành công qua presigned URL, backend không trung chuyển byte file
- [ ] VIEWER không upload được; dự án ARCHIVED chặn mọi mutation
- [ ] Link download hết hạn sau 15 phút
- [ ] Thêm unit test: presign validation, quyền, mime/size

---

# P2 — Quên mật khẩu & xác minh email (Gmail SMTP free)

## P2.1. Chuẩn bị Gmail (dùng miễn phí, 500 email/ngày)

1. Tài khoản Google bật **2-Step Verification**;
2. Tạo **App Password** (Google Account → Security → App passwords) — 16 ký tự;
3. Không dùng mật khẩu Google thật trong code.

`.env` bổ sung:
```env
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=tteamflow.bot@gmail.com
MAIL_PASSWORD=xxxxxxxxxxxxxxxx   # App Password 16 ký tự
MAIL_FROM="TTeamFlow <tteamflow.bot@gmail.com>"
APP_URL=http://localhost          # để tạo link trong email
```

## P2.2. Database — migration mới

```prisma
model ActionToken {
  id          String   @id @default(uuid()) @db.Uuid
  userId      String   @map("user_id") @db.Uuid
  tokenHash   String   @unique @map("token_hash") @db.VarChar(64)  // SHA-256 của token
  purpose     ActionTokenPurpose
  expiresAt   DateTime @map("expires_at")
  usedAt      DateTime? @map("used_at")
  createdAt   DateTime @default(now()) @map("created_at")
  user        User @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId, purpose])
}
enum ActionTokenPurpose {
  EMAIL_VERIFY
  PASSWORD_RESET
}
```
User: thêm `emailVerified Boolean @default(false) @map("email_verified")`.

> Lưu token **bản băm** (giống RefreshToken) — lộ DB cũng không dùng được; 1 token dùng 1 lần (`usedAt`).

## P2.3. Backend — module `mail` + mở rộng `auth`

- `common/mail/mail.module.ts` dùng **@nestjs-modules/mailer** (Nodemailer), transport SMTP Gmail, template HTML đẹp (logo TTeamFlow, nút CTA).
- API mới (public, có rate-limit):

| Endpoint | Ý nghĩa |
|---|---|
| `POST /auth/forgot-password` | Body `{email}` → **luôn trả 200** dù email tồn tại hay không (chống dò email); nếu tồn tại: tạo token 30 phút → gửi link `{APP_URL}/reset-password?token=...` |
| `POST /auth/reset-password` | Body `{token, newPassword}` → băm token tra `ActionToken` (chưa hết hạn, chưa dùng, purpose đúng) → transaction: đổi password + **thu hồi mọi RefreshToken** + đánh dấu used |
| `POST /auth/verify-email` | Body `{token}` → set `emailVerified = true` |
| `POST /auth/resend-verification` | Đăng nhập nhưng chưa verify → gửi lại (rate-limit 1/phút) |

- **Luồng giới hạn**: tối đa 3 token PASSWORD_RESET đang sống/user; forgot-password rate-limit 5 lần/15 phút/người (chung infrastructure rate-limit có sẵn của login).
- **Không bắt buộc verify ngay** để không phá user cũ: đăng nhập vẫn cho qua, hiển thị banner "chưa xác minh email" ở giao diện.

## P2.4. Frontend

- Trang `ForgotPasswordPage`, `ResetPasswordPage` (route public, route mới `/reset-password`);
- Banner nhắc xác minh ở layout khi `user.emailVerified === false`, nút gửi lại;
- Sửa `AuthPage`: form quên mật khẩu (nhập email → thông báo "kiểm tra hộp thư").

## P2.5. Chấp nhận (DoD)
- [ ] Nhận email thật trong Gmail, link hoạt động, token 1 lần + hết hạn 30 phút
- [ ] Reset xong → mọi phiên cũ đăng xuất hết (RefreshToken xoá)
- [ ] Không thể dùng lại token, không dò được email tồn tại qua response
- [ ] Development không có Gmail: mode `MAIL_DEV_LOG=true` in link ra console backend (demo không phụ thuộc Internet)

---

# P1 — Thông báo real-time (Socket.IO)

## P1.1. Backend

- Cài: `@nestjs/websockets @nestjs/platform-socket.io socket.io`
- `common/realtime/notifications.gateway.ts`:

```ts
@WebSocketGateway({ cors: { origin: config.FRONTEND_ORIGIN, credentials: true } })
export class NotificationsGateway implements OnGatewayConnection {
  handleConnection(client: Socket) {
    // xác thực: đọc Access Token từ handshake.auth.token HOẶC cookie (cookie-parser đã có)
    const payload = this.jwtService.verify(...);
    client.join(`user:${payload.sub}`);   // room theo userId
    client.data.userId = payload.sub;
  }
  handleDisconnect(client) { client.leave(`user:${client.data.userId}`); }
}
```

- `notifications.service.ts`: sau khi `create()` → `server.to('user:'+userId).emit('notification:new', notification)`. Vẫn ghi DB như cũ — WebSocket chỉ là **kênh đẩy**, mất kết nối không mất thông báo.
- Disconnect khi: refresh token rotate thất bại, user bị khoá (đuổi room).

## P1.2. Frontend

- `socket.io-client`; tạo `features/notifications/realtime.ts` — connect sau khi `useQuery` user có dữ liệu, disconnect khi logout;
- Nhận `notification:new` → `queryClient.invalidateQueries(['notifications'])` + toast + tăng badge số chưa đọc;
- **Giữ polling làm fallback** (Socket.IO tự fallback long-polling; thêm interval dài 60s dự phòng khi tab nền).

## P1.3. Nginx (container frontend)

Bổ sung cấu hình proxy cho WebSocket (upgrade headers):

```nginx
location /socket.io/ {
    proxy_pass http://backend:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
}
```

## P1.4. Chấp nhận (DoD)
- [ ] BUser A giao việc cho B (2 trình duyệt) → B nhận toast + badge **ngay lập tức**, không chờ polling
- [ ] Mất mạng rồi nối lại → socket tự reconnect, thông báo không mất (vì vẫn ghi DB)
- [ ] Nginx proxy pass handshake qua được (kiểm tra không lỗi CORS/WebSocket 400)

---

# P4 — E2E/UI test (Playwright)

## P4.1. Setup

- Thư mục `e2e/` ở root repo (không nằm trong frontend/backend) hoặc `frontend/e2e/`;
- `playwright.config.ts`: baseURL `http://localhost`, project Chromium + Firefox + mobile Chrome;
- Strategy dữ liệu: chạy DB riêng cho e2e (docker compose profile hoặc DB name `project_management_e2e`) — **không đụng DB thật**; seed trước mỗi run bằng API call (không dùng UI để chuẩn bị dữ liệu, chỉ 1 flow seed qua UI).

## P4.2. Kịch bản ưu tiên (bọc các luồng "vùng vàng")

| # | Kịch bản | Kiểm tra chính |
|---|---|---|
| E1 | Đăng nhập / đăng nhập sai | redirect đúng, hiện lỗi, token trong cookie HttpOnly |
| E2 | Tạo dự án mới | 3 cột mặc định TODO/DOING/DONE xuất hiện |
| E3 | Tạo task + gán người + ưu tiên + hạn chót | thẻ xuất hiện đúng cột, vạch màu đúng |
| E4 | Kéo thả task sang DONE | thẻ đổi cột sau reload (server xác nhận) |
| E5 | Chi tiết task: checklist + comment @mention | vòng tiến độ cập nhật, thông báo đến người được nhắc |
| E6 | Phân quyền VIEWER | nút ẩn; gọi API trực tiếp → 403 |
| E7 | Quên mật khẩu (kết hợp P2, mode MAIL_DEV_LOG) | nhận link trong log, reset xong đăng nhập mật khẩu mới được |
| E8 | Upload attachment (kết hợp P3, MinIO) | file hiện trong danh sách, tải lại được |
| E9 | Thông báo real-time (kết hợp P1, 2 context cùng lúc) | B nhận toast trong khi A thao tác |
| E10 | Responsive mobile | menu trượt, bảng Kanban cuộn ngang được |

## P4.3. CI (GitHub Actions — repo đã có `.github/`)

```yaml
name: e2e
on: [pull_request]
jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: docker compose up -d --build postgres minio minio-init
      - run: cd backend && npm ci && npx prisma migrate deploy && npm run start:dev &
      - run: cd frontend && npm ci && npm run dev &
      - run: npx playwright install --with-deps && npx playwright test
```
- Chặn merge nếu e2e đỏ (kèm điều kiện cổng chất lượng hiện có).

## P4.4. Chấp nhận (DoD)
- [ ] 10 kịch bản chạy xanh local bằng `npx playwright test`
- [ ] CI chạy e2e tự động trên mỗi PR vào develop
- [ ] DB e2e tách biệt, chạy test không phá dữ liệu thật

---

## Rủi ro & lưu ý chung

| Rủi ro | Giảm thiểu |
|---|---|
| Gmail App Password có thể bị chặn khi đổi mật khẩu Google / IP lạ | Mode `MAIL_DEV_LOG` dự phòng; không hardcode, luôn qua `.env` |
| Upload file lớn làm nghẽn | Giới hạn 10MB + presigned URL (byte không qua backend) |
| Socket IO xung đột CORS với cấu hình Helmet hiện tại | Cho phép origin FRONTEND_ORIGIN với credentials, test kỹ handshake qua Nginx |
| Migration mới phá dữ liệu hiện có | Chỉ ADD bảng/cột mới (Attachment, ActionToken, emailVerified default false) — an toàn, không sửa bảng cũ |
| E2E fail do dữ liệu cũ | DB e2e riêng + seed bằng API |

## Thứ tự làm việc đề xuất (sau khi duyệt plan)

```text
Ngày 1–2   P3: docker MinIO + migration Attachment + s3.service + presign API
Ngày 1–2   P2 (song song): migration ActionToken + mail module + forgot/reset API
Ngày 3–4   P3: UI attachment + avatar qua MinIO  |  P2: 3 trang auth + banner verify
Ngày 4–5   P1: Gateway + emit + frontend socket + nginx websocket
Ngày 6–7   P4: Playwright 10 kịch bản + CI + fix
Ngày 7     Merge dần PR; cập nhật README (env mới, lệnh, kiến trúc 4 container) + slide 22
```

Sau khi xong: `docker compose up` sẽ chạy **4 container** (thêm MinIO) — nhớ cập nhật lại slide "3 container" và README cho khớp.
