import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Button from "../../template/tailAdmin/components/ui/button/Button";
import { Modal } from "../../template/tailAdmin/components/ui/modal";
import {
	Table,
	TableBody,
	TableCell,
	TableHeader,
	TableRow,
} from "../../template/tailAdmin/components/ui/table";
import FormioPdfExport from "../../shared/components/formio/FormioPdfExport";
import FormSubmissionEditor from "../../shared/components/formio/FormSubmissionEditor";
import FormSubmissionViewer from "../../shared/components/formio/FormSubmissionViewer";
import {
	getAdminSubmission,
	listAdminSubmissions,
	updateAdminSubmission,
	type AdminSubmissionDetail,
	type AdminSubmissionRow,
} from "../../shared/services/adminSubmissionsService";
import { getForms } from "../../shared/services/formService";

function formatWhen(value: string) {
	const t = Date.parse(value);
	if (!Number.isFinite(t)) return value;
	return new Date(t).toLocaleString();
}

function formatNormalAnswer(value: unknown): string {
	if (value == null) return "";
	if (typeof value === "object") {
		const rec = value as Record<string, unknown>;
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

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

type AnyRecord = Record<string, unknown>;
function isObject(x: unknown): x is AnyRecord {
	return !!x && typeof x === "object";
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

	const walk = (node: unknown) => {
		if (Array.isArray(node)) {
			for (const n of node) walk(n);
			return;
		}
		if (!isObject(node)) return;

		const type = typeof node.type === "string" ? node.type : "";
		const input = "input" in node ? (node as AnyRecord).input : undefined;
		const hasKey = typeof node.key === "string" && node.key.trim();

		// Capture typical input components.
		if (hasKey && input !== false) {
			if (type !== "button" && type !== "hidden" && type !== "htmlelement" && type !== "content") {
				pushField(node.key, node.label);
			}
		}

		// Recurse through common container shapes.
		const components = (node as AnyRecord).components;
		if (Array.isArray(components)) walk(components);
		const columns = (node as AnyRecord).columns;
		if (Array.isArray(columns)) {
			for (const col of columns) {
				if (!isObject(col)) continue;
				const colComponents = (col as AnyRecord).components;
				if (Array.isArray(colComponents)) walk(colComponents);
			}
		}
		const rows = (node as AnyRecord).rows;
		if (Array.isArray(rows)) {
			for (const row of rows) {
				if (Array.isArray(row)) {
					for (const cell of row) {
						if (!isObject(cell)) continue;
						const cellComponents = (cell as AnyRecord).components;
						if (Array.isArray(cellComponents)) walk(cellComponents);
					}
				} else {
					walk(row);
				}
			}
		}
		// Tabs typically have components inside tab objects.
		const tabs = (node as AnyRecord).tabs;
		if (Array.isArray(tabs)) {
			for (const tab of tabs) {
				if (!isObject(tab)) continue;
				const tabComponents = (tab as AnyRecord).components;
				if (Array.isArray(tabComponents)) walk(tabComponents);
			}
		}
	};

	const rootComponents = (form as AnyRecord).components;
	if (Array.isArray(rootComponents)) walk(rootComponents);
	return out;
}

function escapeAttr(value: string): string {
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

function formatAnswerForPdfHtml(value: unknown): string {
	if (value == null) return "";
	if (typeof value === "string") {
		return isProbablyImageUrl(value)
			? renderImagesHtml([{ url: value, originalName: "Image" }])
			: escapeHtml(value);
	}
	if (typeof value === "number") return escapeHtml(String(value));
	if (typeof value === "boolean") return value ? "Yes" : "No";
	if (Array.isArray(value)) {
		const fileLikes = value.map(asFileLike).filter((x): x is PdfRenderableFile => x !== null);
		if (fileLikes.length === value.length && fileLikes.length > 0) {
			return renderImagesHtml(fileLikes);
		}
		const parts = value.map(formatAnswerForPdfHtml).filter((x) => x && x.trim());
		return parts.join(", ");
	}
	if (typeof value === "object") {
		const file = asFileLike(value);
		if (file && typeof file.url === "string") return renderImagesHtml([file]);
		const rec = value as Record<string, unknown>;
		if (typeof rec.label === "string" && rec.label.trim()) return escapeHtml(rec.label.trim());
		if ("value" in rec) return formatAnswerForPdfHtml((rec as any).value);
		try {
			return escapeHtml(JSON.stringify(value));
		} catch {
			return escapeHtml(String(value));
		}
	}
	return escapeHtml(String(value));
}

function buildSubmissionPdfBody(detail: AdminSubmissionDetail): string {
	const submittedBy = detail.user_email ?? "Anonymous";
	const updatedAt = detail.updated_at ? formatWhen(detail.updated_at) : "—";
	const updatedBy = detail.updated_by_email ?? "—";

	const audit = parseAuditEntries(detail.edit_history);
	const abnormalities = Array.isArray(detail.abnormalities) ? detail.abnormalities : [];

	const fields = collectPdfFieldsFromFormSchema(detail.form);
	const rawDataObj = isObject(detail.data) ? detail.data : {};
	// Some submissions may come wrapped as { data: { ... } }.
	// Prefer whichever level actually contains the schema keys.
	let dataObj: AnyRecord = rawDataObj;
	const nestedMaybe = (rawDataObj as AnyRecord).data;
	if (fields.length > 0 && isObject(rawDataObj) && isObject(nestedMaybe)) {
		const nested = nestedMaybe as AnyRecord;
		const schemaKeys = fields.map((f) => f.key);
		const hasAtRoot = schemaKeys.some((k) => Object.prototype.hasOwnProperty.call(rawDataObj, k));
		const hasInNested = schemaKeys.some((k) => Object.prototype.hasOwnProperty.call(nested, k));
		if (!hasAtRoot && hasInNested) dataObj = nested;
	}
	const rows = fields.map((f) => {
		const raw = getByPath(dataObj, f.key);
		const valueHtml = formatAnswerForPdfHtml(raw);
		return {
			label: f.label,
			key: f.key,
			valueHtml: valueHtml.trim() ? valueHtml : "—",
		};
	});

	const noResolvedAnswers = rows.length === 0 || rows.every((r) => r.valueHtml === "—");

	return `
<style>
  body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; font-size: 12px; line-height: 1.35; color: #111; }
  h1 { font-size: 16px; margin: 0 0 8px 0; }
  h2 { font-size: 13px; margin: 16px 0 8px 0; }
  .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; }
  .meta .k { font-size: 11px; color: #555; }
  .meta .v { font-size: 12px; }
  .box { border: 1px solid #ddd; border-radius: 6px; padding: 10px; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  th, td { border: 1px solid #e3e3e3; padding: 6px 8px; vertical-align: top; }
  th { text-align: left; background: #f6f6f6; font-size: 11px; }
	td { word-break: break-word; overflow-wrap: anywhere; white-space: pre-wrap; }
	.pdf-img-list { display: flex; flex-wrap: wrap; gap: 8px; }
	.pdf-img { display: block; max-width: 260px; max-height: 260px; object-fit: contain; border: 1px solid #e3e3e3; border-radius: 6px; }
	/* IMPORTANT: allow pagination; otherwise long answers get clipped */
	tr { page-break-inside: auto; break-inside: auto; }
  .muted { color: #666; }
  .list { margin: 0; padding-left: 18px; }
</style>

<div>
  <h1>${escapeHtml(detail.form_name)} — Submission #${detail.id}</h1>

  <div class="box pdf-avoid-break">
    <div class="meta">
      <div>
        <div class="k">Submitted</div>
        <div class="v">${escapeHtml(formatWhen(detail.submitted_at))}</div>
      </div>
      <div>
        <div class="k">Submitted by</div>
        <div class="v">${escapeHtml(submittedBy)}</div>
      </div>
      <div>
        <div class="k">Last updated</div>
        <div class="v">${escapeHtml(updatedAt)}</div>
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
				const question = (a.label?.trim() ? a.label.trim() : a.key) || a.key;
				const normal = formatNormalAnswer(a.normalValue);
				return `<li><div><strong>${escapeHtml(question)}</strong></div>${
					normal ? `<div class="muted">Normal answer: ${escapeHtml(normal)}</div>` : ""
				}</li>`;
			})
			.join("")}
      </ul>
    </div>
  ` : ""}

  ${audit.length ? `
    <h2>Audit</h2>
    <div class="box pdf-avoid-break">
      <ul class="list">
        ${audit
			.map((e) => {
				const when = e.editedAt ? formatWhen(e.editedAt) : "";
				const by = e.editedBy ? ` by ${e.editedBy}` : "";
				return `<li>${escapeHtml(`${when}${by}`.trim() || "—")}</li>`;
			})
			.join("")}
      </ul>
    </div>
  ` : ""}

  <h2>Answers</h2>
  <div class="box">
    <table>
      <thead>
        <tr>
          <th style="width: 40%">Question</th>
          <th>Answer</th>
        </tr>
      </thead>
      <tbody>
        ${rows
			.map(
				(r) =>
					`<tr><td><strong>${escapeHtml(r.label)}</strong><div class="muted">${escapeHtml(r.key)}</div></td><td>${r.valueHtml}</td></tr>`
			)
			.join("")}
      </tbody>
    </table>
  </div>

	${noResolvedAnswers ? `
		<h2>Raw submission data</h2>
		<div class="box">
			<div class="muted">No answers matched schema keys. Showing stored data for troubleshooting.</div>
			<pre style="margin: 8px 0 0; font-size: 11px; white-space: pre-wrap; word-break: break-word;">${escapeHtml(
		JSON.stringify(detail.data ?? null, null, 2)
	)}</pre>
		</div>
	` : ""}
</div>
`;
}

type AuditEntry = {
	editedAt: string;
	editedBy: string;
};

function parseAuditEntries(value: unknown): AuditEntry[] {
	if (!Array.isArray(value)) return [];
	return value
		.map((x): AuditEntry | null => {
			if (!x || typeof x !== "object") return null;
			const r = x as Record<string, unknown>;
			const editedAtRaw = typeof r.edited_at === "string" ? r.edited_at : "";
			const editedAt = editedAtRaw.trim() ? editedAtRaw.trim() : "";

			let editedBy = "";
			const by = r.edited_by;
			if (by && typeof by === "object") {
				const byRec = by as Record<string, unknown>;
				if (typeof byRec.email === "string" && byRec.email.trim()) editedBy = byRec.email.trim();
			}

			if (!editedAt && !editedBy) return null;
			return { editedAt, editedBy };
		})
		.filter((x): x is AuditEntry => x !== null);
}

export default function AdminSubmissionsPage() {
	const PAGE_SIZE = 25;
	const navigate = useNavigate();
	const location = useLocation();

	const [rows, setRows] = useState<AdminSubmissionRow[]>([]);
	const [total, setTotal] = useState(0);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const [page, setPage] = useState(1);
	const [qInput, setQInput] = useState("");
	const [q, setQ] = useState("");
	const [formId, setFormId] = useState<number | null>(null);
	const [from, setFrom] = useState("");
	const [to, setTo] = useState("");
	const [forms, setForms] = useState<Array<{ id: number; name: string }>>([]);

	useEffect(() => {
		const sp = new URLSearchParams(location.search);
		const fromParam = (sp.get("from") ?? "").trim();
		const toParam = (sp.get("to") ?? "").trim();
		const qParam = (sp.get("q") ?? "").trim();
		const formParam = (sp.get("form_id") ?? "").trim();

		if (fromParam) setFrom(fromParam);
		if (toParam) setTo(toParam);
		if (qParam) {
			setQInput(qParam);
			setQ(qParam);
		}
		if (formParam) {
			const n = Number(formParam);
			if (Number.isFinite(n)) setFormId(n);
		}
		// only run on first mount
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const [viewId, setViewId] = useState<number | null>(null);
	const [viewLoading, setViewLoading] = useState(false);
	const [viewError, setViewError] = useState<string | null>(null);
	const [detail, setDetail] = useState<AdminSubmissionDetail | null>(null);

	const [editMode, setEditMode] = useState(false);
	const [editSaving, setEditSaving] = useState(false);
	const [editError, setEditError] = useState<string | null>(null);

	const exportRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		let alive = true;
		getForms()
			.then((data: unknown) => {
				if (!alive) return;
				if (!Array.isArray(data)) {
					setForms([]);
					return;
				}
				const parsed = data
					.map((f) => {
						if (!f || typeof f !== "object") return null;
						const r = f as Record<string, unknown>;
						const id = typeof r.id === "number" ? r.id : Number(r.id);
						const name = typeof r.name === "string" ? r.name : String(r.name ?? "");
						if (!Number.isFinite(id) || !name.trim()) return null;
						return { id, name: name.trim() };
					})
					.filter((x): x is { id: number; name: string } => x !== null)
					.sort((a, b) => a.name.localeCompare(b.name));
				setForms(parsed);
			})
			.catch(() => {
				if (!alive) return;
				setForms([]);
			});

		return () => {
			alive = false;
		};
	}, []);

	useEffect(() => {
		const t = window.setTimeout(() => {
			setQ(qInput.trim());
			setPage(1);
		}, 250);
		return () => window.clearTimeout(t);
	}, [qInput]);

	const refresh = async (opts?: { keepPage?: boolean }) => {
		setLoading(true);
		setError(null);
		try {
			const nextPage = opts?.keepPage ? page : 1;
			const offset = (nextPage - 1) * PAGE_SIZE;
			const data = await listAdminSubmissions({
				limit: PAGE_SIZE,
				offset,
				formId: formId ?? undefined,
				q: q || undefined,
				from: from || undefined,
				to: to || undefined,
			});
			setRows(Array.isArray(data.items) ? data.items : []);
			setTotal(typeof data.total === "number" ? data.total : 0);
			if (!opts?.keepPage) setPage(1);
		} catch (e: unknown) {
			setError(e instanceof Error ? e.message : String(e));
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		void refresh({ keepPage: true });
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [page, formId, q, from, to]);

	useEffect(() => {
		const sp = new URLSearchParams();
		if (formId != null) sp.set("form_id", String(formId));
		if (q) sp.set("q", q);
		if (from) sp.set("from", from);
		if (to) sp.set("to", to);
		navigate({ pathname: location.pathname, search: sp.toString() ? `?${sp.toString()}` : "" }, { replace: true });
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [formId, q, from, to]);

	useEffect(() => {
		if (!viewId) return;
		let alive = true;
		setViewLoading(true);
		setViewError(null);
		setEditError(null);
		setEditMode(false);
		setEditSaving(false);
		setDetail(null);

		getAdminSubmission(viewId)
			.then((d) => {
				if (!alive) return;
				setDetail(d);
			})
			.catch((e: unknown) => {
				if (!alive) return;
				setViewError(e instanceof Error ? e.message : String(e));
			})
			.finally(() => {
				if (!alive) return;
				setViewLoading(false);
			});

		return () => {
			alive = false;
		};
	}, [viewId]);

	const saveEdits = async (data: unknown) => {
		if (!viewId) return;
		setEditSaving(true);
		setEditError(null);
		try {
			const updated = await updateAdminSubmission(viewId, data);
			setDetail(updated);
			setEditMode(false);
			void refresh();
		} catch (e: unknown) {
			setEditError(e instanceof Error ? e.message : String(e));
		} finally {
			setEditSaving(false);
		}
	};

	return (
		<div className="w-full">
			<div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-center sm:justify-between">
				<div className="text-sm text-gray-600 dark:text-neutral-300">
					{loading ? "Loading…" : `${total} submission(s)`}
				</div>

				<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
					<input
						type="date"
						className="h-9 rounded border border-gray-200 bg-white px-2 text-sm text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
						value={from}
						onChange={(e) => {
							setFrom(e.target.value);
							setPage(1);
						}}
						disabled={loading}
					/>
					<input
						type="date"
						className="h-9 rounded border border-gray-200 bg-white px-2 text-sm text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
						value={to}
						onChange={(e) => {
							setTo(e.target.value);
							setPage(1);
						}}
						disabled={loading}
					/>

					<select
						className="h-9 rounded border border-gray-200 bg-white px-2 text-sm text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
						value={formId == null ? "" : String(formId)}
						onChange={(e) => {
							const v = e.target.value;
							setFormId(v ? Number(v) : null);
							setPage(1);
						}}
						disabled={loading}
					>
						<option value="">All forms</option>
						{forms.map((f) => (
							<option key={f.id} value={String(f.id)}>
								{f.name}
							</option>
						))}
					</select>

					<input
						type="search"
						className="h-9 w-full rounded border border-gray-200 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 dark:border-gray-800 dark:bg-gray-900 dark:text-white sm:w-64"
						placeholder="Search by form, email, or ID"
						value={qInput}
						onChange={(e) => setQInput(e.target.value)}
						disabled={loading}
					/>

					<Button variant="outline" size="xsm" onClick={() => void refresh()} disabled={loading}>
						Refresh
					</Button>
				</div>
			</div>

			{error ? <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-red-700">{error}</div> : null}

			<div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
				<div className="max-w-full overflow-x-auto">
					<Table>
						<TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
							<TableRow>
								<TableCell
									isHeader
									className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
								>
									Form
								</TableCell>
								<TableCell
									isHeader
									className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
								>
									Abnormal
								</TableCell>
								<TableCell
									isHeader
									className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
								>
									Submitted
								</TableCell>
								<TableCell
									isHeader
									className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
								>
									Submitted By
								</TableCell>
								<TableCell
									isHeader
									className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
								>
									Actions
								</TableCell>
							</TableRow>
						</TableHeader>

						<TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
							{rows.length === 0 ? (
								<TableRow>
									<td colSpan={5} className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
										{loading ? "Loading…" : "No submissions yet."}
									</td>
								</TableRow>
							) : (
								rows.map((r) => {
									const abnormalCount = typeof r.abnormal_count === "number" ? r.abnormal_count : 0;
									return (
										<TableRow key={r.id}>
											<TableCell className="px-5 py-4 text-sm text-gray-800 dark:text-white/90">{r.form_name}</TableCell>
											<TableCell className="px-5 py-4 text-sm text-gray-800 dark:text-white/90">
												{abnormalCount > 0 ? `Yes (${abnormalCount})` : "No"}
											</TableCell>
											<TableCell className="px-5 py-4 text-sm text-gray-800 dark:text-white/90">
												{formatWhen(r.submitted_at)}
											</TableCell>
											<TableCell className="px-5 py-4 text-sm text-gray-800 dark:text-white/90">
												{r.user_email ?? "Anonymous"}
											</TableCell>
											<TableCell className="px-5 py-4 text-sm text-gray-800 dark:text-white/90">
												<Button variant="primary" size="sm" className="px-3! py-2! text-xs!" onClick={() => setViewId(r.id)}>
													View
												</Button>
											</TableCell>
										</TableRow>
									);
								})
							)}
						</TableBody>
					</Table>
				</div>
			</div>

			{(() => {
				const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
				const to = Math.min(total, (page - 1) * PAGE_SIZE + rows.length);
				const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
				const canPrev = page > 1 && !loading;
				const canNext = page < totalPages && !loading;
				return (
					<div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
						<div className="text-sm text-gray-600 dark:text-neutral-300">
							Showing {from}–{to} of {total}
						</div>
						<div className="flex items-center gap-2">
							<Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={!canPrev}>
								Prev
							</Button>
							<div className="text-sm text-gray-600 dark:text-neutral-300">
								Page {page} / {totalPages}
							</div>
							<Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={!canNext}>
								Next
							</Button>
						</div>
					</div>
				);
			})()}

			<Modal isOpen={viewId != null} onClose={() => setViewId(null)} className="w-[80vw] h-[80vh] max-w-6xl overflow-y-auto p-6">
				<div className="flex items-start justify-between gap-4 pb-4 border-b border-gray-100 dark:border-gray-800">
					<h3 className="text-lg font-semibold text-gray-900 dark:text-white/90">
						{detail ? `View submission: ${detail.form_name}` : "View submission"}
					</h3>
				</div>

				<div className="pt-4 space-y-3">
					{viewError ? <div className="rounded border border-red-200 bg-red-50 p-3 text-red-700">{viewError}</div> : null}
					{editError ? <div className="rounded border border-red-200 bg-red-50 p-3 text-red-700">{editError}</div> : null}
					{viewLoading ? <div className="text-sm text-gray-600 dark:text-neutral-300">Loading…</div> : null}

					{detail ? (
						<div ref={exportRef} className="space-y-3">
							<div className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm dark:border-gray-800 dark:bg-gray-900">
								<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
									<div>
										<div className="text-xs text-gray-500 dark:text-neutral-400">Submitted</div>
										<div className="text-sm text-gray-900 dark:text-white">{formatWhen(detail.submitted_at)}</div>
									</div>
									<div>
										<div className="text-xs text-gray-500 dark:text-neutral-400">Submitted by</div>
										<div className="text-sm text-gray-900 dark:text-white">{detail.user_email ?? "Anonymous"}</div>
									</div>
									<div>
										<div className="text-xs text-gray-500 dark:text-neutral-400">Last updated</div>
										<div className="text-sm text-gray-900 dark:text-white">
											{detail.updated_at ? formatWhen(detail.updated_at) : "—"}
										</div>
									</div>
									<div>
										<div className="text-xs text-gray-500 dark:text-neutral-400">Last updated by</div>
										<div className="text-sm text-gray-900 dark:text-white">{detail.updated_by_email ?? "—"}</div>
									</div>
								</div>

								{Array.isArray(detail.abnormalities) && detail.abnormalities.length > 0 ? (
									<div className="mt-3 rounded border border-red-200 bg-red-50 p-3 text-red-800">
										<div className="text-sm font-semibold mb-1">Abnormal answers detected</div>
										<ul className="list-disc pl-5 text-sm">
											{detail.abnormalities.map((a) => {
												const question = a.label?.trim() ? a.label.trim() : a.key;
												const normal = formatNormalAnswer(a.normalValue);
												return (
													<li key={a.key}>
														<div className="font-medium">{question}</div>
														{normal ? <div className="pl-4 text-xs text-red-900/80">Normal answer: {normal}</div> : null}
													</li>
												);
											})}
										</ul>
									</div>
								) : null}

								{(() => {
									const entries = parseAuditEntries(detail.edit_history);
									return (
										<div className="mt-3 rounded border border-gray-200 bg-gray-50 p-3 text-gray-800 dark:border-gray-800 dark:bg-gray-950 dark:text-neutral-200">
											<div className="text-sm font-semibold mb-1">Audit</div>
											{entries.length === 0 ? (
												<div className="text-sm text-gray-700 dark:text-neutral-300">No edits yet.</div>
											) : (
												<ul className="list-disc pl-5 text-sm">
													{entries.map((e, idx) => (
														<li key={`${e.editedAt}-${idx}`}>
															{e.editedAt ? formatWhen(e.editedAt) : ""}
															{e.editedBy ? <span className="ml-2"> by {e.editedBy}</span> : null}
														</li>
													))}
												</ul>
											)}
										</div>
									);
								})()}
							</div>

							{detail.form != null ? (
								<div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
									{editMode ? (
										<div className={editSaving ? "opacity-60 pointer-events-none" : ""}>
											<FormSubmissionEditor form={detail.form} data={detail.data} onSubmit={saveEdits} />
										</div>
									) : (
										<FormSubmissionViewer form={detail.form} data={detail.data} />
									)}
								</div>
							) : (
								<div className="rounded border border-yellow-200 bg-yellow-50 p-3 text-yellow-800">
									Submission loaded but the form schema could not be parsed.
								</div>
							)}
						</div>
					) : null}
				</div>

				<div className="pt-4 mt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-2">
					{detail && !editMode ? (
						<Button variant="outline" size="sm" onClick={() => setEditMode(true)}>
							Edit
						</Button>
					) : null}
					{detail && !editMode ? (
						<FormioPdfExport
							fileName={`submission-${detail.id}`}
							label="Export PDF"
							buildHtml={() => buildSubmissionPdfBody(detail)}
						/>
					) : null}
					{detail && editMode ? (
						<Button variant="outline" size="sm" onClick={() => setEditMode(false)} disabled={editSaving}>
							Cancel edit
						</Button>
					) : null}
					<Button variant="outline" size="sm" onClick={() => setViewId(null)}>
						Close
					</Button>
				</div>
			</Modal>
		</div>
	);
}
