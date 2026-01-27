import { HttpError } from '../../core/http';
import { MexError, MexErrorCode } from '../../core/types';

export function mapBinLocationError(
  error: unknown
): MexError {
  if (error instanceof HttpError) {
    switch (error.statusCode) {
      case 401:
        return {
          code: MexErrorCode.Unauthorized,
          message: 'Unauthorized access to bin locations',
          cause: error,
        };

      case 404:
        return {
          code: MexErrorCode.RecordNotFound,
          message: 'Bin location not found',
          cause: error,
        };

      default:
        return {
          code: MexErrorCode.Unknown,
          message: 'Failed to retrieve bin locations',
          cause: error,
        };
    }
  }

  return {
    code: MexErrorCode.Unknown,
    message: 'Unexpected error retrieving bin locations',
    cause: error,
  };
}
