import { EntityId } from '../../core/types';

export interface RequisitionActionDTO {
  requisitionId: EntityId;
  comments?: string;
}
