import { EntityId, Name } from '../../core/types';

export interface JobTypeDTO {
  jobTypeId?: EntityId;
  jobTypeName?: Name;
  jobTypeDescription?: string;
  isActive?: boolean;
}
