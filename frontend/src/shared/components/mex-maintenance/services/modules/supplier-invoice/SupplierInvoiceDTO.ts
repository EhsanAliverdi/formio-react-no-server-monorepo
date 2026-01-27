import { EntityId } from '../../core/types';

export interface SupplierInvoiceDTO {
  supplierInvoiceId?: EntityId;
  supplierInvoiceNumber?: string;

  supplierId?: EntityId;
  supplierName?: string;

  invoiceDate?: string;
  dueDate?: string;

  totalAmount?: number;
  currencyTypeId?: EntityId;

  status?: string;
  isPaid?: boolean;
}
