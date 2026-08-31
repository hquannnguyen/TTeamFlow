# TTeamFlow — KẾ HOẠCH PHÂN CÔNG & QUY TRÌNH PHÁT TRIỂN

> Kiến trúc: React + Vite → Nginx → NestJS REST API → Prisma ORM → PostgreSQL  
> Mô hình: Mỗi thành viên làm fullstack theo feature  
> Branch flow: `feature/* → develop → main`

## 1. Phạm vi hiện tại
- Authentication & User Management
- Project Management
- Project Member Management
- Kanban
- Task Management
- Checklist
- Comment
- Dashboard
- Activity Logs
- RBAC 2 tầng
- Admin User Management

AI Assistant và realtime WebSocket là phần mở rộng, không bắt buộc ở giai đoạn base.

## 2. Dependency
```text
Auth
 ↓
Users
 ↓
Projects + Members
 ↓
Kanban + Tasks
 ↓
Checklist + Comments
 ↓
Dashboard + Activity Logs
```

## 3. QuanNH — Auth / Users / Projects / Members
### Backend
Auth:
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `POST /auth/refresh`
- `GET /auth/me`
- `PATCH /auth/change-password`

Users:
- `GET /users/me`
- `PATCH /users/me`
- `PATCH /users/me/avatar`

Projects:
- `POST /projects`
- `GET /projects`
- `GET /projects/:projectId`
- `PATCH /projects/:projectId`
- `PATCH /projects/:projectId/archive`
- `PATCH /projects/:projectId/restore`
- `DELETE /projects/:projectId`

Tạo Project phải transaction:
```text
Project
+ Creator → OWNER
+ TODO
+ DOING
+ DONE
+ Activity Log
```

Project Members:
- `GET /projects/:projectId/members`
- `POST /projects/:projectId/members`
- `PATCH /projects/:projectId/members/:userId`
- `DELETE /projects/:projectId/members/:userId`

Rule:
- Không add member trùng.
- Member phải là user tồn tại.
- MANAGER không được quản lý OWNER.
- Remove member phải xóa các TaskAssignment liên quan, không xóa Task.

### Frontend
- Login/Register/Logout
- Profile
- Project list
- Create/Edit/Archive Project
- Member management

### Branch
```text
feature/auth
feature/users-profile
feature/projects
feature/members
```

## 4. PhongVV — Kanban / Tasks / Checklist / Comments
### Backend
Kanban:
- `GET /projects/:projectId/kanban`
- `POST /projects/:projectId/columns`
- `PATCH /projects/:projectId/columns/:columnId`
- `DELETE /projects/:projectId/columns/:columnId`
- `PATCH /projects/:projectId/columns/reorder`

Rule:
- Column có `position`
- Column có `isCompleted`
- Không dùng `column.name === "DONE"` để xác định hoàn thành
- Không xóa column còn task nếu chưa chuyển task

Tasks:
- `POST /projects/:projectId/tasks`
- `GET /tasks/:taskId`
- `PATCH /tasks/:taskId`
- `DELETE /tasks/:taskId`
- `PATCH /tasks/:taskId/move`

Task Assignment:
- `POST /tasks/:taskId/assignees/:userId`
- `DELETE /tasks/:taskId/assignees/:userId`

Rule:
- Task có 0..N assignee
- Dùng `TaskAssignment`, không dùng `Task.assigneeId`
- Assignee phải thuộc project
- Vào completed column → `completedAt = NOW()`
- Rời completed column → `completedAt = null`

Checklist:
- `GET /tasks/:taskId/checklists`
- `POST /tasks/:taskId/checklists`
- `PATCH /checklists/:checklistId`
- `DELETE /checklists/:checklistId`

Comments:
- `GET /tasks/:taskId/comments`
- `POST /tasks/:taskId/comments`
- `PATCH /comments/:commentId`
- `DELETE /comments/:commentId`

### Frontend
- Kanban board
- Drag & Drop
- Task Card
- Task detail modal/page
- Assignee selector
- Checklist
- Comments
- Optimistic update + rollback

### Branch
```text
feature/kanban
feature/tasks
feature/task-assignment
feature/checklist-comment
```

## 5. KienTT — Dashboard / Activity Logs / Admin / RBAC / Polish
### Backend
Dashboard:
- `GET /projects/:projectId/dashboard`

Metrics:
- totalTasks
- completedTasks
- overdueTasks
- progress
- statusDistribution
- memberWorkload

Activity Logs:
- `GET /projects/:projectId/activity-logs`

Event tối thiểu:
```text
PROJECT_CREATED
PROJECT_UPDATED
PROJECT_ARCHIVED
PROJECT_DELETED
MEMBER_ADDED
MEMBER_REMOVED
MEMBER_ROLE_CHANGED
TASK_CREATED
TASK_UPDATED
TASK_MOVED
TASK_COMPLETED
TASK_DELETED
```

Activity Log là append-only.

Admin Users:
- `GET /admin/users`
- `GET /admin/users/:userId`
- `PATCH /admin/users/:userId/status`

RBAC:
- Review `SystemRole`
- Review `ProjectRole`
- Review guard/decorator trên toàn hệ thống

### Frontend
- Dashboard
- Activity feed
- Admin Users
- Permission-aware UI
- Loading/Error/Empty states
- Responsive polish

### Branch
```text
feature/dashboard
feature/activity-logs
feature/admin-users
fix/rbac-permissions
fix/ui-polish
```

## 6. Shared ownership
### RBAC
Mỗi dev tự gắn guard cho route mình viết. KienTT review toàn hệ thống.

### Activity Logs
KienTT sở hữu module log, nhưng QuanNH/PhongVV phải ghi log trong business flow của feature mình làm.

### Prisma schema
Ai sửa `schema.prisma`:
```text
1. Pull develop mới nhất
2. Sửa schema
3. npx prisma format
4. npx prisma validate
5. npx prisma migrate dev --name <name>
6. Commit schema + migration
7. Ghi rõ DB changes trong PR
```

Không sửa migration đã merge.

## 7. Git workflow
```bash
git checkout develop
git pull origin develop
git checkout -b feature/tasks
```

Commit:
```text
feat(auth): QuanNH add login endpoint
feat(project): QuanNH implement project creation transaction
feat(task): PhongVV support multiple assignees
fix(kanban): PhongVV rollback failed task movement
```

Không ghi tên developer trong commit message.

PR:
```text
feature/* → develop
```

`develop → main` chỉ khi:
- Hoàn thành milestone/sprint
- CI xanh
- Integration local ổn
- Có reviewer approve

Không auto-merge `develop → main`.

## 8. Definition of Done
Backend:
- [ ] DTO validation
- [ ] Business rule đúng
- [ ] Auth/RBAC đúng
- [ ] Error handling đúng status code
- [ ] Không expose sensitive data
- [ ] Migration nếu schema đổi
- [ ] Transaction nếu cần atomicity
- [ ] Activity log nếu action trọng yếu

Frontend:
- [ ] API integration
- [ ] Loading state
- [ ] Error state
- [ ] Empty state nếu cần
- [ ] Permission-aware UI
- [ ] Không duplicate server state không cần thiết

Quality:
- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] `npx prisma validate`
- [ ] CI pass
- [ ] Reviewer approve
- [ ] Không commit `.env`, secret, `node_modules`, `dist`

## 9. Milestones
Milestone 1:
```text
Register → Login → Create Project → Auto OWNER/TODO/DOING/DONE → Add Member
```

Milestone 2:
```text
Create Task → Assign Member → TODO → DOING → DONE → completedAt
```

Milestone 3:
- Dashboard
- Activity Logs
- Admin Users
- RBAC audit

Milestone 4:
- Integration test
- Permission matrix test
- UI polish
- CI green
- Merge `develop → main`
