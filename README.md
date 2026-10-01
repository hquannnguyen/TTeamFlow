# Team Project Management — Base Repository

Base kiến trúc dùng chung cho nhóm:

- Frontend: React + Vite + TypeScript
- Reverse proxy/static server: Nginx
- Backend: NestJS REST API
- ORM: Prisma
- Database: PostgreSQL
- Auth: JWT Access Token + Refresh Token (HttpOnly cookie)
- Authorization: RBAC 2 tầng
  - SystemRole: `ADMIN`, `USER`
  - ProjectRole: `OWNER`, `MANAGER`, `MEMBER`, `VIEWER`

## 1. Kiến trúc

```text
Browser
   |
   v
Nginx :80
   |------ / --------> React SPA
   |
   `------ /api/* ----> NestJS :3000
                           |
                           v
                         Prisma
                           |
                           v
                      PostgreSQL :5432
```

Development:
- React: http://localhost:5173
- NestJS: http://localhost:3000/api/v1
- PostgreSQL: localhost:5432

Docker:
- App: http://localhost
- Browser chỉ đi qua Nginx.
- Backend kết nối DB bằng hostname `postgres`, không dùng `localhost`.

## 2. Chạy bằng Docker

### Lần đầu clone về

```bash
# 1. Tạo file .env
cp .env.example .env
# Điền các giá trị thật vào .env (JWT secrets, v.v.)

# 2. Build và khởi động toàn bộ services
docker compose up --build

# 3. Chạy migration (mở terminal mới)
docker compose exec backend npx prisma migrate deploy

# 4. Seed dữ liệu mẫu
docker compose exec backend npx tsx prisma/seed.ts
```

Truy cập: **http://localhost**

### Khi pull code mới về (có migration mới)

```bash
git pull
docker compose up --build
docker compose exec backend npx prisma migrate deploy
```

### Dừng / khởi động lại

```bash
# Dừng
docker compose down

# Khởi động lại (không cần build lại)
docker compose up

# Xoá toàn bộ data (reset DB)
docker compose down -v
docker compose up --build
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npx tsx prisma/seed.ts
```

## 3. Chạy development (local, không dùng Docker)

> Yêu cầu: PostgreSQL đang chạy local, đã tạo database `project_management`.

### Lần đầu clone về

**Backend:**

```bash
cd backend
cp .env.example .env
# Sửa DATABASE_URL trong .env trỏ đến DB local
npm install
npx prisma migrate deploy
npx tsx prisma/seed.ts
npm run start:dev
```

**Frontend:**

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

### Khi pull code mới về

```bash
git pull

# Nếu có migration mới:
cd backend && npx prisma migrate deploy

# Nếu có package mới:
npm install
```

## 4. Tài khoản seed

```text
Admin:
admin@example.com
Admin@123

Member:
member@example.com
Member@123
```

CHỈ dùng cho development.

## 5. Workflow khi thay đổi schema Prisma

> Áp dụng khi bạn thêm/sửa/xoá model trong `backend/prisma/schema.prisma`.

### Người thực hiện thay đổi schema

```bash
# 1. Sửa schema.prisma theo nhu cầu

# 2. Tạo migration file (chạy trên máy local, KHÔNG trong Docker)
cd backend
npx prisma migrate dev --name <tên_thay_đổi>
# Ví dụ: npx prisma migrate dev --name add_comment_table

# 3. Commit CẢ migration file lên git
git add prisma/migrations
git commit -m "feat(<module>): <TenBạn> add <tên_thay_đổi>"
git push
```

> ⚠️ **Không bao giờ** sửa file trong `prisma/migrations/` sau khi đã commit/merge.

### Người khác trong team (khi pull về có migration mới)

```bash
git pull

# Docker:
docker compose exec backend npx prisma migrate deploy

# Local:
cd backend && npx prisma migrate deploy
```

---

## 6. Quy ước kiến trúc Backend

Không chia toàn dự án thành `controllers/`, `services/`, `dto/`.

Mỗi business capability là một module:

```text
modules/
  auth/
  users/
  projects/
  project-members/
  kanban/
  tasks/
  dashboard/
  activity-logs/
```

Controller:
- HTTP only.
- Validate DTO.
- Đọc user hiện tại.
- Gọi service.
- Không viết Prisma query trực tiếp.

Service:
- Chứa business logic.
- Transaction.
- Permission/business invariant.
- Gọi PrismaService.

Prisma:
- Chỉ truy cập qua `PrismaService`.
- Không new PrismaClient rải rác.

## 7. Quy ước RBAC

### System role

`users.systemRole`

```text
ADMIN
USER
```

### Project role

`project_members.role`

```text
OWNER
MANAGER
MEMBER
VIEWER
```

Một user có thể OWNER ở Project A nhưng MEMBER ở Project B.

Không lưu `projectRole` trực tiếp trong bảng User.

## 8. Invariants bắt buộc

1. Tạo project phải chạy transaction:
   - tạo Project;
   - creator -> OWNER;
   - tạo TODO;
   - tạo DOING;
   - tạo DONE (`isCompleted=true`).

2. Task nhiều assignee:
   - dùng `TaskAssignment`;
   - không thêm `assigneeId` vào Task.

3. Trạng thái Done:
   - dựa vào `KanbanColumn.isCompleted`;
   - không dựa vào `column.name === "DONE"`.

4. Khi task chuyển vào completed column:
   - `completedAt = NOW()`.

5. Khi task rời completed column:
   - `completedAt = null`.

6. `ActivityLog` là append-only:
   - không tạo API update/delete log.

7. Archived project là read-only.

## 9. API prefix

```text
/api/v1
```

Health check:

```text
GET /api/v1/health
```

## 10. Branch convention

```text
main
develop
feature/auth
feature/projects
feature/kanban
feature/dashboard
fix/<issue>
```

Trước khi code hay sửa 1 chức năng nào thì hãy tạo branch mới từ `develop` (phải pull code mới nhất từ `develop` về máy trước) và đặt tên nhánh theo tính năng thay đổi ví dụ: feature/auth, feature/task, feature/kanban, feature/dashboard, fix/<issue> Sau đó khi code xong thì push lên và tạo pull request vào `develop` để mọi người review trước khi merge vào `develop`.

Không push thẳng vào `develop` và `main`.

## 11. Commit convention
Commit theo chức năng thay đổi (feat(tính năng mới), fix(sửa lỗi), refactor(cải tiến), docs(tài liệu), style(thay đổi về định dạng), test(kiểm thử)). 
- Chia nhỏ commit. Không thay đổi quá nhiều thứ vào 1 commit.
```text
feat(auth): QuanNH add login endpoint
feat(task): PhongVV support multiple assignees
fix(kanban): KienTT rollback failed task movement
refactor(project): QuanNH extract permission policy
docs(readme): QuanNH update docker guide
```

## 12. Pull Request checklist
- [ ] Build pass
- [ ] Lint pass
- [ ] DTO có validation
- [ ] Không expose password/hash/token
- [ ] API có auth/permission guard đúng
- [ ] Prisma migration đi kèm khi schema thay đổi
- [ ] Không sửa migration đã merge
- [ ] Có xử lý error nghiệp vụ
- [ ] Không query DB trực tiếp trong Controller
- [ ] Không hardcode URL/secret
- Tạo 1 Pull Request vào develop thì phải có ít nhất 1 người(hquannnguyen) approve và merge vào develop. ( Không tự merge PR của chính mình)

### PR convention
Pull Request template

## Description
<!-- Provide a brief summary of what this PR does and why it's needed. -->

## Related Issues
<!-- Link to relevant issues using keywords (e.g., Closes #123). -->

## What's Change
- [ ] List changes summary

## How Has This Been Tested?
<!-- Describe the tests you ran to verify your changes. -->

## Checklist
- [ ] My code follows the coding guidelines of this project.
- [ ] I have performed a self-review of my own code.
- [ ] I have updated the documentation accordingly.
- [ ] Unit test passed
- [ ] No hardcoded secret