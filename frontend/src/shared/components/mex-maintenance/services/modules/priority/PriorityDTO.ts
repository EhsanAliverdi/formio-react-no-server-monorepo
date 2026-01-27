import { EntityId } from '../../core/types';

export interface PriorityDTO {
  priorityId?: EntityId;

  priorityNumber?: number;     // e.g. 1, 2, 3
  priorityDescription?: string;

  isActive?: boolean;
}
