import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';
import { ErrorCode } from '../constants/error-codes';
import { resolveErrorMetadata } from '../errors/error-metadata';
import {
  mapPrismaError,
  mapUnknownDatabaseError,
} from '../errors/prisma-error.mapper';
import { ApiErrorResponse, AuthenticatedUser } from '../types';
import { ErrorLogsService } from '../../modules/error-logs/error-logs.service';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly errorLogsService?: ErrorLogsService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { user?: AuthenticatedUser }>();

    const resolved = this.resolveException(exception);

    const errorResponse: ApiErrorResponse = {
      success: false,
      statusCode: resolved.statusCode,
      code: resolved.code,
      message: resolved.code,
      category: resolved.category,
      ...(resolved.hintCode ? { hint: resolved.hintCode } : {}),
      ...(resolved.retryAfterSeconds !== undefined
        ? { retryAfterSeconds: resolved.retryAfterSeconds }
        : {}),
      errors: resolved.errors,
    };

    if (this.errorLogsService && this.shouldPersistApiError(request, resolved)) {
      void this.errorLogsService
        .createFromApiError({
          request,
          code: resolved.code,
          message: resolved.code,
          category: resolved.category,
          hintCode: resolved.hintCode,
          statusCode: resolved.statusCode,
          errors: resolved.errors,
          stack: exception instanceof Error ? exception.stack : undefined,
        })
        .catch(() => {
          // Error logging must never block the API response.
        });
    }

    response.status(resolved.statusCode).json(errorResponse);
  }

  private shouldPersistApiError(
    request: Request,
    resolved: {
      statusCode: number;
    },
  ): boolean {
    const path = request.originalUrl ?? request.url ?? '';

    if (path.includes('/error-logs')) {
      return false;
    }

    if (resolved.statusCode === 401 && path.includes('/auth/')) {
      return false;
    }

    return resolved.statusCode >= 400;
  }

  private resolveException(exception: unknown): {
    statusCode: number;
    code: string;
    category: 'user' | 'system';
    hintCode?: string;
    errors: string[];
    retryAfterSeconds?: number;
  } {
    if (exception instanceof HttpException) {
      return this.resolveHttpException(exception);
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const mapped = mapPrismaError(exception);

      if (mapped) {
        const metadata = resolveErrorMetadata(mapped.code, mapped.statusCode);

        return {
          statusCode: mapped.statusCode,
          code: metadata.code,
          category: metadata.category,
          hintCode: metadata.hintCode,
          errors: mapped.errors,
        };
      }
    }

    if (exception instanceof Error) {
      const mapped = mapUnknownDatabaseError(exception.message);

      if (mapped) {
        const metadata = resolveErrorMetadata(mapped.code, mapped.statusCode);

        return {
          statusCode: mapped.statusCode,
          code: metadata.code,
          category: metadata.category,
          hintCode: metadata.hintCode,
          errors: mapped.errors,
        };
      }

      if (exception.message.toLowerCase().includes('entity too large')) {
        const metadata = resolveErrorMetadata(
          ErrorCode.PAYLOAD_TOO_LARGE,
          HttpStatus.PAYLOAD_TOO_LARGE,
        );

        return {
          statusCode: HttpStatus.PAYLOAD_TOO_LARGE,
          code: metadata.code,
          category: metadata.category,
          hintCode: metadata.hintCode,
          errors: [],
        };
      }
    }

    const metadata = resolveErrorMetadata(
      ErrorCode.INTERNAL_SERVER_ERROR,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: metadata.code,
      category: metadata.category,
      hintCode: metadata.hintCode,
      errors: [],
    };
  }

  private resolveHttpException(exception: HttpException): {
    statusCode: number;
    code: string;
    category: 'user' | 'system';
    hintCode?: string;
    errors: string[];
    retryAfterSeconds?: number;
  } {
    const statusCode = exception.getStatus();
    const exceptionResponse = exception.getResponse();
    let code: string = ErrorCode.INTERNAL_SERVER_ERROR;
    let errors: string[] = [];
    let retryAfterSeconds: number | undefined;

    if (typeof exceptionResponse === 'string') {
      code = this.normalizeCode(exceptionResponse, statusCode);
    } else if (typeof exceptionResponse === 'object') {
      const body = exceptionResponse as Record<string, unknown>;

      if (Array.isArray(body.message)) {
        errors = body.message.map((item) => String(item));
        code = ErrorCode.VALIDATION_FAILED;
      } else if (typeof body.message === 'string') {
        code = this.normalizeCode(body.message, statusCode);
      }

      if (Array.isArray(body.errors)) {
        errors = body.errors.map((item) => String(item));
      }

      if (typeof body.retryAfterSeconds === 'number' && Number.isFinite(body.retryAfterSeconds)) {
        retryAfterSeconds = Math.max(0, Math.ceil(body.retryAfterSeconds));
      }
    }

    if (
      statusCode === HttpStatus.TOO_MANY_REQUESTS &&
      code !== ErrorCode.LOGIN_TEMPORARILY_LOCKED
    ) {
      code = ErrorCode.TOO_MANY_REQUESTS;
    }

    if (statusCode === HttpStatus.FORBIDDEN && code === ErrorCode.INTERNAL_SERVER_ERROR) {
      code = ErrorCode.FORBIDDEN;
    }

    if (statusCode === HttpStatus.NOT_FOUND && code === ErrorCode.INTERNAL_SERVER_ERROR) {
      code = ErrorCode.NOT_FOUND;
    }

    const metadata = resolveErrorMetadata(code, statusCode);

    return {
      statusCode,
      code: metadata.code,
      category: metadata.category,
      hintCode: metadata.hintCode,
      errors: errors.map((item) => this.normalizeCode(item, statusCode)),
      retryAfterSeconds,
    };
  }

  private normalizeCode(message: string, statusCode: number): string {
    const trimmed = message.trim();

    if (Object.values(ErrorCode).includes(trimmed as (typeof ErrorCode)[keyof typeof ErrorCode])) {
      return trimmed;
    }

    if (statusCode === HttpStatus.TOO_MANY_REQUESTS) {
      return ErrorCode.TOO_MANY_REQUESTS;
    }

    if (trimmed.toLowerCase().includes('entity too large')) {
      return ErrorCode.PAYLOAD_TOO_LARGE;
    }

    const mapped = mapUnknownDatabaseError(trimmed);

    if (mapped) {
      return mapped.code;
    }

    return ErrorCode.INTERNAL_SERVER_ERROR;
  }
}
