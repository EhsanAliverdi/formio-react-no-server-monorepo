import { MexAuthConfig } from '../config';
import { MexDefaults } from '../config';

export function buildAuthHeaders(
  auth: MexAuthConfig
): Record<string, string> {
  switch (auth.type) {
    case 'apiKey':
      return {
        [auth.headerName ?? MexDefaults.apiKeyHeaderName]: auth.apiKey,
      };

    case 'basic':
      return {
        Authorization:
          'Basic ' +
          btoa(`${auth.username}:${auth.password}`),
      };

    case 'bearer':
      return {
        Authorization: `Bearer ${auth.token}`,
      };

    default: {
      const exhaustiveCheck: never = auth;
      return exhaustiveCheck;
    }
  }
}
