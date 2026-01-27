import { EntityId } from '../../core/types';

export interface AssetReadingDTO {
  assetReadingId?: EntityId;
  assetId?: EntityId;

  readingType?: string;
  readingValue?: number;

  readingDateTime?: string;
  enteredBy?: string;
  comments?: string;
}
