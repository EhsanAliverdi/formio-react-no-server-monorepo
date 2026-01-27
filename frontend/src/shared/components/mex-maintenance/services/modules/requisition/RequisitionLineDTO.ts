import { EntityId } from '../../core/types';

export interface RequisitionLineDTO {
  requisitionLineId?: EntityId;
  requisitionId?: EntityId;

  catalogueId?: EntityId;
  description?: string;

  quantity?: number;
}
