import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { PrismaService } from "../../prisma/prisma.service";

/**
 * Gateway đẩy thông báo real-time qua WebSocket (Socket.IO).
 *
 * - Mỗi người dùng join room riêng `user:<id>` sau khi xác thực JWT.
 * - Business service gọi `emitToUser(userId, event, payload)` — WebSocket chỉ là
 *   kênh ĐẨY; thông báo vẫn được ghi DB trước, mất kết nối không mất dữ liệu.
 */
@WebSocketGateway({
  cors: {
    origin: (origin, callback) => callback(null, true),
    credentials: true,
  },
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(NotificationsGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  private roomOf(userId: string) {
    return `user:${userId}`;
  }

  async handleConnection(client: Socket) {
    try {
      // Ưu tiên token gửi qua handshake.auth.token (frontend), fallback cookie HttpOnly
      const bearer = client.handshake.headers.authorization;
      const tokenFromAuth =
        (client.handshake.auth?.token as string | undefined) ??
        (typeof bearer === "string" && bearer.startsWith("Bearer ")
          ? bearer.slice(7)
          : undefined);
      const token = tokenFromAuth ?? client.handshake.headers.cookie;

      const payload = await this.jwt.verifyAsync<{ sub: string }>(token ?? "", {
        secret: this.config.getOrThrow<string>("JWT_ACCESS_SECRET"),
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, isActive: true },
      });
      if (!user?.isActive) throw new Error("Tài khoản không hoạt động");

      (client.data as { userId?: string }).userId = user.id;
      await client.join(this.roomOf(user.id));
      this.logger.debug(`Socket connected: ${user.id}`);
    } catch {
      // Không xác thực được → ngắt kết nối ngay
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    const userId = (client.data as { userId?: string }).userId;
    if (userId) {
      this.logger.debug(`Socket disconnected: ${userId}`);
    }
  }

  /** Đẩy event tới đúng người dùng (nếu đang online). */
  emitToUser(userId: string, event: string, payload: unknown) {
    if (!this.server) return;
    this.server.to(this.roomOf(userId)).emit(event, payload);
  }

  /** Buộc ngắt mọi socket của một user (khoá tài khoản, thu hồi phiên...). */
  disconnectUser(userId: string) {
    if (!this.server) return;
    for (const [, socket] of this.server.sockets.sockets) {
      if ((socket.data as { userId?: string }).userId === userId) {
        socket.disconnect(true);
      }
    }
  }
}
