import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { FastifyReply } from 'fastify';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse() as any;

    const code =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : exceptionResponse.error || exceptionResponse.message || 'ERROR';

    const message =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : Array.isArray(exceptionResponse.message)
          ? exceptionResponse.message.join('; ')
          : exceptionResponse.message || exception.message;

    response.status(status).send({
      success: false,
      error: {
        code,
        message,
        details: exceptionResponse.details || undefined,
      },
    });
  }
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();

    console.error('Unhandled exception:', exception);

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Terjadi kesalahan internal. Silakan coba lagi.',
      },
    });
  }
}
