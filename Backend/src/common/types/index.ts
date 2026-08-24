export interface ApiResponse<T = unknown> {
  success: true;
  data: T;
  message: string;
}

export type ApiErrorCategory = 'user' | 'system';

export interface ApiErrorResponse {
  success: false;
  statusCode: number;
  code: string;
  message: string;
  category: ApiErrorCategory;
  hint?: string;
  errors: string[];
  retryAfterSeconds?: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedData<T> {
  items: T[];
  meta: PaginationMeta;
}

export interface JwtPayload {
  sub: string;
  phone: string;
  roleId: string;
  rememberMe?: boolean;
}

export interface AuthenticatedUser {
  id: string;
  phone: string;
  roleId: string;
}

export type RealtimeEntityName =
  | 'app-roles'
  | 'structural-units'
  | 'users'
  | 'objects'
  | 'ppr-types'
  | 'applications'
  | 'application-workflow'
  | 'ppr-calendar'
  | 'guide-videos';

export type RealtimeEntityAction = 'create' | 'update' | 'delete';
