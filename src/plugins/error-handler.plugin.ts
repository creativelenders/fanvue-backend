import type { FastifyError, FastifyRequest, FastifyReply } from "fastify";
import { AppError } from "../utils/errors";
import { ZodError } from "zod";

export function errorHandler(
  error: FastifyError | AppError | ZodError | Error,
  request: FastifyRequest,
  reply: FastifyReply
) {
  // Known application errors
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details || undefined,
      },
    });
  }

  // Zod validation errors
  if (error instanceof ZodError) {
    return reply.status(400).send({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed",
        details: error.flatten(),
      },
    });
  }

  // Fastify built-in errors (rate limit, etc.)
  if ("statusCode" in error && typeof error.statusCode === "number") {
    return reply.status(error.statusCode).send({
      success: false,
      error: {
        code: error.code || "FASTIFY_ERROR",
        message: error.message,
      },
    });
  }

  // Unknown errors
  request.log.error(error);
  return reply.status(500).send({
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message:
        process.env.NODE_ENV === "production"
          ? "An unexpected error occurred"
          : error.message,
    },
  });
}
