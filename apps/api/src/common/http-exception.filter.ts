import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const rawResponse = exception instanceof HttpException ? exception.getResponse() : null;
    const message =
      status >= 500
        ? "Ocorreu um erro interno."
        : typeof rawResponse === "string"
          ? rawResponse
          : (rawResponse as { message?: string | string[] } | null)?.message ||
            "Requisição inválida.";

    if (status >= 500) {
      this.logger.error(
        JSON.stringify({
          event: "http.error",
          method: request.method,
          path: request.url,
          status,
          error: exception instanceof Error ? exception.message : String(exception),
        }),
      );
    }
    response.status(status).json({
      statusCode: status,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
