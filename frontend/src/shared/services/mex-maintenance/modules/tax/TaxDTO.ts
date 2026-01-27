import { EntityId } from '../../core/types';

export interface TaxDTO {
  taxId?: EntityId;

  taxName?: string;           // e.g. GST
  taxDescription?: string;    // e.g. Goods and Services Tax

  taxRate?: number;           // percentage value (e.g. 10)
  isActive?: boolean;
}
