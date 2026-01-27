import { EntityId } from '../../core/types';

export interface CatalogueSupplierDTO {
  catalogueSupplierId?: EntityId;
  catalogueId?: EntityId;
  supplierId?: EntityId;

  supplierCatalogueNumber?: string;
  isPreferredSupplier?: boolean;
}
