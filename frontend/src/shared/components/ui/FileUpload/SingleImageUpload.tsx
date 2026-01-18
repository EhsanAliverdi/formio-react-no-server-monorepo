import { useEffect, useRef, useState } from "react";
import { FilePond } from "react-filepond";
import type { FileUploadProps } from "./FileUpload";
import { ensureFilePondRegistered } from "./filePondSetup";

export default function SingleImageUpload(props: FileUploadProps) {
	const {
		id,
		label,
		description,
		multiple = false,
		accept = "image/*",
		maxSizeMb = 10,
		disabled = false,
		existingImageUrl,
		uploadLabel,
		clearLabel,
		onFilesSelected,
		onClear,
		orientation = "horizontal",
		previewShape = "square",
		showDeleteButton = true,
		buttonSize = "md",
		showPreview = true,
		previewSize = 160,
		filePondOptions,
	} = props;

	ensureFilePondRegistered();

	const pondRef = useRef<any | null>(null);

	const [previewUrl, setPreviewUrl] = useState<string | null>(existingImageUrl ?? null);
	const previewObjectUrlRef = useRef<string | null>(null);

	useEffect(() => {
		if (!previewObjectUrlRef.current) {
			setPreviewUrl(existingImageUrl ?? null);
		}
	}, [existingImageUrl]);

	const resolvedUploadLabel = uploadLabel || "Upload";
	const acceptedTypes = accept
		? accept
				.split(",")
				.map((s) => s.trim())
				.filter(Boolean)
		: undefined;

	const maxFileSize = maxSizeMb ? `${maxSizeMb}MB` : undefined;

	const isImageOnlyUpload = !!accept && accept.split(",").every((t) => t.trim().startsWith("image"));

	const handleUpdateFiles = (items: any[]) => {
		if (onFilesSelected) {
			const files = items
				.map((item) => item.file as File | null | undefined)
				.filter((file): file is File => file instanceof File);
			onFilesSelected(files);
		}

		if (items.length > 0) {
			const files = items
				.map((item) => item.file as File | null | undefined)
				.filter((file): file is File => file instanceof File);

			if (files[0]) {
				if (previewObjectUrlRef.current) {
					URL.revokeObjectURL(previewObjectUrlRef.current);
				}

				const objectUrl = URL.createObjectURL(files[0]);
				previewObjectUrlRef.current = objectUrl;
				setPreviewUrl(objectUrl);
			}
		} else {
			if (previewObjectUrlRef.current) {
				URL.revokeObjectURL(previewObjectUrlRef.current);
				previewObjectUrlRef.current = null;
			}
			setPreviewUrl(existingImageUrl ?? null);

			if (onClear) {
				onClear();
			}
		}
	};

	const baseFilePondProps: any = {
		id,
		name: id || "file",
		allowMultiple: multiple,
		disabled,
		acceptedFileTypes: acceptedTypes,
		maxFileSize,
		onupdatefiles: handleUpdateFiles,
		credits: false,
		allowImagePreview: showPreview && isImageOnlyUpload,
		allowImageCrop: showPreview && isImageOnlyUpload,
		allowImageTransform: showPreview && isImageOnlyUpload,
		imagePreviewHeight: isImageOnlyUpload ? 160 : undefined,
		labelIdle:
			description ||
			`${resolvedUploadLabel || "Upload"} or <span class="filepond--label-action">Browse</span>`,
		...filePondOptions,
	};

	const orientationClasses =
		orientation === "vertical" ? "flex-col items-start" : "flex-row items-center";

	const previewShapeClass =
		previewShape === "circle"
			? "rounded-full"
			: previewShape === "square"
				? "rounded-lg"
				: "";

	const buttonSizeClasses =
		buttonSize === "sm"
			? "px-3 py-1 text-xs"
			: buttonSize === "lg"
				? "px-4 py-2 text-sm"
				: "px-4 py-1.5 text-sm";

	return (
		<>
			<div className={`flex gap-4 ${orientationClasses}`}>
				<div
					className="flex items-center justify-center"
					style={{ width: previewSize, height: previewSize }}
				>
					{previewUrl ? (
						<img
							src={previewUrl}
							alt={label || "Current image"}
							className={`max-h-[80%] max-w-[80%] object-contain ${previewShapeClass}`}
						/>
					) : (
						<div
							className={`flex h-full w-full items-center justify-center rounded-full bg-gray-100 text-xs text-gray-400 dark:bg-gray-800/60 dark:text-gray-500 ${previewShapeClass}`}
						>
							No image
						</div>
					)}
				</div>
				<div className="flex flex-col gap-2">
					<button
						type="button"
						className={`${buttonSizeClasses} inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800`}
						onClick={() => {
							if (pondRef.current) {
								pondRef.current.browse();
							}
						}}
					>
						{resolvedUploadLabel}
					</button>

					{onClear && showDeleteButton && (
						<button
							type="button"
							className="text-xs font-medium text-red-600 hover:text-red-700 hover:underline dark:text-red-400 dark:hover:text-red-300"
							onClick={() => {
								if (pondRef.current) {
									pondRef.current.removeFiles();
								}
							}}
						>
							{clearLabel || "Delete"}
						</button>
					)}

					{description && (
						<p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{description}</p>
					)}
				</div>
			</div>

			<div className="hidden">
				<FilePond ref={pondRef} {...baseFilePondProps} />
			</div>
		</>
	);
}
