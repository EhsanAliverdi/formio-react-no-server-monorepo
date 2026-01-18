declare module "filepond" {
  export interface FilePondFile {
    file: File;
    [key: string]: any;
  }

  export interface FilePondOptions {
    [key: string]: any;
  }

  export function registerPlugin(...plugins: any[]): void;
}

declare module "react-filepond" {
  import type { FilePondOptions, FilePondFile as FPFile } from "filepond";

  export type FilePondProps = FilePondOptions & {
    id?: string;
    name?: string;
    className?: string;
  };

  export type FilePondFile = FPFile;

  export const FilePond: (props: FilePondProps) => any;
}

declare module "filepond/dist/filepond.min.css" {
  const content: string;
  export default content;
}

declare module "filepond-plugin-image-preview/dist/filepond-plugin-image-preview.css" {
  const content: string;
  export default content;
}

declare module "filepond-plugin-media-preview/dist/filepond-plugin-media-preview.min.css" {
  const content: string;
  export default content;
}

declare module "filepond-plugin-image-overlay/dist/filepond-plugin-image-overlay.css" {
  const content: string;
  export default content;
}

declare module "filepond-plugin-get-file/dist/filepond-plugin-get-file.min.css" {
  const content: string;
  export default content;
}

declare module "filepond-plugin-pdf-preview/dist/filepond-plugin-pdf-preview.min.css" {
  const content: string;
  export default content;
}

declare module "filepond-plugin-file-encode" {
  const plugin: any;
  export default plugin;
}

declare module "filepond-plugin-file-metadata" {
  const plugin: any;
  export default plugin;
}

declare module "filepond-plugin-file-poster" {
  const plugin: any;
  export default plugin;
}

declare module "filepond-plugin-file-rename" {
  const plugin: any;
  export default plugin;
}

declare module "filepond-plugin-file-validate-size" {
  const plugin: any;
  export default plugin;
}

declare module "filepond-plugin-file-validate-type" {
  const plugin: any;
  export default plugin;
}

declare module "filepond-plugin-image-preview" {
  const plugin: any;
  export default plugin;
}

declare module "filepond-plugin-image-crop" {
  const plugin: any;
  export default plugin;
}

declare module "filepond-plugin-image-edit" {
  const plugin: any;
  export default plugin;
}

declare module "filepond-plugin-image-exif-orientation" {
  const plugin: any;
  export default plugin;
}

declare module "filepond-plugin-image-filter" {
  const plugin: any;
  export default plugin;
}

declare module "filepond-plugin-image-resize" {
  const plugin: any;
  export default plugin;
}

declare module "filepond-plugin-image-transform" {
  const plugin: any;
  export default plugin;
}

declare module "filepond-plugin-image-validate-size" {
  const plugin: any;
  export default plugin;
}

declare module "filepond-plugin-image-overlay" {
  const plugin: any;
  export default plugin;
}

declare module "filepond-plugin-media-preview" {
  const plugin: any;
  export default plugin;
}

declare module "filepond-plugin-get-file" {
  const plugin: any;
  export default plugin;
}

declare module "filepond-plugin-zipper" {
  const plugin: any;
  export default plugin;
}

declare module "filepond-plugin-pdf-preview" {
  const plugin: any;
  export default plugin;
}

declare module "filepond-plugin-pdf-convert" {
  const plugin: any;
  export default plugin;
}
