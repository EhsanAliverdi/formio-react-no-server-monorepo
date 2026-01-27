import { TaxClient } from './TaxClient';
import { TaxDTO } from './TaxDTO';
import { Result } from '../../core/types';
import { mapTaxError } from './TaxErrorMapper';

export class TaxService {
  constructor(
    private readonly client: TaxClient
  ) {}

  async getAll(): Promise<Result<TaxDTO[]>> {
    try {
      const data = await this.client.getAll();
      return { ok: true, value: data };
    } catch (err) {
      return {
        ok: false,
        error: mapTaxError(err),
      };
    }
  }

  async getById(
    id: number
  ): Promise<Result<TaxDTO>> {
    try {
      const data = await this.client.getById(id);
      return { ok: true, value: data };
    } catch (err) {
      return {
        ok: false,
        error: mapTaxError(err),
      };
    }
  }

  async getByName(
    name: string
  ): Promise<Result<TaxDTO[]>> {
    try {
      const data = await this.client.getByName(name);
      return { ok: true, value: data };
    } catch (err) {
      return {
        ok: false,
        error: mapTaxError(err),
      };
    }
  }

  async getByDescription(
    description: string
  ): Promise<Result<TaxDTO[]>> {
    try {
      const data =
        await this.client.getByDescription(description);
      return { ok: true, value: data };
    } catch (err) {
      return {
        ok: false,
        error: mapTaxError(err),
      };
    }
  }
}
