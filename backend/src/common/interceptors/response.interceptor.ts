import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Observable, map } from "rxjs";

export interface StandardSuccessResponse<T> {
  success: true;
  data: T;
  meta?: unknown;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  StandardSuccessResponse<unknown>
> {
  intercept(
    _context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<StandardSuccessResponse<unknown>> {
    return next.handle().pipe(
      map((res: unknown) => {
        if (res && typeof res === "object" && "data" in res && "meta" in res) {
          const paginated = res;
          return {
            success: true as const,
            data: paginated.data,
            meta: paginated.meta,
          };
        }

        return {
          success: true as const,
          data: res,
        };
      }),
    );
  }
}
