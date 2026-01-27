import { MexHttpClient } from '../../core/http';
import { InvoiceMatchDTO } from './InvoiceMatchDTO';

export class InvoiceMatchClient {
  constructor(
    private readonly http: MexHttpClient
  ) {}

  getByPurchaseOrderNumber(
    purchaseOrderNumber: string
  ): Promise<InvoiceMatchDTO[]> {
    return this.http.get(
      `/InvoiceMatch/GetByPurchaseOrderNumber/${encodeURIComponent(
        purchaseOrderNumber
      )}`
    );
  }

  getByDateRange(
    dateFrom: string,
    dateTo: string
  ): Promise<InvoiceMatchDTO[]> {
    return this.http.get(
      `/InvoiceMatch/GetByDateRange/${encodeURIComponent(
        dateFrom
      )}/${encodeURIComponent(dateTo)}`
    );
  }
}
