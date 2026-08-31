# TTeamFlow — REQUEST / RESPONSE CONTRACT

> Contract dùng để Backend và Frontend code song song.

## 1. Auth

### Register
```http
POST /api/v1/auth/register
```

Request:
```json
{
  "fullName": "Nguyen Van A",
  "email": "vana@example.com",
  "password": "Password@123"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "fullName": "Nguyen Van A",
    "email": "vana@example.com",
    "systemRole": "USER",
    "createdAt": "2026-08-31T12:00:00.000Z"
  }
}
```

### Login
```http
POST /api/v1/auth/login
```

Request:
```json
{
  "email": "vana@example.com",
  "password": "Password@123"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "accessToken": "<jwt>",
    "user": {
      "id": "uuid",
      "fullName": "Nguyen Van A",
      "email": "vana@example.com",
      "avatarUrl": null,
      "systemRole": "USER"
    }
  }
}
```

Refresh Token được set qua HttpOnly Cookie.

### Refresh
```http
POST /api/v1/auth/refresh
```

Response:
```json
{
  "success": true,
  "data": {
    "accessToken": "<new-jwt>"
  }
}
```

### Logout
```http
POST /api/v1/auth/logout
```

Response:
```json
{
  "success": true,
  "data": {
    "message": "Đăng xuất thành công"
  }
}
```

### Me
```http
GET /api/v1/auth/me
```

### Change Password
```http
PATCH /api/v1/auth/change-password
```

Request:
```json
{
  "currentPassword": "Password@123",
  "newPassword": "NewPassword@123"
}
```

## 2. Users

### Get Profile
```http
GET /api/v1/users/me
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "fullName": "Nguyen Van A",
    "email": "vana@example.com",
    "phone": "0900000000",
    "avatarUrl": null,
    "systemRole": "USER",
    "isActive": true
  }
}
```

### Update Profile
```http
PATCH /api/v1/users/me
```

Request:
```json
{
  "fullName": "Nguyen Van B",
  "phone": "0912345678"
}
```

## 3. Projects

### Create
```http
POST /api/v1/projects
```

Request:
```json
{
  "name": "TTeamFlow",
  "projectKey": "TTF",
  "description": "Hệ thống quản lý dự án nhóm",
  "startDate": "2026-09-01",
  "dueDate": "2026-12-01"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "projectKey": "TTF",
    "name": "TTeamFlow",
    "status": "ACTIVE",
    "myRole": "OWNER",
    "startDate": "2026-09-01T00:00:00.000Z",
    "dueDate": "2026-12-01T00:00:00.000Z"
  }
}
```

### List
```http
GET /api/v1/projects?status=ACTIVE
```

### Detail
```http
GET /api/v1/projects/:projectId
```

### Update
```http
PATCH /api/v1/projects/:projectId
```

Request:
```json
{
  "name": "TTeamFlow v2",
  "dueDate": "2026-12-15"
}
```

### Archive
```http
PATCH /api/v1/projects/:projectId/archive
```

### Restore
```http
PATCH /api/v1/projects/:projectId/restore
```

### Delete
```http
DELETE /api/v1/projects/:projectId
```

## 4. Project Members

### List
```http
GET /api/v1/projects/:projectId/members
```

Response:
```json
{
  "success": true,
  "data": [
    {
      "userId": "uuid",
      "fullName": "Nguyen Van A",
      "email": "vana@example.com",
      "avatarUrl": null,
      "role": "OWNER",
      "joinedAt": "2026-08-31T12:00:00.000Z"
    }
  ]
}
```

### Add
```http
POST /api/v1/projects/:projectId/members
```

Request:
```json
{
  "email": "member@example.com",
  "role": "MEMBER"
}
```

### Change Role
```http
PATCH /api/v1/projects/:projectId/members/:userId
```

Request:
```json
{
  "role": "MANAGER"
}
```

### Remove
```http
DELETE /api/v1/projects/:projectId/members/:userId
```

## 5. Kanban

### Board
```http
GET /api/v1/projects/:projectId/kanban
```

Response:
```json
{
  "success": true,
  "data": {
    "projectId": "uuid",
    "columns": [
      {
        "id": "uuid",
        "name": "TODO",
        "position": 1000,
        "isCompleted": false,
        "tasks": [
          {
            "id": "uuid",
            "title": "Implement Login",
            "priority": "HIGH",
            "position": 1000,
            "dueDate": null,
            "completedAt": null,
            "assignees": []
          }
        ]
      }
    ]
  }
}
```

### Create Column
```http
POST /api/v1/projects/:projectId/columns
```

Request:
```json
{
  "name": "REVIEW"
}
```

### Update Column
```http
PATCH /api/v1/projects/:projectId/columns/:columnId
```

### Reorder
```http
PATCH /api/v1/projects/:projectId/columns/reorder
```

Request:
```json
{
  "columns": [
    { "columnId": "uuid-1", "position": 1000 },
    { "columnId": "uuid-2", "position": 2000 }
  ]
}
```

### Delete Column
```http
DELETE /api/v1/projects/:projectId/columns/:columnId
```

## 6. Tasks

### Create
```http
POST /api/v1/projects/:projectId/tasks
```

Request:
```json
{
  "columnId": "uuid",
  "title": "Implement login",
  "description": "JWT login endpoint",
  "priority": "HIGH",
  "startDate": "2026-09-01",
  "dueDate": "2026-09-03T17:00:00.000Z",
  "assigneeIds": ["uuid-user-1", "uuid-user-2"]
}
```

### Detail
```http
GET /api/v1/tasks/:taskId
```

### Update
```http
PATCH /api/v1/tasks/:taskId
```

### Delete
```http
DELETE /api/v1/tasks/:taskId
```

### Move
```http
PATCH /api/v1/tasks/:taskId/move
```

Request:
```json
{
  "sourceColumnId": "uuid-source",
  "targetColumnId": "uuid-target",
  "newPosition": 1500
}
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "columnId": "uuid-target",
    "position": 1500,
    "completedAt": "2026-08-31T12:30:00.000Z"
  }
}
```

## 7. Task Assignment

### Assign
```http
POST /api/v1/tasks/:taskId/assignees/:userId
```

### Unassign
```http
DELETE /api/v1/tasks/:taskId/assignees/:userId
```

## 8. Checklist
```http
GET    /api/v1/tasks/:taskId/checklists
POST   /api/v1/tasks/:taskId/checklists
PATCH  /api/v1/checklists/:checklistId
DELETE /api/v1/checklists/:checklistId
```

Create request:
```json
{
  "content": "Write service test"
}
```

Update request:
```json
{
  "isCompleted": true
}
```

## 9. Comments
```http
GET    /api/v1/tasks/:taskId/comments
POST   /api/v1/tasks/:taskId/comments
PATCH  /api/v1/comments/:commentId
DELETE /api/v1/comments/:commentId
```

Create request:
```json
{
  "content": "Đã hoàn thành API."
}
```

## 10. Dashboard
```http
GET /api/v1/projects/:projectId/dashboard
```

Response:
```json
{
  "success": true,
  "data": {
    "totalTasks": 42,
    "completedTasks": 20,
    "overdueTasks": 3,
    "progress": 47.62,
    "statusDistribution": [
      {
        "columnId": "uuid",
        "columnName": "TODO",
        "isCompleted": false,
        "count": 12
      }
    ],
    "memberWorkload": [
      {
        "userId": "uuid",
        "fullName": "Nguyen Van A",
        "avatarUrl": null,
        "activeTaskCount": 6
      }
    ]
  }
}
```

Overdue:
```text
dueDate < now AND completedAt IS NULL
```

## 11. Activity Logs
```http
GET /api/v1/projects/:projectId/activity-logs?page=1&limit=20
```

Response:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "action": "TASK_MOVED",
      "entityType": "TASK",
      "entityId": "uuid",
      "actor": {
        "id": "uuid",
        "fullName": "Nguyen Van A",
        "avatarUrl": null
      },
      "metadata": {
        "fromColumnId": "uuid",
        "toColumnId": "uuid"
      },
      "createdAt": "2026-08-31T12:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

## 12. Admin Users

### List
```http
GET /api/v1/admin/users?page=1&limit=20&search=quan&isActive=true
```

### Lock / Unlock
```http
PATCH /api/v1/admin/users/:userId/status
```

Request:
```json
{
  "isActive": false
}
```

## 13. Permission Matrix
| Chức năng | OWNER | MANAGER | MEMBER | VIEWER |
|---|:---:|:---:|:---:|:---:|
| Xem Project | ✅ | ✅ | ✅ | ✅ |
| Update Project | ✅ | ✅ | ❌ | ❌ |
| Archive Project | ✅ | ✅ | ❌ | ❌ |
| Delete Project | ✅ | ❌ | ❌ | ❌ |
| Xem Members | ✅ | ✅ | ✅ | ✅ |
| Add Member | ✅ | ✅ | ❌ | ❌ |
| Change Role | ✅ | ✅* | ❌ | ❌ |
| Remove Member | ✅ | ✅* | ❌ | ❌ |
| Xem Kanban | ✅ | ✅ | ✅ | ✅ |
| Manage Columns | ✅ | ✅ | ❌ | ❌ |
| Create Task | ✅ | ✅ | ✅ | ❌ |
| Update Task | ✅ | ✅ | ✅ | ❌ |
| Move Task | ✅ | ✅ | ✅ | ❌ |
| Checklist | ✅ | ✅ | ✅ | ❌ |
| Comment | ✅ | ✅ | ✅ | ❌ |
| Dashboard | ✅ | ✅ | ✅ | ✅ |

`*`: MANAGER không được quản lý OWNER.

System Admin là role hệ thống riêng, không mặc định có ProjectRole.
