import { HttpError } from '../../core/http';
import { MexError, MexErrorCode } from '../../core/types';

export function mapInvoiceMatchError(
  error: unknown
): MexError {
  if (error instanceof HttpError) {
    switch (error.statusCode) {
      case 401:
        return {
          code: MexErrorCode.Unauthorized,
          message:
            'Unauthorized access to invoice matches',
          cause: error,
        };

      case 404:
        return {
          code: MexErrorCode.RecordNotFound,
          message:
            'Invoice match not found',
          cause: error,
        };

      default:
        return {
          code: MexErrorCode.Unknown,
          message:
            'Failed to retrieve invoice matches',
          cause: error,
        };
    }
  }

  return {
    code: MexErrorCode.Unknown,
    message:
      'Unexpected error retrieving invoice matches',
    cause: error,
  };
}
