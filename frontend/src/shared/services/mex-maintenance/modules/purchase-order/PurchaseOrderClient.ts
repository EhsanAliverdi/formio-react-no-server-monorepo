import { MexHttpClient } from '../../core/http';
import { PurchaseOrderDTO } from './PurchaseOrderDTO';
import { PurchaseOrderActionDTO } from './PurchaseOrderActionDTO';

export class PurchaseOrderClient {
  constructor(
    private readonly http: MexHttpClient
  ) {}

  getAll(): Promise<PurchaseOrderDTO[]> {
    return this.http.get('/PurchaseOrder/GetAll');
  }

  getByPurchaseOrderNumber(
    purchaseOrderNumber: string
  ): Promise<PurchaseOrderDTO> {
    return this.http.get(
      `/PurchaseOrder/GetByPurchaseOrderNumber/${encodeURIComponent(
        purchaseOrderNumber
      )}`
    );
  }

  getByApprovalStatusAndDateRange(
    approvalStatus: string,
    dateFrom: string,
    dateTo: string
  ): Promise<PurchaseOrderDTO[]> {
    return this.http.get(
      `/PurchaseOrder/GetByApprovalStatusAndDateRange/${encodeURIComponent(
        approvalStatus
      )}/${encodeURIComponent(dateFrom)}/${encodeURIComponent(
        dateTo
      )}`
    );
  }

  approve(
    payload: PurchaseOrderActionDTO
  ): Promise<void> {
    return this.http.put(
      '/PurchaseOrder/ApprovePurchaseOrder',
      payload
    );
  }

  decline(
    payload: PurchaseOrderActionDTO
  ): Promise<void> {
    return this.http.put(
      '/PurchaseOrder/DeclinePurchaseOrder',
      payload
    );
  }
}
