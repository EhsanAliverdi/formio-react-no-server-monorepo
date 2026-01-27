import { CurrencyTypeClient } from './CurrencyTypeClient';
import { CurrencyTypeDTO } from './CurrencyTypeDTO';
import { Result } from '../../core/types';
import { mapCurrencyTypeError } from './CurrencyTypeErrorMapper';

export class CurrencyTypeService {
  constructor(
    private readonly client: CurrencyTypeClient
  ) {}

  async getAll(): Promise<Result<CurrencyTypeDTO[]>> {
    try {
      const data = await this.client.getAll();
      return { ok: true, value: data };
    } catch (err) {
      return {
        ok: false,
        error: mapCurrencyTypeError(err),
      };
    }
  }

  async getById(
    id: number
  ): Promise<Result<CurrencyTypeDTO>> {
    try {
      const data = await this.client.getById(id);
      return { ok: true, value: data };
    } catch (err) {
      return {
        ok: false,
        error: mapCurrencyTypeError(err),
      };
    }
  }

  async getByCode(
    code: string
  ): Promise<Result<CurrencyTypeDTO[]>> {
    try {
      const data = await this.client.getByCode(code);
      return { ok: true, value: data };
    } catch (err) {
      return {
        ok: false,
        error: mapCurrencyTypeError(err),
      };
    }
  }

  async create(
    actionedByContactId: number,
    currencyType: CurrencyTypeDTO
  ): Promise<Result<CurrencyTypeDTO>> {
    try {
      const data = await this.client.create(
        actionedByContactId,
        currencyType
      );
      return { ok: true, value: data };
    } catch (err) {
      return {
        ok: false,
        error: mapCurrencyTypeError(err),
      };
    }
  }

  async update(
    currencyTypeId: number,
    actionedByContactId: number,
    currencyType: CurrencyTypeDTO
  ): Promise<Result<CurrencyTypeDTO>> {
    try {
      const data = await this.client.update(
        currencyTypeId,
        actionedByContactId,
        currencyType
      );
      return { ok: true, value: data };
    } catch (err) {
      return {
        ok: false,
        error: mapCurrencyTypeError(err),
      };
    }
  }
}
