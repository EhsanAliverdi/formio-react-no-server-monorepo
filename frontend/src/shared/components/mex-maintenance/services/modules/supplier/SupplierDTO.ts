import { EntityId, Code, Name } from '../../core/types';

export interface SupplierDTO {
  supplierId?: EntityId;

  supplierCode?: Code;
  supplierName?: Name;

  companyName?: string;
  contactName?: string;

  phone?: string;
  email?: string;

  isActive?: boolean;
}
