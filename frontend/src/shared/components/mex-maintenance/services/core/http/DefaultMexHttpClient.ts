import { MexHttpClient } from './MexHttpClient';
import { MexConfig } from '../config';
import { buildAuthHeaders } from './AuthHeaderBuilder';
import { mapHttpError } from './HttpErrorMapper';
import { MexDefaults } from '../config';

export class DefaultMexHttpClient implements MexHttpClient {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;
  private readonly timeoutMs: number;

  constructor(config: MexConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.timeoutMs =
      config.timeoutMs ?? MexDefaults.timeoutMs;

    this.headers = {
      'Content-Type': 'application/json',
      ...buildAuthHeaders(config.auth),
      ...(config.clientName
        ? { 'X-Client-Name': config.clientName }
        : {}),
    };
  }

  async get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  async put<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>('PUT', path, body);
  }

  async delete<T>(path: string): Promise<T> {
    return this.request<T>('DELETE', path);
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.timeoutMs
    );

    const response = await fetch(
      `${this.baseUrl}${path}`,
      {
        method,
        headers: this.headers,
        body:
          body !== undefined
            ? JSON.stringify(body)
            : undefined,
        signal: controller.signal,
      }
    ).finally(() => clearTimeout(timeout));

    if (!response.ok) {
      throw await mapHttpError(response);
    }

    // Handle empty responses safely
    if (response.status === 204) {
      return undefined as T;
    }

    const text = await response.text();
    return text ? (JSON.parse(text) as T) : (undefined as T);
  }
}
