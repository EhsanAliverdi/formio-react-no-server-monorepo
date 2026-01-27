import { HttpError } from '../../core/http';
import { MexError, MexErrorCode } from '../../core/types';

export function mapDepartmentError(
  error: unknown
): MexError {
  if (error instanceof HttpError) {
    switch (error.statusCode) {
      case 401:
        return {
          code: MexErrorCode.Unauthorized,
          message: 'Unauthorized access to departments',
          cause: error,
        };

      case 404:
        return {
          code: MexErrorCode.RecordNotFound,
          message: 'Department not found',
          cause: error,
        };

      default:
        return {
          code: MexErrorCode.Unknown,
          message: 'Failed to retrieve departments',
          cause: error,
        };
    }
  }

  return {
    code: MexErrorCode.Unknown,
    message: 'Unexpected error retrieving departments',
    cause: error,
  };
}
