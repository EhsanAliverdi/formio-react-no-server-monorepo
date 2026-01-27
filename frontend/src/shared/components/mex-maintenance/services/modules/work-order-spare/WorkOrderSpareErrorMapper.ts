import { HttpError } from '../../core/http';
import { MexError, MexErrorCode } from '../../core/types';

export function mapWorkOrderSpareError(
  error: unknown
): MexError {
  if (error instanceof HttpError) {
    switch (error.statusCode) {
      case 401:
        return {
          code: MexErrorCode.Unauthorized,
          message:
            'Unauthorized access to work order spares',
          cause: error,
        };

      case 404:
        return {
          code: MexErrorCode.RecordNotFound,
          message: 'Work order spare not found',
          cause: error,
        };

      default:
        return {
          code: MexErrorCode.Unknown,
          message:
            'Failed to retrieve work order spares',
          cause: error,
        };
    }
  }

  return {
    code: MexErrorCode.Unknown,
    message:
      'Unexpected error retrieving work order spares',
    cause: error,
  };
}
