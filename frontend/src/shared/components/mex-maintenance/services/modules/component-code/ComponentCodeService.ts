import { ComponentCodeClient } from './ComponentCodeClient';
import { ComponentCodeDTO } from './ComponentCodeDTO';
import { Result } from '../../core/types';
import { mapComponentCodeError } from './ComponentCodeErrorMapper';

export class ComponentCodeService {
  constructor(
    private readonly client: ComponentCodeClient
  ) {}

  async getAll(): Promise<Result<ComponentCodeDTO[]>> {
    try {
      const data = await this.client.getAll();
      return { ok: true, value: data };
    } catch (err) {
      return {
        ok: false,
        error: mapComponentCodeError(err),
      };
    }
  }

  async getById(
    id: number
  ): Promise<Result<ComponentCodeDTO>> {
    try {
      const data = await this.client.getById(id);
      return { ok: true, value: data };
    } catch (err) {
      return {
        ok: false,
        error: mapComponentCodeError(err),
      };
    }
  }

  async getByName(
    name: string
  ): Promise<Result<ComponentCodeDTO[]>> {
    try {
      const data = await this.client.getByName(name);
      return { ok: true, value: data };
    } catch (err) {
      return {
        ok: false,
        error: mapComponentCodeError(err),
      };
    }
  }

  async getByDescription(
    description: string
  ): Promise<Result<ComponentCodeDTO[]>> {
    try {
      const data =
        await this.client.getByDescription(description);
      return { ok: true, value: data };
    } catch (err) {
      return {
        ok: false,
        error: mapComponentCodeError(err),
      };
    }
  }
}
