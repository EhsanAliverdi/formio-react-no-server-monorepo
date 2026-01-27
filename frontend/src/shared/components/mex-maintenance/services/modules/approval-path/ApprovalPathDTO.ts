import { EntityId, Name } from '../../core/types';

export interface ApprovalPathDTO {
  approvalPathId?: EntityId;
  approvalPathName?: Name;
  description?: string;
  isActive?: boolean;
}
