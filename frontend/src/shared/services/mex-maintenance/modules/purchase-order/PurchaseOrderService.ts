import { PurchaseOrderClient } from './PurchaseOrderClient';
import { PurchaseOrderDTO } from './PurchaseOrderDTO';
import { PurchaseOrderActionDTO } from './PurchaseOrderActionDTO';
import { Result } from '../../core/types';
import { mapPurchaseOrderError } from './PurchaseOrderErrorMapper';

export class PurchaseOrderService {
  constructor(
    private readonly client: PurchaseOrderClient
  ) {}

  async getAll(): Promise<Result<PurchaseOrderDTO[]>> {
    try {
      const data = await this.client.getAll();
      return { ok: true, value: data };
    } catch (err) {
      return {
        ok: false,
        error: mapPurchaseOrderError(err),
      };
    }
  }

  async getByPurchaseOrderNumber(
    number: string
  ): Promise<Result<PurchaseOrderDTO>> {
    try {
      const data =
        await this.client.getByPurchaseOrderNumber(number);
      return { ok: true, value: data };
    } catch (err) {
      return {
        ok: false,
        error: mapPurchaseOrderError(err),
      };
    }
  }

  async getByApprovalStatusAndDateRange(
    status: string,
    dateFrom: string,
    dateTo: string
  ): Promise<Result<PurchaseOrderDTO[]>> {
    try {
      const data =
        await this.client.getByApprovalStatusAndDateRange(
          status,
          dateFrom,
          dateTo
        );
      return { ok: true, value: data };
    } catch (err) {
      return {
        ok: false,
        error: mapPurchaseOrderError(err),
      };
    }
  }

  async approve(
    action: PurchaseOrderActionDTO
  ): Promise<Result<void>> {
    try {
      await this.client.approve(action);
      return { ok: true, value: undefined };
    } catch (err) {
      return {
        ok: false,
        error: mapPurchaseOrderError(err),
      };
    }
  }

  async decline(
    action: PurchaseOrderActionDTO
  ): Promise<Result<void>> {
    try {
      await this.client.decline(action);
      return { ok: true, value: undefined };
    } catch (err) {
      return {
        ok: false,
        error: mapPurchaseOrderError(err),
      };
    }
  }
}
