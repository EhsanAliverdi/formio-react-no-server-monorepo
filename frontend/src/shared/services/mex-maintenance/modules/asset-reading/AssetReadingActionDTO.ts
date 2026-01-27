import { EntityId } from '../../core/types';

export interface AssetReadingActionDTO {
  assetId: EntityId;

  /**
   * Reading type / code (e.g. HOURS, KM, FUEL)
   */
  readingType: string;

  /**
   * Numeric value of the reading
   */
  readingValue: number;

  /**
   * Optional timestamp (ISO string)
   * If omitted, MEX uses server time
   */
  readingDateTime?: string;

  /**
   * Optional comments
   */
  comments?: string;
}
