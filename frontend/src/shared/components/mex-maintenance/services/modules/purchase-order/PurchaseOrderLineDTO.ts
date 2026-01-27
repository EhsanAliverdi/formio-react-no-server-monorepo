import { EntityId } from '../../core/types';

export interface PurchaseOrderLineDTO {
  purchaseOrderLineId?: EntityId;
  purchaseOrderId?: EntityId;

  catalogueId?: EntityId;
  description?: string;

  quantity?: number;
  unitPrice?: number;
  totalPrice?: number;
}
