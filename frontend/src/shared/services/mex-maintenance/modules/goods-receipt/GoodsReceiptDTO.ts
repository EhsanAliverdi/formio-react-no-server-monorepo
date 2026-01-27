import { EntityId } from '../../core/types';

export interface GoodsReceiptDTO {
  goodsReceiptId?: EntityId;

  purchaseOrderId?: EntityId;
  purchaseOrderNumber?: string;

  catalogueId?: EntityId;
  quantityReceived?: number;

  receiptDateTime?: string;

  receivedBy?: string;
  comments?: string;

  isProcessed?: boolean;
}
