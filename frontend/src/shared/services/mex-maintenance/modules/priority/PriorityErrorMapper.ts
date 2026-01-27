import { HttpError } from '../../core/http';
import { MexError, MexErrorCode } from '../../core/types';

export function mapPriorityError(
  error: unknown
): MexError {
  if (error instanceof HttpError) {
    switch (error.statusCode) {
      case 401:
        return {
          code: MexErrorCode.Unauthorized,
          message: 'Unauthorized access to priorities',
          cause: error,
        };

      case 404:
        return {
          code: MexErrorCode.RecordNotFound,
          message: 'Priority not found',
          cause: error,
        };

      default:
        return {
          code: MexErrorCode.Unknown,
          message: 'Failed to retrieve priorities',
          cause: error,
        };
    }
  }

  return {
    code: MexErrorCode.Unknown,
    message: 'Unexpected error retrieving priorities',
    cause: error,
  };
}
