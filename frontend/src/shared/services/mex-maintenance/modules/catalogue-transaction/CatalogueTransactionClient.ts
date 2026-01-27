import { MexHttpClient } from '../../core/http';
import { CatalogueTransactionDTO } from './CatalogueTransactionDTO';

export class CatalogueTransactionClient {
  constructor(private readonly http: MexHttpClient) {}

  getByDateRange(
    dateFrom: string,
    dateTo: string
  ): Promise<CatalogueTransactionDTO[]> {
    return this.http.get(
      `/CatalogueTransaction/GetByDateRange/${encodeURIComponent(
        dateFrom
      )}/${encodeURIComponent(dateTo)}`
    );
  }
}
