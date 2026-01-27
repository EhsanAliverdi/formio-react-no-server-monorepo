import { EntityId } from '../../core/types';

export interface SupplierInvoiceLineDTO {
  supplierInvoiceLineId?: EntityId;
  supplierInvoiceId?: EntityId;

  catalogueId?: EntityId;
  description?: string;

  quantity?: number;
  unitPrice?: number;
  totalPrice?: number;
}
