import type { Dropzone } from "dropzone";
import type { VanillaCalendarPro } from "vanilla-calendar-pro";
import type { noUiSlider } from "nouislider";
import type { IStaticMethods } from "preline/dist";

declare global {
  interface Window {
    _?: typeof import("lodash");
    $?: typeof import("jquery");
    jQuery?: typeof import("jquery");
    Dropzone?: typeof Dropzone;
    VanillaCalendarPro?: typeof VanillaCalendarPro;
    noUiSlider?: typeof noUiSlider;
    HSStaticMethods?: IStaticMethods;
  }
}

declare module "*.css" {
  const content: string;
  export default content;
}

declare module "react/jsx-runtime" {
  export const jsx: any;
  export const jsxs: any;
  export const Fragment: any;
}

export {};
