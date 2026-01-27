import { HttpError } from '../../core/http';
import { MexError, MexErrorCode } from '../../core/types';

export function mapEmployeeError(
  error: unknown
): MexError {
  if (error instanceof HttpError) {
    switch (error.statusCode) {
      case 400:
        return {
          code: MexErrorCode.ValidationError,
          message: 'Invalid employee data',
          cause: error,
        };

      case 401:
        return {
          code: MexErrorCode.Unauthorized,
          message: 'Unauthorized access to employees',
          cause: error,
        };

      case 404:
        return {
          code: MexErrorCode.RecordNotFound,
          message: 'Employee not found',
          cause: error,
        };

      case 409:
        return {
          code: MexErrorCode.DuplicateRecord,
          message: 'Employee already exists',
          cause: error,
        };

      default:
        return {
          code: MexErrorCode.Unknown,
          message: 'Failed to process employee request',
          cause: error,
        };
    }
  }

  return {
    code: MexErrorCode.Unknown,
    message: 'Unexpected error processing employee',
    cause: error,
  };
}
