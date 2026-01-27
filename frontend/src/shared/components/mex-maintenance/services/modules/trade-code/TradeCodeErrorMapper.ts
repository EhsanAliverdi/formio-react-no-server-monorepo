import { HttpError } from '../../core/http';
import { MexError, MexErrorCode } from '../../core/types';

export function mapTradeCodeError(
  error: unknown
): MexError {
  if (error instanceof HttpError) {
    switch (error.statusCode) {
      case 400:
        return {
          code: MexErrorCode.ValidationError,
          message: 'Invalid trade code data',
          cause: error,
        };

      case 401:
        return {
          code: MexErrorCode.Unauthorized,
          message:
            'Unauthorized access to trade codes',
          cause: error,
        };

      case 404:
        return {
          code: MexErrorCode.RecordNotFound,
          message: 'Trade code not found',
          cause: error,
        };

      case 409:
        return {
          code: MexErrorCode.DuplicateRecord,
          message: 'Trade code already exists',
          cause: error,
        };

      default:
        return {
          code: MexErrorCode.Unknown,
          message:
            'Failed to process trade code request',
          cause: error,
        };
    }
  }

  return {
    code: MexErrorCode.Unknown,
    message:
      'Unexpected error processing trade code',
    cause: error,
  };
}
