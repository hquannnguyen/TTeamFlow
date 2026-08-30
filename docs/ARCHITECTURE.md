# Architecture Rules

## Dependency direction

```text
HTTP
 -> Controller
 -> Service
 -> PrismaService
 -> PostgreSQL
```

Không cho phép:
- Controller -> Prisma trực tiếp (trừ scaffold kỹ thuật tạm thời đã đánh dấu TODO).
- Feature A đọc DB của Feature B bằng logic copy-paste.
- Frontend component gọi axios trực tiếp ngoài `api/` của feature.

## Backend module contract

Một module chuẩn:

```text
feature/
  dto/
  feature.controller.ts
  feature.service.ts
  feature.module.ts
```

Nếu module lớn mới tách thêm:
- policies/
- mappers/
- repositories/
- events/

Không tạo abstraction sớm khi chưa có nhu cầu.

## Transaction boundaries

Bắt buộc transaction cho operation thay đổi nhiều aggregate/bảng:
- Create Project.
- Remove project member + unassign tasks.
- Move Task khi cần reorder hàng loạt.
- Delete Project.
- Change OWNER.
- Refresh token rotation.

## Kanban position

Base đang dùng integer position theo khoảng 1000.

Ví dụ:
- 1000
- 2000
- 3000

Dev triển khai drag/drop có thể chèn midpoint.
Khi khoảng cách quá nhỏ thì normalize lại position trong transaction.

Không cập nhật toàn bộ board cho mỗi lần kéo nếu không cần.

## Archived Project

Service phải chặn mutation khi project.status = ARCHIVED.
GET vẫn cho phép.

## Soft delete

Task và Project có `deletedAt`.

Không query record deleted trừ màn hình phục hồi/quản trị.

## Activity Log

Append-only.
Không UPDATE/DELETE qua API.

metadata chỉ lưu context cần thiết; không lưu password/token.
