import { EntityId, Name } from '../../core/types';

export interface ContactDTO {
  contactId?: EntityId;

  username?: string;
  fullName?: Name;

  email?: string;
  isActive?: boolean;
}
