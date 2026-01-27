import { HttpError } from '../../core/http';
import { MexError, MexErrorCode } from '../../core/types';

export function mapGoodsReceiptError(
  error: unknown
): MexError {
  if (error instanceof HttpError) {
    switch (error.statusCode) {
      case 400:
        return {
          code: MexErrorCode.ValidationError,
          message: 'Invalid goods receipt data',
          cause: error,
        };

      case 401:
        return {
          code: MexErrorCode.Unauthorized,
          message:
            'Unauthorized access to goods receipts',
          cause: error,
        };

      case 404:
        return {
          code: MexErrorCode.RecordNotFound,
          message:
            'Goods receipt not found',
          cause: error,
        };

      default:
        return {
          code: MexErrorCode.Unknown,
          message:
            'Failed to process goods receipt request',
          cause: error,
        };
    }
  }

  return {
    code: MexErrorCode.Unknown,
    message:
      'Unexpected error processing goods receipt',
    cause: error,
  };
}
