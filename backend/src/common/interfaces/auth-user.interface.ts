import { SystemRole } from "@prisma/client";

export interface AuthUser {
  id: string;
  email: string;
  fullName?: string;
  avatarUrl?: string | null;
  systemRole: SystemRole;
}
