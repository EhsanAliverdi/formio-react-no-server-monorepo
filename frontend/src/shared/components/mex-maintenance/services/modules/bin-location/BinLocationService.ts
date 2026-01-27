import { BinLocationClient } from './BinLocationClient';
import { BinLocationDTO } from './BinLocationDTO';
import { Result } from '../../core/types';
import { mapBinLocationError } from './BinLocationErrorMapper';

export class BinLocationService {
  constructor(
    private readonly client: BinLocationClient
  ) {}

  async getAll(): Promise<Result<BinLocationDTO[]>> {
    try {
      const data = await this.client.getAll();
      return { ok: true, value: data };
    } catch (err) {
      return { ok: false, error: mapBinLocationError(err) };
    }
  }

  async getById(
    id: number
  ): Promise<Result<BinLocationDTO>> {
    try {
      const data = await this.client.getById(id);
      return { ok: true, value: data };
    } catch (err) {
      return { ok: false, error: mapBinLocationError(err) };
    }
  }

  async getByName(
    name: string
  ): Promise<Result<BinLocationDTO[]>> {
    try {
      const data = await this.client.getByName(name);
      return { ok: true, value: data };
    } catch (err) {
      return { ok: false, error: mapBinLocationError(err) };
    }
  }
}
