import { CatalogueTransactionClient } from './CatalogueTransactionClient';
import { CatalogueTransactionDTO } from './CatalogueTransactionDTO';
import { Result } from '../../core/types';
import { mapCatalogueTransactionError } from './CatalogueTransactionErrorMapper';

export class CatalogueTransactionService {
  constructor(
    private readonly client: CatalogueTransactionClient
  ) {}

  async getByDateRange(
    dateFrom: string,
    dateTo: string
  ): Promise<Result<CatalogueTransactionDTO[]>> {
    try {
      const data =
        await this.client.getByDateRange(dateFrom, dateTo);
      return { ok: true, value: data };
    } catch (err) {
      return {
        ok: false,
        error: mapCatalogueTransactionError(err),
      };
    }
  }
}
