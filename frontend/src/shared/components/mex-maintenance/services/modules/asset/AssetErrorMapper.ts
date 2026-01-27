import { HttpError } from '../../core/http';
import { MexError, MexErrorCode } from '../../core/types';

export function mapAssetError(error: unknown): MexError {
  if (error instanceof HttpError) {
    switch (error.statusCode) {
      case 400:
        return {
          code: MexErrorCode.ValidationError,
          message: 'Invalid asset data supplied',
          cause: error,
        };

      case 401:
        return {
          code: MexErrorCode.Unauthorized,
          message: 'Unauthorized access to assets',
          cause: error,
        };

      case 404:
        return {
          code: MexErrorCode.RecordNotFound,
          message: 'Asset not found',
          cause: error,
        };

      case 409:
        return {
          code: MexErrorCode.DuplicateRecord,
          message: 'Asset already exists',
          cause: error,
        };

      default:
        return {
          code: MexErrorCode.Unknown,
          message: 'Failed to process asset request',
          cause: error,
        };
    }
  }

  return {
    code: MexErrorCode.Unknown,
    message: 'Unexpected error processing asset request',
    cause: error,
  };
}
