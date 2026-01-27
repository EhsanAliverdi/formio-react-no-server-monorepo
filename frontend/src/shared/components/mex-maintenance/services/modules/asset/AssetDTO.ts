import { EntityId, Code, Name } from '../../core/types';

export interface AssetDTO {
  assetId?: EntityId;
  assetNumber?: Code;
  description?: string;

  departmentId?: EntityId;
  departmentName?: Name;

  location?: string;
  status?: string;

  serialNumber?: string;
  model?: string;
  manufacturer?: string;

  parentAssetId?: EntityId;

  isActive?: boolean;
}
