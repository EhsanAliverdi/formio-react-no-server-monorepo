import { PriorityClient } from './PriorityClient';
import { PriorityDTO } from './PriorityDTO';
import { Result } from '../../core/types';
import { mapPriorityError } from './PriorityErrorMapper';

export class PriorityService {
  constructor(
    private readonly client: PriorityClient
  ) {}

  async getAll(): Promise<Result<PriorityDTO[]>> {
    try {
      const data = await this.client.getAll();
      return { ok: true, value: data };
    } catch (err) {
      return {
        ok: false,
        error: mapPriorityError(err),
      };
    }
  }

  async getById(
    id: number
  ): Promise<Result<PriorityDTO>> {
    try {
      const data = await this.client.getById(id);
      return { ok: true, value: data };
    } catch (err) {
      return {
        ok: false,
        error: mapPriorityError(err),
      };
    }
  }

  async getByNumber(
    number: number
  ): Promise<Result<PriorityDTO[]>> {
    try {
      const data = await this.client.getByNumber(number);
      return { ok: true, value: data };
    } catch (err) {
      return {
        ok: false,
        error: mapPriorityError(err),
      };
    }
  }

  async getByDescription(
    description: string
  ): Promise<Result<PriorityDTO[]>> {
    try {
      const data =
        await this.client.getByDescription(description);
      return { ok: true, value: data };
    } catch (err) {
      return {
        ok: false,
        error: mapPriorityError(err),
      };
    }
  }
}
