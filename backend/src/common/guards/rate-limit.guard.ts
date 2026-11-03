import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  SetMetadata,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";

export const RATE_LIMIT_KEY = "rateLimit";

export interface RateLimitOptions {
  /** Số lần tối đa trong một cửa sổ thời gian */
  limit: number;
  /** Độ dài cửa sổ (ms) */
  windowMs: number;
}

/** Giới hạn số lần gọi một endpoint theo IP, ví dụ chặn dò mật khẩu. */
export const RateLimit = (options: RateLimitOptions) =>
  SetMetadata(RATE_LIMIT_KEY, options);

interface Bucket {
  count: number;
  resetAt: number;
}

/**
 * Bộ giới hạn tần suất đơn giản lưu trong bộ nhớ của tiến trình.
 * Đủ cho một instance backend; nếu chạy nhiều instance cần chuyển sang Redis.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly buckets = new Map<string, Bucket>();

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const options = this.reflector.get<RateLimitOptions | undefined>(
      RATE_LIMIT_KEY,
      context.getHandler(),
    );
    if (!options) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const now = Date.now();
    const key = `${request.ip ?? "unknown"}:${request.method}:${request.path}`;

    this.prune(now);

    const bucket = this.buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + options.windowMs });
      return true;
    }

    bucket.count += 1;
    if (bucket.count > options.limit) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
      const response = context.switchToHttp().getResponse<{
        setHeader: (name: string, value: string) => void;
      }>();
      response.setHeader("Retry-After", String(retryAfter));
      throw new HttpException(
        `Bạn thao tác quá nhiều lần. Vui lòng thử lại sau ${Math.ceil(retryAfter / 60)} phút.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }

  /** Dọn các bản ghi đã hết hạn để Map không phình mãi. */
  private prune(now: number) {
    if (this.buckets.size < 500) return;
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) this.buckets.delete(key);
    }
  }
}
