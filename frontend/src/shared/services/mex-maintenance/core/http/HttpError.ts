export class HttpError extends Error {
  readonly statusCode: number;
  readonly responseBody?: unknown;

  constructor(
    message: string,
    statusCode: number,
    responseBody?: unknown
  ) {
    super(message);
    this.statusCode = statusCode;
    this.responseBody = responseBody;
  }
}
