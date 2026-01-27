export type MexAuthConfig =
  | {
      type: 'apiKey';
      apiKey: string;
      headerName?: string; // default later
    }
  | {
      type: 'basic';
      username: string;
      password: string;
    }
  | {
      type: 'bearer';
      token: string;
    };
