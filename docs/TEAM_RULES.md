# Team Development Rules

## Ownership gợi ý

Backend:
- Dev A: Auth + User + system RBAC
- Dev B: Project + Project Member + project RBAC
- Dev C: Kanban + Task + Assignment
- Dev D: Checklist + Comment + Dashboard + Activity

Frontend:
- Dev A: Auth + router + layout
- Dev B: Project + member screens
- Dev C: Kanban + task modal + dnd-kit
- Dev D: Dashboard + admin

## Rule merge

1. Pull `develop`.
2. Tạo branch `feature/...`.
3. Không sửa migration cũ đã merge.
4. Schema thay đổi -> migration mới.
5. PR phải mô tả:
   - business change;
   - API change;
   - DB change;
   - screenshot nếu sửa UI.
6. Ít nhất 1 reviewer.
7. Resolve conflict trên feature branch.
8. Merge vào `develop`.
9. `main` dùng release/demo stable.

## Không được làm

- Commit `.env`.
- Commit secret.
- Return `passwordHash`, refresh token.
- Hardcode role permission trong nhiều controller.
- Dùng tên cột "DONE" để xác định task complete.
- Thêm `assigneeId` vào Task.
- Dùng `localhost` để container gọi container khác.
