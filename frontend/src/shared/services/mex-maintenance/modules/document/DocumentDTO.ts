import { EntityId } from '../../core/types';

export interface DocumentDTO {
  documentId?: EntityId;

  fileName?: string;
  filePath?: string;
  fileType?: string;

  description?: string;

  /**
   * Foreign reference
   * e.g. WorkOrderId, AssetId, RequestId
   */
  referenceId?: EntityId;
  referenceType?: string;

  isActive?: boolean;
}
