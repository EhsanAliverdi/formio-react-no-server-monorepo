import { EntityId } from '../../core/types';

export interface StandardJobActionDTO {
  standardJobId: EntityId;

  /**
   * Optional overrides
   */
  assetId?: EntityId;
  scheduledDate?: string;
  comments?: string;
}
