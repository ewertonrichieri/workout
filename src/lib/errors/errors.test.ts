import { describe, expect, it } from "vitest";
import {
  AppError,
  ExternalServiceError,
  ForbiddenError,
  InvalidInputError,
  NotFoundError,
  RateLimitExceededError,
  UnauthorizedError,
  UnprocessableError,
} from "@/lib/errors/app-errors";
import { buildErrorResponse, buildSuccessResponse } from "@/lib/errors/api-response";
import { HTTP_STATUS } from "@/lib/constants/http";

describe("custom errors", () => {
  it.each([
    [new InvalidInputError("x"), HTTP_STATUS.BAD_REQUEST],
    [new UnauthorizedError("x"), HTTP_STATUS.UNAUTHORIZED],
    [new ForbiddenError("x"), HTTP_STATUS.FORBIDDEN],
    [new NotFoundError("x"), HTTP_STATUS.NOT_FOUND],
    [new UnprocessableError("x"), HTTP_STATUS.UNPROCESSABLE_ENTITY],
    [new RateLimitExceededError("x"), HTTP_STATUS.TOO_MANY_REQUESTS],
    [new ExternalServiceError("x"), HTTP_STATUS.BAD_GATEWAY],
  ])("%s maps to the right HTTP status", (error, status) => {
    expect(error).toBeInstanceOf(AppError);
    expect(error.httpStatus).toBe(status);
  });
});

describe("api responses", () => {
  it("wraps data in a success envelope", () => {
    expect(buildSuccessResponse({ id: 1 })).toEqual({ success: true, data: { id: 1 } });
  });

  it("exposes the user message of an AppError", () => {
    const result = buildErrorResponse(new NotFoundError("Treino não encontrado."));
    expect(result).toEqual({
      httpStatus: HTTP_STATUS.NOT_FOUND,
      body: { success: false, error: "Treino não encontrado." },
    });
  });

  it("hides details of unknown errors behind a generic 500", () => {
    const result = buildErrorResponse(new Error("db password leaked in stack"));
    expect(result.httpStatus).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
    expect(result.body.error).not.toContain("password");
    expect(result.body.success).toBe(false);
  });
});
