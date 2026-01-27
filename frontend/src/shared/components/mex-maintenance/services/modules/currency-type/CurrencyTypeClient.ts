import { MexHttpClient } from '../../core/http';
import { CurrencyTypeDTO } from './CurrencyTypeDTO';

export class CurrencyTypeClient {
  constructor(private readonly http: MexHttpClient) {}

  getAll(): Promise<CurrencyTypeDTO[]> {
    return this.http.get('/CurrencyType/GetAll');
  }

  getById(
    currencyTypeId: number
  ): Promise<CurrencyTypeDTO> {
    return this.http.get(
      `/CurrencyType/${currencyTypeId}`
    );
  }

  getByCode(
    code: string
  ): Promise<CurrencyTypeDTO[]> {
    return this.http.get(
      `/CurrencyType/GetByCurrencyTypeCode/${encodeURIComponent(
        code
      )}`
    );
  }

  getByDescription(
    description: string
  ): Promise<CurrencyTypeDTO[]> {
    return this.http.get(
      `/CurrencyType/GetByCurrencyTypeDescription/${encodeURIComponent(
        description
      )}`
    );
  }

  create(
    actionedByContactId: number,
    payload: CurrencyTypeDTO
  ): Promise<CurrencyTypeDTO> {
    return this.http.post(
      `/CurrencyType/${actionedByContactId}`,
      payload
    );
  }

  update(
    currencyTypeId: number,
    actionedByContactId: number,
    payload: CurrencyTypeDTO
  ): Promise<CurrencyTypeDTO> {
    return this.http.put(
      `/CurrencyType/${currencyTypeId}/${actionedByContactId}`,
      payload
    );
  }
}
