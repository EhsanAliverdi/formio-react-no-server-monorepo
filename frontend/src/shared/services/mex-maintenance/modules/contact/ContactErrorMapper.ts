import { HttpError } from '../../core/http';
import { MexError, MexErrorCode } from '../../core/types';

export function mapContactError(
  error: unknown
): MexError {
  if (error instanceof HttpError) {
    switch (error.statusCode) {
      case 401:
        return {
          code: MexErrorCode.Unauthorized,
          message: 'Unauthorized access to contacts',
          cause: error,
        };

      case 404:
        return {
          code: MexErrorCode.RecordNotFound,
          message: 'Contact not found',
          cause: error,
        };

      default:
        return {
          code: MexErrorCode.Unknown,
          message: 'Failed to retrieve contact',
          cause: error,
        };
    }
  }

  return {
    code: MexErrorCode.Unknown,
    message: 'Unexpected error retrieving contact',
    cause: error,
  };
}
