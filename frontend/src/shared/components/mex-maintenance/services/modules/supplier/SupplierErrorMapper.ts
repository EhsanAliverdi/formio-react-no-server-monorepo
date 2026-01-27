import { HttpError } from '../../core/http';
import { MexError, MexErrorCode } from '../../core/types';

export function mapSupplierError(
  error: unknown
): MexError {
  if (error instanceof HttpError) {
    switch (error.statusCode) {
      case 400:
        return {
          code: MexErrorCode.ValidationError,
          message: 'Invalid supplier data',
          cause: error,
        };

      case 401:
        return {
          code: MexErrorCode.Unauthorized,
          message:
            'Unauthorized access to suppliers',
          cause: error,
        };

      case 404:
        return {
          code: MexErrorCode.RecordNotFound,
          message: 'Supplier not found',
          cause: error,
        };

      case 409:
        return {
          code: MexErrorCode.DuplicateRecord,
          message: 'Supplier already exists',
          cause: error,
        };

      default:
        return {
          code: MexErrorCode.Unknown,
          message:
            'Failed to process supplier request',
          cause: error,
        };
    }
  }

  return {
    code: MexErrorCode.Unknown,
    message:
      'Unexpected error processing supplier',
    cause: error,
  };
}
