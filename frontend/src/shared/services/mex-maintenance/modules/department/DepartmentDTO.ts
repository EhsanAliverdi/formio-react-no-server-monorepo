import { EntityId, Name, Code } from '../../core/types';

export interface DepartmentDTO {
  departmentId?: EntityId;
  departmentName?: Name;
  departmentCode?: Code;
  description?: string;
  isActive?: boolean;
}
