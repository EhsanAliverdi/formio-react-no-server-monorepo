import { InvoiceMatchClient } from './InvoiceMatchClient';
import { InvoiceMatchDTO } from './InvoiceMatchDTO';
import { Result } from '../../core/types';
import { mapInvoiceMatchError } from './InvoiceMatchErrorMapper';

export class InvoiceMatchService {
  constructor(
    private readonly client: InvoiceMatchClient
  ) {}

  async getByPurchaseOrderNumber(
    purchaseOrderNumber: string
  ): Promise<Result<InvoiceMatchDTO[]>> {
    try {
      const data =
        await this.client.getByPurchaseOrderNumber(
          purchaseOrderNumber
        );
      return { ok: true, value: data };
    } catch (err) {
      return {
        ok: false,
        error: mapInvoiceMatchError(err),
      };
    }
  }

  async getByDateRange(
    dateFrom: string,
    dateTo: string
  ): Promise<Result<InvoiceMatchDTO[]>> {
    try {
      const data =
        await this.client.getByDateRange(
          dateFrom,
          dateTo
        );
      return { ok: true, value: data };
    } catch (err) {
      return {
        ok: false,
        error: mapInvoiceMatchError(err),
      };
    }
  }
}
