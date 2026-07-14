import { HttpStatus } from '@nestjs/common';
import { ErrorCode, type ErrorCodeValue } from '../constants/error-codes';

export type ApiErrorCategory = 'user' | 'system';

interface ErrorMetadata {
  category: ApiErrorCategory;
  hintCode?: ErrorCodeValue;
}

const ERROR_METADATA: Partial<Record<ErrorCodeValue, ErrorMetadata>> = {
  [ErrorCode.VALIDATION_FAILED]: { category: 'user' },
  [ErrorCode.UNAUTHORIZED]: { category: 'user' },
  [ErrorCode.INVALID_CREDENTIALS]: { category: 'user' },
  [ErrorCode.INVALID_REFRESH_TOKEN]: { category: 'user' },
  [ErrorCode.USER_NOT_FOUND]: { category: 'user' },
  [ErrorCode.PHONE_ALREADY_REGISTERED]: {
    category: 'user',
    hintCode: ErrorCode.PHONE_ALREADY_IN_USE,
  },
  [ErrorCode.PHONE_ALREADY_IN_USE]: { category: 'user' },
  [ErrorCode.TABEL_NUMBER_ALREADY_REGISTERED]: { category: 'user' },
  [ErrorCode.TABEL_NUMBER_ALREADY_IN_USE]: { category: 'user' },
  [ErrorCode.APP_ROLE_NOT_FOUND]: { category: 'user' },
  [ErrorCode.STRUCTURAL_UNIT_NOT_FOUND]: { category: 'user' },
  [ErrorCode.STRUCTURAL_UNIT_IN_USE]: { category: 'user' },
  [ErrorCode.REGISTERED_OBJECT_NOT_FOUND]: { category: 'user' },
  [ErrorCode.PPR_TYPE_NOT_FOUND]: { category: 'user' },
  [ErrorCode.NOTIFICATION_NOT_FOUND]: { category: 'user' },
  [ErrorCode.FIRST_NAME_REQUIRED]: { category: 'user' },
  [ErrorCode.LAST_NAME_REQUIRED]: { category: 'user' },
  [ErrorCode.BIRTH_DATE_REQUIRED]: { category: 'user' },
  [ErrorCode.PHONE_REQUIRED]: { category: 'user' },
  [ErrorCode.TABEL_NUMBER_FORMAT]: { category: 'user' },
  [ErrorCode.POSITION_REQUIRED]: { category: 'user' },
  [ErrorCode.ROLE_ID_REQUIRED]: { category: 'user' },
  [ErrorCode.STRUCTURAL_UNIT_ID_REQUIRED]: { category: 'user' },
  [ErrorCode.PASSWORD_MIN_LENGTH]: { category: 'user' },
  [ErrorCode.APPLICATION_NOT_FOUND]: { category: 'user' },
  [ErrorCode.APPLICATION_WORKFLOW_FORBIDDEN]: { category: 'user' },
  [ErrorCode.APPLICATION_WORKFLOW_CONFIRMATION_FILES_REQUIRED]: {
    category: 'user',
  },
  [ErrorCode.PPR_CALENDAR_MONTH_NOT_FOUND]: { category: 'user' },
  [ErrorCode.PPR_CALENDAR_ENTRY_NOT_FOUND]: { category: 'user' },
  [ErrorCode.PPR_CALENDAR_FORBIDDEN]: { category: 'user' },
  [ErrorCode.PPR_CALENDAR_MONTH_NOT_EDITABLE]: { category: 'user' },
  [ErrorCode.PPR_CALENDAR_MONTH_NOT_SUBMITTABLE]: { category: 'user' },
  [ErrorCode.PPR_CALENDAR_HEAD_NOT_FOUND]: { category: 'user' },
  [ErrorCode.PPR_CALENDAR_MONTH_EMPTY]: { category: 'user' },
  [ErrorCode.PAYLOAD_TOO_LARGE]: { category: 'user' },
  [ErrorCode.TOO_MANY_REQUESTS]: { category: 'user' },
  [ErrorCode.LOGIN_TEMPORARILY_LOCKED]: { category: 'user' },
  [ErrorCode.FORBIDDEN]: { category: 'user' },
  [ErrorCode.NOT_FOUND]: { category: 'user' },
  [ErrorCode.RESOURCE_ALREADY_EXISTS]: { category: 'user' },
  [ErrorCode.INTERNAL_SERVER_ERROR]: { category: 'system' },
  [ErrorCode.DATABASE_ERROR]: { category: 'system' },
  [ErrorCode.DATABASE_SCHEMA_OUT_OF_DATE]: { category: 'system' },
  [ErrorCode.ERROR_LOG_FORBIDDEN]: { category: 'user' },
};

const USER_STATUS_CODES = new Set<number>([
  HttpStatus.BAD_REQUEST,
  HttpStatus.UNAUTHORIZED,
  HttpStatus.FORBIDDEN,
  HttpStatus.NOT_FOUND,
  HttpStatus.CONFLICT,
  HttpStatus.UNPROCESSABLE_ENTITY,
  HttpStatus.PAYLOAD_TOO_LARGE,
  HttpStatus.TOO_MANY_REQUESTS,
]);

export function isErrorCode(value: string): value is ErrorCodeValue {
  return Object.values(ErrorCode).includes(value as ErrorCodeValue);
}

export function resolveErrorMetadata(
  code: string,
  statusCode: number,
): { code: string; category: ApiErrorCategory; hintCode?: string } {
  if (isErrorCode(code)) {
    const metadata = ERROR_METADATA[code];

    return {
      code,
      category: metadata?.category ?? inferCategoryFromStatus(statusCode),
      hintCode: metadata?.hintCode,
    };
  }

  return {
    code: ErrorCode.INTERNAL_SERVER_ERROR,
    category: inferCategoryFromStatus(statusCode),
  };
}

function inferCategoryFromStatus(statusCode: number): ApiErrorCategory {
  if (USER_STATUS_CODES.has(statusCode)) {
    return 'user';
  }

  return 'system';
}
