/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/unbound-method, @typescript-eslint/require-await */
import assert from "node:assert";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ProjectRole, ProjectStatus } from "@prisma/client";
import { PROJECT_ROLES_KEY } from "../src/common/decorators/project-roles.decorator";
import { ProjectMembersController } from "../src/modules/project-members/project-members.controller";
import { ProjectMembersService } from "../src/modules/project-members/project-members.service";
import type { PrismaService } from "../src/prisma/prisma.service";

async function runTests() {
  console.log("🚀 Bắt đầu kiểm thử Project Members (Task 14)...\n");

  const projectId = "proj-1111-1111-1111-111111111111";
  const archivedProjectId = "proj-archived-9999";
  const ownerId = "user-owner-1111";
  const managerId = "user-manager-2222";
  const memberId = "user-member-3333";
  const newUserId = "user-new-4444";

  const mockProjects: Record<
    string,
    { id: string; status: ProjectStatus; deletedAt: Date | null }
  > = {
    [projectId]: {
      id: projectId,
      status: ProjectStatus.ACTIVE,
      deletedAt: null,
    },
    [archivedProjectId]: {
      id: archivedProjectId,
      status: ProjectStatus.ARCHIVED,
      deletedAt: null,
    },
  };

  // Mock in-memory state
  const mockUsers: Record<
    string,
    { id: string; email: string; fullName: string; avatarUrl: string | null }
  > = {
    [ownerId]: {
      id: ownerId,
      email: "owner@example.com",
      fullName: "Project Owner",
      avatarUrl: null,
    },
    [managerId]: {
      id: managerId,
      email: "manager@example.com",
      fullName: "Project Manager",
      avatarUrl: null,
    },
    [memberId]: {
      id: memberId,
      email: "member@example.com",
      fullName: "Team Member",
      avatarUrl: null,
    },
    [newUserId]: {
      id: newUserId,
      email: "newuser@example.com",
      fullName: "New User",
      avatarUrl: null,
    },
  };

  const mockMembers: Array<{
    id: string;
    projectId: string;
    userId: string;
    role: ProjectRole;
    joinedAt: Date;
    user: {
      id: string;
      fullName: string;
      email: string;
      avatarUrl: string | null;
    };
  }> = [
    {
      id: "pm-1",
      projectId,
      userId: ownerId,
      role: ProjectRole.OWNER,
      joinedAt: new Date(Date.now() - 100000),
      user: mockUsers[ownerId],
    },
    {
      id: "pm-2",
      projectId,
      userId: managerId,
      role: ProjectRole.MANAGER,
      joinedAt: new Date(Date.now() - 50000),
      user: mockUsers[managerId],
    },
    {
      id: "pm-3",
      projectId,
      userId: memberId,
      role: ProjectRole.MEMBER,
      joinedAt: new Date(Date.now() - 10000),
      user: mockUsers[memberId],
    },
  ];

  let mockTaskAssignments: Array<{
    id: string;
    taskId: string;
    userId: string;
    task: { projectId: string };
  }> = [
    { id: "ta-1", taskId: "task-101", userId: memberId, task: { projectId } },
    { id: "ta-2", taskId: "task-102", userId: memberId, task: { projectId } },
    {
      id: "ta-3",
      taskId: "task-other",
      userId: memberId,
      task: { projectId: "other-proj" },
    }, // belonging to another project
  ];

  const loggedActivities: any[] = [];

  const mockPrisma = {
    project: {
      findUnique: async ({ where }: any) => {
        return mockProjects[where.id] || null;
      },
    },
    user: {
      findUnique: async ({ where }: any) => {
        if (where.email) {
          return (
            Object.values(mockUsers).find((u) => u.email === where.email) ||
            null
          );
        }
        if (where.id) {
          return mockUsers[where.id] || null;
        }
        return null;
      },
    },
    projectMember: {
      findMany: async ({ where }: any) => {
        return mockMembers.filter((m) => m.projectId === where.projectId);
      },
      findUnique: async ({ where }: any) => {
        if (where.projectId_userId) {
          const found = mockMembers.find(
            (m) =>
              m.projectId === where.projectId_userId.projectId &&
              m.userId === where.projectId_userId.userId,
          );
          return found ? { ...found } : null;
        }
        return null;
      },
      create: async ({ data }: any) => {
        const user = mockUsers[data.userId];
        const newMember = {
          id: `pm-${Date.now()}`,
          projectId: data.projectId,
          userId: data.userId,
          role: data.role,
          joinedAt: new Date(),
          user,
        };
        mockMembers.push(newMember);
        return newMember;
      },
      update: async ({ where, data }: any) => {
        const member = mockMembers.find(
          (m) =>
            m.projectId === where.projectId_userId.projectId &&
            m.userId === where.projectId_userId.userId,
        );
        if (!member) throw new Error("Member not found");
        member.role = data.role;
        return member;
      },
      delete: async ({ where }: any) => {
        const index = mockMembers.findIndex(
          (m) =>
            m.projectId === where.projectId_userId.projectId &&
            m.userId === where.projectId_userId.userId,
        );
        if (index === -1) throw new Error("Member not found to delete");
        const deleted = mockMembers.splice(index, 1)[0];
        return deleted;
      },
    },
    taskAssignment: {
      deleteMany: async ({ where }: any) => {
        const initialCount = mockTaskAssignments.length;
        mockTaskAssignments = mockTaskAssignments.filter((ta) => {
          const matchUser = ta.userId === where.userId;
          const matchProject = where.task?.projectId
            ? ta.task.projectId === where.task.projectId
            : true;
          return !(matchUser && matchProject);
        });
        return { count: initialCount - mockTaskAssignments.length };
      },
    },
    activityLog: {
      create: async ({ data }: any) => {
        loggedActivities.push(data);
        return { id: `act-${Date.now()}`, ...data, createdAt: new Date() };
      },
    },
    $transaction: async (cb: any) => {
      return cb(mockPrisma);
    },
  } as unknown as PrismaService;

  const service = new ProjectMembersService(mockPrisma);

  // =========================================================================
  // TC-1: Lấy danh sách thành viên (list)
  // =========================================================================
  console.log("--- TC-1: Lấy danh sách thành viên (list) ---");
  const membersList = await service.list(projectId);
  assert.strictEqual(
    membersList.length,
    3,
    "Dự án phải có 3 thành viên ban đầu",
  );
  assert.strictEqual(membersList[0].role, ProjectRole.OWNER);
  assert.strictEqual(membersList[0].userId, ownerId);
  assert.strictEqual(membersList[0].fullName, "Project Owner");
  console.log("✅ TC-1 Pass: Lấy danh sách thành viên chuẩn cấu trúc");

  // =========================================================================
  // TC-2: Thêm thành viên mới thành công (add)
  // =========================================================================
  console.log("--- TC-2: Thêm thành viên mới thành công (add) ---");
  const addedMember = await service.add(projectId, ownerId, {
    email: "newuser@example.com",
    role: ProjectRole.MEMBER,
  });
  assert.strictEqual(addedMember.userId, newUserId);
  assert.strictEqual(addedMember.role, ProjectRole.MEMBER);
  assert.strictEqual(
    mockMembers.length,
    4,
    "Tổng số thành viên phải tăng lên 4",
  );
  const addLog = loggedActivities.find((l) => l.action === "MEMBER_ADDED");
  assert.ok(addLog, "Phải ghi ActivityLog MEMBER_ADDED");
  assert.strictEqual(addLog.metadata.addedUserId, newUserId);
  console.log(
    "✅ TC-2 Pass: Thêm thành viên mới thành công và tự động ghi log MEMBER_ADDED",
  );

  // =========================================================================
  // TC-3: Chặn thêm trùng thành viên (ConflictException)
  // =========================================================================
  console.log("--- TC-3: Chặn thêm trùng thành viên ---");
  await assert.rejects(
    async () => {
      await service.add(projectId, ownerId, {
        email: "newuser@example.com",
        role: ProjectRole.MEMBER,
      });
    },
    (err: unknown) => err instanceof ConflictException,
    "Phải ném ConflictException khi thêm thành viên đã có trong dự án",
  );
  console.log(
    "✅ TC-3 Pass: Chặn thêm trùng thành viên với lỗi 409 ConflictException",
  );

  // =========================================================================
  // TC-4: Chặn thêm thành viên với vai trò OWNER (BadRequestException)
  // =========================================================================
  console.log("--- TC-4: Chặn thêm thành viên với vai trò OWNER ---");
  await assert.rejects(
    async () => {
      await service.add(projectId, ownerId, {
        email: "nonexistent@example.com",
        role: ProjectRole.OWNER,
      });
    },
    (err: unknown) => err instanceof BadRequestException,
    "Phải ném BadRequestException khi cố thêm vai trò OWNER",
  );
  console.log("✅ TC-4 Pass: Chặn thêm role OWNER qua endpoint add member");

  // =========================================================================
  // TC-5: Chặn thêm email không tồn tại trong hệ thống (NotFoundException)
  // =========================================================================
  console.log("--- TC-5: Chặn thêm email không tồn tại ---");
  await assert.rejects(
    async () => {
      await service.add(projectId, ownerId, {
        email: "doesnotexist@example.com",
        role: ProjectRole.VIEWER,
      });
    },
    (err: unknown) => err instanceof NotFoundException,
    "Phải ném NotFoundException khi email không tồn tại",
  );
  console.log(
    "✅ TC-5 Pass: Chặn thêm email không tồn tại với lỗi 404 NotFoundException",
  );

  // =========================================================================
  // TC-6: Cập nhật vai trò thành viên thành công (updateRole)
  // =========================================================================
  console.log("--- TC-6: Cập nhật vai trò thành viên (updateRole) ---");
  const updatedMember = await service.updateRole(projectId, ownerId, memberId, {
    role: ProjectRole.MANAGER,
  });
  assert.strictEqual(updatedMember.role, ProjectRole.MANAGER);
  const roleLog = loggedActivities.find(
    (l) => l.action === "MEMBER_ROLE_CHANGED",
  );
  assert.ok(roleLog, "Phải ghi ActivityLog MEMBER_ROLE_CHANGED");
  assert.strictEqual(roleLog.metadata.oldRole, ProjectRole.MEMBER);
  assert.strictEqual(roleLog.metadata.newRole, ProjectRole.MANAGER);
  console.log(
    "✅ TC-6 Pass: Cập nhật vai trò thành công và ghi log MEMBER_ROLE_CHANGED",
  );

  // =========================================================================
  // TC-7: Chặn cập nhật vai trò của OWNER (BadRequestException)
  // =========================================================================
  console.log("--- TC-7: Chặn cập nhật vai trò của OWNER ---");
  await assert.rejects(
    async () => {
      await service.updateRole(projectId, ownerId, ownerId, {
        role: ProjectRole.MEMBER,
      });
    },
    (err: unknown) => err instanceof BadRequestException,
    "Phải ném BadRequestException khi cố đổi role của OWNER",
  );
  console.log("✅ TC-7 Pass: Chặn đổi vai trò của Chủ sở hữu (OWNER)");

  // =========================================================================
  // TC-8: Chặn chuyển đổi role thành OWNER qua updateRole (BadRequestException)
  // =========================================================================
  console.log("--- TC-8: Chặn chuyển đổi role thành OWNER ---");
  await assert.rejects(
    async () => {
      await service.updateRole(projectId, ownerId, memberId, {
        role: ProjectRole.OWNER,
      });
    },
    (err: unknown) => err instanceof BadRequestException,
    "Phải ném BadRequestException khi gán role thành OWNER qua updateRole",
  );
  console.log("✅ TC-8 Pass: Chặn nâng role thành OWNER qua updateRole");

  // =========================================================================
  // TC-9: MANAGER không được phép thao tác trên OWNER (ForbiddenException)
  // =========================================================================
  console.log("--- TC-9: MANAGER không được phép thao tác trên OWNER ---");
  await assert.rejects(
    async () => {
      await service.updateRole(projectId, managerId, ownerId, {
        role: ProjectRole.MEMBER,
      });
    },
    (err: unknown) =>
      err instanceof BadRequestException || err instanceof ForbiddenException,
    "MANAGER thao tác trên OWNER phải bị chặn",
  );
  console.log("✅ TC-9 Pass: Bảo vệ OWNER khỏi sự can thiệp của MANAGER");

  // =========================================================================
  // TC-10: Xóa thành viên và tự động gỡ gán Tasks (remove + unassign tasks)
  // =========================================================================
  console.log(
    "--- TC-10: Xóa thành viên và gỡ gán task (remove + unassign tasks) ---",
  );
  // Trước khi xóa, memberId có 2 task trong project này và 1 task trong other-proj
  const initialProjectAssignments = mockTaskAssignments.filter(
    (ta) => ta.userId === memberId && ta.task.projectId === projectId,
  );
  assert.strictEqual(
    initialProjectAssignments.length,
    2,
    "Ban đầu member có 2 task trong project này",
  );

  const removeResult = await service.remove(projectId, ownerId, memberId);
  assert.strictEqual(removeResult.success, true);
  assert.strictEqual(removeResult.removedUserId, memberId);
  assert.strictEqual(
    removeResult.unassignedTaskCount,
    2,
    "Phải gỡ đúng 2 task trong project này",
  );

  // Kiểm tra thành viên đã bị xóa khỏi projectMember
  const existsMember = mockMembers.find(
    (m) => m.userId === memberId && m.projectId === projectId,
  );
  assert.strictEqual(
    existsMember,
    undefined,
    "Thành viên phải bị xóa khỏi projectMember",
  );

  // Kiểm tra taskAssignment trong project này đã bị xóa sạch
  const remainingProjectAssignments = mockTaskAssignments.filter(
    (ta) => ta.userId === memberId && ta.task.projectId === projectId,
  );
  assert.strictEqual(
    remainingProjectAssignments.length,
    0,
    "Mọi taskAssignment của user trong project này phải bị gỡ",
  );

  // Kiểm tra taskAssignment ở project khác vẫn còn nguyên vẹn
  const otherProjectAssignments = mockTaskAssignments.filter(
    (ta) => ta.userId === memberId && ta.task.projectId === "other-proj",
  );
  assert.strictEqual(
    otherProjectAssignments.length,
    1,
    "TaskAssignment ở project khác không được phép bị ảnh hưởng",
  );

  // Kiểm tra ActivityLog MEMBER_REMOVED
  const removeLog = loggedActivities.find((l) => l.action === "MEMBER_REMOVED");
  assert.ok(removeLog, "Phải ghi ActivityLog MEMBER_REMOVED");
  assert.strictEqual(removeLog.metadata.removedUserId, memberId);
  assert.strictEqual(removeLog.metadata.unassignedTaskCount, 2);
  console.log(
    "✅ TC-10 Pass: Xóa thành viên trong transaction tự động unassign 2 tasks và ghi log MEMBER_REMOVED",
  );

  // =========================================================================
  // TC-11: Chặn xóa OWNER khỏi dự án (BadRequestException)
  // =========================================================================
  console.log("--- TC-11: Chặn xóa OWNER khỏi dự án ---");
  await assert.rejects(
    async () => {
      await service.remove(projectId, ownerId, ownerId);
    },
    (err: unknown) => err instanceof BadRequestException,
    "Phải ném BadRequestException khi cố xóa OWNER",
  );
  console.log("✅ TC-11 Pass: Chặn xóa Chủ sở hữu (OWNER) khỏi dự án");

  // =========================================================================
  // TC-12: Kiểm tra Controller Decorator @ProjectRoles
  // =========================================================================
  console.log("--- TC-12: Kiểm tra Controller Decorators (@ProjectRoles) ---");
  const reflector = new Reflector();
  const controllerProto = ProjectMembersController.prototype;

  const listRoles = reflector.get(PROJECT_ROLES_KEY, controllerProto.list);
  assert.deepStrictEqual(
    listRoles,
    [
      ProjectRole.OWNER,
      ProjectRole.MANAGER,
      ProjectRole.MEMBER,
      ProjectRole.VIEWER,
    ],
    "list phải cho phép tất cả các roles",
  );

  const addRoles = reflector.get(PROJECT_ROLES_KEY, controllerProto.add);
  assert.deepStrictEqual(
    addRoles,
    [ProjectRole.OWNER, ProjectRole.MANAGER],
    "add chỉ cho phép OWNER và MANAGER",
  );

  const updateRoles = reflector.get(
    PROJECT_ROLES_KEY,
    controllerProto.updateRole,
  );
  assert.deepStrictEqual(
    updateRoles,
    [ProjectRole.OWNER, ProjectRole.MANAGER],
    "updateRole chỉ cho phép OWNER và MANAGER",
  );

  const removeRoles = reflector.get(PROJECT_ROLES_KEY, controllerProto.remove);
  assert.deepStrictEqual(
    removeRoles,
    [ProjectRole.OWNER, ProjectRole.MANAGER],
    "remove chỉ cho phép OWNER và MANAGER",
  );
  console.log(
    "✅ TC-12 Pass: Controller endpoints được bảo vệ chặt chẽ bởi @ProjectRoles",
  );

  // =========================================================================
  // TC-13: Chặn thêm thành viên vào dự án đã lưu trữ (ARCHIVED) hoặc không tồn tại
  // =========================================================================
  console.log("--- TC-13: Chặn thêm thành viên vào dự án đã lưu trữ (ARCHIVED) ---");
  await assert.rejects(
    async () => {
      await service.add(archivedProjectId, ownerId, {
        email: "newuser@example.com",
        role: ProjectRole.MEMBER,
      });
    },
    (err: unknown) => err instanceof BadRequestException,
    "Phải ném BadRequestException khi thêm thành viên vào dự án ARCHIVED",
  );

  await assert.rejects(
    async () => {
      await service.add("non-existent-proj", ownerId, {
        email: "newuser@example.com",
        role: ProjectRole.MEMBER,
      });
    },
    (err: unknown) => err instanceof NotFoundException,
    "Phải ném NotFoundException khi thêm thành viên vào dự án không tồn tại",
  );
  console.log("✅ TC-13 Pass: Chặn thêm thành viên vào dự án ARCHIVED hoặc không tồn tại");

  console.log("\n🎉 TẤT CẢ 13 TEST CASES CỦA TASK 14 ĐÃ PASS 100%!");
}

runTests().catch((err) => {
  console.error("❌ Test Suite Thất Bại:", err);
  process.exit(1);
});
