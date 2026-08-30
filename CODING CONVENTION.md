# CODING CONVENTION
## HỆ THỐNG QUẢN LÝ DỰ ÁN NHÓM

**Tech Stack**

- Frontend: React + Vite + TypeScript
- Backend: NestJS + TypeScript
- ORM: Prisma
- Database: PostgreSQL
- Reverse Proxy: Nginx
- Containerization: Docker / Docker Compose
- Source Control: Git + GitHub
- CI: GitHub Actions

---

# 1. MỤC ĐÍCH

Tài liệu này quy định cách tổ chức source code, đặt tên, viết API, sử dụng Git, xử lý database và phối hợp giữa các thành viên trong nhóm.

Mục tiêu:

- Code của các thành viên có cùng một phong cách.
- Giảm conflict khi merge.
- Giúp thành viên khác dễ đọc và bảo trì code.
- Hạn chế duplicate logic.
- Hạn chế lỗi phân quyền.
- Hạn chế lỗi database migration.
- Giúp Pull Request dễ review.
- Chuẩn hóa cách phát triển Backend và Frontend.

Tất cả thành viên tham gia dự án phải tuân thủ các convention trong tài liệu này.

---

# 2. KIẾN TRÚC CHUNG

Kiến trúc hệ thống:

```text
Browser
   │
   ▼
React + Vite
   │
   ▼
Nginx
   │
   ▼
NestJS REST API
   │
   ▼
Prisma ORM
   │
   ▼
PostgreSQL
```

Trong môi trường development:

```text
Frontend
http://localhost:5173

Backend
http://localhost:3000/api/v1

PostgreSQL
localhost:5432
```

Trong Docker:

```text
Browser
   │
   ▼
Nginx
   │
   ├── /       → React
   │
   └── /api/*  → NestJS
                    │
                    ▼
                 Prisma
                    │
                    ▼
                PostgreSQL
```

---

# 3. QUY TẮC CHUNG

## 3.1. Ngôn ngữ trong source code

Tên biến, class, function, interface, enum và API phải sử dụng **tiếng Anh**.

Đúng:

```ts
createProject()

projectMember

taskAssignment

completedAt
```

Không dùng:

```ts
taoDuAn()

thanhVienDuAn

congViec
```

Comment có thể dùng tiếng Việt hoặc tiếng Anh, tuy nhiên nên ưu tiên tiếng Anh cho những đoạn kỹ thuật.

---

## 3.2. Không viết tắt khó hiểu

Không nên:

```ts
const usr = ...
const prj = ...
const tsk = ...
const mgr = ...
```

Nên:

```ts
const user = ...
const project = ...
const task = ...
const manager = ...
```

Một số từ viết tắt phổ biến được phép:

```text
id
dto
api
url
jwt
http
db
ui
```

---

# 4. QUY ƯỚC GIT BRANCH

Repository sử dụng mô hình:

```text
main
  ↑
develop
  ↑
feature/*
```

## 4.1. main

`main` chứa phiên bản ổn định.

Không được code trực tiếp trên `main`.

Không được push trực tiếp vào `main`.

Chỉ merge:

```text
develop → main
```

khi:

- Hoàn thành milestone.
- Hoàn thành sprint.
- Chuẩn bị demo.
- CI đã pass.
- Các chức năng chính đã được kiểm tra.

---

## 4.2. develop

`develop` là branch tích hợp code của cả nhóm.

Mọi feature phải merge vào:

```text
develop
```

trước khi được đưa lên `main`.

Không nên push trực tiếp lên `develop`.

---

## 4.3. Feature branch

Mỗi chức năng phải có branch riêng.

Cấu trúc:

```text
feature/<feature-name>
```

Ví dụ:

```text
feature/auth
feature/project-management
feature/project-member
feature/kanban
feature/task
feature/dashboard
feature/comment
```

Bug:

```text
fix/<bug-name>
```

Ví dụ:

```text
fix/login-refresh-token
fix/kanban-position
fix/task-permission
```

Refactor:

```text
refactor/<scope>
```

Ví dụ:

```text
refactor/project-service
```

---

# 5. QUY TRÌNH LÀM VIỆC CỦA MỘT DEV

Trước khi bắt đầu code:

```bash
git checkout develop
git pull origin develop
```

Tạo branch:

```bash
git checkout -b feature/task
```

Sau khi hoàn thành:

```bash
git add .
git commit -m "feat(task): QuanNH implement create task"
git push origin feature/task
```

Sau đó tạo:

```text
Pull Request

feature/task
      ↓
develop
```

Không merge nếu CI đang fail.

---

# 6. COMMIT MESSAGE CONVENTION

Sử dụng format:

```text
<type>(<scope>): <user name> <description>
```

Ví dụ:

```text
feat(auth): QuanNH implement login
feat(project): KienTT add project creation
feat(task): PhongVV support multiple assignees

fix(auth): QuanNH handle expired refresh token
fix(kanban): PhongVV correct task position after move

refactor(project): KienTT extract project permission logic

docs(readme): QuanNH update development guide

test(task): QuanNH add create task unit tests

chore(deps): PhongVV update dependencies
```

Các `type` được sử dụng:

```text
feat      chức năng mới
fix       sửa lỗi
refactor  tái cấu trúc code
docs      tài liệu
test      test
chore     cấu hình / dependency
style     format code
```

Không dùng commit message kiểu:

```text
update
fix
code
abc
done
final
test
sua loi
```

---

# 7. BACKEND ARCHITECTURE

Backend sử dụng kiến trúc theo module.

```text
src/
│
├── common/
├── prisma/
└── modules/
    ├── auth/
    ├── users/
    ├── projects/
    ├── project-members/
    ├── kanban/
    ├── tasks/
    ├── checklists/
    ├── comments/
    ├── dashboard/
    └── activity-logs/
```

Không tổ chức:

```text
controllers/
services/
repositories/
dtos/
```

cho toàn bộ project.

---

# 8. CẤU TRÚC MỘT BACKEND MODULE

Module tiêu chuẩn:

```text
tasks/
├── dto/
│   ├── create-task.dto.ts
│   ├── update-task.dto.ts
│   └── move-task.dto.ts
│
├── tasks.controller.ts
├── tasks.service.ts
└── tasks.module.ts
```

Nếu module lớn mới tách thêm:

```text
tasks/
├── dto/
├── policies/
├── mappers/
├── constants/
├── interfaces/
├── tasks.controller.ts
├── tasks.service.ts
└── tasks.module.ts
```

Không tạo abstraction quá sớm nếu chưa thực sự cần.

---

# 9. CONTROLLER CONVENTION

Controller chỉ chịu trách nhiệm:

- Nhận HTTP request.
- Đọc params/query/body.
- Validate DTO.
- Đọc current user.
- Kiểm tra Guard.
- Gọi Service.
- Trả response.

Controller **không chứa business logic phức tạp**.

Controller **không query Prisma trực tiếp**.

Sai:

```ts
@Post()
async create(@Body() dto: CreateTaskDto) {
  return this.prisma.task.create({
    data: dto,
  });
}
```

Đúng:

```ts
@Post()
create(
  @CurrentUser() user: AuthUser,
  @Body() dto: CreateTaskDto,
) {
  return this.tasksService.create(user.id, dto);
}
```

---

# 10. SERVICE CONVENTION

Service chứa:

- Business logic.
- Permission nghiệp vụ.
- Database query.
- Prisma transaction.
- Validation liên quan nghiệp vụ.
- Activity log.

Ví dụ:

```ts
@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    projectId: string,
    userId: string,
    dto: CreateTaskDto,
  ) {
    // business logic
  }
}
```

Không nên tạo Service chỉ để gọi lại một hàm Prisma mà không có lý do.

---

# 11. DEPENDENCY FLOW

Backend phải tuân theo:

```text
HTTP Request
     ↓
Controller
     ↓
Service
     ↓
PrismaService
     ↓
PostgreSQL
```

Không:

```text
Controller
     ↓
Prisma
```

Không:

```text
Frontend
     ↓
Database
```

---

# 12. FILE NAMING

TypeScript file sử dụng:

```text
kebab-case
```

Ví dụ:

```text
create-project.dto.ts
project-members.service.ts
jwt-auth.guard.ts
current-user.decorator.ts
activity-log.interface.ts
```

Không:

```text
CreateProjectDto.ts
projectMembersService.ts
JWTGuard.ts
```

---

# 13. CLASS NAMING

Class sử dụng:

```text
PascalCase
```

Ví dụ:

```ts
class CreateProjectDto {}

class ProjectsService {}

class ProjectRoleGuard {}

class AuthController {}
```

---

# 14. VARIABLE VÀ FUNCTION NAMING

Sử dụng:

```text
camelCase
```

Ví dụ:

```ts
const projectId = ...

const currentUser = ...

const completedTasks = ...

function createProject() {}

function validateProjectMember() {}
```

Boolean nên bắt đầu bằng:

```text
is
has
can
should
```

Ví dụ:

```ts
isActive
isCompleted
hasPermission
canEdit
shouldRefresh
```

Không nên:

```ts
active
completed
permission
```

nếu đó là boolean mà tên gây mơ hồ.

---

# 15. CONSTANT NAMING

Global constant:

```text
UPPER_SNAKE_CASE
```

Ví dụ:

```ts
const DEFAULT_PAGE_SIZE = 20;

const MAX_UPLOAD_SIZE = 2 * 1024 * 1024;
```

---

# 16. ENUM CONVENTION

Enum name:

```text
PascalCase
```

Enum value:

```text
UPPER_SNAKE_CASE
```

Ví dụ:

```ts
enum TaskPriority {
  LOW,
  MEDIUM,
  HIGH,
  URGENT,
}
```

Project role:

```ts
enum ProjectRole {
  OWNER,
  MANAGER,
  MEMBER,
  VIEWER,
}
```

System role:

```ts
enum SystemRole {
  ADMIN,
  USER,
}
```

Không dùng:

```text
admin
Admin
project_manager
```

trong cùng một enum.

---

# 17. RBAC CONVENTION

Hệ thống sử dụng RBAC 2 tầng.

## System Role

```text
ADMIN
USER
```

Được lưu trong:

```text
users.system_role
```

## Project Role

```text
OWNER
MANAGER
MEMBER
VIEWER
```

Được lưu trong:

```text
project_members.role
```

Một User có thể có role khác nhau ở từng project.

Ví dụ:

```text
User A

Project 1 → OWNER
Project 2 → MEMBER
Project 3 → VIEWER
```

Tuyệt đối không thêm:

```ts
user.projectRole
```

vào User.

Quyền dự án phải được lấy từ:

```text
project_members
```

Thiết kế này phù hợp với đặc tả RBAC hai tầng của hệ thống.

---

# 18. GUARD CONVENTION

Xác thực:

```text
JwtAuthGuard
```

Role hệ thống:

```text
SystemRoleGuard
```

Role project:

```text
ProjectRoleGuard
```

Ví dụ:

```ts
@ProjectRoles(
  ProjectRole.OWNER,
  ProjectRole.MANAGER,
)
@Patch(':projectId')
updateProject() {}
```

Không kiểm role bằng cách copy-paste:

```ts
if (
  role !== 'OWNER' &&
  role !== 'MANAGER'
) {
  ...
}
```

ở hàng chục Controller.

Permission phải được centralize bằng Guard hoặc Policy.

---

# 19. DTO CONVENTION

Mọi request body phải dùng DTO.

Không dùng:

```ts
@Post()
create(@Body() body: any) {}
```

Đúng:

```ts
@Post()
create(@Body() dto: CreateTaskDto) {}
```

DTO phải có validation.

Ví dụ:

```ts
export class CreateTaskDto {
  @IsString()
  @MinLength(1)
  @MaxLength(250)
  title: string;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;
}
```

Không tin dữ liệu frontend gửi lên.

Backend luôn validate lại.

---

# 20. DTO NAMING

Sử dụng:

```text
Create<Project>Dto
Update<Project>Dto

CreateTaskDto
UpdateTaskDto
MoveTaskDto

AddProjectMemberDto
UpdateProjectMemberRoleDto
```

Không sử dụng tên mơ hồ:

```text
TaskData
TaskRequest
TaskObject
InputData
DataDto
```

---

# 21. PRISMA CONVENTION

Chỉ sử dụng một:

```text
PrismaService
```

toàn hệ thống.

Không:

```ts
const prisma = new PrismaClient();
```

trong từng Service.

Đúng:

```ts
constructor(
  private readonly prisma: PrismaService,
) {}
```

---

# 22. DATABASE TABLE NAMING

Database sử dụng:

```text
snake_case
```

Ví dụ:

```text
users
projects
project_members
kanban_columns
tasks
task_assignments
checklist_items
activity_logs
refresh_tokens
```

Prisma model sử dụng:

```text
PascalCase
```

Ví dụ:

```prisma
model ProjectMember {
}
```

Map xuống DB:

```prisma
@@map("project_members")
```

Field TypeScript:

```text
camelCase
```

Field DB:

```text
snake_case
```

Ví dụ:

```prisma
completedAt DateTime? @map("completed_at")
```

---

# 23. PRIMARY KEY

Sử dụng UUID:

```prisma
id String @id @default(uuid()) @db.Uuid
```

Không sử dụng ID tự tăng cho các entity chính trừ khi có lý do rõ ràng.

---

# 24. TIMESTAMP CONVENTION

Entity thông thường nên có:

```text
createdAt
updatedAt
```

Nếu sử dụng soft delete:

```text
deletedAt
```

Ví dụ:

```prisma
createdAt DateTime  @default(now())
updatedAt DateTime  @updatedAt
deletedAt DateTime?
```

Không dùng:

```text
create_time
last_modify
dateUpdate
```

trong code TypeScript.

---

# 25. TASK ASSIGNMENT CONVENTION

Theo nghiệp vụ, một Task có thể được giao cho 0, 1 hoặc nhiều thành viên.

Do đó phải sử dụng:

```text
Task
     N
     │
     │
TaskAssignment
     │
     N
     │
    User
```

Không thêm:

```prisma
assigneeId String?
```

vào Task.

Đúng:

```prisma
model TaskAssignment {
  taskId String
  userId String

  @@unique([taskId, userId])
}
```

---

# 26. KANBAN CONVENTION

Không được xác định Task hoàn thành bằng tên Column.

Sai:

```ts
if (column.name === 'DONE') {
  task.completedAt = new Date();
}
```

Vì Manager có thể đổi tên:

```text
DONE
→ Completed
→ Finished
```

Đúng:

```ts
if (column.isCompleted) {
  ...
}
```

Kanban column phải có:

```prisma
isCompleted Boolean
```

Khi Task chuyển vào completed column:

```ts
completedAt = new Date();
```

Khi Task được kéo ra khỏi completed column:

```ts
completedAt = null;
```

Đây là hành vi đã được đặc tả cho Kanban của hệ thống.

---

# 27. KANBAN POSITION

Không sử dụng index của array làm dữ liệu duy nhất.

Task cần trường:

```text
position
```

Ví dụ:

```text
Task A → 1000
Task B → 2000
Task C → 3000
```

Khi kéo Task vào giữa:

```text
1500
```

Nếu khoảng position quá nhỏ thì normalize lại.

Operation thay đổi nhiều Task phải chạy trong transaction.

---

# 28. DATABASE TRANSACTION

Phải sử dụng:

```ts
prisma.$transaction()
```

khi một nghiệp vụ thay đổi nhiều bảng mà yêu cầu tất cả cùng thành công hoặc cùng rollback.

Ví dụ bắt buộc:

### Create Project

```text
Create Project
+
Add Creator as OWNER
+
Create TODO
+
Create DOING
+
Create DONE
+
Create Activity Log
```

Phải nằm trong một transaction.

Theo nghiệp vụ, project mới phải tự tạo ba column mặc định và creator trở thành Owner.

---

# 29. MIGRATION CONVENTION

Khi sửa:

```text
schema.prisma
```

phải tạo migration.

Ví dụ:

```bash
npx prisma migrate dev --name add_task_assignment
```

Commit cả:

```text
prisma/schema.prisma
```

và:

```text
prisma/migrations/
```

Không chỉ commit `schema.prisma`.

---

# 30. KHÔNG SỬA MIGRATION ĐÃ MERGE

Giả sử migration sau đã được merge:

```text
20260830_create_tasks
```

Không được sửa file SQL cũ.

Nếu muốn thay đổi:

```text
task.description
```

hãy tạo migration mới:

```bash
npx prisma migrate dev --name update_task_description
```

---

# 31. KHÔNG DÙNG DB PUSH CHO TEAM WORKFLOW

Không sử dụng thường xuyên:

```bash
npx prisma db push
```

để thay thế migration.

Team phải đồng bộ database thông qua:

```text
schema.prisma
+
migrations
```

---

# 32. API CONVENTION

Base URL:

```text
/api/v1
```

API phải sử dụng REST convention.

---

# 33. HTTP METHOD

Read:

```http
GET
```

Create:

```http
POST
```

Update:

```http
PATCH
```

Delete:

```http
DELETE
```

Không dùng:

```http
POST /deleteTask
POST /updateProject
POST /getUsers
```

---

# 34. API URL NAMING

URL sử dụng:

```text
lowercase
plural nouns
kebab-case khi cần
```

Đúng:

```http
GET /projects

POST /projects

GET /projects/:projectId/members

POST /projects/:projectId/tasks

PATCH /tasks/:taskId/move
```

Không:

```text
/getProjects
/createProject
/project/getMember
/taskMove
```

---

# 35. NESTED ROUTE

Nếu resource phụ thuộc rõ vào parent:

```http
GET /projects/:projectId/members
GET /projects/:projectId/kanban
POST /projects/:projectId/tasks
```

Nếu resource đã có ID duy nhất:

```http
GET /tasks/:taskId
PATCH /tasks/:taskId
DELETE /tasks/:taskId
```

Không cần:

```text
/projects/:projectId/tasks/:taskId
```

cho mọi operation nếu `taskId` đã đủ để xác định Task.

---

# 36. API RESPONSE

Success:

```json
{
  "success": true,
  "data": {}
}
```

List có pagination:

```json
{
  "success": true,
  "data": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

Error:

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Invalid request",
  "timestamp": "2026-08-30T10:00:00.000Z",
  "path": "/api/v1/tasks"
}
```

Không để mỗi Controller tự thiết kế response format khác nhau.

---

# 37. HTTP STATUS CODE

Sử dụng:

```text
200 OK
Read / Update thành công

201 Created
Create thành công

400 Bad Request
Input hoặc business rule không hợp lệ

401 Unauthorized
Chưa xác thực / token hết hạn

403 Forbidden
Đã xác thực nhưng không có quyền

404 Not Found
Resource không tồn tại

409 Conflict
Duplicate / conflict

500 Internal Server Error
Lỗi hệ thống ngoài dự kiến
```

Ví dụ email trùng:

```text
409 Conflict
```

không phải:

```text
500
```

---

# 38. ERROR HANDLING

Không:

```ts
try {
  ...
} catch (error) {
  return null;
}
```

Không swallow error.

Business exception sử dụng NestJS exception:

```ts
throw new NotFoundException(
  'Không tìm thấy dự án',
);
```

```ts
throw new ForbiddenException(
  'Bạn không có quyền thực hiện hành động này',
);
```

```ts
throw new ConflictException(
  'Thành viên đã ở trong dự án',
);
```

Global Exception Filter chịu trách nhiệm chuẩn hóa response.

---

# 39. AUTHENTICATION

Access Token:

```text
15 phút
```

Refresh Token:

```text
7 ngày
```

Theo đặc tả hiện tại của hệ thống.

Refresh Token nên lưu:

```text
HttpOnly Cookie
```

Access Token có thể giữ:

```text
Frontend memory
```

Không expose refresh token trong response frontend nếu đang sử dụng HttpOnly Cookie.

---

# 40. PASSWORD

Password phải:

```text
>= 8 ký tự
```

Khuyến nghị yêu cầu:

```text
1 chữ thường
1 chữ hoa
1 chữ số
1 ký tự đặc biệt
```

Password phải hash bằng bcrypt.

Không bao giờ lưu:

```text
plain password
```

Không bao giờ return:

```text
passwordHash
```

qua API.

---

# 41. ACTIVITY LOG

Activity Log là append-only.

Được phép:

```text
INSERT
SELECT
```

Không expose API:

```text
UPDATE activity log
DELETE activity log
```

Các event quan trọng nên log:

```text
PROJECT_CREATED

PROJECT_UPDATED

PROJECT_ARCHIVED

MEMBER_ADDED

MEMBER_REMOVED

MEMBER_ROLE_CHANGED

TASK_CREATED

TASK_UPDATED

TASK_MOVED

TASK_COMPLETED

TASK_DELETED
```

Tài liệu yêu cầu các thao tác trọng yếu được ghi vào `activity_logs` và log không được chỉnh sửa/xóa.

Không lưu vào Activity Log:

```text
password
accessToken
refreshToken
secret
```

---

# 42. FRONTEND ARCHITECTURE

Frontend tổ chức theo feature.

```text
src/
│
├── app/
│   ├── router/
│   └── providers/
│
├── api/
│
├── components/
│   ├── ui/
│   └── layout/
│
├── features/
│   ├── auth/
│   ├── projects/
│   ├── members/
│   ├── kanban/
│   ├── tasks/
│   ├── dashboard/
│   └── admin/
│
├── hooks/
├── types/
└── utils/
```

Không gom toàn bộ UI vào:

```text
components/
```

một cách không phân loại.

---

# 43. FEATURE FRONTEND

Ví dụ:

```text
features/
└── tasks/
    ├── api/
    │   └── tasks.api.ts
    │
    ├── components/
    │   ├── TaskCard.tsx
    │   └── TaskModal.tsx
    │
    ├── hooks/
    │   └── useTasks.ts
    │
    ├── pages/
    ├── schemas/
    ├── types/
    └── utils/
```

Code chỉ sử dụng bởi Task nên để trong:

```text
features/tasks
```

Component dùng chung nhiều feature mới đưa vào:

```text
components/ui
```

---

# 44. REACT COMPONENT NAMING

Component:

```text
PascalCase
```

Ví dụ:

```text
TaskCard.tsx
ProjectCard.tsx
KanbanColumn.tsx
MemberAvatar.tsx
```

Function:

```tsx
export function TaskCard() {
  ...
}
```

Không:

```text
taskcard.tsx
task_card.tsx
```

---

# 45. CUSTOM HOOK

Hook phải bắt đầu bằng:

```text
use
```

Ví dụ:

```text
useProjects()
useKanban()
useCurrentUser()
useTaskMutation()
```

---

# 46. API CALL FRONTEND

Không gọi Axios trực tiếp trong UI component.

Không:

```tsx
function ProjectPage() {
  axios.get('/projects');
}
```

Đúng:

```text
features/projects/api/projects.api.ts
```

```ts
export async function getProjects() {
  return http.get('/projects');
}
```

Component sử dụng:

```ts
useQuery({
  queryKey: ['projects'],
  queryFn: getProjects,
});
```

---

# 47. SERVER STATE

Dữ liệu đến từ backend phải ưu tiên quản lý bằng:

```text
TanStack Query
```

Ví dụ:

```text
projects
tasks
members
comments
dashboard
kanban
```

Không copy toàn bộ server data sang Zustand nếu không cần.

---

# 48. CLIENT STATE

Zustand dành cho:

```text
access token
sidebar state
theme
temporary UI state
```

Không dùng Zustand như một database thứ hai.

---

# 49. QUERY KEY CONVENTION

Ví dụ:

```ts
['projects']
```

```ts
['project', projectId]
```

```ts
['kanban', projectId]
```

```ts
['project-members', projectId]
```

```ts
['task', taskId]
```

Không sử dụng các string ngẫu nhiên:

```ts
['data1']
['abc']
['load']
```

---

# 50. FORM

Form nên sử dụng:

```text
React Hook Form
+
Zod
```

Frontend validation nhằm cải thiện UX.

Tuy nhiên:

> Frontend validation không thay thế Backend validation.

Backend vẫn phải validate DTO.

---

# 51. KANBAN FRONTEND

Sử dụng:

```text
dnd-kit
```

Flow:

```text
Drag
 ↓
Optimistic update UI
 ↓
PATCH /tasks/:id/move
 ↓
Success
```

Nếu request fail:

```text
Rollback UI
+
Toast error
```

Đây cũng là behavior được yêu cầu trong đặc tả hiện tại.

---

# 52. TYPESCRIPT

Không lạm dụng:

```ts
any
```

Sai:

```ts
function handleTask(task: any) {
}
```

Đúng:

```ts
function handleTask(task: Task) {
}
```

Nếu dữ liệu chưa xác định:

```ts
unknown
```

tốt hơn `any`.

---

# 53. NULL VÀ UNDEFINED

Không sử dụng lẫn lộn tùy ý.

Convention:

```text
undefined
→ giá trị optional ở TypeScript/DTO.

null
→ giá trị thực sự không tồn tại trong DB/API.
```

Ví dụ:

```ts
description?: string;
```

Database:

```text
completedAt = null
```

---

# 54. ASYNC / AWAIT

Ưu tiên:

```ts
async/await
```

Đúng:

```ts
const project =
  await this.prisma.project.findUnique(...);
```

Hạn chế chuỗi:

```ts
.then()
.then()
.then()
.catch()
```

nếu làm code khó đọc.

---

# 55. EARLY RETURN

Ưu tiên giảm nesting.

Không:

```ts
if (user) {
  if (user.isActive) {
    if (hasPermission) {
      ...
    }
  }
}
```

Nên:

```ts
if (!user) {
  throw new NotFoundException();
}

if (!user.isActive) {
  throw new ForbiddenException();
}

if (!hasPermission) {
  throw new ForbiddenException();
}

...
```

---

# 56. MAGIC NUMBER

Không:

```ts
if (file.size > 2097152) {
}
```

Nên:

```ts
const MAX_AVATAR_SIZE =
  2 * 1024 * 1024;
```

---

# 57. COMMENT CONVENTION

Không comment điều hiển nhiên.

Không:

```ts
// Create user
const user = await prisma.user.create(...);
```

Comment nên giải thích:

```text
WHY
```

không phải:

```text
WHAT
```

Ví dụ tốt:

```ts
// Keep task positions sparse so a drag operation
// can usually insert a midpoint without reindexing
// the whole column.
const DEFAULT_POSITION_GAP = 1000;
```

---

# 58. TODO CONVENTION

Nếu code chưa hoàn thiện:

```ts
// TODO(task): normalize positions when gaps become too small.
```

Không:

```ts
// TODO
```

mà không ghi mục tiêu.

Nếu TODO quan trọng, tạo GitHub Issue.

---

# 59. ENVIRONMENT VARIABLE

Không hardcode:

```ts
const api = 'http://localhost:3000';
```

Không:

```ts
const jwtSecret = '123456';
```

Phải dùng:

```text
.env
```

và:

```text
.env.example
```

Commit:

```text
.env.example
```

Không commit:

```text
.env
```

---

# 60. SECRET

Không được commit:

```text
DATABASE_URL thực tế
JWT secret
API key
password
private key
token
```

Nếu secret từng bị push lên GitHub:

> Không chỉ xóa commit. Phải rotate/revoke secret đó.

---

# 61. DOCKER CONVENTION

Trong container:

```text
localhost
```

chỉ container hiện tại.

Backend muốn gọi PostgreSQL phải dùng service name:

```text
postgres:5432
```

Không:

```text
localhost:5432
```

Frontend/Nginx gọi backend:

```text
backend:3000
```

---

# 62. DATABASE LOCAL

Mỗi Dev sử dụng database local riêng.

Ví dụ:

```text
Dev A PC
├── Frontend
├── Backend
└── PostgreSQL

Dev B PC
├── Frontend
├── Backend
└── PostgreSQL
```

Không chia sẻ một database development chung nếu không có nhu cầu đặc biệt.

Schema được đồng bộ thông qua:

```text
Git
+
Prisma migrations
```

---

# 63. TEST CONVENTION

Unit test:

```text
*.spec.ts
```

E2E:

```text
*.e2e-spec.ts
```

Ví dụ:

```text
auth.service.spec.ts
projects.service.spec.ts
tasks.service.spec.ts

auth.e2e-spec.ts
projects.e2e-spec.ts
```

Các nghiệp vụ quan trọng nên được ưu tiên test:

```text
Login
Create Project
RBAC
Add Member
Create Task
Move Task
Task completion
```

---

# 64. CI RULE

Pull Request phải pass CI trước khi merge.

CI tối thiểu:

```text
Backend
├── npm ci
├── prisma generate
├── prisma validate
├── lint
└── build

Frontend
├── npm ci
├── lint
└── build

Docker
└── docker compose build
```

Khi có automated test:

```text
Backend
├── lint
├── unit test
├── integration/e2e test
├── build
└── docker build
```

---

# 65. PULL REQUEST CONVENTION

PR title:

```text
feat(task): implement task assignment
```

PR phải mô tả ít nhất:

```text
## What

Chức năng được thay đổi.

## Why

Tại sao cần thay đổi.

## Changes

Các thay đổi chính.

## Database Changes

Có / Không.

Nếu có:
migration nào được thêm.

## API Changes

Endpoint mới/thay đổi.

## Test

Cách đã kiểm tra.

## Screenshot

Nếu có thay đổi UI.
```

---

# 66. PR SIZE

Không nên tạo PR có:

```text
50-100 file
```

nếu có thể chia nhỏ.

Ưu tiên:

```text
1 PR
=
1 feature hoặc 1 nhóm thay đổi liên quan chặt chẽ
```

Ví dụ tốt:

```text
PR 1
Create Project

PR 2
Project Member

PR 3
Kanban Column

PR 4
Create Task
```

Không nên:

```text
PR:
Auth + Project + Kanban + Dashboard + CSS
```

---

# 67. CODE REVIEW

Reviewer kiểm tra:

```text
[ ] Có đúng nghiệp vụ không?

[ ] Có đúng kiến trúc không?

[ ] Controller có business logic không?

[ ] DTO có validation chưa?

[ ] API có permission guard chưa?

[ ] Có expose dữ liệu nhạy cảm không?

[ ] Prisma query có hợp lý không?

[ ] Có transaction khi cần không?

[ ] DB schema thay đổi có migration chưa?

[ ] Naming có đúng convention không?

[ ] Error handling đã đầy đủ chưa?

[ ] Có duplicate code không?

[ ] Build có pass không?

[ ] CI có pass không?
```

---

# 68. KHÔNG MERGE CODE CHỈ VÌ "CHẠY ĐƯỢC"

Code chạy được chưa đồng nghĩa với code đủ điều kiện merge.

Phải kiểm tra:

```text
Correctness
+
Architecture
+
Security
+
Readability
+
Maintainability
+
CI
```

---

# 69. QUY ƯỚC MODULE OWNERSHIP

Có thể chia trách nhiệm như:

```text
Dev A
Auth
User
System RBAC

Dev B
Project
Project Member
Project RBAC

Dev C
Kanban
Task
Task Assignment

Dev D
Checklist
Comment
Dashboard
Activity Log
```

Tuy nhiên:

> Code thuộc repository chung, không phải code riêng của một người.

Thành viên khác được phép sửa module khi có lý do, nhưng phải thông báo nếu thay đổi ảnh hưởng tới API hoặc database của module khác.

---

# 70. THAY ĐỔI API

Nếu Dev Backend thay đổi:

```text
request body
response
endpoint
field name
enum
```

phải thông báo cho Dev Frontend.

Ví dụ:

```text
priority:
NORMAL
```

đổi thành:

```text
MEDIUM
```

phải cập nhật contract trước khi merge.

Không tự ý thay API khiến frontend bị lỗi mà không thông báo.

---

# 71. THAY ĐỔI DATABASE

Nếu thay đổi:

```text
table
column
relation
enum
constraint
```

phải:

```text
1. Sửa schema.prisma
2. Tạo migration
3. Kiểm tra migration
4. Commit migration
5. Ghi trong PR
6. Thông báo team nếu ảnh hưởng module khác
```

---

# 72. ARCHIVED PROJECT

Project có trạng thái:

```text
ACTIVE
ARCHIVED
```

Khi:

```text
ARCHIVED
```

project phải ở chế độ read-only.

Service phải chặn mutation.

Không chỉ disable button frontend.

Frontend chỉ hỗ trợ UX.

Backend mới là lớp enforcement cuối cùng.

---

# 73. SOFT DELETE

Entity sử dụng soft delete phải luôn query:

```ts
where: {
  deletedAt: null,
}
```

Không để record deleted xuất hiện trong API thông thường.

Nếu sau này có Trash/Restore thì viết endpoint riêng.

---

# 74. SECURITY RULE

Không tin frontend.

Frontend gửi:

```json
{
  "projectId": "...",
  "userId": "...",
  "role": "OWNER"
}
```

không đồng nghĩa backend được phép thực hiện.

Backend phải kiểm:

```text
Authentication
↓
Membership
↓
Role
↓
Business Rule
↓
Database Operation
```

---

# 75. QUY TẮC QUAN TRỌNG NHẤT CỦA PROJECT

Các quy tắc sau không được phá vỡ nếu chưa được cả nhóm thống nhất.

### Rule 1

RBAC gồm hai tầng:

```text
SystemRole
+
ProjectRole
```

---

### Rule 2

Task có nhiều assignee thông qua:

```text
TaskAssignment
```

Không dùng:

```text
Task.assigneeId
```

---

### Rule 3

Task hoàn thành dựa vào:

```text
KanbanColumn.isCompleted
```

Không dựa vào:

```text
column.name
```

---

### Rule 4

Create Project phải transaction:

```text
Project
+
OWNER
+
TODO
+
DOING
+
DONE
```

---

### Rule 5

Backend quyết định permission.

Frontend không phải security layer.

---

### Rule 6

Không sửa migration đã merge.

---

### Rule 7

Activity Log là append-only.

---

### Rule 8

Không commit `.env`, token hoặc secret.

---

### Rule 9

Không push trực tiếp `main`.

---

### Rule 10

PR chỉ được merge khi CI pass.

---

# 76. CHECKLIST TRƯỚC KHI PUSH

Mỗi Dev tự kiểm:

```text
[ ] Tôi đang ở đúng feature branch.

[ ] Tôi đã pull develop mới nhất.

[ ] Code chạy local.

[ ] Không có console.log/debug code không cần thiết.

[ ] Không commit .env.

[ ] Không commit secret.

[ ] Backend DTO đã validation.

[ ] Permission backend đã kiểm tra.

[ ] Không return password/token/hash.

[ ] Prisma schema thay đổi đã có migration.

[ ] Không sửa migration cũ.

[ ] Frontend không gọi Axios trực tiếp trong page/component.

[ ] Không sử dụng any nếu không cần.

[ ] Lint pass.

[ ] Build pass.

[ ] Commit message đúng convention.
```

---

# 77. CHECKLIST TRƯỚC KHI MERGE PR

Reviewer kiểm tra:

```text
[ ] CI xanh.

[ ] PR đúng scope.

[ ] Không có file ngoài phạm vi bị sửa nhầm.

[ ] Naming đúng convention.

[ ] Không duplicate business logic.

[ ] Controller mỏng.

[ ] Service xử lý đúng nghiệp vụ.

[ ] RBAC đúng.

[ ] Migration đúng.

[ ] Không có secret.

[ ] API contract rõ ràng.

[ ] Error code hợp lý.

[ ] Không phá chức năng hiện tại.

[ ] Code đủ dễ hiểu để thành viên khác maintain.
```

---

# 78. NGUYÊN TẮC CUỐI CÙNG

Mục tiêu của Coding Convention không phải ép mọi người viết code giống từng ký tự.

Mục tiêu là:

```text
Một thành viên mở code của thành viên khác
                 ↓
     hiểu được cấu trúc ngay
                 ↓
      biết logic nằm ở đâu
                 ↓
    biết sửa ở vị trí nào
                 ↓
không làm phá kiến trúc chung
```

Khi chưa chắc cách triển khai một chức năng, thành viên không nên tự tạo một pattern mới.

Hãy ưu tiên:

```text
1. Kiểm tra convention hiện tại.

2. Xem module tương tự đã có.

3. Trao đổi với nhóm nếu thay đổi architecture.

4. Chỉ tạo convention/pattern mới khi thực sự cần.
```

> **Consistency is more important than personal coding style.**

Toàn bộ thành viên sử dụng chung các convention trên trong quá trình phát triển dự án.