import { MexErrorCode } from './MexErrorCode';

export interface MexError {
  code: MexErrorCode;
  message: string;

  /**
   * Optional underlying error or raw payload
   * Never relied on programmatically
   */
  cause?: unknown;
}
