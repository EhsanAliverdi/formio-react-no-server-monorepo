import { RequestClient } from './RequestClient';
import { RequestDTO } from './RequestDTO';
import { Result } from '../../core/types';
import { mapRequestError } from './RequestErrorMapper';

export class RequestService {
  constructor(
    private readonly client: RequestClient
  ) {}

  async getAll(): Promise<Result<RequestDTO[]>> {
    try {
      const data = await this.client.getAll();
      return { ok: true, value: data };
    } catch (err) {
      return {
        ok: false,
        error: mapRequestError(err),
      };
    }
  }

  async getById(
    id: number
  ): Promise<Result<RequestDTO>> {
    try {
      const data = await this.client.getById(id);
      return { ok: true, value: data };
    } catch (err) {
      return {
        ok: false,
        error: mapRequestError(err),
      };
    }
  }

  async getByRequestNumber(
    number: string
  ): Promise<Result<RequestDTO>> {
    try {
      const data =
        await this.client.getByRequestNumber(number);
      return { ok: true, value: data };
    } catch (err) {
      return {
        ok: false,
        error: mapRequestError(err),
      };
    }
  }

  async getByDescription(
    description: string
  ): Promise<Result<RequestDTO[]>> {
    try {
      const data =
        await this.client.getByDescription(description);
      return { ok: true, value: data };
    } catch (err) {
      return {
        ok: false,
        error: mapRequestError(err),
      };
    }
  }

  async create(
    actionedByContactId: number,
    request: RequestDTO
  ): Promise<Result<RequestDTO>> {
    try {
      const data =
        await this.client.create(
          actionedByContactId,
          request
        );
      return { ok: true, value: data };
    } catch (err) {
      return {
        ok: false,
        error: mapRequestError(err),
      };
    }
  }

  async update(
    requestId: number,
    actionedByContactId: number,
    request: RequestDTO
  ): Promise<Result<RequestDTO>> {
    try {
      const data =
        await this.client.update(
          requestId,
          actionedByContactId,
          request
        );
      return { ok: true, value: data };
    } catch (err) {
      return {
        ok: false,
        error: mapRequestError(err),
      };
    }
  }
}
