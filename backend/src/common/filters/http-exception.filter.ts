import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import type { Request, Response } from "express";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isCorsError =
      (exception as { message?: string })?.message === "Not allowed by CORS";

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : isCorsError
          ? HttpStatus.FORBIDDEN
          : HttpStatus.INTERNAL_SERVER_ERROR;

    const raw =
      exception instanceof HttpException
        ? exception.getResponse()
        : isCorsError
          ? "Not allowed by CORS"
          : "Internal server error";

    const message =
      typeof raw === "string"
        ? raw
        : ((raw as { message?: string | string[] }).message ??
          "Internal server error");

    if (!(exception instanceof HttpException)) {
      console.error(
        `[Unhandled Exception ${status}] ${request.method} ${request.url}:`,
        exception,
      );
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
