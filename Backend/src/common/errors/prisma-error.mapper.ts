import { Prisma } from '@prisma/client';
import { ErrorCode } from '../constants/error-codes';

interface MappedPrismaError {
  statusCode: number;
  code: string;
  errors: string[];
}

function getUniqueFieldTarget(error: Prisma.PrismaClientKnownRequestError): string {
  const target = error.meta?.target;

  if (Array.isArray(target)) {
    return target.join(',');
  }

  if (typeof target === 'string') {
    return target;
  }

  return '';
}

export function mapPrismaError(
  error: Prisma.PrismaClientKnownRequestError,
): MappedPrismaError | null {
  switch (error.code) {
    case 'P2002': {
      const target = getUniqueFieldTarget(error).toLowerCase();

      if (target.includes('phone')) {
        return {
          statusCode: 409,
          code: ErrorCode.PHONE_ALREADY_IN_USE,
          errors: [],
        };
      }

      if (target.includes('tabel')) {
        return {
          statusCode: 409,
          code: ErrorCode.TABEL_NUMBER_ALREADY_IN_USE,
          errors: [],
        };
      }

      return {
        statusCode: 409,
        code: ErrorCode.RESOURCE_ALREADY_EXISTS,
        errors: [],
      };
    }

    case 'P2003':
      return {
        statusCode: 409,
        code: ErrorCode.STRUCTURAL_UNIT_IN_USE,
        errors: [],
      };

    case 'P2025':
      return {
        statusCode: 404,
        code: ErrorCode.NOT_FOUND,
        errors: [],
      };

    case 'P2021':
    case 'P2022':
      return {
        statusCode: 500,
        code: ErrorCode.DATABASE_SCHEMA_OUT_OF_DATE,
        errors: [],
      };

    default:
      return {
        statusCode: 500,
        code: ErrorCode.DATABASE_ERROR,
        errors: [],
      };
  }
}

export function mapUnknownDatabaseError(message: string): MappedPrismaError | null {
  const lower = message.toLowerCase();

  if (
    lower.includes('column ') ||
    lower.includes('does not exist') ||
    lower.includes('relation ') ||
    lower.includes('unknown argument')
  ) {
    return {
      statusCode: 500,
      code: ErrorCode.DATABASE_SCHEMA_OUT_OF_DATE,
      errors: [],
    };
  }

  if (lower.includes('prisma') || lower.includes('database')) {
    return {
      statusCode: 500,
      code: ErrorCode.DATABASE_ERROR,
      errors: [],
    };
  }

  return null;
}
