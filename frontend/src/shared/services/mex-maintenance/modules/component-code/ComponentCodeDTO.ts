import { EntityId, Code, Name } from '../../core/types';

export interface ComponentCodeDTO {
  componentCodeId?: EntityId;
  componentCodeName?: Name;
  componentCodeDescription?: string;
  componentCode?: Code;
  isActive?: boolean;
}
