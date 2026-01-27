import { EntityId } from '../../core/types';

export interface PurchaseOrderActionDTO {
  purchaseOrderId: EntityId;
  comments?: string;
}
