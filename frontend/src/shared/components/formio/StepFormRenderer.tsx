import { useEffect, useMemo, useRef, useState } from "react";
import { Formio } from "formiojs";
import { installImageUploadComponent } from "./components/installImageUploadComponent";
import SubmissionPreview, { type PreviewItem } from "./SubmissionPreview";
import Button from "../../../template/tailAdmin/components/ui/button/Button";

type AnyRecord = Record<string, unknown>;

type Props = {
	form: unknown;
	onSubmit?: (data: Record<string, unknown>) => void;
};

type Panel = {
	type: "panel";
	key?: string;
	title?: string;
	label?: string;
	breadcrumb?: string;
	components?: unknown[];
} & AnyRecord;

type FormLike = {
	display?: unknown;
	components?: unknown;
} & AnyRecord;

type FormAppSettings = {
  previewBeforeSubmit?: boolean;
  allowDraftPdfBeforeSubmit?: boolean;
};

function isObject(x: unknown): x is AnyRecord {
	return !!x && typeof x === "object";
}

function buildLabelMap(schema: unknown): Record<string, string> {
	const map: Record<string, string> = {};

	const walk = (node: unknown) => {
		if (!isObject(node)) return;
		const key = typeof (node as AnyRecord).key === "string" ? String((node as AnyRecord).key) : "";
		const label = typeof (node as AnyRecord).label === "string" ? String((node as AnyRecord).label) : "";
		const type = typeof (node as AnyRecord).type === "string" ? String((node as AnyRecord).type) : "";
		if (key && label && type !== "button") map[key] = label;

		const components = (node as AnyRecord).components;
		if (Array.isArray(components)) {
			for (const c of components) walk(c);
		}

		const columns = (node as AnyRecord).columns;
		if (Array.isArray(columns)) {
			for (const col of columns) {
				if (!isObject(col)) continue;
				const colComps = (col as AnyRecord).components;
				if (Array.isArray(colComps)) {
					for (const c of colComps) walk(c);
				}
			}
		}
	};

	walk(schema);
	return map;
}

function toPreviewItems(labelMap: Record<string, string>, data: Record<string, unknown>): PreviewItem[] {
	const items: PreviewItem[] = [];
	for (const [key, raw] of Object.entries(data || {})) {
		const label = labelMap[key] || key;
		const value =
			raw === null || raw === undefined
				? ""
				: typeof raw === "string"
					? raw
					: typeof raw === "number" || typeof raw === "boolean"
						? String(raw)
						: JSON.stringify(raw, null, 2);
			items.push({ label, value });
	}
	return items;
}

function isPanel(x: unknown): x is Panel {
	return isObject(x) && x.type === "panel" && Array.isArray((x as AnyRecord).components);
}

function firstNonEmptyString(...values: unknown[]): string | undefined {
	for (const v of values) {
		if (typeof v !== "string") continue;
		const trimmed = v.trim();
		if (trimmed.length > 0) return trimmed;
	}
	return undefined;
}

function wizardStepTitle(panel: Panel, index: number): string {
	return firstNonEmptyString(panel.breadcrumb, panel.title, panel.label, panel.key) ?? `Step ${index + 1}`;
}

type FormioInstance = {
	destroy: (deleteFromGlobal?: boolean) => void;
	on: (event: string, cb: (...args: any[]) => void) => void;
	nextPage?: () => unknown;
	prevPage?: () => unknown;
	setPage?: (page: number) => unknown;
	submit?: () => unknown;
	page?: number;
};

export default function StepFormRenderer({ form, onSubmit }: Props) {
	const [step, setStep] = useState(0);
	const [maxCompletedStep, setMaxCompletedStep] = useState(-1);
	const [previewOpen, setPreviewOpen] = useState(false);
	const [pendingData, setPendingData] = useState<Record<string, unknown> | null>(null);
	const [pendingItems, setPendingItems] = useState<PreviewItem[]>([]);
	const containerRef = useRef<HTMLDivElement | null>(null);
	const instanceRef = useRef<FormioInstance | null>(null);

	const formLike: FormLike | null = isObject(form) ? (form as FormLike) : null;

	const rootComponents = useMemo<unknown[]>(
		() => (formLike && Array.isArray(formLike.components) ? formLike.components : []),
		[formLike]
	);
	const panels = useMemo(() => rootComponents.filter(isPanel), [rootComponents]);
	const isWizard = formLike?.display === "wizard" || panels.length > 0;

	const appSettings: FormAppSettings = useMemo(() => {
		const raw = (formLike as any)?.appSettings;
		return raw && typeof raw === "object" ? (raw as FormAppSettings) : {};
	}, [formLike]);

	// Ensure custom components (like Image Upload) are available at render time.
	installImageUploadComponent(Formio as any);

	useEffect(() => {
		if (!isWizard) return;
		if (!formLike) return;
		if (!containerRef.current) return;

		let cancelled = false;
		let instance: FormioInstance | null = null;

		containerRef.current.innerHTML = "";

		Formio.createForm(containerRef.current, structuredClone(formLike)).then((formInstance: any) => {
			if (cancelled) {
				formInstance?.destroy?.(true);
				return;
			}

			instance = formInstance as FormioInstance;
			instanceRef.current = instance;

			// Initial page is handled by the separate [step] effect below.

			const syncStepFromInstance = () => {
				const current = typeof instance?.page === "number" ? instance.page : NaN;
				if (Number.isFinite(current)) {
					const currentIndex = Number(current);
					setStep(currentIndex);
					setMaxCompletedStep((prev) => Math.max(prev, currentIndex - 1));
				}
			};

			instance.on("nextPage", syncStepFromInstance);
			instance.on("prevPage", syncStepFromInstance);
			instance.on("wizardPageSelected", syncStepFromInstance);
			instance.on("render", syncStepFromInstance);

			instance.on("submit", (submission: any) => {
				const data = (submission && submission.data && typeof submission.data === "object")
					? (submission.data as Record<string, unknown>)
					: {};

				if (appSettings.previewBeforeSubmit) {
					const labelMap = buildLabelMap(formLike);
					setPendingData(data);
					setPendingItems(toPreviewItems(labelMap, data));
					setPreviewOpen(true);
					return;
				}

				onSubmit?.(data);
			});
		});

		return () => {
			cancelled = true;
			instanceRef.current = null;
			if (instance) instance.destroy(true);
		};
	}, [formLike, isWizard, onSubmit]);

	useEffect(() => {
		setMaxCompletedStep(-1);
		setStep(0);
	}, [formLike]);

	useEffect(() => {
		const instance = instanceRef.current;
		if (!instance) return;

		if (typeof instance.setPage === "function") {
			instance.setPage(step);
			return;
		}

		if (typeof instance.page === "number") {
			instance.page = step;
		}
	}, [step]);

	if (!formLike) {
		return <div className="p-6 text-center text-gray-500">No form loaded</div>;
	}

	if (!isWizard) {
		return <div className="p-6 text-center text-gray-500">Not a wizard form</div>;
	}

	if (panels.length === 0) {
		return <div className="p-6 text-center text-gray-500">Wizard form has no pages</div>;
	}

	const title =
		typeof formLike?.title === "string" && formLike.title.trim()
			? String(formLike.title)
			: typeof formLike?.name === "string" && String(formLike.name).trim()
				? String(formLike.name)
				: "Review before submission";

	const clampedStep = Math.max(0, Math.min(step, panels.length - 1));
	const maxAccessibleStep = Math.min(panels.length - 1, maxCompletedStep + 1);

	const tryAdvanceTo = async (targetIndex: number) => {
		const instance = instanceRef.current as any;
		if (!instance) {
			setStep(targetIndex);
			return;
		}

		if (targetIndex <= clampedStep) {
			setStep(targetIndex);
			return;
		}

		if (targetIndex > maxAccessibleStep) return;

		while (true) {
			const current = typeof instance.page === "number" ? instance.page : clampedStep;
			if (current >= targetIndex) break;

			const before = current;

			if (typeof instance.nextPage === "function") {
				const result = instance.nextPage();
				if (result && typeof result.then === "function") {
					await result;
				}
			} else if (typeof instance.setPage === "function") {
				instance.setPage(current + 1);
			} else {
				setStep((s) => Math.min(panels.length - 1, s + 1));
			}

			const after = typeof instance.page === "number" ? instance.page : before;
			if (after === before) break;
		}
	};

	const goPrev = () => {
		const instance = instanceRef.current;
		if (instance?.prevPage) {
			instance.prevPage();
			return;
		}
		setStep((s) => Math.max(0, s - 1));
	};

	const goNext = () => {
		const instance = instanceRef.current;
		if (instance?.nextPage) {
			instance.nextPage();
			return;
		}
		setStep((s) => Math.min(panels.length - 1, s + 1));
	};

	const goSubmit = () => {
		const instance = instanceRef.current;
		if (instance?.submit) {
			instance.submit();
		}
	};

	return (
		<div className="p-6 w-full flowbite-stepper-wizard">
			{previewOpen && pendingData && (
				<div className="mb-6">
					<SubmissionPreview
						title={title}
						items={pendingItems}
						allowPdfDownload={!!appSettings.allowDraftPdfBeforeSubmit}
						onBack={() => setPreviewOpen(false)}
						onConfirmSubmit={() => {
							const data = pendingData;
							setPreviewOpen(false);
							setPendingData(null);
							setPendingItems([]);
							onSubmit?.(data);
						}}
					/>
				</div>
			)}

			<div className="mb-6 w-full">
				<ul className="relative flex flex-col md:flex-row gap-2">
					{panels.map((p, idx) => {
						const title = wizardStepTitle(p, idx);
						const active = idx === clampedStep;
						const isDone = idx < clampedStep;
						const isFutureLocked = idx > maxAccessibleStep;

						const bubbleClass =
							isDone || active
								? "bg-brand-500 text-white"
								: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
						const titleClass = active || isDone ? "text-blue-600" : "text-gray-800";

						return (
							<li
								key={String(p.key ?? idx)}
								className="md:shrink md:basis-0 flex-1 group flex gap-x-2 md:block"
							>
								<button
									type="button"
									onClick={() => void tryAdvanceTo(idx)}
									aria-current={active ? "step" : undefined}
									disabled={isFutureLocked}
									className={
										isFutureLocked
											? "w-full text-left flex gap-x-2 md:block opacity-50 cursor-not-allowed"
											: "w-full text-left flex gap-x-2 md:block"
									}
								>
									<div className="min-w-7 min-h-7 flex flex-col items-center md:w-full md:inline-flex md:flex-wrap md:flex-row text-xs align-middle">
										<span
											className={`size-7 flex justify-center items-center shrink-0 font-medium rounded-full ${bubbleClass}`}
										>
											{idx + 1}
										</span>
										<div className="mt-2 w-px h-full md:mt-0 md:ms-2 md:w-full md:h-px md:flex-1 bg-gray-200 group-last:hidden" />
									</div>

									<div className="grow md:grow-0 md:mt-3 pb-5">
										<span className={`block text-sm font-medium ${titleClass}`}>{title}</span>
									</div>
								</button>
							</li>
						);
					})}
				</ul>
			</div>

			<div className={previewOpen ? "hidden" : "mb-6"}>
				<div className="formio-scope">
					<div ref={containerRef} />
				</div>
			</div>

			<div className="flex gap-2 justify-between">
				<Button variant="outline" onClick={goPrev} disabled={clampedStep === 0}>
					Previous
				</Button>

				{clampedStep < panels.length - 1 ? (
					<Button onClick={goNext}>Next</Button>
				) : (
					<Button onClick={goSubmit}>{appSettings.previewBeforeSubmit ? "Review and Submit" : "Submit"}</Button>
				)}
			</div>

		</div>
	);
}
