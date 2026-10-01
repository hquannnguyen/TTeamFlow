# Kế hoạch Triển khai Tính năng Chuông Thông Báo (Notification System)

## 1. Tổng quan & Mục tiêu

Tính năng **Chuông thông báo (Notification System)** nhằm giúp các thành viên trong dự án nhận được thông tin kịp thời về các sự kiện liên quan trực tiếp đến mình (được gán việc, được nhắc tên trong bình luận, cập nhật tiến độ công việc, được mời vào dự án,...), từ đó nâng cao hiệu quả cộng tác nhóm trong TTeamFlow.

---

## 2. Ma trận Sự kiện Bắn Thông Báo (Notification Event Matrix)

| Loại sự kiện (`type`) | Điều kiện kích hoạt | Người nhận thông báo (`recipient`) | Nội dung hiển thị mẫu |
| :--- | :--- | :--- | :--- |
| **`TASK_ASSIGNED`** | Khi được gán vào một task hoặc được chuyển giao task | Thành viên được gán | **[Actor]** đã phân công nhiệm vụ **"[Task Title]"** cho bạn |
| **`TASK_MENTIONED`** | Khi được `@mention` trong nội dung bình luận của task | Thành viên được nhắc tên | **[Actor]** đã nhắc đến bạn trong bình luận: *"[Nội dung trích đoạn]"* |
| **`TASK_COMMENTED`** | Khi có bình luận mới trong task | Người tạo task & các assignees khác (trừ người bình luận) | **[Actor]** đã bình luận vào nhiệm vụ **"[Task Title]"** |
| **`TASK_STATUS_CHANGED`** | Khi task được kéo sang cột khác hoặc hoàn thành | Các thành viên được gán vào task | Nhiệm vụ **"[Task Title]"** đã được chuyển sang **"[Column Name]"** |
| **`TASK_DUE_DATE_CHANGED`** | Khi hạn hoàn thành (deadline) bị thay đổi | Các thành viên được gán vào task | Hạn hoàn thành của **"[Task Title]"** đã được dời đến **[Due Date]** |
| **`PROJECT_INVITED`** | Khi được thêm vào một dự án mới | Thành viên mới được thêm | Bạn đã được thêm vào dự án **"[Project Name]"** với vai trò **[Role]** |

> [!NOTE]
> **Nguyên tắc cốt lõi**: Không bao giờ gửi thông báo cho chính người thực hiện hành động (`actorId !== recipientId`).

---

## 3. Thiết kế Cơ sở Dữ liệu (Prisma Schema)

Thêm model `Notification` và enum `NotificationType` vào `backend/prisma/schema.prisma`:

```prisma
enum NotificationType {
  TASK_ASSIGNED
  TASK_MENTIONED
  TASK_COMMENTED
  TASK_STATUS_CHANGED
  TASK_DUE_DATE_CHANGED
  PROJECT_INVITED
  SYSTEM
}

model Notification {
  id        String           @id @default(uuid()) @db.Uuid
  userId    String           @map("user_id") @db.Uuid
  actorId   String?          @map("actor_id") @db.Uuid
  projectId String?          @map("project_id") @db.Uuid
  taskId    String?          @map("task_id") @db.Uuid
  type      NotificationType
  title     String           @db.VarChar(200)
  content   String           @db.Text
  isRead    Boolean          @default(false) @map("is_read")
  readAt    DateTime?        @map("read_at")
  data      Json?            // Chứa metadata deep-link: { projectId, taskId, commentId, linkUrl }
  createdAt DateTime         @default(now()) @map("created_at")

  user    User     @relation("UserNotifications", fields: [userId], references: [id], onDelete: Cascade)
  actor   User?    @relation("NotificationActor", fields: [actorId], references: [id], onDelete: SetNull)
  project Project? @relation(fields: [projectId], references: [id], onDelete: Cascade)
  task    Task?    @relation(fields: [taskId], references: [id], onDelete: Cascade)

  @@index([userId, isRead, createdAt])
  @@index([userId, createdAt])
  @@map("notifications")
}
```

Thêm quan hệ tương ứng vào model `User`, `Project`, `Task`:
- Trong `User`: `notifications Notification[] @relation("UserNotifications")` và `actedNotifications Notification[] @relation("NotificationActor")`
- Trong `Project`: `notifications Notification[]`
- Trong `Task`: `notifications Notification[]`

---

## 4. Thiết kế Backend (NestJS Architecture)

Tạo module mới theo chuẩn kiến trúc TTeamFlow:
```text
backend/src/modules/notifications/
├── dto/
│   ├── query-notifications.dto.ts   (page, limit, unreadOnly)
│   └── mark-read.dto.ts
├── interfaces/
│   └── create-notification-payload.interface.ts
├── notifications.controller.ts
├── notifications.service.ts
└── notifications.module.ts
```

### 4.1. REST API Endpoints

| Method | Endpoint | Quyền | Mô tả |
| :--- | :--- | :--- | :--- |
| `GET` | `/notifications` | Đăng nhập (`JwtAuthGuard`) | Lấy danh sách thông báo của user (phân trang `page`, `limit`, lọc `unreadOnly`) |
| `GET` | `/notifications/unread-count` | Đăng nhập (`JwtAuthGuard`) | Lấy số lượng thông báo chưa đọc để hiển thị badge đỏ trên chuông |
| `PATCH` | `/notifications/:id/read` | Đăng nhập (Chính chủ) | Đánh dấu 1 thông báo là đã đọc (`isRead = true`, `readAt = NOW()`) |
| `PATCH` | `/notifications/mark-all-read`| Đăng nhập | Đánh dấu tất cả thông báo của user là đã đọc |
| `DELETE`| `/notifications/:id` | Đăng nhập (Chính chủ) | Xóa 1 thông báo khỏi danh sách |

### 4.2. Tích hợp Trigger từ các Service hiện hữu
- **`TasksService.assign` & `TasksService.update` (assignees)**: Gọi `notificationsService.create(...)` tạo `TASK_ASSIGNED`.
- **`TasksService.move`**: Tạo `TASK_STATUS_CHANGED` gửi tới các assignees của task.
- **`TasksService.update` (dueDate)**: Tạo `TASK_DUE_DATE_CHANGED` gửi tới assignees.
- **`CommentsService.create`**:
  - Quét regex `@tên_thành_viên` để tìm user được nhắc đến -> Bắn `TASK_MENTIONED`.
  - Bắn `TASK_COMMENTED` cho creator và các assignees khác.
- **`ProjectMembersService.addMember`**: Tạo `PROJECT_INVITED` gửi cho thành viên mới.

---

## 5. Thiết kế Frontend (React + Vite UI/UX)

### 5.1. Cấu trúc Component
```text
frontend/src/features/notifications/
├── api/
│   └── notifications.api.ts
├── types/
│   └── notification.types.ts
└── components/
    ├── NotificationBell.tsx         (Icon chuông + badge số lượng chưa đọc)
    ├── NotificationDropdown.tsx     (Menu dropdown xổ xuống khi click chuông)
    └── NotificationItem.tsx         (Từng dòng thông báo)
```

### 5.2. Luồng Trải nghiệm Người dùng (UX Workflow)
1. **Header Topbar**:
   - Icon chuông có badge số màu đỏ (hiển thị số lượng chưa đọc `1`, `2`, `9+`). Nếu không có tin chưa đọc thì ẩn badge.
   - Polling ngầm nhẹ nhàng (chu kỳ mỗi 30s - 60s hoặc khi window focus) để cập nhật `unread-count` mà không cần cấu hình WebSocket phức tạp.
2. **Dropdown Menu khi click chuông**:
   - Header: Tiêu đề "Thông báo", nút "Đánh dấu tất cả đã đọc" (Mark all as read).
   - Bộ lọc tab: **"Tất cả"** | **"Chưa đọc"**.
   - Danh sách item:
     - Avatar của người tác động (`actor`), icon phân loại hành động (icon giao việc, icon bình luận, icon deadline,...).
     - Nội dung thông báo, thời gian tương đối (`vừa xong`, `5 phút trước`, `2 giờ trước`).
     - Chấm xanh báo hiệu thông báo chưa đọc.
   - Click vào thông báo:
     - Đánh dấu đã đọc ngay lập tức (optimistic update).
     - Tự động đóng dropdown và chuyển hướng đến trang liên quan (ví dụ: mở task detail `/projects/:projectId/board?taskId=...`).
   - Trạng thái rỗng: Minh họa "Bạn không có thông báo nào" khi chưa có thông báo.

---

## 6. Kế hoạch Thực hiện Từng Bước (Execution Roadmap)

### Bước 1: Database Migration
- Cập nhật `schema.prisma` với model `Notification` và enum `NotificationType`.
- Chạy `npx prisma migrate dev --name add_notifications_system`.
- Tạo quan hệ Prisma an toàn không ảnh hưởng dữ liệu hiện có.

### Bước 2: Xây dựng Backend Module (`notifications`)
- Viết `CreateNotificationDto`, `QueryNotificationsDto`, `MarkReadDto`.
- Viết `NotificationsService` (phân trang, đếm chưa đọc, đánh dấu đọc, tạo thông báo).
- Viết `NotificationsController` có gắn đầy đủ `JwtAuthGuard`.
- Viết unit tests cho `NotificationsService`.

### Bước 3: Tích hợp Logic Trigger Bắn Thông Báo
- Inject `NotificationsService` vào `TasksService`, `CommentsService`, `ProjectMembersService`.
- Bổ sung logic trích xuất `@mention` trong comment và trigger tạo thông báo.

### Bước 4: Xây dựng Frontend UI & Tích hợp Topbar
- Viết `notifications.api.ts` (React Query hook: `useNotifications`, `useUnreadNotificationCount`, `useMarkAsRead`).
- Xây dựng component `NotificationBell`, `NotificationDropdown`, `NotificationItem`.
- Tích hợp vào [`AppLayout.tsx`](file:///d:/Lập trình web/TTeamFlow/frontend/src/components/layout/AppLayout.tsx) tại vị trí nút chuông thông báo hiện có.
- Thêm CSS styling sang trọng, responsive trong `styles.css`.

### Bước 5: Kiểm thử Toàn diện & Hoàn thiện
- Chạy toàn bộ backend test (`npm run test:all`).
- Chạy frontend lint & build (`npm run lint`, `npm run build`).
- Kiểm thử luồng end-to-end: User A gán task / comment tag User B -> User B thấy badge đỏ trên chuông -> Click mở xem và click nhảy đến task.
