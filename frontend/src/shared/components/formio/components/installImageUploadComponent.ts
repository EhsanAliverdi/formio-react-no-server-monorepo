import { getApiBaseUrl, getAuthToken } from "../../../services/apiClient";

let installed = false;

// Registers a Form.io builder component that is a pre-configured File component for images.
export function installImageUploadComponent(Formio: any) {
	if (installed) return;
	if (!Formio?.Components?.components?.file) return;

	const FileComponent = Formio.Components.components.file;

	const apiBase = (() => {
		try {
			return getApiBaseUrl();
		} catch {
			return "";
		}
	})();

	const uploadUrl = (() => {
		if (!apiBase) return "/api/uploads";
		return `${apiBase.replace(/\/+$/, "")}/api/uploads`;
	})();

	// Ensure Formio uses our API base for relative URLs (important for upload/download).
	try {
		if (apiBase) {
			Formio.setBaseUrl(apiBase);
			Formio.setProjectUrl(apiBase);
		}
	} catch {
		// ignore
	}

	const normalizeFileTypes = (value: unknown): string[] | undefined => {
		if (!Array.isArray(value)) return undefined;
		const out = value
			.map((v) => {
				if (typeof v === "string") return v;
				if (v && typeof v === "object" && "value" in (v as any)) {
					const candidate = (v as any).value;
					return typeof candidate === "string" ? candidate : String(candidate ?? "");
				}
				return "";
			})
			.map((s) => s.trim())
			.filter(Boolean);
		return out.length ? out : undefined;
	};

	class ImageUploadComponent extends FileComponent {
		static schema(...extend: any[]) {
			return FileComponent.schema(
				{
					type: "imageUpload",
					label: "Images",
					key: "images",
					input: true,
					storage: "url",
					// IMPORTANT: use an absolute URL so uploads hit the backend, not the nginx SPA host.
					url: uploadUrl,
					image: true,
					multiple: true,
					// IMPORTANT: Form.io expects an array of strings here. Using objects can break the
					// component at runtime and make the Browse button non-functional.
					fileTypes: ["image/*"],
					webcam: false,
				},
				...extend
			);
		}

		init() {
			const result = super.init?.();
			try {
				// Force upload URL for previously-saved forms that still have a relative /api/uploads.
				if ((this as any)?.component) {
					(this as any).component.url = uploadUrl;
				}

				const current = (this as any)?.component?.fileTypes;
				const normalized = normalizeFileTypes(current);
				if (normalized) {
					(this as any).component.fileTypes = normalized;
				}
			} catch {
				// ignore
			}
			return result;
		}

		static get builderInfo() {
			return {
				title: "Images",
				group: "basic",
				icon: "file-image-o",
				weight: 55,
				schema: ImageUploadComponent.schema(),
			};
		}

		// Add Authorization header (if the user is logged in) when uploading.
		uploadFile(file: any, fileName: any, dir: any, progressCallback: any, url: any, options: any, fileKey: any) {
			const token = getAuthToken();
			const nextOptions = {
				...(options || {}),
				headers: {
					...((options && options.headers) || {}),
					...(token ? { Authorization: `Bearer ${token}` } : {}),
				},
			};
			return super.uploadFile(file, fileName, dir, progressCallback, url, nextOptions, fileKey);
		}
	}

	// Register custom type.
	Formio.Components.addComponent("imageUpload", ImageUploadComponent);
	installed = true;
}
