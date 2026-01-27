import { DepartmentClient } from './DepartmentClient';
import { DepartmentDTO } from './DepartmentDTO';
import { Result } from '../../core/types';
import { mapDepartmentError } from './DepartmentErrorMapper';

export class DepartmentService {
  constructor(
    private readonly client: DepartmentClient
  ) {}

  async getAll(): Promise<Result<DepartmentDTO[]>> {
    try {
      const data = await this.client.getAll();
      return { ok: true, value: data };
    } catch (err) {
      return {
        ok: false,
        error: mapDepartmentError(err),
      };
    }
  }

  async getById(
    id: number
  ): Promise<Result<DepartmentDTO>> {
    try {
      const data = await this.client.getById(id);
      return { ok: true, value: data };
    } catch (err) {
      return {
        ok: false,
        error: mapDepartmentError(err),
      };
    }
  }

  async getByName(
    name: string
  ): Promise<Result<DepartmentDTO[]>> {
    try {
      const data = await this.client.getByName(name);
      return { ok: true, value: data };
    } catch (err) {
      return {
        ok: false,
        error: mapDepartmentError(err),
      };
    }
  }
}
