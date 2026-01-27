import { MexEnvironment } from './MexEnvironment';
import { MexAuthConfig } from './MexAuthConfig';

export interface MexConfig {
  /**
   * Base URL of the MEX API
   * Example: https://eng.mex.com.au:5100
   */
  baseUrl: string;

  /**
   * Target environment (informational but important)
   */
  environment?: MexEnvironment;

  /**
   * Authentication strategy
   */
  auth: MexAuthConfig;

  /**
   * Request timeout in milliseconds
   */
  timeoutMs?: number;

  /**
   * Optional client identifier (useful for logs / headers)
   */
  clientName?: string;

  /**
   * Toggle SDK Help entries in the navigation.
   */
  showSdkHelp?: boolean;
}
