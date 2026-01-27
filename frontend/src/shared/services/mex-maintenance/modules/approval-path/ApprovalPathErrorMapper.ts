import { HttpError } from '../../core/http';
import { MexError, MexErrorCode } from '../../core/types';

export function mapApprovalPathError(error: unknown): MexError {
  if (error instanceof HttpError) {
    switch (error.statusCode) {
      case 401:
        return {
          code: MexErrorCode.Unauthorized,
          message: 'Unauthorized access to approval paths',
          cause: error,
        };

      case 404:
        return {
          code: MexErrorCode.RecordNotFound,
          message: 'Approval path not found',
          cause: error,
        };

      default:
        return {
          code: MexErrorCode.Unknown,
          message: 'Failed to retrieve approval paths',
          cause: error,
        };
    }
  }

  return {
    code: MexErrorCode.Unknown,
    message: 'Unexpected error retrieving approval paths',
    cause: error,
  };
}
