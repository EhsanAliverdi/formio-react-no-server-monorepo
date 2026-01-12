import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import router from "./router";

// Preline core (ensures HSStaticMethods + plugin globals are consistently available in SPA).
import "preline/dist/index.js";

// Preline optional third-party dependencies (only required for certain components).
// Installed & wired per Preline's React + Vite docs.
import $ from "jquery";
import _ from "lodash";
import noUiSlider from "nouislider";
import Dropzone from "dropzone";
import * as VanillaCalendarPro from "vanilla-calendar-pro";
import { AppToaster } from "./shared/components/common";

// Prevent Dropzone from auto-attaching to elements with .dropzone.
// Form.io manages Dropzone instances itself for File components.
(Dropzone as any).autoDiscover = false;

window._ = _;
window.$ = $;
window.jQuery = $;
window.noUiSlider = noUiSlider as any;
window.Dropzone = Dropzone as any;
window.VanillaCalendarPro = VanillaCalendarPro as any;

import "./shared/styles/index.css";
import "formiojs/dist/formio.full.min.css";
import "formiojs/dist/formio.builder.min.css";
import "./shared/components/formio/styles/formio-tailwind.css";
import "./shared/components/formio/styles/formio-builder-tailwind.css";
ReactDOM.createRoot(document.getElementById("root")!).render(
  <>
    <AppToaster />
    <RouterProvider router={router} />
  </>
);
