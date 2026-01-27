import { GoodsReceiptClient } from './GoodsReceiptClient';
import { GoodsReceiptDTO } from './GoodsReceiptDTO';
import { Result } from '../../core/types';
import { mapGoodsReceiptError } from './GoodsReceiptErrorMapper';

export class GoodsReceiptService {
  constructor(
    private readonly client: GoodsReceiptClient
  ) {}

  async getByPurchaseOrderNumber(
    purchaseOrderNumber: string
  ): Promise<Result<GoodsReceiptDTO[]>> {
    try {
      const data =
        await this.client.getByPurchaseOrderNumber(
          purchaseOrderNumber
        );
      return { ok: true, value: data };
    } catch (err) {
      return {
        ok: false,
        error: mapGoodsReceiptError(err),
      };
    }
  }

  async getProcessedByDateRange(
    dateFrom: string,
    dateTo: string
  ): Promise<Result<GoodsReceiptDTO[]>> {
    try {
      const data =
        await this.client.getProcessedByDateRange(
          dateFrom,
          dateTo
        );
      return { ok: true, value: data };
    } catch (err) {
      return {
        ok: false,
        error: mapGoodsReceiptError(err),
      };
    }
  }

  async create(
    receipt: GoodsReceiptDTO
  ): Promise<Result<GoodsReceiptDTO>> {
    try {
      const data =
        await this.client.create(receipt);
      return { ok: true, value: data };
    } catch (err) {
      return {
        ok: false,
        error: mapGoodsReceiptError(err),
      };
    }
  }
}
