import { EntityId, Code } from '../../core/types';

export interface CatalogueDTO {
  catalogueId?: EntityId;
  catalogueNumber?: Code;
  description?: string;

  uom?: string;
  isActive?: boolean;

  taxId?: EntityId;
  currencyTypeId?: EntityId;

  defaultBinLocationId?: EntityId;
}
