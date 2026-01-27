import { EntityId } from '../../core/types';

export interface WorkOrderSpareDTO {
  workOrderSpareId?: EntityId;
  workOrderId?: EntityId;

  catalogueId?: EntityId;
  catalogueNumber?: string;
  description?: string;

  quantity?: number;
  unitCost?: number;
  totalCost?: number;
}
