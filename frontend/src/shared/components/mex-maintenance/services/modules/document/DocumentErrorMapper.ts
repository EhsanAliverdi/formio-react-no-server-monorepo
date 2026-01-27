import { HttpError } from '../../core/http';
import { MexError, MexErrorCode } from '../../core/types';

export function mapDocumentError(
  error: unknown
): MexError {
  if (error instanceof HttpError) {
    switch (error.statusCode) {
      case 400:
        return {
          code: MexErrorCode.ValidationError,
          message: 'Invalid document data',
          cause: error,
        };

      case 401:
        return {
          code: MexErrorCode.Unauthorized,
          message: 'Unauthorized document operation',
          cause: error,
        };

      case 404:
        return {
          code: MexErrorCode.RecordNotFound,
          message: 'Document not found',
          cause: error,
        };

      default:
        return {
          code: MexErrorCode.Unknown,
          message: 'Failed to process document request',
          cause: error,
        };
    }
  }

  return {
    code: MexErrorCode.Unknown,
    message: 'Unexpected error processing document',
    cause: error,
  };
}
