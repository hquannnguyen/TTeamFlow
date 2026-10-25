-- Đánh số thứ tự nhiệm vụ trong từng dự án cho các task cũ chưa có task_number.
-- Số được gán theo thứ tự tạo (created_at), nối tiếp số lớn nhất hiện có của dự án.
UPDATE "tasks" AS t
SET "task_number" = numbered.rn + COALESCE(
  (SELECT MAX(x."task_number") FROM "tasks" AS x WHERE x."project_id" = t."project_id"),
  0
)
FROM (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "project_id" ORDER BY "created_at", "id") AS rn
  FROM "tasks"
  WHERE "task_number" IS NULL
) AS numbered
WHERE t."id" = numbered."id";
