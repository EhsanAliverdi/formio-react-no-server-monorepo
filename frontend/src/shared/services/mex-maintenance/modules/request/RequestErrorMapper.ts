import { HttpError } from '../../core/http';
import { MexError, MexErrorCode } from '../../core/types';

export function mapRequestError(
  error: unknown
): MexError {
  if (error instanceof HttpError) {
    switch (error.statusCode) {
      case 400:
        return {
          code: MexErrorCode.ValidationError,
          message: 'Invalid request data',
          cause: error,
        };

      case 401:
        return {
          code: MexErrorCode.Unauthorized,
          message: 'Unauthorized access to requests',
          cause: error,
        };

      case 404:
        return {
          code: MexErrorCode.RecordNotFound,
          message: 'Request not found',
          cause: error,
        };

      default:
        return {
          code: MexErrorCode.Unknown,
          message: 'Failed to process request',
          cause: error,
        };
    }
  }

  return {
    code: MexErrorCode.Unknown,
    message: 'Unexpected error processing request',
    cause: error,
  };
}
