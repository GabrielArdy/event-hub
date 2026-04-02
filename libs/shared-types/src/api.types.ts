export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: PaginationMeta;
  message?: string;
  warnings?: string[];
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: FieldError[];
  };
}

export interface PaginationMeta {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

export interface FieldError {
  field: string;
  message: string;
}

export interface PaginationQuery {
  page?: number;
  per_page?: number;
}
