import { EntityId, Code, Name } from '../../core/types';

export interface BinLocationDTO {
  binLocationId?: EntityId;
  binLocationName?: Name;
  binLocationCode?: Code;
  description?: string;
  isActive?: boolean;
}
