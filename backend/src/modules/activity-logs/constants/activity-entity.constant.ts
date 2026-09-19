export const ActivityEntityType = {
  PROJECT: "PROJECT",
  PROJECT_MEMBER: "PROJECT_MEMBER",
  TASK: "TASK",
  KANBAN_COLUMN: "KANBAN_COLUMN",
} as const;

export type ActivityEntityType =
  (typeof ActivityEntityType)[keyof typeof ActivityEntityType];

