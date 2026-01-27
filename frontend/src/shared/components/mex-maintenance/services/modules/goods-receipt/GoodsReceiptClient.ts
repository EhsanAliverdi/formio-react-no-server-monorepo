import { MexHttpClient } from '../../core/http';
import { GoodsReceiptDTO } from './GoodsReceiptDTO';

export class GoodsReceiptClient {
  constructor(
    private readonly http: MexHttpClient
  ) {}

  getByPurchaseOrderNumber(
    purchaseOrderNumber: string
  ): Promise<GoodsReceiptDTO[]> {
    return this.http.get(
      `/GoodsReceipt/GetByPurchaseOrderNumber/${encodeURIComponent(
        purchaseOrderNumber
      )}`
    );
  }

  getProcessedByDateRange(
    dateFrom: string,
    dateTo: string
  ): Promise<GoodsReceiptDTO[]> {
    return this.http.get(
      `/GoodsReceipt/GetProcessedByDateRange/${encodeURIComponent(
        dateFrom
      )}/${encodeURIComponent(dateTo)}`
    );
  }

  create(
    payload: GoodsReceiptDTO
  ): Promise<GoodsReceiptDTO> {
    return this.http.post(
      '/GoodsReceipt',
      payload
    );
  }
}
