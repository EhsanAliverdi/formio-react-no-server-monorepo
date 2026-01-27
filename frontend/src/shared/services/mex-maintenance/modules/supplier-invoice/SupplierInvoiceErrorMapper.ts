import { HttpError } from '../../core/http';
import { MexError, MexErrorCode } from '../../core/types';

export function mapSupplierInvoiceError(
  error: unknown
): MexError {
  if (error instanceof HttpError) {
    switch (error.statusCode) {
      case 400:
        return {
          code: MexErrorCode.ValidationError,
          message: 'Invalid supplier invoice data',
          cause: error,
        };

      case 401:
        return {
          code: MexErrorCode.Unauthorized,
          message:
            'Unauthorized access to supplier invoices',
          cause: error,
        };

      case 404:
        return {
          code: MexErrorCode.RecordNotFound,
          message: 'Supplier invoice not found',
          cause: error,
        };

      case 409:
        return {
          code: MexErrorCode.DuplicateRecord,
          message:
            'Supplier invoice already exists',
          cause: error,
        };

      default:
        return {
          code: MexErrorCode.Unknown,
          message:
            'Failed to process supplier invoice request',
          cause: error,
        };
    }
  }

  return {
    code: MexErrorCode.Unknown,
    message:
      'Unexpected error processing supplier invoice',
    cause: error,
  };
}
