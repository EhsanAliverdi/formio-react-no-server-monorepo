import { EntityId } from '../../core/types';

export interface WorkOrderDTO {
  workOrderId?: EntityId;
  workOrderNumber?: string;

  description?: string;

  assetId?: EntityId;
  departmentId?: EntityId;
  jobTypeId?: EntityId;
  priorityId?: EntityId;

  status?: string;

  requestedBy?: string;
  createdDateTime?: string;
  scheduledStartDate?: string;
  scheduledEndDate?: string;

  isClosed?: boolean;
}
