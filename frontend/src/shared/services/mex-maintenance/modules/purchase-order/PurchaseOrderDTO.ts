import { EntityId } from '../../core/types';

export interface PurchaseOrderDTO {
  purchaseOrderId?: EntityId;
  purchaseOrderNumber?: string;

  supplierId?: EntityId;
  supplierName?: string;

  approvalStatus?: string;

  orderDate?: string;
  requiredDate?: string;

  totalAmount?: number;
  currencyTypeId?: EntityId;

  isApproved?: boolean;
}
