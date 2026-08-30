# API Conventions

Base path:

```text
/api/v1
```

## Success

```json
{
  "success": true,
  "data": {}
}
```

## Failure

```json
{
  "success": false,
  "statusCode": 400,
  "message": "..."
}
```

## HTTP status

- 200: read/update success
- 201: create success
- 400: invalid business/input
- 401: unauthenticated/expired token
- 403: authenticated but forbidden
- 404: resource not found
- 409: duplicate/conflict
- 500: unexpected server error

## Naming

URL:
- plural nouns
- kebab-case if needed
- nested route only when parent context is meaningful

Examples:

```text
GET  /projects
POST /projects
GET  /projects/:projectId/members
POST /projects/:projectId/tasks
GET  /projects/:projectId/kanban
PATCH /tasks/:taskId/move
```

DTO:
- `CreateTaskDto`
- `UpdateTaskDto`
- `MoveTaskDto`

Không dùng:
- `TaskRequest`
- `TaskData`
- `DataDto`

nếu tên không biểu đạt use case.
