import { HttpError } from '../../core/http';
import { MexError, MexErrorCode } from '../../core/types';

export function mapWorkOrderError(
  error: unknown
): MexError {
  if (error instanceof HttpError) {
    switch (error.statusCode) {
      case 400:
        return {
          code: MexErrorCode.ValidationError,
          message: 'Invalid work order data',
          cause: error,
        };

      case 401:
        return {
          code: MexErrorCode.Unauthorized,
          message:
            'Unauthorized access to work orders',
          cause: error,
        };

      case 404:
        return {
          code: MexErrorCode.RecordNotFound,
          message: 'Work order not found',
          cause: error,
        };

      default:
        return {
          code: MexErrorCode.Unknown,
          message:
            'Failed to process work order request',
          cause: error,
        };
    }
  }

  return {
    code: MexErrorCode.Unknown,
    message:
      'Unexpected error processing work order',
    cause: error,
  };
}
