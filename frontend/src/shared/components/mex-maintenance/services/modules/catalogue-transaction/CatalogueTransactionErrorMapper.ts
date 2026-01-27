import { HttpError } from '../../core/http';
import { MexError, MexErrorCode } from '../../core/types';

export function mapCatalogueTransactionError(
  error: unknown
): MexError {
  if (error instanceof HttpError) {
    switch (error.statusCode) {
      case 401:
        return {
          code: MexErrorCode.Unauthorized,
          message:
            'Unauthorized access to catalogue transactions',
          cause: error,
        };

      case 404:
        return {
          code: MexErrorCode.RecordNotFound,
          message:
            'No catalogue transactions found for date range',
          cause: error,
        };

      default:
        return {
          code: MexErrorCode.Unknown,
          message:
            'Failed to retrieve catalogue transactions',
          cause: error,
        };
    }
  }

  return {
    code: MexErrorCode.Unknown,
    message:
      'Unexpected error retrieving catalogue transactions',
    cause: error,
  };
}
