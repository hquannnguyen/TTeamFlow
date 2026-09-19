export interface TaskMovedMetadata {
  fromColumnId: string;
  toColumnId: string;
  newPosition?: number;
}

export interface TaskAssignedMetadata {
  assignedUserId: string;
}

export interface TaskUnassignedMetadata {
  unassignedUserId: string;
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

