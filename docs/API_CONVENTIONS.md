# TTeamFlow — API CONVENTIONS

## 1. Base URL
```text
/api/v1
```

## 2. Authentication
Access Token:
```http
Authorization: Bearer <access_token>
```

Refresh Token:
```text
HttpOnly Cookie
```

Frontend dùng `withCredentials: true` cho refresh/logout.

## 3. Success Response
```json
{
  "success": true,
  "data": {}
}
```

## 4. List/Pagination Response
```json
{
  "success": true,
  "data": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 57,
    "totalPages": 3
  }
}
```

## 5. Error Response
```json
{
  "success": false,
  "statusCode": 400,
  "code": "VALIDATION_ERROR",
  "message": "Dữ liệu không hợp lệ",
  "errors": [],
  "path": "/api/v1/projects",
  "timestamp": "2026-08-31T12:00:00.000Z"
}
```

Frontend nên dựa vào `code`, không parse `message`.

## 6. Validation Error
```json
{
  "success": false,
  "statusCode": 400,
  "code": "VALIDATION_ERROR",
  "message": "Dữ liệu không hợp lệ",
  "errors": [
    {
      "field": "email",
      "message": "Email không đúng định dạng"
    }
  ],
  "path": "/api/v1/auth/register",
  "timestamp": "2026-08-31T12:00:00.000Z"
}
```

## 7. HTTP Status
| Status | Ý nghĩa |
|---|---|
| 200 | GET/PATCH/DELETE thành công |
| 201 | Create thành công |
| 400 | Input/business rule invalid |
| 401 | Chưa xác thực/token invalid |
| 403 | Không đủ quyền |
| 404 | Resource không tồn tại |
| 409 | Duplicate/conflict |
| 500 | Unexpected server error |

## 8. Error Code
Dùng `UPPER_SNAKE_CASE`.

Ví dụ:
```text
VALIDATION_ERROR
UNAUTHENTICATED
FORBIDDEN
USER_NOT_FOUND
EMAIL_ALREADY_EXISTS
PROJECT_NOT_FOUND
PROJECT_ARCHIVED
PROJECT_MEMBER_ALREADY_EXISTS
TASK_NOT_FOUND
ASSIGNEE_NOT_PROJECT_MEMBER
KANBAN_COLUMN_NOT_FOUND
KANBAN_COLUMN_NOT_EMPTY
```

## 9. Naming
URL:
- lowercase
- plural nouns
- kebab-case khi cần

JSON:
- camelCase

Date/time:
- ISO 8601

Enum:
- UPPER_SNAKE_CASE

## 10. Pagination
Request:
```text
GET /admin/users?page=1&limit=20
```

Rule:
```text
page >= 1
limit mặc định = 20
limit tối đa = 100
```

Search/filter:
```text
GET /admin/users?page=1&limit=20&search=quan&isActive=true
GET /projects?status=ACTIVE
```

Sort:
```text
?sortBy=createdAt&sortOrder=desc
```

Backend phải whitelist field được sort.

## 11. PATCH
Chỉ gửi field cần đổi.

```json
{
  "priority": "HIGH",
  "dueDate": "2026-09-10T12:00:00.000Z"
}
```

## 12. Null
Response giữ shape ổn định:
```json
{
  "dueDate": null,
  "completedAt": null
}
```

## 13. Permission
Frontend ẩn/disable button chỉ phục vụ UX.

Backend enforce:
```text
JWT
↓
Membership
↓
Role
↓
Business Rule
↓
Database
```

## 14. Archived Project
GET vẫn cho phép.

Mutation trả:
```json
{
  "success": false,
  "statusCode": 400,
  "code": "PROJECT_ARCHIVED",
  "message": "Dự án đã được lưu trữ và đang ở chế độ chỉ đọc"
}
```

## 15. Common Query Keys
```text
['auth', 'me']
['projects']
['project', projectId]
['project-members', projectId]
['kanban', projectId]
['task', taskId]
['task-comments', taskId]
['dashboard', projectId]
['activity-logs', projectId]
['admin-users', params]
```

## 16. API change rule
Nếu backend đổi:
- endpoint
- request body
- response field
- enum
- error code
- pagination

PR phải có mục `API Changes` và cập nhật docs/frontend types.
