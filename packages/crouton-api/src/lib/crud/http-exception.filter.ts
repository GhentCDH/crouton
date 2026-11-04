import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
} from '@nestjs/common';

/**
 * Catches HttpException-shaped errors from modules that run a different
 * @nestjs/common instance (linked packages). NestJS uses instanceof to detect
 * HttpException; that check fails across module boundaries, producing a 500.
 * Duck-typing getStatus() avoids the instanceof check entirely.
 */
@Catch()
export class HttpExceptionDuckFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const res = http.getResponse<{
      headersSent?: boolean;
      status: (code: number) => { json: (body: unknown) => void };
    }>();

    if (res.headersSent) return;

    if (
      exception &&
      typeof exception === 'object' &&
      typeof (exception as Record<string, unknown>)['getStatus'] === 'function'
    ) {
      const ex = exception as { getStatus(): number; getResponse(): unknown };
      const status = ex.getStatus();
      const body = ex.getResponse();
      res.status(status).json(
        typeof body === 'string'
          ? { statusCode: status, message: body }
          : body,
      );
    } else {
      res.status(500).json({ statusCode: 500, message: 'Internal server error' });
    }
  }
}
