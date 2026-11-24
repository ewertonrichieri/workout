import { HTTP_STATUS, type HttpStatus } from "@/lib/constants/http";

/** Base error; `message` must be safe to show to the user (pt-BR). */
export class AppError extends Error {
  constructor(
    message: string,
    readonly httpStatus: HttpStatus,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class InvalidInputError extends AppError {
  constructor(message: string) {
    super(message, HTTP_STATUS.BAD_REQUEST);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string) {
    super(message, HTTP_STATUS.UNAUTHORIZED);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string) {
    super(message, HTTP_STATUS.FORBIDDEN);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(message, HTTP_STATUS.NOT_FOUND);
  }
}

export class UnprocessableError extends AppError {
  constructor(message: string) {
    super(message, HTTP_STATUS.UNPROCESSABLE_ENTITY);
  }
}

export class RateLimitExceededError extends AppError {
  constructor(message: string) {
    super(message, HTTP_STATUS.TOO_MANY_REQUESTS);
  }
}

export class ExternalServiceError extends AppError {
  constructor(message: string) {
    super(message, HTTP_STATUS.BAD_GATEWAY);
  }
}

/** Database read/write failure; `operation` is for logs only, never shown to the user. */
export class RepositoryError extends AppError {
  constructor(
    message: string,
    readonly operation: string,
  ) {
    super(message, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
}
