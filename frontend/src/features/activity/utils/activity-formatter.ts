import type { ActivityLogRecord } from '../types/activity.types';

export type ActivityTone =
  | 'blue'
  | 'emerald'
  | 'amber'
  | 'indigo'
  | 'purple'
  | 'teal'
  | 'red'
  | 'slate';

export type ActivityIconType =
  | 'project'
  | 'member'
  | 'task'
  | 'column'
  | 'comment'
  | 'document';

export interface FormattedActivityInfo {
  actionLabel: string;
  entityLabel: string;
  tone: ActivityTone;
  iconType: ActivityIconType;
  description: string;
  detailChips: string[];
  canNavigateToTask: boolean;
}

export interface ActivityLookupContext {
  columnsMap?: Map<string, string>;
  membersMap?: Map<string, string>;
  tasksMap?: Map<string, string>;
}

export type ActivityFormatterContext = ActivityLookupContext;

const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Chủ dự án (Owner)',
  MANAGER: 'Quản lý (Manager)',
  MEMBER: 'Thành viên (Member)',
  VIEWER: 'Người xem (Viewer)',
};

const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Thấp',
  MEDIUM: 'Trung bình',
  HIGH: 'Cao',
  URGENT: 'Khẩn cấp',
};

const FIELD_LABELS: Record<string, string> = {
  name: 'Tên dự án',
  description: 'Mô tả',
  startDate: 'Ngày bắt đầu',
  dueDate: 'Hạn hoàn thành',
  title: 'Tiêu đề',
  priority: 'Độ ưu tiên',
  status: 'Trạng thái',
  columnId: 'Cột trạng thái',
  position: 'Vị trí',
};

export const ENTITY_TYPE_OPTIONS = [
  { value: 'ALL', label: 'Tất cả đối tượng' },
  { value: 'TASK', label: 'Công việc (Task)' },
  { value: 'PROJECT_MEMBER', label: 'Thành viên (Member)' },
  { value: 'KANBAN_COLUMN', label: 'Cột Kanban (Column)' },
  { value: 'PROJECT', label: 'Dự án (Project)' },
] as const;

export const ACTION_FILTER_OPTIONS = [
  { value: 'ALL', label: 'Tất cả hành động', group: 'ALL' },
  // Task
  { value: 'TASK_CREATED', label: 'Tạo công việc mới', group: 'TASK' },
  { value: 'TASK_UPDATED', label: 'Cập nhật công việc', group: 'TASK' },
  { value: 'TASK_MOVED', label: 'Chuyển cột trạng thái', group: 'TASK' },
  { value: 'TASK_COMPLETED', label: 'Hoàn thành công việc', group: 'TASK' },
  { value: 'TASK_ASSIGNED', label: 'Giao việc cho thành viên', group: 'TASK' },
  { value: 'TASK_UNASSIGNED', label: 'Gỡ phân công việc', group: 'TASK' },
  { value: 'TASK_DELETED', label: 'Xóa công việc', group: 'TASK' },
  // Member
  { value: 'MEMBER_ADDED', label: 'Thêm thành viên', group: 'PROJECT_MEMBER' },
  { value: 'MEMBER_ROLE_CHANGED', label: 'Đổi vai trò thành viên', group: 'PROJECT_MEMBER' },
  { value: 'MEMBER_REMOVED', label: 'Xóa thành viên', group: 'PROJECT_MEMBER' },
  // Column
  { value: 'COLUMN_CREATED', label: 'Tạo cột Kanban', group: 'KANBAN_COLUMN' },
  { value: 'COLUMN_UPDATED', label: 'Cập nhật cột Kanban', group: 'KANBAN_COLUMN' },
  { value: 'COLUMN_REORDERED', label: 'Sắp xếp thứ tự cột', group: 'KANBAN_COLUMN' },
  { value: 'COLUMN_DELETED', label: 'Xóa cột Kanban', group: 'KANBAN_COLUMN' },
  // Project
  { value: 'PROJECT_CREATED', label: 'Khởi tạo dự án', group: 'PROJECT' },
  { value: 'PROJECT_UPDATED', label: 'Cập nhật dự án', group: 'PROJECT' },
  { value: 'PROJECT_ARCHIVED', label: 'Lưu trữ dự án', group: 'PROJECT' },
  { value: 'PROJECT_RESTORED', label: 'Khôi phục dự án', group: 'PROJECT' },
  { value: 'PROJECT_DELETED', label: 'Xóa dự án', group: 'PROJECT' },
] as const;

export function getEntityLabel(entityType: string): string {
  switch (entityType) {
    case 'PROJECT':
      return 'Dự án';
    case 'PROJECT_MEMBER':
      return 'Thành viên';
    case 'TASK':
      return 'Công việc';
    case 'KANBAN_COLUMN':
      return 'Cột Kanban';
    default:
      return 'Hệ thống';
  }
}

export function getEntityIconType(entityType: string): ActivityIconType {
  switch (entityType) {
    case 'PROJECT':
      return 'project';
    case 'PROJECT_MEMBER':
      return 'member';
    case 'KANBAN_COLUMN':
      return 'column';
    case 'TASK':
    default:
      return 'task';
  }
}

function asString(val: unknown): string | undefined {
  if (typeof val === 'string' && val.trim().length > 0) {
    return val.trim();
  }
  return undefined;
}

function resolveUserName(
  userId: string | undefined,
  fallbackName: string | undefined,
  ctx?: ActivityLookupContext,
): string {
  if (fallbackName) return fallbackName;
  if (userId && ctx?.membersMap?.has(userId)) {
    return ctx.membersMap.get(userId)!;
  }
  return ' một thành viên';
}

function resolveColumnName(
  columnId: string | undefined,
  fallbackName: string | undefined,
  ctx?: ActivityLookupContext,
): string {
  if (fallbackName) return fallbackName;
  if (columnId && ctx?.columnsMap?.has(columnId)) {
    return ctx.columnsMap.get(columnId)!;
  }
  return 'cột khác';
}

function resolveTaskTitle(
  entityId: string | null,
  meta: Record<string, unknown>,
  ctx?: ActivityLookupContext,
): string | undefined {
  const fromMeta = asString(meta.title) || asString(meta.taskTitle) || asString(meta.name);
  if (fromMeta) return fromMeta;
  if (entityId && ctx?.tasksMap?.has(entityId)) {
    return ctx.tasksMap.get(entityId);
  }
  return undefined;
}

/**
 * Chuẩn hóa bản ghi ActivityLog từ Backend thành nhãn hiển thị tiếng Việt,
 * màu sắc nhận diện, mô tả chi tiết và các chip thông tin phụ.
 */
export function formatActivityLog(
  log: ActivityLogRecord,
  ctx?: ActivityLookupContext,
): FormattedActivityInfo {
  const meta = (log.metadata || {}) as Record<string, unknown>;
  const entityLabel = getEntityLabel(log.entityType);
  const iconType = getEntityIconType(log.entityType);
  const detailChips: string[] = [];

  const taskTitle = resolveTaskTitle(log.entityId, meta, ctx);
  const taskSuffix = taskTitle ? ` "${taskTitle}"` : '';

  switch (log.action) {
    // ── PROJECT ACTIONS ──
    case 'PROJECT_CREATED': {
      const projectName = asString(meta.name) || asString(meta.projectName);
      if (projectName) detailChips.push(`Dự án: ${projectName}`);
      return {
        actionLabel: 'Khởi tạo dự án',
        entityLabel,
        tone: 'blue',
        iconType,
        description: projectName
          ? `đã khởi tạo dự án mới "${projectName}".`
          : 'đã khởi tạo dự án mới.',
        detailChips,
        canNavigateToTask: false,
      };
    }

    case 'PROJECT_UPDATED': {
      const updatedFields = Array.isArray(meta.updatedFields)
        ? (meta.updatedFields as string[])
        : Object.keys(meta);
      if (updatedFields.length > 0) {
        const translated = updatedFields.map((f) => FIELD_LABELS[f] || f);
        detailChips.push(`Cập nhật: ${translated.join(', ')}`);
      }
      return {
        actionLabel: 'Cập nhật dự án',
        entityLabel,
        tone: 'indigo',
        iconType,
        description: 'đã cập nhật thông tin cấu hình dự án.',
        detailChips,
        canNavigateToTask: false,
      };
    }

    case 'PROJECT_ARCHIVED':
      return {
        actionLabel: 'Lưu trữ dự án',
        entityLabel,
        tone: 'amber',
        iconType,
        description: 'đã chuyển dự án vào trạng thái Lưu trữ (Archived).',
        detailChips: ['Trạng thái: Đã lưu trữ'],
        canNavigateToTask: false,
      };

    case 'PROJECT_RESTORED':
      return {
        actionLabel: 'Khôi phục dự án',
        entityLabel,
        tone: 'emerald',
        iconType,
        description: 'đã khôi phục dự án về trạng thái Đang hoạt động (Active).',
        detailChips: ['Trạng thái: Đang hoạt động'],
        canNavigateToTask: false,
      };

    case 'PROJECT_DELETED':
      return {
        actionLabel: 'Xóa dự án',
        entityLabel,
        tone: 'red',
        iconType,
        description: 'đã xóa mềm dự án khỏi danh sách hoạt động.',
        detailChips,
        canNavigateToTask: false,
      };

    // ── PROJECT MEMBER ACTIONS ──
    case 'MEMBER_ADDED': {
      const addedUserId = asString(meta.addedUserId) || asString(meta.userId);
      const memberName = resolveUserName(
        addedUserId,
        asString(meta.memberName) || asString(meta.fullName) || asString(meta.email),
        ctx,
      );
      const roleRaw = asString(meta.role);
      const roleLabel = roleRaw ? ROLE_LABELS[roleRaw] || roleRaw : undefined;
      if (roleLabel) detailChips.push(`Vai trò: ${roleLabel}`);

      return {
        actionLabel: 'Thêm thành viên',
        entityLabel,
        tone: 'teal',
        iconType,
        description: `đã thêm ${memberName} vào dự án.`,
        detailChips,
        canNavigateToTask: false,
      };
    }

    case 'MEMBER_ROLE_CHANGED': {
      const targetUserId = asString(meta.targetUserId) || asString(meta.userId);
      const memberName = resolveUserName(
        targetUserId,
        asString(meta.memberName) || asString(meta.fullName),
        ctx,
      );
      const oldRole = asString(meta.oldRole);
      const newRole = asString(meta.newRole) || asString(meta.role);
      if (oldRole && newRole) {
        detailChips.push(
          `${ROLE_LABELS[oldRole] || oldRole} → ${ROLE_LABELS[newRole] || newRole}`,
        );
      } else if (newRole) {
        detailChips.push(`Vai trò mới: ${ROLE_LABELS[newRole] || newRole}`);
      }

      return {
        actionLabel: 'Đổi vai trò thành viên',
        entityLabel,
        tone: 'purple',
        iconType,
        description: `đã thay đổi phân quyền của ${memberName} trong dự án.`,
        detailChips,
        canNavigateToTask: false,
      };
    }

    case 'MEMBER_REMOVED': {
      const removedUserId = asString(meta.removedUserId) || asString(meta.userId);
      const removedEmail = asString(meta.removedUserEmail) || asString(meta.email);
      const memberName = resolveUserName(removedUserId, removedEmail, ctx);
      const unassignedCount =
        typeof meta.unassignedTaskCount === 'number' ? meta.unassignedTaskCount : 0;
      if (removedEmail) detailChips.push(`Email: ${removedEmail}`);
      if (unassignedCount > 0) {
        detailChips.push(`Gỡ phân công: ${unassignedCount} công việc`);
      }

      return {
        actionLabel: 'Xóa thành viên',
        entityLabel,
        tone: 'red',
        iconType,
        description: `đã xóa ${memberName} khỏi dự án.`,
        detailChips,
        canNavigateToTask: false,
      };
    }

    // ── TASK ACTIONS ──
    case 'TASK_CREATED': {
      const priorityRaw = asString(meta.priority);
      if (priorityRaw) {
        detailChips.push(`Ưu tiên: ${PRIORITY_LABELS[priorityRaw] || priorityRaw}`);
      }
      const colId = asString(meta.columnId);
      if (colId && ctx?.columnsMap?.has(colId)) {
        detailChips.push(`Cột: ${ctx.columnsMap.get(colId)}`);
      }

      return {
        actionLabel: 'Tạo công việc mới',
        entityLabel,
        tone: 'blue',
        iconType,
        description: `đã tạo công việc mới${taskSuffix}.`,
        detailChips,
        canNavigateToTask: Boolean(log.entityId),
      };
    }

    case 'TASK_UPDATED': {
      const updatedFields = Array.isArray(meta.updatedFields)
        ? (meta.updatedFields as string[])
        : Object.keys(meta).filter((k) => k !== 'title' && k !== 'taskTitle');
      if (updatedFields.length > 0) {
        const translated = updatedFields.map((f) => FIELD_LABELS[f] || f);
        detailChips.push(`Trường thay đổi: ${translated.join(', ')}`);
      }
      const priorityRaw = asString(meta.priority);
      if (priorityRaw) {
        detailChips.push(`Ưu tiên: ${PRIORITY_LABELS[priorityRaw] || priorityRaw}`);
      }

      return {
        actionLabel: 'Cập nhật công việc',
        entityLabel,
        tone: 'indigo',
        iconType,
        description: `đã cập nhật chi tiết công việc${taskSuffix}.`,
        detailChips,
        canNavigateToTask: Boolean(log.entityId),
      };
    }

    case 'TASK_MOVED': {
      const fromCol = resolveColumnName(
        asString(meta.fromColumnId),
        asString(meta.fromColumnName),
        ctx,
      );
      const toCol = resolveColumnName(
        asString(meta.toColumnId),
        asString(meta.toColumnName),
        ctx,
      );
      detailChips.push(`${fromCol} → ${toCol}`);

      return {
        actionLabel: 'Chuyển cột trạng thái',
        entityLabel,
        tone: 'amber',
        iconType,
        description: `đã di chuyển công việc${taskSuffix} từ "${fromCol}" sang "${toCol}".`,
        detailChips,
        canNavigateToTask: Boolean(log.entityId),
      };
    }

    case 'TASK_COMPLETED': {
      const toCol = resolveColumnName(
        asString(meta.toColumnId) || asString(meta.columnId),
        asString(meta.toColumnName) || asString(meta.columnName),
        ctx,
      );
      if (toCol && toCol !== 'cột khác') {
        detailChips.push(`Cột hoàn thành: ${toCol}`);
      } else {
        detailChips.push('Trạng thái: Hoàn thành');
      }

      return {
        actionLabel: 'Hoàn thành công việc',
        entityLabel,
        tone: 'emerald',
        iconType,
        description: `đã đánh dấu hoàn thành công việc${taskSuffix}.`,
        detailChips,
        canNavigateToTask: Boolean(log.entityId),
      };
    }

    case 'TASK_ASSIGNED': {
      const assignedUserId = asString(meta.assignedUserId) || asString(meta.userId);
      const assigneeName = resolveUserName(
        assignedUserId,
        asString(meta.assigneeName) || asString(meta.fullName),
        ctx,
      );
      detailChips.push(`Người nhận: ${assigneeName.trim()}`);

      return {
        actionLabel: 'Giao việc',
        entityLabel,
        tone: 'teal',
        iconType,
        description: `đã giao công việc${taskSuffix} cho ${assigneeName}.`,
        detailChips,
        canNavigateToTask: Boolean(log.entityId),
      };
    }

    case 'TASK_UNASSIGNED': {
      const unassignedUserId = asString(meta.unassignedUserId) || asString(meta.userId);
      const unassignedName = resolveUserName(
        unassignedUserId,
        asString(meta.assigneeName) || asString(meta.fullName),
        ctx,
      );
      detailChips.push(`Gỡ phân công: ${unassignedName.trim()}`);

      return {
        actionLabel: 'Gỡ giao việc',
        entityLabel,
        tone: 'slate',
        iconType,
        description: `đã gỡ phân công của ${unassignedName} khỏi công việc${taskSuffix}.`,
        detailChips,
        canNavigateToTask: Boolean(log.entityId),
      };
    }

    case 'TASK_DELETED': {
      if (taskTitle) detailChips.push(`Công việc đã xóa: ${taskTitle}`);
      return {
        actionLabel: 'Xóa công việc',
        entityLabel,
        tone: 'red',
        iconType,
        description: `đã xóa công việc${taskSuffix} khỏi bảng Kanban.`,
        detailChips,
        canNavigateToTask: false,
      };
    }

    // ── KANBAN COLUMN ACTIONS ──
    case 'COLUMN_CREATED': {
      const colName =
        asString(meta.name) ||
        asString(meta.columnName) ||
        (log.entityId && ctx?.columnsMap?.get(log.entityId));
      if (colName) detailChips.push(`Cột mới: ${colName}`);

      return {
        actionLabel: 'Tạo cột Kanban',
        entityLabel,
        tone: 'purple',
        iconType,
        description: colName
          ? `đã thêm cột trạng thái "${colName}" vào bảng Kanban.`
          : 'đã thêm một cột trạng thái mới vào bảng Kanban.',
        detailChips,
        canNavigateToTask: false,
      };
    }

    case 'COLUMN_UPDATED': {
      const colName =
        asString(meta.name) ||
        asString(meta.columnName) ||
        (log.entityId && ctx?.columnsMap?.get(log.entityId));
      if (colName) detailChips.push(`Cột: ${colName}`);

      return {
        actionLabel: 'Cập nhật cột Kanban',
        entityLabel,
        tone: 'indigo',
        iconType,
        description: colName
          ? `đã cập nhật thông tin cột "${colName}".`
          : 'đã cập nhật cấu hình cột trên bảng Kanban.',
        detailChips,
        canNavigateToTask: false,
      };
    }

    case 'COLUMN_REORDERED': {
      const cols = Array.isArray(meta.columns) ? meta.columns : [];
      if (cols.length > 0) {
        detailChips.push(`Số cột sắp xếp: ${cols.length} cột`);
      }

      return {
        actionLabel: 'Sắp xếp thứ tự cột',
        entityLabel,
        tone: 'slate',
        iconType,
        description: 'đã thay đổi thứ tự hiển thị các cột trên bảng Kanban.',
        detailChips,
        canNavigateToTask: false,
      };
    }

    case 'COLUMN_DELETED': {
      const colName = asString(meta.name) || asString(meta.columnName);
      if (colName) detailChips.push(`Cột đã xóa: ${colName}`);

      return {
        actionLabel: 'Xóa cột Kanban',
        entityLabel,
        tone: 'red',
        iconType,
        description: colName
          ? `đã xóa cột "${colName}" khỏi bảng Kanban.`
          : 'đã xóa một cột trạng thái khỏi bảng Kanban.',
        detailChips,
        canNavigateToTask: false,
      };
    }

    default:
      return {
        actionLabel: log.action.replace(/_/g, ' '),
        entityLabel,
        tone: 'slate',
        iconType,
        description: `đã thực hiện thao tác ${log.action} trên ${entityLabel.toLowerCase()}.`,
        detailChips,
        canNavigateToTask: log.entityType === 'TASK' && Boolean(log.entityId),
      };
  }
}

/**
 * Định dạng thời gian tương đối tiếng Việt (ví dụ: "Vừa xong", "5 phút trước", "2 giờ trước")
 */
export function formatRelativeTime(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '';

  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 45) return 'Vừa xong';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} phút trước`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} giờ trước`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay} ngày trước`;

  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Định dạng ngày giờ đầy đủ chính xác (HH:mm - dd/MM/yyyy)
 */
export function formatExactDateTime(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '';

  const timeStr = date.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const dateStr = date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  return `${timeStr} • ${dateStr}`;
}

/**
 * Nhóm theo ngày hiển thị trên đầu mỗi cụm Timeline ("Hôm nay", "Hôm qua", hoặc Thứ, dd/MM/yyyy)
 */
export function formatDateGroupHeader(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return 'Khác';

  const now = new Date();
  const todayKey = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayKey = todayKey - 86400000;
  const targetKey = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

  const ddmmyyyy = date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  if (targetKey === todayKey) {
    return `Hôm nay — ${ddmmyyyy}`;
  }
  if (targetKey === yesterdayKey) {
    return `Hôm qua — ${ddmmyyyy}`;
  }

  return date.toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}
