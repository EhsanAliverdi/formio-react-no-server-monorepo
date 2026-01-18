import SingleImageUpload from "./SingleImageUpload";

export type FileUploadMode =
  | "default"
  | "gallery"
  | "single"
  | "input"
  // legacy aliases kept for compatibility
  | "card"
  | "avatar"
  | "panel";

export type FileUploadProps = {
  id?: string;
  label?: string;
  description?: string;
  multiple?: boolean;
  accept?: string;
  maxSizeMb?: number;
  showPreview?: boolean;
  disabled?: boolean;
  className?: string;
  /**
   * Layout mode, inspired by FlyonUI examples:
   * - "card": simple drop area with icon + text (default)
   * - "avatar": inline avatar + upload & delete buttons
   * - "input": single-line "Choose File" input style
   * - "panel": large drag-and-drop panel with helper text
   */
  mode?: FileUploadMode;
  /** Optional existing image URL for avatar mode. */
  existingImageUrl?: string | null;
  /** Label for the primary upload button (avatar/input/panel modes). */
  uploadLabel?: string;
  /** Label for the clear/delete action (where applicable). */
  clearLabel?: string;
  /** Placeholder text when no file is selected (input mode). */
  placeholder?: string;
  /**
   * Orientation for avatar layout. Horizontal matches the example,
   * vertical stacks avatar above buttons.
   */
  orientation?: "horizontal" | "vertical";
  /**
   * Whether avatar images should be fully round. Defaults to false
   * so settings logos/icons render with their natural shape.
   */
  rounded?: boolean;
  /**
   * Shape of the inline image preview for single-image/avatar mode.
   * - "square": rounded square
   * - "circle": fully round
   * - "natural": no forced rounding
   */
  previewShape?: "square" | "circle" | "natural";
  /** Whether to show the delete button for single-image mode. */
  showDeleteButton?: boolean;
  /** Size of the upload/delete buttons in single-image mode. */
  buttonSize?: "sm" | "md" | "lg";
  /** Pixel size (width & height) of the single-image preview box. */
  previewSize?: number;
  /** Called whenever the selected files list changes. */
  onFilesSelected?: (files: File[]) => void;
  /** Optional handler when the user clicks the clear/delete action. */
  onClear?: () => void;
  /** Optional raw FilePond options to fine-tune behaviour. */
  filePondOptions?: Record<string, unknown>;
};

export default function FileUpload({
  id,
  label,
  description,
  multiple = true,
  accept = "image/*",
  maxSizeMb = 10,
  disabled = false,
  className = "",
  mode = "default",
  uploadLabel,
  placeholder,
  onFilesSelected,
  existingImageUrl,
  clearLabel,
  onClear,
  orientation = "horizontal",
  previewShape = "square",
  showDeleteButton = true,
  buttonSize = "md",
  showPreview = true,
  previewSize,
  filePondOptions,
}: FileUploadProps) {
  const resolvedUploadLabel = uploadLabel || "Upload";
  const normalizedMode: "default" | "gallery" | "single" | "input" =
    mode === "avatar"
      ? "single"
      : mode === "card"
        ? "default"
        : mode === "panel"
          ? "gallery"
          : (mode as "default" | "gallery" | "single" | "input");

  let body: JSX.Element;

  switch (normalizedMode) {
    case "single":
      body = (
        <SingleImageUpload
          id={id}
          label={label}
          description={description}
          multiple={multiple}
          accept={accept}
          maxSizeMb={maxSizeMb}
          showPreview={showPreview}
          disabled={disabled}
          existingImageUrl={existingImageUrl}
          uploadLabel={uploadLabel}
          clearLabel={clearLabel}
          placeholder={placeholder}
          orientation={orientation}
          previewShape={previewShape}
          showDeleteButton={showDeleteButton}
          buttonSize={buttonSize}
          previewSize={previewSize}
          onFilesSelected={onFilesSelected}
          onClear={onClear}
          filePondOptions={filePondOptions}
        />
      );
      break;
    case "gallery":
    case "input":
    case "default":
    default:
      // For now, reuse single-image layout until dedicated layouts are added.
      body = (
        <SingleImageUpload
          id={id}
          label={label}
          description={description}
          multiple={multiple}
          accept={accept}
          maxSizeMb={maxSizeMb}
          showPreview={showPreview}
          disabled={disabled}
          existingImageUrl={existingImageUrl}
          uploadLabel={uploadLabel}
          clearLabel={clearLabel}
          placeholder={placeholder}
          orientation={orientation}
          previewShape={previewShape}
          showDeleteButton={showDeleteButton}
          buttonSize={buttonSize}
          previewSize={previewSize}
          onFilesSelected={onFilesSelected}
          onClear={onClear}
          filePondOptions={filePondOptions}
        />
      );
      break;
  }

  return (
    <div className={className}>
      {label && (
        <label
          htmlFor={id}
          className="block mb-2.5 text-sm font-medium text-heading text-gray-800 dark:text-white/90"
        >
          {label}
        </label>
      )}
      {body}
    </div>
  );
}
