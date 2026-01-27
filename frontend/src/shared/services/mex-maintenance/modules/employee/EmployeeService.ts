import { EmployeeClient } from './EmployeeClient';
import { EmployeeDTO } from './EmployeeDTO';
import { Result } from '../../core/types';
import { mapEmployeeError } from './EmployeeErrorMapper';

export class EmployeeService {
  constructor(
    private readonly client: EmployeeClient
  ) {}

  async getAll(): Promise<Result<EmployeeDTO[]>> {
    try {
      const data = await this.client.getAll();
      return { ok: true, value: data };
    } catch (err) {
      return {
        ok: false,
        error: mapEmployeeError(err),
      };
    }
  }

  async getById(
    id: number
  ): Promise<Result<EmployeeDTO>> {
    try {
      const data = await this.client.getById(id);
      return { ok: true, value: data };
    } catch (err) {
      return {
        ok: false,
        error: mapEmployeeError(err),
      };
    }
  }

  async create(
    actionedByContactId: number,
    employee: EmployeeDTO
  ): Promise<Result<EmployeeDTO>> {
    try {
      const data = await this.client.create(
        actionedByContactId,
        employee
      );
      return { ok: true, value: data };
    } catch (err) {
      return {
        ok: false,
        error: mapEmployeeError(err),
      };
    }
  }

  async update(
    employeeId: number,
    actionedByContactId: number,
    employee: EmployeeDTO
  ): Promise<Result<EmployeeDTO>> {
    try {
      const data = await this.client.update(
        employeeId,
        actionedByContactId,
        employee
      );
      return { ok: true, value: data };
    } catch (err) {
      return {
        ok: false,
        error: mapEmployeeError(err),
      };
    }
  }
}
