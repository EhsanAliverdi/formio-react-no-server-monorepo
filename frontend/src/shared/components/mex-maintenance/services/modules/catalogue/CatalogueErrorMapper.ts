import { HttpError } from '../../core/http';
import { MexError, MexErrorCode } from '../../core/types';

export function mapCatalogueError(
  error: unknown
): MexError {
  if (error instanceof HttpError) {
    switch (error.statusCode) {
      case 400:
        return {
          code: MexErrorCode.ValidationError,
          message: 'Invalid catalogue data',
          cause: error,
        };

      case 401:
        return {
          code: MexErrorCode.Unauthorized,
          message: 'Unauthorized access to catalogue',
          cause: error,
        };

      case 404:
        return {
          code: MexErrorCode.RecordNotFound,
          message: 'Catalogue item not found',
          cause: error,
        };

      case 409:
        return {
          code: MexErrorCode.DuplicateRecord,
          message: 'Catalogue item already exists',
          cause: error,
        };

      default:
        return {
          code: MexErrorCode.Unknown,
          message: 'Failed to process catalogue request',
          cause: error,
        };
    }
  }

  return {
    code: MexErrorCode.Unknown,
    message: 'Unexpected error processing catalogue request',
    cause: error,
  };
}
