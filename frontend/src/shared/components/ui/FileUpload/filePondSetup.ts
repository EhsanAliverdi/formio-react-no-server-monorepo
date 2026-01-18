import { registerPlugin } from "filepond";
import FilePondPluginFileEncode from "filepond-plugin-file-encode";
import FilePondPluginFileMetadata from "filepond-plugin-file-metadata";
import FilePondPluginFilePoster from "filepond-plugin-file-poster";
import FilePondPluginFileRename from "filepond-plugin-file-rename";
import FilePondPluginFileValidateSize from "filepond-plugin-file-validate-size";
import FilePondPluginFileValidateType from "filepond-plugin-file-validate-type";
import FilePondPluginImagePreview from "filepond-plugin-image-preview";
import FilePondPluginImageCrop from "filepond-plugin-image-crop";
import FilePondPluginImageEdit from "filepond-plugin-image-edit";
import FilePondPluginImageExifOrientation from "filepond-plugin-image-exif-orientation";
import FilePondPluginImageFilter from "filepond-plugin-image-filter";
import FilePondPluginImageResize from "filepond-plugin-image-resize";
import FilePondPluginImageTransform from "filepond-plugin-image-transform";
import FilePondPluginImageValidateSize from "filepond-plugin-image-validate-size";
import FilePondPluginImageOverlay from "filepond-plugin-image-overlay";
import FilePondPluginMediaPreview from "filepond-plugin-media-preview";
import FilePondPluginGetFile from "filepond-plugin-get-file";
import FilePondPluginZipper from "filepond-plugin-zipper";
import FilePondPluginPdfPreview from "filepond-plugin-pdf-preview";

import "filepond/dist/filepond.min.css";
import "filepond-plugin-image-preview/dist/filepond-plugin-image-preview.css";
import "filepond-plugin-media-preview/dist/filepond-plugin-media-preview.min.css";
import "filepond-plugin-image-overlay/dist/filepond-plugin-image-overlay.css";
import "filepond-plugin-get-file/dist/filepond-plugin-get-file.min.css";
import "filepond-plugin-pdf-preview/dist/filepond-plugin-pdf-preview.min.css";

let registered = false;

export function ensureFilePondRegistered() {
  if (registered) return;
  registerPlugin(
    FilePondPluginFileEncode,
    FilePondPluginFileMetadata,
    FilePondPluginFilePoster,
    FilePondPluginFileRename,
    FilePondPluginFileValidateSize,
    FilePondPluginFileValidateType,
    FilePondPluginImagePreview,
    FilePondPluginImageCrop,
    FilePondPluginImageEdit,
    FilePondPluginImageExifOrientation,
    FilePondPluginImageFilter,
    FilePondPluginImageResize,
    FilePondPluginImageTransform,
    FilePondPluginImageValidateSize,
    FilePondPluginImageOverlay,
    FilePondPluginMediaPreview,
    FilePondPluginGetFile,
    FilePondPluginZipper(),
    FilePondPluginPdfPreview,
  );
  registered = true;
}
