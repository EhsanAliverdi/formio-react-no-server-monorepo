import { EntityId } from '../../core/types';

export interface RequisitionDTO {
  requisitionId?: EntityId;
  requisitionNumber?: string;

  departmentId?: EntityId;
  requestedBy?: string;

  status?: string;
  approvalStatus?: string;

  requestDateTime?: string;
  requiredDate?: string;

  isApproved?: boolean;
}
