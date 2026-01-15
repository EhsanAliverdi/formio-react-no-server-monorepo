// Backward-compatible alias: the UI version footer got refactored into a UI-agnostic
// render-prop component. Prefer importing from `./AppVersion` going forward.
export { default } from "./AppVersion";
export type { AppVersionInfo, AppVersionProps } from "./AppVersion";
