import { useEffect, useRef, useState } from "react";
import Dropzone from "dropzone";

export type FileUploadSelectedFile = {
  id: string;
  name: string;
  size: number;
  type: string;
  file: File;
  previewUrl?: string;
};

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
  onFilesSelected?: (files: File[]) => void;
};

const FileUpload: React.FC<FileUploadProps> = ({
  id,
  label,
  description,
  multiple = true,
  accept = "image/*",
  maxSizeMb = 10,
  showPreview = true,
  disabled = false,
  className = "",
  onFilesSelected,
}) => {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const dropzoneRef = useRef<Dropzone | null>(null);
  const callbackRef = useRef<typeof onFilesSelected | undefined>(undefined);
  const [files, setFiles] = useState<FileUploadSelectedFile[]>([]);

  callbackRef.current = onFilesSelected;

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!rootRef.current) return;

    if (dropzoneRef.current) {
      dropzoneRef.current.destroy();
      dropzoneRef.current = null;
    }

    const dz = new Dropzone(rootRef.current, {
      url: "/", // we do not auto-upload; parent handles uploads
      autoProcessQueue: false,
      clickable: true,
      maxFilesize: maxSizeMb,
      uploadMultiple: multiple,
      acceptedFiles: accept,
      createImageThumbnails: false,
      previewsContainer: false as any,
      dictDefaultMessage: "",
    } as any);

    dz.on("addedfile", (file: any) => {
      const idValue: string =
        (file.upload && file.upload.uuid) ||
        `${file.name}-${file.size}-${file.lastModified ?? Date.now()}`;

      let previewUrl: string | undefined;
      if (showPreview && typeof file.type === "string" && file.type.startsWith("image/")) {
        try {
          previewUrl = URL.createObjectURL(file);
        } catch {
          previewUrl = undefined;
        }
      }

      setFiles((prev) => {
        const nextFile: FileUploadSelectedFile = {
          id: idValue,
          name: file.name,
          size: file.size,
          type: file.type,
          file,
          previewUrl,
        };
        const updated = multiple ? [...prev, nextFile] : [nextFile];
        callbackRef.current?.(updated.map((f) => f.file));
        return updated;
      });
    });

    dz.on("removedfile", (file: any) => {
      setFiles((prev) => {
        const idValue: string =
          (file.upload && file.upload.uuid) ||
          `${file.name}-${file.size}-${file.lastModified ?? ""}`;
        const remaining = prev.filter((f) => {
          if (f.id === idValue && f.previewUrl) {
            try {
              URL.revokeObjectURL(f.previewUrl);
            } catch {
              // ignore
            }
          }
          return f.id !== idValue;
        });
        callbackRef.current?.(remaining.map((f) => f.file));
        return remaining;
      });
    });

    dropzoneRef.current = dz;

    return () => {
      dz.files.forEach((file: any) => {
        const idValue: string =
          (file.upload && file.upload.uuid) ||
          `${file.name}-${file.size}-${file.lastModified ?? ""}`;
        const existing = files.find((f) => f.id === idValue);
        if (existing?.previewUrl) {
          try {
            URL.revokeObjectURL(existing.previewUrl);
          } catch {
            // ignore
          }
        }
      });
      dz.destroy();
      dropzoneRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accept, maxSizeMb, multiple, showPreview]);

  const readableSize = (bytes: number) => {
    if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(1)} MB`;
  };

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

      <div
        ref={rootRef}
        id={id}
        className={`flex flex-col items-center justify-center w-full rounded-base border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-body cursor-pointer hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800 ${
          disabled ? "opacity-60 cursor-not-allowed pointer-events-none" : ""
        }`}
      >
        <svg
          className="w-8 h-8 mb-3 text-gray-500 dark:text-gray-400"
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          fill="none"
          viewBox="0 0 24 24"
        >
          <path
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M15 17h3a3 3 0 0 0 0-6h-.025a5.56 5.56 0 0 0 .025-.5A5.5 5.5 0 0 0 7.207 9.021C7.137 9.017 7.071 9 7 9a4 4 0 1 0 0 8h2.167M12 19v-9m0 0-2 2m2-2 2 2"
          />
        </svg>
        <p className="mb-1 text-sm text-gray-700 dark:text-gray-200">
          <span className="font-semibold">Click to upload</span>
          {multiple ? " or drag and drop" : ""}
        </p>
        {description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center max-w-sm">
            {description}
          </p>
        )}
      </div>

      {showPreview && files.length > 0 && (
        <div className="mt-3 space-y-2">
          {files.map((f) => (
            <div
              key={f.id}
              className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-xs dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
            >
              {f.previewUrl && (
                <div className="h-10 w-10 rounded-md overflow-hidden border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                  <img
                    src={f.previewUrl}
                    alt={f.name}
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="truncate font-medium">{f.name}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {readableSize(f.size)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUpload;
