import { HttpError } from '../../core/http';
import { MexError, MexErrorCode } from '../../core/types';

export function mapPurchaseOrderError(
  error: unknown
): MexError {
  if (error instanceof HttpError) {
    switch (error.statusCode) {
      case 400:
        return {
          code: MexErrorCode.ValidationError,
          message: 'Invalid purchase order action',
          cause: error,
        };

      case 401:
        return {
          code: MexErrorCode.Unauthorized,
          message:
            'Unauthorized access to purchase orders',
          cause: error,
        };

      case 404:
        return {
          code: MexErrorCode.RecordNotFound,
          message: 'Purchase order not found',
          cause: error,
        };

      default:
        return {
          code: MexErrorCode.Unknown,
          message:
            'Failed to process purchase order request',
          cause: error,
        };
    }
  }

  return {
    code: MexErrorCode.Unknown,
    message:
      'Unexpected error processing purchase order',
    cause: error,
  };
}
