/**
 * The fetch layer every generated hook routes through (orval
 * `override.mutator`). It exists for two reasons the default client does not
 * handle:
 *
 *  1. Orval's stock fetch client parses the body and resolves for *any*
 *     status, so a 500 arrives at React Query as a success and the error
 *     branch never renders.
 *  2. A base URL baked in at generation time ends up inside query keys as well
 *     as request URLs, so it cannot be changed later without silently
 *     invalidating every cache entry.
 */

/** The error envelope every non-2xx response carries. See planning/API.md. */
export type ApiErrorBody = {
  error: { code: string; message: string; fields?: Record<string, string> };
};

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields?: Record<string, string>;

  constructor(status: number, code: string, message: string, fields?: Record<string, string>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

let baseUrl = "http://localhost:8787";

/** Point the client at a different origin. Call once, before any request. */
export function configureApi(options: { baseUrl: string }): void {
  baseUrl = options.baseUrl.replace(/\/$/, "");
}

export function getApiBaseUrl(): string {
  return baseUrl;
}

/**
 * Returns orval's `{ data, status, headers }` envelope so the generated types
 * stay accurate — but throws ApiError on any non-2xx instead of resolving.
 */
export async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${baseUrl}${url}`, init);
  const text = await response.text();

  let body: unknown;
  try {
    body = text ? JSON.parse(text) : undefined;
  } catch {
    // A non-JSON body means the request never reached a route handler.
    throw new ApiError(
      response.status,
      "NON_JSON_RESPONSE",
      `Expected JSON from ${url}, got ${response.status}: ${text.slice(0, 200)}`,
    );
  }

  if (!response.ok) {
    const envelope = body as Partial<ApiErrorBody> | undefined;
    throw new ApiError(
      response.status,
      envelope?.error?.code ?? "UNKNOWN",
      envelope?.error?.message ?? `Request to ${url} failed with ${response.status}`,
      envelope?.error?.fields,
    );
  }

  return { data: body, status: response.status, headers: response.headers } as T;
}
