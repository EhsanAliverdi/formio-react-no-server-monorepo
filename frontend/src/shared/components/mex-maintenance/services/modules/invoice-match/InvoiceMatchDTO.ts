import { EntityId } from '../../core/types';

export interface InvoiceMatchDTO {
  invoiceMatchId?: EntityId;

  purchaseOrderId?: EntityId;
  purchaseOrderNumber?: string;

  supplierInvoiceId?: EntityId;
  supplierInvoiceNumber?: string;

  matchDateTime?: string;

  isMatched?: boolean;
  comments?: string;
}
