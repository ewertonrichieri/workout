import { unstable_rethrow } from "next/navigation";
import { NextResponse } from "next/server";
import { HTTP_STATUS, type HttpStatus } from "@/lib/constants/http";
import { buildErrorResponse, buildSuccessResponse } from "@/lib/errors/api-response";
import { AppError, RepositoryError } from "@/lib/errors/app-errors";
import type { Logger } from "@/lib/logger/logger";

interface ApiHandlerContext {
  route: string;
  logger: Logger;
  /** HTTP status of a successful answer (default 200; e.g. 201 for creations). */
  successStatus?: HttpStatus;
}

function logFailure({ route, logger }: ApiHandlerContext, error: unknown): void {
  if (error instanceof AppError && !(error instanceof RepositoryError)) return;
  const operation = error instanceof RepositoryError ? error.operation : undefined;
  logger.error("api request failed", { route, operation, errorName: error instanceof Error ? error.name : typeof error });
}

/** Thin route handler wrapper: runs the service call and answers in the standard JSON envelope. */
export async function respondWithJson<T>(context: ApiHandlerContext, run: () => Promise<T>): Promise<NextResponse> {
  try {
    return NextResponse.json(buildSuccessResponse(await run()), { status: context.successStatus ?? HTTP_STATUS.OK });
  } catch (error) {
    // Lets Next.js internal signals (e.g. dynamic rendering bail-out during prerender) pass through.
    unstable_rethrow(error);
    logFailure(context, error);
    const { httpStatus, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status: httpStatus });
  }
}
