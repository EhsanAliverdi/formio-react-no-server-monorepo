import { HttpError } from '../../core/http';
import { MexError, MexErrorCode } from '../../core/types';

export function mapWorkOrderTradeError(
  error: unknown
): MexError {
  if (error instanceof HttpError) {
    switch (error.statusCode) {
      case 401:
        return {
          code: MexErrorCode.Unauthorized,
          message:
            'Unauthorized access to work order trades',
          cause: error,
        };

      case 404:
        return {
          code: MexErrorCode.RecordNotFound,
          message: 'Work order trade not found',
          cause: error,
        };

      default:
        return {
          code: MexErrorCode.Unknown,
          message:
            'Failed to retrieve work order trades',
          cause: error,
        };
    }
  }

  return {
    code: MexErrorCode.Unknown,
    message:
      'Unexpected error retrieving work order trades',
    cause: error,
  };
}
