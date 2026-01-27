import { MexError } from "./MexError";
export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: MexError };
