import { MexHttpClient } from '../../core/http';
import { TaxDTO } from './TaxDTO';

export class TaxClient {
  constructor(
    private readonly http: MexHttpClient
  ) {}

  getAll(): Promise<TaxDTO[]> {
    return this.http.get('/Tax/GetAll');
  }

  getById(
    taxId: number
  ): Promise<TaxDTO> {
    return this.http.get(`/Tax/${taxId}`);
  }

  getByName(
    name: string
  ): Promise<TaxDTO[]> {
    return this.http.get(
      `/Tax/GetByTaxName/${encodeURIComponent(name)}`
    );
  }

  getByDescription(
    description: string
  ): Promise<TaxDTO[]> {
    return this.http.get(
      `/Tax/GetByTaxDescription/${encodeURIComponent(
        description
      )}`
    );
  }
}
