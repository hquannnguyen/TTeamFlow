export interface TaskMovedMetadata {
  fromColumnId: string;
  fromColumnName?: string;
  toColumnId: string;
  toColumnName?: string;
  newPosition?: number;
}

export interface TaskAssignedMetadata {
  assignedUserId: string;
  assignedUserName?: string;
  isTransfer?: boolean;
  transferredFromUserId?: string;
  transferredFromUserName?: string;
}

export interface TaskUnassignedMetadata {
  unassignedUserId: string;
  unassignedUserName?: string;
}

export interface TaskUpdatedMetadata {
  changeType?: "PRIORITY" | "DUE_DATE" | "TITLE" | "DESCRIPTION" | "GENERAL";
  field?: string;
  oldPriority?: string;
  newPriority?: string;
  oldDueDate?: string | null;
  newDueDate?: string | null;
  oldTitle?: string;
  newTitle?: string;
}

export interface MemberAddedMetadata {
  addedUserId: string;
  role: string;
}

export interface MemberRoleChangedMetadata {
  targetUserId: string;
  oldRole: string;
  newRole: string;
}

export interface MemberRemovedMetadata {
  removedUserId: string;
  removedUserEmail?: string;
  unassignedTaskCount?: number;
}

export interface ProjectUpdatedMetadata {
  updatedFields: string[];
}

export interface ColumnReorderedMetadata {
  columns: Array<{
    id: string;
    name?: string;
    previousPosition?: number;
    newPosition: number;
  }>;
}

export type ActivityMetadata =
  | TaskMovedMetadata
  | TaskAssignedMetadata
  | TaskUnassignedMetadata
  | MemberAddedMetadata
  | MemberRoleChangedMetadata
  | MemberRemovedMetadata
  | ProjectUpdatedMetadata
  | ColumnReorderedMetadata
  | Record<string, unknown>;

