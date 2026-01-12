type AnyRecord = Record<string, unknown>;

export type Abnormality = {
	key: string;
	type?: string;
	label?: string;
	normalValue: unknown;
};

function isObject(x: unknown): x is AnyRecord {
	return !!x && typeof x === "object";
}

function getString(x: unknown): string {
	return typeof x === "string" ? x : "";
}

function truthyFlag(x: unknown): boolean {
	return x === true || x === 1 || x === "1" || x === "true";
}

function stableStringify(value: unknown): string {
	const seen = new WeakSet<object>();

	const normalize = (v: unknown): unknown => {
		if (v == null) return v;
		if (typeof v !== "object") return v;
		if (seen.has(v as object)) return "[Circular]";
		seen.add(v as object);

		if (Array.isArray(v)) return v.map(normalize);
		const obj = v as AnyRecord;
		const keys = Object.keys(obj).sort();
		const out: AnyRecord = {};
		for (const k of keys) out[k] = normalize(obj[k]);
		return out;
	};

	try {
		return JSON.stringify(normalize(value));
	} catch {
		return String(value);
	}
}

function equalsLoose(a: unknown, b: unknown): boolean {
	// treat numeric strings as numbers where reasonable
	if (typeof a === "number" && typeof b === "string" && b.trim() !== "") {
		const n = Number(b);
		if (Number.isFinite(n)) return a === n;
	}
	if (typeof b === "number" && typeof a === "string" && a.trim() !== "") {
		const n = Number(a);
		if (Number.isFinite(n)) return b === n;
	}

	if (a === b) return true;
	return stableStringify(a) === stableStringify(b);
}

function normalizeOptionValue(value: unknown): unknown {
	// Form.io sometimes stores select-like values as { label, value } objects
	if (!value || typeof value !== "object") return value;
	const r = value as AnyRecord;
	if ("value" in r) return normalizeOptionValue(r.value);
	return value;
}

function selectedKeysFromSelectboxes(value: unknown): string[] {
	// selectboxes submissions are commonly { optionValue: true/false, ... }
	if (!value || typeof value !== "object") return [];
	const r = value as AnyRecord;
	const out: string[] = [];
	for (const [k, v] of Object.entries(r)) {
		if (v === true || v === 1 || v === "1" || v === "true") out.push(k);
	}
	out.sort();
	return out;
}

function normalizeSelectboxesNormal(value: unknown): string[] {
	// Allow configuring normal answer as:
	// - string: single option value
	// - array: multiple option values
	// - object: {value,label} or { optionValue: true }
	const v = normalizeOptionValue(value);
	if (typeof v === "string") return [v].filter(Boolean).sort();
	if (typeof v === "number") return [String(v)].sort();
	if (Array.isArray(v)) return v.map((x) => String(normalizeOptionValue(x))).filter(Boolean).sort();
	if (v && typeof v === "object") return selectedKeysFromSelectboxes(v);
	return [];
}

function stringArrayEqual(a: string[], b: string[]): boolean {
	if (a.length !== b.length) return false;
	for (let i = 0; i < a.length; i++) {
		if (a[i] !== b[i]) return false;
	}
	return true;
}

function getValueByKeyPath(data: unknown, key: string): unknown {
	if (!key) return undefined;
	if (!isObject(data)) return undefined;
	if (!key.includes(".")) return (data as AnyRecord)[key];

	const parts = key.split(".").filter(Boolean);
	let cur: unknown = data;
	for (const p of parts) {
		if (!isObject(cur)) return undefined;
		cur = (cur as AnyRecord)[p];
	}
	return cur;
}

type MarkedField = {
	key: string;
	type?: string;
	label?: string;
	normalValue?: unknown;
};

function collectMarkedFields(schema: unknown): MarkedField[] {
	if (!isObject(schema)) return [];
	const root = Array.isArray(schema.components) ? schema.components : [];

	const fields: MarkedField[] = [];

	const walk = (items: unknown[]) => {
		for (const item of items) {
			if (!isObject(item)) continue;
			const type = getString(item.type);
			const key = getString(item.key);
			const label = getString(item.label) || getString(item.title) || undefined;

			// Panel is a container
			if (type === "panel" && Array.isArray(item.components)) {
				walk(item.components);
				continue;
			}

			const props = isObject(item.properties) ? (item.properties as AnyRecord) : null;
			const enabled = props ? truthyFlag(props.abnormal_enabled) : false;
			const normalValue = props ? (props.abnormal_normal_value as unknown) : undefined;

			if (enabled && key) {
				fields.push({ key, type, label, normalValue });
			}

			if (Array.isArray(item.components)) walk(item.components);
			if (Array.isArray(item.columns)) {
				for (const col of item.columns) {
					if (!isObject(col)) continue;
					if (Array.isArray(col.components)) walk(col.components);
				}
			}
		}
	};

	walk(root);

	const seen = new Set<string>();
	return fields.filter((f) => {
		if (seen.has(f.key)) return false;
		seen.add(f.key);
		return true;
	});
}

export function computeAbnormalities(schema: unknown, submissionData: unknown): Abnormality[] {
	const marked = collectMarkedFields(schema);
	if (marked.length === 0) return [];

	const out: Abnormality[] = [];
	for (const f of marked) {
		const value = getValueByKeyPath(submissionData, f.key);

		// New behavior: abnormal if submitted value != configured normal value.
		if (f.normalValue === undefined) {
			// Misconfigured: enabled but no normal answer set -> don't flag.
			continue;
		}


		let isNormal = false;
		const t = (f.type || "").toLowerCase();

		if (t === "selectboxes") {
			const selected = selectedKeysFromSelectboxes(value);
			const normalSelected = normalizeSelectboxesNormal(f.normalValue);
			isNormal = stringArrayEqual(selected, normalSelected);
		} else if (t === "radio" || t === "select") {
			const submitted = normalizeOptionValue(value);
			const normal = normalizeOptionValue(f.normalValue);
			isNormal = equalsLoose(submitted, normal);
		} else {
			isNormal = equalsLoose(value, f.normalValue);
		}

		if (!isNormal) {
			out.push({ key: f.key, type: f.type, label: f.label, normalValue: f.normalValue });
		}
	}
	return out;
}
