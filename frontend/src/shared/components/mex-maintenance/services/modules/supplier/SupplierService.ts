import { SupplierClient } from './SupplierClient';
import { SupplierDTO } from './SupplierDTO';
import { Result } from '../../core/types';
import { mapSupplierError } from './SupplierErrorMapper';

export class SupplierService {
  constructor(
    private readonly client: SupplierClient
  ) {}

  async getAll(): Promise<Result<SupplierDTO[]>> {
    try {
      const data = await this.client.getAll();
      return { ok: true, value: data };
    } catch (err) {
      return {
        ok: false,
        error: mapSupplierError(err),
      };
    }
  }

  async getById(
    id: number
  ): Promise<Result<SupplierDTO>> {
    try {
      const data = await this.client.getById(id);
      return { ok: true, value: data };
    } catch (err) {
      return {
        ok: false,
        error: mapSupplierError(err),
      };
    }
  }

  async getByCode(
    code: string
  ): Promise<Result<SupplierDTO[]>> {
    try {
      const data = await this.client.getByCode(code);
      return { ok: true, value: data };
    } catch (err) {
      return {
        ok: false,
        error: mapSupplierError(err),
      };
    }
  }

  async getByCompany(
    company: string
  ): Promise<Result<SupplierDTO[]>> {
    try {
      const data = await this.client.getByCompany(company);
      return { ok: true, value: data };
    } catch (err) {
      return {
        ok: false,
        error: mapSupplierError(err),
      };
    }
  }

  async create(
    actionedByContactId: number,
    supplier: SupplierDTO
  ): Promise<Result<SupplierDTO>> {
    try {
      const data = await this.client.create(
        actionedByContactId,
        supplier
      );
      return { ok: true, value: data };
    } catch (err) {
      return {
        ok: false,
        error: mapSupplierError(err),
      };
    }
  }

  async update(
    supplierId: number,
    actionedByContactId: number,
    supplier: SupplierDTO
  ): Promise<Result<SupplierDTO>> {
    try {
      const data = await this.client.update(
        supplierId,
        actionedByContactId,
        supplier
      );
      return { ok: true, value: data };
    } catch (err) {
      return {
        ok: false,
        error: mapSupplierError(err),
      };
    }
  }
}
