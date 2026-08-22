import { z } from "@hono/zod-openapi";
import type { ContentfulStatusCode } from "hono/utils/http-status";

/**
 * The envelope every non-2xx response carries. It is not new here — the
 * dashboard's fetcher (packages/api-client/src/fetcher.ts) has always parsed
 * this shape, turning `code` into an ApiError the UI can branch on. This module
 * is the server finally emitting what the client already reads.
 */
export const ApiErrorBody = z
  .object({
    error: z.object({
      /** Stable machine string. Never rephrase one — the UI branches on it. */
      code: z.string(),
      /** Human sentence. Powers the error Toast and ErrorState. */
      message: z.string(),
      /** Per-input errors, keyed by dotted path. Powers FormRow error text. */
      fields: z.record(z.string(), z.string()).optional(),
    }),
  })
  .openapi("ApiErrorBody");

/** Declares one error response on a route, so the shape is in the contract. */
export function errorResponse(description: string) {
  return {
    description,
    content: { "application/json": { schema: ApiErrorBody } },
  };
}

/**
 * Thrown by handlers, converted to the envelope above by `app.onError`.
 *
 * Throwing rather than returning keeps the happy path in a handler readable and
 * lets a failure deep inside a transaction abort it — which is what makes
 * "a rejected order cannot strand a customer" true rather than aspirational.
 */
export class ApiException extends Error {
  readonly status: ContentfulStatusCode;
  readonly code: string;
  readonly fields?: Record<string, string>;

  constructor(
    status: ContentfulStatusCode,
    code: string,
    message: string,
    fields?: Record<string, string>,
  ) {
    super(message);
    this.name = "ApiException";
    this.status = status;
    this.code = code;
    this.fields = fields;
  }

  toBody(): z.infer<typeof ApiErrorBody> {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.fields ? { fields: this.fields } : {}),
      },
    };
  }
}

export const notFound = (message: string) => new ApiException(404, "NOT_FOUND", message);

export const invalidTransition = (message: string) =>
  new ApiException(409, "INVALID_TRANSITION", message);

export const itemUnavailable = (message: string) =>
  new ApiException(409, "ITEM_UNAVAILABLE", message);

export const validationFailed = (message: string, fields?: Record<string, string>) =>
  new ApiException(422, "VALIDATION_FAILED", message, fields);
