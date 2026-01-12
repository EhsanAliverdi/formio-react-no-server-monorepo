import { useEffect, useMemo, useState } from "react";
import { apiFetch, getApiBaseUrl } from "../../services/apiClient";
import {
	getReactIconPackLabel,
	isReactIconPack,
	REACT_ICON_PACKS,
	type ReactIconPack,
	type SelectedReactIcon,
} from "./reactIconsRegistry";

const ALL_PACKS = "__all__" as const;
type PackSelection = ReactIconPack | typeof ALL_PACKS;

type Props = {
	isOpen: boolean;
	onClose: () => void;
	onSelect: (icon: SelectedReactIcon) => void;
	initialQuery?: string;
	initialPack?: ReactIconPack;
};

type SearchResponse = { items: string[] };

export default function IconPickerModal({
	isOpen,
	onClose,
	onSelect,
	initialQuery,
	initialPack = "fa",
}: Props) {
	const [pack, setPack] = useState<PackSelection>(initialPack);
	const [query, setQuery] = useState(initialQuery ?? "");
	const [items, setItems] = useState<string[]>([]);
	const [groupedItems, setGroupedItems] = useState<Array<{ pack: ReactIconPack; items: string[] }>>(
		[],
	);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!isOpen) return;
		let cancelled = false;
		const timeout = window.setTimeout(() => {
			const q = query.trim();

			// Avoid flooding the server when searching across all packs with an empty query.
			if (pack === ALL_PACKS && !q) {
				setItems([]);
				setGroupedItems([]);
				setError(null);
				setLoading(false);
				return;
			}

			setLoading(true);
			setError(null);

			if (pack !== ALL_PACKS) {
				apiFetch(
					`/api/icons/search?pack=${encodeURIComponent(pack)}&q=${encodeURIComponent(q)}&limit=240`,
				)
					.then((res) => res.json() as Promise<SearchResponse>)
					.then((payload) => {
						if (cancelled) return;
						setGroupedItems([]);
						setItems(Array.isArray(payload.items) ? payload.items : []);
					})
					.catch((err) => {
						if (cancelled) return;
						setGroupedItems([]);
						setItems([]);
						setError(err instanceof Error ? err.message : "Failed to load icons");
					})
					.finally(() => {
						if (cancelled) return;
						setLoading(false);
					});
				return;
			}

			// Search across all packs (grouped by pack)
			const limitPerPack = 48;
			const packs = REACT_ICON_PACKS.map((p) => p.id);
			Promise.allSettled(
				packs.map(async (p) => {
					const res = await apiFetch(
						`/api/icons/search?pack=${encodeURIComponent(p)}&q=${encodeURIComponent(q)}&limit=${limitPerPack}`,
					);
					const payload = (await res.json()) as SearchResponse;
					return {
						pack: p,
						items: Array.isArray(payload.items) ? payload.items : [],
					};
				}),
			)
				.then((results) => {
					if (cancelled) return;
					const groups: Array<{ pack: ReactIconPack; items: string[] }> = [];
					let anySuccess = false;
					for (const r of results) {
						if (r.status !== "fulfilled") continue;
						anySuccess = true;
						if (r.value.items.length) {
							groups.push({ pack: r.value.pack, items: r.value.items });
						}
					}
					setItems([]);
					setGroupedItems(groups);
					if (!anySuccess) {
						setError("Failed to load icons");
					}
				})
				.catch((err) => {
					if (cancelled) return;
					setItems([]);
					setGroupedItems([]);
					setError(err instanceof Error ? err.message : "Failed to load icons");
				})
				.finally(() => {
					if (cancelled) return;
					setLoading(false);
				});
		}, 200);
		return () => {
			cancelled = true;
			window.clearTimeout(timeout);
		};
	}, [isOpen, pack, query]);

	useEffect(() => {
		if (!isOpen) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [isOpen, onClose]);

	const base = useMemo(() => getApiBaseUrl(), []);
	const filtered = useMemo(() => items.slice(0, 240), [items]);
	const trimmedQuery = query.trim();

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-99999">
			<button
				type="button"
				className="absolute inset-0 bg-black/40"
				onClick={onClose}
				aria-label="Close"
			/>

			<div
				role="dialog"
				aria-modal="true"
				className="absolute left-1/2 top-1/2 w-[min(920px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white shadow-theme-lg"
			>
				<div className="flex items-center justify-between gap-3 border-b border-gray-200 px-5 py-4">
					<div className="min-w-0">
						<div className="text-lg font-semibold text-gray-900">Choose an icon</div>
						<div className="text-sm text-gray-600">Search and pick a React Icon.</div>
					</div>
					<button
						type="button"
						className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
						onClick={onClose}
						aria-label="Close"
					>
						×
					</button>
				</div>

				<div className="px-5 py-4">
					<div className="flex flex-wrap items-center gap-3">
						<div className="min-w-55">
							<label className="block text-xs font-medium text-gray-700 mb-1">Icon pack</label>
							<select
								className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
								value={pack}
								onChange={(e) => {
									const next = e.target.value;
										if (next === ALL_PACKS) setPack(ALL_PACKS);
										else if (isReactIconPack(next)) setPack(next);
								}}
							>
									<option value={ALL_PACKS}>All packs</option>
								{REACT_ICON_PACKS.map((p) => (
									<option key={p.id} value={p.id}>
										{getReactIconPackLabel(p.id)}
									</option>
								))}
							</select>
						</div>

						<div className="flex-1 min-w-60">
							<label className="block text-xs font-medium text-gray-700 mb-1">Search</label>
							<input
								className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
								value={query}
								onChange={(e) => setQuery(e.target.value)}
								placeholder="e.g. user, file, bell..."
								autoFocus
							/>
						</div>
					</div>

					<div className="mt-4 max-h-[60vh] overflow-auto rounded-lg border border-gray-200">
						{error ? <div className="p-3 text-sm text-red-600">{error}</div> : null}
						{loading ? <div className="p-3 text-sm text-gray-600">Loading icons…</div> : null}
							{pack === ALL_PACKS ? (
								!trimmedQuery ? (
									<div className="p-3 text-sm text-gray-600">
										Type a search term to search across all packs.
									</div>
								) : groupedItems.length ? (
									<div className="p-3 space-y-4">
										{groupedItems.map((group) => (
											<div key={group.pack}>
												<div className="mb-2 text-xs font-semibold text-gray-700">
													{getReactIconPackLabel(group.pack)}
												</div>
												<div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
													{group.items.map((name) => (
														<button
															key={`${group.pack}:${name}`}
															type="button"
															className="group flex flex-col items-center justify-center gap-1 rounded-lg border border-gray-200 bg-white p-2 hover:bg-gray-50"
															onClick={() => onSelect({ pack: group.pack, name })}
															title={`${group.pack}:${name}`}
														>
															<img
																src={`${base}/api/icons/svg?pack=${encodeURIComponent(group.pack)}&name=${encodeURIComponent(name)}`}
																alt={name}
																className="h-6 w-6"
																loading="lazy"
															/>
															<span className="w-full truncate text-[10px] text-gray-500 group-hover:text-gray-700">
																{name}
															</span>
														</button>
													))}
												</div>
											</div>
										))}
									</div>
								) : (
									<div className="p-3 text-sm text-gray-600">No results.</div>
								)
							) : (
								<div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 p-3">
									{filtered.map((name) => (
										<button
											key={`${pack}:${name}`}
											type="button"
											className="group flex flex-col items-center justify-center gap-1 rounded-lg border border-gray-200 bg-white p-2 hover:bg-gray-50"
											onClick={() => onSelect({ pack, name })}
											title={name}
										>
											<img
												src={`${base}/api/icons/svg?pack=${encodeURIComponent(pack)}&name=${encodeURIComponent(name)}`}
												alt={name}
												className="h-6 w-6"
												loading="lazy"
										/>
											<span className="w-full truncate text-[10px] text-gray-500 group-hover:text-gray-700">
												{name}
											</span>
										</button>
									))}
								</div>
							)}
					</div>

						<div className="mt-3 text-xs text-gray-500">
							{pack === ALL_PACKS ? "Showing up to 48 results per pack." : "Showing up to 240 results."}
						</div>
				</div>
			</div>
		</div>
	);
}
