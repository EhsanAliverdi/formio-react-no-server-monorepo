import { EntityId, Name } from '../../core/types';

export interface EmployeeDTO {
  employeeId?: EntityId;

  employeeNumber?: string;
  firstName?: Name;
  lastName?: Name;
  fullName?: Name;

  email?: string;
  phone?: string;

  isActive?: boolean;
}
