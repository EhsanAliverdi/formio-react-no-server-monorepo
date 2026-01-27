import { HttpError } from './HttpError';

export async function mapHttpError(
  response: Response
): Promise<HttpError> {
  let body: unknown;

  try {
    const text = await response.text();
    body = text ? text : undefined;
  } catch {
    body = undefined;
  }

  return new HttpError(
    `HTTP ${response.status} ${response.statusText}`,
    response.status,
    body
  );
}
