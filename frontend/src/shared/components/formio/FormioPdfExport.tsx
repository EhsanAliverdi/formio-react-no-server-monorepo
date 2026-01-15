import { useState } from "react";
import { apiFetch } from "../../services/apiClient";
import Button from "../../../template/tailAdmin/components/ui/button/Button";

type AnyRecord = Record<string, unknown>;

function isObject(x: unknown): x is AnyRecord {
	return !!x && typeof x === "object";
}

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/\"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

function escapeAttr(value: string): string {
	// Same escaping rules as HTML text for our limited attribute usage.
	return escapeHtml(value);
}

function isProbablyImageUrl(value: string): boolean {
	const v = value.trim();
	if (!v) return false;
	if (/^data:image\//i.test(v)) return true;
	try {
		const u = new URL(v);
		const p = u.pathname.toLowerCase();
		return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(p);
	} catch {
		return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(v.toLowerCase());
	}
}

type PdfRenderableFile = {
	url?: unknown;
	originalName?: unknown;
	name?: unknown;
	type?: unknown;
};

function asFileLike(value: unknown): PdfRenderableFile | null {
	if (!value || typeof value !== "object") return null;
	const r = value as Record<string, unknown>;
	if (typeof r.url === "string" && r.url.trim()) return r as PdfRenderableFile;
	return null;
}

function renderImagesHtml(files: PdfRenderableFile[]): string {
	if (!files.length) return "";
	const imgs = files
		.map((f) => {
			const src = typeof f.url === "string" ? f.url : "";
			if (!src) return "";
			const altRaw = (typeof f.originalName === "string" && f.originalName.trim())
				? f.originalName.trim()
				: (typeof f.name === "string" ? f.name : "Image");
			const alt = altRaw || "Image";
			return `<a href="${escapeAttr(src)}" target="_blank" rel="noopener noreferrer"><img class="pdf-img" src="${escapeAttr(
				src
			)}" alt="${escapeAttr(alt)}" /></a>`;
		})
		.filter(Boolean)
		.join("");
	return imgs ? `<div class="pdf-img-list">${imgs}</div>` : "";
}

function formatWhen(value: unknown): string {
	if (typeof value !== "string") return "";
	const t = Date.parse(value);
	if (!Number.isFinite(t)) return value;
	return new Date(t).toLocaleString();
}

function formatAnswerForPdfHtml(value: unknown): string {
	if (value == null) return "";

	// Strings: if it's an image URL/data URI, render as an <img>.
	if (typeof value === "string") {
		return isProbablyImageUrl(value)
			? renderImagesHtml([{ url: value, originalName: "Image" }])
			: escapeHtml(value);
	}
	if (typeof value === "number") return escapeHtml(String(value));
	if (typeof value === "boolean") return value ? "Yes" : "No";

	// Arrays: try to interpret as list of uploaded files first.
	if (Array.isArray(value)) {
		const fileLikes = value.map(asFileLike).filter((x): x is PdfRenderableFile => x !== null);
		if (fileLikes.length === value.length && fileLikes.length > 0) {
			return renderImagesHtml(fileLikes);
		}
		const pieces = value.map(formatAnswerForPdfHtml).filter((x) => x && x.trim());
		return pieces.join(", ");
	}

	// Objects: common Form.io file shape is { url, originalName, ... }
	if (typeof value === "object") {
		const file = asFileLike(value);
		if (file && typeof file.url === "string") {
			return renderImagesHtml([file]);
		}

		const rec = value as AnyRecord;
		if (typeof rec.label === "string" && rec.label.trim()) return escapeHtml(rec.label.trim());
		if ("value" in rec) return formatAnswerForPdfHtml(rec.value);
		try {
			return escapeHtml(JSON.stringify(value));
		} catch {
			return escapeHtml(String(value));
		}
	}

	return escapeHtml(String(value));
}

type PdfField = { key: string; label: string };

function getByPath(obj: unknown, path: string): unknown {
	if (!isObject(obj)) return undefined;
	if (!path) return undefined;
	// First, try literal key lookup (important when keys contain dots).
	if (Object.prototype.hasOwnProperty.call(obj, path)) return obj[path];
	// Support dotted keys as a best-effort for nested objects.
	if (!path.includes(".")) return obj[path];
	let cur: unknown = obj;
	for (const part of path.split(".")) {
		if (!isObject(cur)) return undefined;
		cur = cur[part];
	}
	return cur;
}

function collectPdfFieldsFromFormSchema(form: unknown): PdfField[] {
	if (!isObject(form)) return [];
	const out: PdfField[] = [];
	const seen = new Set<string>();

	const pushField = (key: unknown, label: unknown) => {
		if (typeof key !== "string" || !key.trim()) return;
		if (seen.has(key)) return;
		const labelStr = typeof label === "string" && label.trim() ? label.trim() : key;
		seen.add(key);
		out.push({ key, label: labelStr });
	};

	type AnyNode = Record<string, unknown>;
	const walk = (node: unknown) => {
		if (Array.isArray(node)) {
			for (const n of node) walk(n);
			return;
		}
		if (!isObject(node)) return;
		const n = node as AnyNode;

		const type = typeof n.type === "string" ? (n.type as string) : "";
		const input = "input" in n ? (n as any).input : undefined;
		const hasKey = typeof n.key === "string" && (n.key as string).trim();

		if (hasKey && input !== false) {
			if (type !== "button" && type !== "hidden" && type !== "htmlelement" && type !== "content") {
				pushField(n.key, n.label);
			}
		}

		if (Array.isArray((n as any).components)) walk((n as any).components);
		if (Array.isArray((n as any).columns)) {
			for (const col of (n as any).columns) {
				if (isObject(col) && Array.isArray((col as any).components)) walk((col as any).components);
			}
		}
		if (Array.isArray((n as any).rows)) {
			for (const row of (n as any).rows) {
				if (Array.isArray(row)) {
					for (const cell of row) {
						if (isObject(cell) && Array.isArray((cell as any).components)) walk((cell as any).components);
					}
				} else {
					walk(row);
				}
			}
		}
		if (Array.isArray((n as any).tabs)) {
			for (const tab of (n as any).tabs) {
				if (isObject(tab) && Array.isArray((tab as any).components)) walk((tab as any).components);
			}
		}
	};

	walk((form as any).components);
	return out;
}

function formatNormalAnswer(value: unknown): string {
	if (value == null) return "";
	if (typeof value === "object") {
		const rec = value as AnyRecord;
		if (typeof rec.label === "string" && rec.label.trim()) return rec.label.trim();
		if ("value" in rec) return formatNormalAnswer(rec.value);
	}
	if (typeof value === "string") return value;
	if (typeof value === "number") return String(value);
	if (typeof value === "boolean") return value ? "Yes" : "No";
	if (Array.isArray(value)) return value.map(formatNormalAnswer).filter(Boolean).join(", ");
	try {
		return JSON.stringify(value);
	} catch {
		return String(value);
	}
}

export function buildSubmissionPdfBodyFromDetail(detail: AnyRecord): string {
	const formName = typeof detail.form_name === "string" ? detail.form_name : "Submission";
	const id = typeof detail.id === "number" ? detail.id : typeof detail.id === "string" ? detail.id : "";
	const submittedAt = formatWhen(detail.submitted_at);
	const submittedBy = typeof detail.user_email === "string" && detail.user_email.trim() ? detail.user_email : "Anonymous";
	const updatedAt = detail.updated_at ? formatWhen(detail.updated_at) : "—";
	const updatedBy =
		typeof detail.updated_by_email === "string" && detail.updated_by_email.trim() ? detail.updated_by_email : "—";

	const abnormalities = Array.isArray(detail.abnormalities) ? (detail.abnormalities as unknown[]) : [];

	const fields = collectPdfFieldsFromFormSchema(detail.form);
	const rawDataObj = isObject(detail.data) ? (detail.data as AnyRecord) : {};
	let dataObj: AnyRecord = rawDataObj;
	if (fields.length > 0 && isObject(rawDataObj) && isObject((rawDataObj as any).data)) {
		const nested = (rawDataObj as any).data as AnyRecord;
		const schemaKeys = fields.map((f) => f.key);
		const hasAtRoot = schemaKeys.some((k) => Object.prototype.hasOwnProperty.call(rawDataObj, k));
		const hasInNested = schemaKeys.some((k) => Object.prototype.hasOwnProperty.call(nested, k));
		if (!hasAtRoot && hasInNested) dataObj = nested;
	}

	const rows = fields
		.map((f) => {
			const raw = getByPath(dataObj, f.key);
			const valueHtml = formatAnswerForPdfHtml(raw).trim();
			return { label: f.label, key: f.key, valueHtml: valueHtml || "—" };
		})
		.filter((r) => r.label && r.label.trim());

	return `
<style>
  body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; font-size: 12px; line-height: 1.35; color: #111; }
  h1 { font-size: 16px; margin: 0 0 8px 0; }
  h2 { font-size: 13px; margin: 16px 0 8px 0; }
  .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; }
  .meta .k { font-size: 11px; color: #555; }
  .meta .v { font-size: 12px; }
  .box { border: 1px solid #ddd; border-radius: 6px; padding: 10px; }
	/* Answer list (no border/title; question bold, answer next line). */
	.qa-wrap { margin-top: 14px; padding: 10px; }
	.qa { margin: 0; }
	.qa-item { padding: 8px 0; }
	.q { font-weight: 700; font-size: 13.5px; }
	.a { margin-top: 2px; color: #555; white-space: pre-wrap; overflow-wrap: anywhere; word-break: break-word; }
	.pdf-img-list { display: flex; flex-wrap: wrap; gap: 8px; }
	.pdf-img { display: block; max-width: 260px; max-height: 260px; object-fit: contain; border: 1px solid #e3e3e3; border-radius: 6px; }
  .muted { color: #666; font-size: 11px; }
  .list { margin: 0; padding-left: 18px; }
</style>

<div>
  <h1>${escapeHtml(formName)}${id !== "" ? ` — Submission #${escapeHtml(String(id))}` : ""}</h1>

  <div class="box pdf-avoid-break">
    <div class="meta">
      <div>
        <div class="k">Submitted</div>
        <div class="v">${escapeHtml(submittedAt || "—")}</div>
      </div>
      <div>
        <div class="k">Submitted by</div>
        <div class="v">${escapeHtml(submittedBy)}</div>
      </div>
      <div>
        <div class="k">Last updated</div>
        <div class="v">${escapeHtml(updatedAt || "—")}</div>
      </div>
      <div>
        <div class="k">Last updated by</div>
        <div class="v">${escapeHtml(updatedBy)}</div>
      </div>
    </div>
  </div>

  ${abnormalities.length ? `
    <h2>Abnormal answers</h2>
    <div class="box pdf-avoid-break">
      <ul class="list">
        ${abnormalities
			.map((a) => {
				if (!isObject(a)) return "";
				const key = typeof (a as any).key === "string" ? ((a as any).key as string) : "";
				const label = typeof (a as any).label === "string" ? ((a as any).label as string) : "";
				const question = (label.trim() ? label.trim() : key) || key;
				const normal = formatNormalAnswer((a as any).normalValue);
				return `<li><div><strong>${escapeHtml(question)}</strong></div>${
					normal ? `<div class="muted">Normal answer: ${escapeHtml(normal)}</div>` : ""
				}</li>`;
			})
			.join("")}
      </ul>
    </div>
  ` : ""}

	  <div class="qa-wrap">
		<div class="qa">
	    ${rows
			.map((r) => {
				return `<div class="qa-item"><div class="q">${escapeHtml(r.label)}</div><div class="a">${r.valueHtml}</div></div>`;
			})
			.join("")}
	    ${rows.length === 0 ? `<div class="muted">No fields found in schema.</div>` : ""}
		</div>
	  </div>
</div>
`;
}

async function tryBuildAutoSubmissionHtml(fileName: string): Promise<string | null> {
	const m = /^submission-(\d+)$/i.exec(fileName.trim());
	if (!m) return null;
	const id = m[1];
	try {
		const res = await apiFetch(`/api/admin/submissions/${id}`, { method: "GET" });
		if (!res.ok) return null;
		const json = (await res.json()) as unknown;
		if (!isObject(json)) return null;
		return buildSubmissionPdfBodyFromDetail(json);
	} catch {
		return null;
	}
}

type Props = {
	// When provided, we generate a print-friendly HTML document instead of cloning DOM.
	buildHtml?: () => string;
	// Fallback for legacy usage (clone the DOM inside this ref).
	targetRef?: React.RefObject<HTMLElement | null>;
	fileName: string;
	label?: string;
	className?: string;
};

function ensurePdfExt(name: string): string {
	const trimmed = name.trim();
	if (!trimmed) return "export.pdf";
	return trimmed.toLowerCase().endsWith(".pdf") ? trimmed : `${trimmed}.pdf`;
}

export function createHtmlDocument(bodyHtml: string): string {
	return `<!doctype html>
<html>
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<title>Export</title>
		<style>
			@page { size: A4; margin: 12mm; }
			html, body { margin: 0; padding: 0; }
			body { background: #ffffff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
			/* Keep content within page bounds */
			.pdf-root, .pdf-root * { box-sizing: border-box; }
			.pdf-root { width: 100%; max-width: 100%; }
			img, svg, canvas, video { max-width: 100%; height: auto; }
			table { max-width: 100%; }
			pre, code { white-space: pre-wrap; word-break: break-word; }
			* { overflow-wrap: anywhere; }
			/* Avoid splitting important blocks across pages */
			.pdf-avoid-break { page-break-inside: avoid; break-inside: avoid; }
		</style>
	</head>
	<body>
		<div class="pdf-root">${bodyHtml}</div>
	</body>
</html>`;
}

function copyFormControlState(source: Element, target: Element) {
	if (source instanceof HTMLTextAreaElement && target instanceof HTMLTextAreaElement) {
		// Textarea value is represented by its text content in HTML.
		target.value = source.value;
		target.textContent = source.value;
		return;
	}

	if (source instanceof HTMLInputElement && target instanceof HTMLInputElement) {
		// For HTML serialization, we must copy state into attributes.
		const type = (source.getAttribute("type") || source.type || "").toLowerCase();
		if (type !== "file") {
			target.value = source.value;
			if (source.value != null) target.setAttribute("value", source.value);
		}

		if (type === "checkbox" || type === "radio") {
			target.checked = source.checked;
			if (source.checked) target.setAttribute("checked", "");
			else target.removeAttribute("checked");
		}
		return;
	}

	if (source instanceof HTMLSelectElement && target instanceof HTMLSelectElement) {
		// In HTML, selected options are represented by the 'selected' attribute.
		target.value = source.value;
		const selectedValues = new Set<string>();
		for (const opt of Array.from(source.selectedOptions)) selectedValues.add(opt.value);
		for (const opt of Array.from(target.options)) {
			const shouldSelect = selectedValues.has(opt.value);
			opt.selected = shouldSelect;
			if (shouldSelect) opt.setAttribute("selected", "");
			else opt.removeAttribute("selected");
		}
	}
}

function copyComputedStylesDeep(sourceRoot: HTMLElement, targetRoot: HTMLElement) {
	const skipProps = new Set([
		"width",
		"min-width",
		"max-width",
		"height",
		"min-height",
		"max-height",
		"position",
		"left",
		"right",
		"top",
		"bottom",
		"inset",
		"transform",
		"translate",
		"scale",
		"rotate",
		"zoom",
	]);

	const sourceNodes: Element[] = [sourceRoot];
	const targetNodes: Element[] = [targetRoot];

	while (sourceNodes.length && targetNodes.length) {
		const source = sourceNodes.shift()!;
		const target = targetNodes.shift()!;

		copyFormControlState(source, target);

		if (target instanceof HTMLElement) {
			const computed = window.getComputedStyle(source as Element);
			for (let i = 0; i < computed.length; i++) {
				const prop = computed.item(i);
				if (skipProps.has(prop)) continue;
				// Skip CSS variables because Tailwind v4 uses OKLCH in many custom properties and
				// html2canvas can fail when parsing them.
				if (prop.startsWith("--")) continue;

				const value = computed.getPropertyValue(prop);
				if (!value) continue;

				// Some properties (notably background-image) can include embedded SVG data URLs
				// with oklch() in the string. If so, drop it to avoid parser crashes.
				if (value.toLowerCase().includes("oklch(")) {
					if (
						prop === "background-image" ||
						prop === "border-image-source" ||
						prop === "list-style-image" ||
						prop === "mask-image" ||
						prop === "-webkit-mask-image"
					) {
						continue;
					}
					// For any other property that still contains OKLCH, safest is to skip.
					continue;
				}

				target.style.setProperty(prop, value, computed.getPropertyPriority(prop));
			}
		}

		const sourceChildren = Array.from(source.children);
		const targetChildren = Array.from(target.children);
		for (let i = 0; i < sourceChildren.length && i < targetChildren.length; i++) {
			sourceNodes.push(sourceChildren[i]);
			targetNodes.push(targetChildren[i]);
		}
	}
}

function cloneWithInlineStyles(el: HTMLElement): HTMLElement {
	const clone = el.cloneNode(true) as HTMLElement;
	clone.style.margin = "0";
	clone.style.position = "static";
	clone.style.width = "100%";
	clone.style.maxWidth = "100%";
	copyComputedStylesDeep(el, clone);
	return clone;
}

export default function FormioPdfExport({ buildHtml, targetRef, fileName, label = "Export PDF", className }: Props) {
	const [exporting, setExporting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const onExport = async () => {
		if (exporting) return;
		setError(null);

		setExporting(true);
		try {
			// Server-side PDF via headless Chromium.
			let html: string;
			// Always prefer the schema-driven template for submission exports.
			// This prevents blank inputs and ensures we show only Q/A.
			const autoBody = await tryBuildAutoSubmissionHtml(fileName);
			if (autoBody) {
				html = createHtmlDocument(autoBody);
			} else if (typeof buildHtml === "function") {
				// Explicit print template (no DOM cloning / no fixed widths).
				html = createHtmlDocument(String(buildHtml()));
			} else {
				const el = targetRef?.current;
				if (!el) {
					setError("Nothing to export.");
					return;
				}
				const clone = cloneWithInlineStyles(el);
				html = createHtmlDocument(clone.outerHTML);
			}

			const res = await apiFetch("/api/admin/pdf", {
				method: "POST",
				body: JSON.stringify({ html, fileName: ensurePdfExt(fileName) }),
				// apiFetch sets JSON content-type for us.
			});

			const blob = await res.blob();
			const url = URL.createObjectURL(blob);
			try {
				const a = document.createElement("a");
				a.href = url;
				a.download = ensurePdfExt(fileName);
				a.click();
			} finally {
				URL.revokeObjectURL(url);
			}
		} catch (e: unknown) {
			setError(e instanceof Error ? e.message : String(e));
		} finally {
			setExporting(false);
		}
	};

	return (
		<div className={className}>
			<Button variant="outline" size="sm" onClick={() => void onExport()} disabled={exporting}>
				{exporting ? "Exporting…" : label}
			</Button>
			{error ? <div className="mt-2 text-xs text-red-700">{error}</div> : null}
		</div>
	);
}
