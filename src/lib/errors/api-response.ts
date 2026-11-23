import { HTTP_STATUS, type HttpStatus } from "@/lib/constants/http";
import { AppError } from "@/lib/errors/app-errors";

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ErrorResponse {
  httpStatus: HttpStatus;
  body: ApiResponse<never>;
}

// TODO(BASE-001): replace with the messages file key once i18n exists (step 0.4).
const GENERIC_INTERNAL_ERROR_MESSAGE = "Ocorreu um erro inesperado. Tente novamente.";

export function buildSuccessResponse<T>(data: T): ApiResponse<T> {
  return { success: true, data };
}

/** Converts any error into the standard envelope without leaking internal details. */
export function buildErrorResponse(error: unknown): ErrorResponse {
  if (error instanceof AppError) {
    return { httpStatus: error.httpStatus, body: { success: false, error: error.message } };
  }
  return {
    httpStatus: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    body: { success: false, error: GENERIC_INTERNAL_ERROR_MESSAGE },
  };
}
