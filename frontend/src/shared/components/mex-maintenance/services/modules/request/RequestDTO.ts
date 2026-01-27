import { EntityId } from '../../core/types';

export interface RequestDTO {
  requestId?: EntityId;
  requestNumber?: string;

  description?: string;

  assetId?: EntityId;
  departmentId?: EntityId;
  jobTypeId?: EntityId;
  priorityId?: EntityId;

  requestedBy?: string;
  requestDateTime?: string;

  status?: string;
  isClosed?: boolean;
}
