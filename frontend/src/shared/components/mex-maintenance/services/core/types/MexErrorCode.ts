export enum MexErrorCode {
  Unknown = 'Unknown',

  // Transport / infrastructure
  NetworkError = 'NetworkError',
  Timeout = 'Timeout',
  Unauthorized = 'Unauthorized',
  Forbidden = 'Forbidden',
  NotFound = 'NotFound',

  // Validation / input
  ValidationError = 'ValidationError',
  InvalidArgument = 'InvalidArgument',

  // MEX-specific semantics
  RecordNotFound = 'RecordNotFound',
  DuplicateRecord = 'DuplicateRecord',
  InvalidState = 'InvalidState',

  // Unsupported / not exposed by API
  NotSupported = 'NotSupported',
}
