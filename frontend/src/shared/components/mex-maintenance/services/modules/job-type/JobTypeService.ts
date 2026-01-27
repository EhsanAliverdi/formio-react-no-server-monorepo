import { JobTypeClient } from './JobTypeClient';
import { JobTypeDTO } from './JobTypeDTO';
import { Result } from '../../core/types';
import { mapJobTypeError } from './JobTypeErrorMapper';

export class JobTypeService {
  constructor(
    private readonly client: JobTypeClient
  ) {}

  async getAll(): Promise<Result<JobTypeDTO[]>> {
    try {
      const data = await this.client.getAll();
      return { ok: true, value: data };
    } catch (err) {
      return {
        ok: false,
        error: mapJobTypeError(err),
      };
    }
  }

  async getById(
    id: number
  ): Promise<Result<JobTypeDTO>> {
    try {
      const data = await this.client.getById(id);
      return { ok: true, value: data };
    } catch (err) {
      return {
        ok: false,
        error: mapJobTypeError(err),
      };
    }
  }

  async getByName(
    name: string
  ): Promise<Result<JobTypeDTO[]>> {
    try {
      const data = await this.client.getByName(name);
      return { ok: true, value: data };
    } catch (err) {
      return {
        ok: false,
        error: mapJobTypeError(err),
      };
    }
  }

  async getByDescription(
    description: string
  ): Promise<Result<JobTypeDTO[]>> {
    try {
      const data =
        await this.client.getByDescription(description);
      return { ok: true, value: data };
    } catch (err) {
      return {
        ok: false,
        error: mapJobTypeError(err),
      };
    }
  }
}
