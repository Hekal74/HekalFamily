import { useDeferredValue, useEffect, useRef, useState } from "react";
import familySeed from "../../../data/family";
import type { FamilyData, Language, Person } from "../../../types/family";
import DetailDrawer from "./DetailDrawer";
import TreeViewport, { type TreeViewportHandle } from "./TreeViewport";
import {
	buildTreeScene,
	getDisplayName,
	getPerson,
	isFamilyData,
	LANGUAGE_KEY,
	searchPeople,
	STORAGE_KEY,
} from "../lib/tree";

const loadStoredData = (): FamilyData => {
	const raw = window.localStorage.getItem(STORAGE_KEY);
	if (!raw) {
		return familySeed;
	}

	try {
		const parsed = JSON.parse(raw) as unknown;
		return isFamilyData(parsed) ? parsed : familySeed;
	} catch {
		return familySeed;
	}
};

const loadStoredLanguage = (): Language =>
	window.localStorage.getItem(LANGUAGE_KEY) === "en" ? "en" : "ar";

interface FamilyTreeProps {
	onLock?: () => void;
}

const FamilyTree = ({ onLock }: FamilyTreeProps) => {
	const viewportRef = useRef<TreeViewportHandle>(null);
	const exploreViewportRef = useRef<TreeViewportHandle>(null);
	const searchRef = useRef<HTMLDivElement>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const [data, setData] = useState<FamilyData>(loadStoredData);
	const [language, setLanguage] = useState<Language>(loadStoredLanguage);
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [query, setQuery] = useState("");
	const [searchOpen, setSearchOpen] = useState(false);
	const [isExploreOpen, setIsExploreOpen] = useState(false);
	const [isEditing, setIsEditing] = useState(false);

	const deferredQuery = useDeferredValue(query);
	const scene = buildTreeScene(data);
	const searchHits = searchPeople(data, deferredQuery, language);
	const selectedPerson = selectedId ? getPerson(data, selectedId) : undefined;

	const handleSelectPerson = (personId: string) => {
		setSelectedId(personId);
		setIsEditing(false);
	};

	useEffect(() => {
		window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
	}, [data]);

	useEffect(() => {
		window.localStorage.setItem(LANGUAGE_KEY, language);
		document.body.classList.toggle("lang-en", language === "en");
		document.documentElement.dir = language === "en" ? "ltr" : "rtl";
		document.documentElement.lang = language;
	}, [language]);

	useEffect(() => {
		const onPointerDown = (event: PointerEvent) => {
			const target = event.target;
			if (target instanceof Node && searchRef.current?.contains(target)) {
				return;
			}

			setSearchOpen(false);
		};

		document.addEventListener("pointerdown", onPointerDown);
		return () => document.removeEventListener("pointerdown", onPointerDown);
	}, []);

	useEffect(() => {
		if (isExploreOpen) {
			window.requestAnimationFrame(() => exploreViewportRef.current?.fit());
		}
	}, [isExploreOpen]);

	const updatePerson = (personId: string, updates: Partial<Person>) => {
		setData((current) => ({
			...current,
			people: {
				...current.people,
				[personId]: {
					...current.people[personId],
					...updates,
				},
			},
		}));
	};

	return (
		<div className="app-shell">
			<div aria-hidden="true" className="paper-bg">
				<svg className="pattern" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
					<defs>
						<pattern
							height="60"
							id="geo"
							patternUnits="userSpaceOnUse"
							width="60"
							x="0"
							y="0"
						>
							<g fill="none" stroke="currentColor" strokeWidth="0.6">
								<circle cx="30" cy="30" r="22" />
								<circle cx="30" cy="30" r="15" />
								<path d="M30 8 L52 30 L30 52 L8 30 Z" />
								<path d="M15 15 L45 15 L45 45 L15 45 Z" />
							</g>
						</pattern>
					</defs>
					<rect fill="url(#geo)" height="100%" width="100%" />
				</svg>
			</div>

			<header className="topbar">
				<div className="brand">
					<svg aria-hidden="true" className="brand-mark" viewBox="0 0 40 40">
						<g fill="none" stroke="currentColor" strokeWidth="1.2">
							<circle cx="20" cy="20" r="18" />
							<circle cx="20" cy="20" r="12" />
							<path d="M20 2 L38 20 L20 38 L2 20 Z" />
							<path d="M20 8 L32 20 L20 32 L8 20 Z" />
						</g>
					</svg>

					<div className="brand-text">
						<div className="brand-ar">
							{language === "ar" ? "شجرة عائلة هيكل" : "عائلة هيكل"}
						</div>
						<div className="brand-en">
							{language === "ar"
								? "The Hekal Family Tree"
								: "The Hekal Family"}
						</div>
					</div>
				</div>

				<div className="search-wrap" ref={searchRef}>
					<svg
						className="search-icon"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.6"
						viewBox="0 0 24 24"
					>
						<circle cx="11" cy="11" r="7" />
						<path d="m20 20-3.5-3.5" />
					</svg>

					<input
						autoComplete="off"
						id="search"
						onChange={(event) => {
							setQuery(event.target.value);
							setSearchOpen(true);
						}}
						onFocus={() => setSearchOpen(true)}
						placeholder={language === "ar" ? "ابحث عن اسم..." : "Search a name..."}
						type="search"
						value={query}
					/>

					{searchOpen && query.trim() && searchHits.length > 0 ? (
						<div className="search-results">
							{searchHits.map((hit) => (
								<button
									className="hit"
									key={hit.id}
									onClick={() => {
										handleSelectPerson(hit.id);
										setQuery("");
										setSearchOpen(false);
									}}
									type="button"
								>
									<span className="hit-main">
										<strong>{hit.primary}</strong>
										{hit.secondary ? (
											<span className="hit-secondary">{hit.secondary}</span>
										) : null}
									</span>
									{hit.context ? <span className="ctx">{hit.context}</span> : null}
								</button>
							))}
						</div>
					) : null}
				</div>

				<div className="actions">
					<button
						className="btn ghost"
						onClick={() =>
							setLanguage((current) => (current === "ar" ? "en" : "ar"))
						}
						title="Language"
						type="button"
					>
						<span>{language === "ar" ? "EN" : "AR"}</span>
					</button>

					<button
						className="btn ghost"
						onClick={() => setIsExploreOpen(true)}
						title="Explore"
						type="button"
					>
						<span className="btn-label">
							{language === "ar" ? "استكشاف" : "Explore"}
						</span>
					</button>

					<button
						className={`btn ghost${isEditing ? " active" : ""}`}
						disabled={!selectedId}
						onClick={() => {
							if (selectedId) {
								setIsEditing((current) => !current);
							}
						}}
						title="Edit mode"
						type="button"
					>
						<span className="btn-label">
							{language === "ar" ? "تعديل" : "Edit"}
						</span>
					</button>

					<button
						className="btn ghost"
						onClick={() => viewportRef.current?.fit()}
						title="Fit"
						type="button"
					>
						<svg
							fill="none"
							height="16"
							stroke="currentColor"
							strokeWidth="1.6"
							viewBox="0 0 24 24"
							width="16"
						>
							<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
						</svg>
					</button>

					<button
						className="btn ghost"
						onClick={() => viewportRef.current?.zoomOut()}
						title="Zoom out"
						type="button"
					>
						−
					</button>

					<button
						className="btn ghost"
						onClick={() => viewportRef.current?.zoomIn()}
						title="Zoom in"
						type="button"
					>
						+
					</button>

					<span className="divider" />

					<button
						className="btn ghost"
						onClick={() => fileInputRef.current?.click()}
						title="Import JSON"
						type="button"
					>
						<span className="btn-label">
							{language === "ar" ? "استيراد" : "Import"}
						</span>
					</button>

					{onLock ? (
						<button
							className="btn ghost"
							onClick={onLock}
							title={language === "ar" ? "رجوع لشاشة الدخول" : "Back to welcome gate"}
							type="button"
						>
							<span className="btn-label">
								{language === "ar" ? "خروج" : "Lock"}
							</span>
						</button>
					) : null}

					<button
						className="btn primary"
						onClick={() => {
							const blob = new Blob([JSON.stringify(data, null, 2)], {
								type: "application/json",
							});
							const url = URL.createObjectURL(blob);
							const link = document.createElement("a");
							link.href = url;
							link.download = "hekal-family-tree.json";
							link.click();
							window.setTimeout(() => URL.revokeObjectURL(url), 1000);
						}}
						title="Export JSON"
						type="button"
					>
						<span className="btn-label">
							{language === "ar" ? "تصدير" : "Export"}
						</span>
					</button>

					<input
						accept="application/json"
						hidden
						onChange={async (event) => {
							const file = event.target.files?.[0];
							if (!file) {
								return;
							}

							try {
								const text = await file.text();
								const parsed = JSON.parse(text) as unknown;

								if (!isFamilyData(parsed)) {
									throw new Error("Invalid family schema");
								}

								setData(parsed);
								setSelectedId(null);
								setQuery("");
								setSearchOpen(false);
								setIsEditing(false);
							} catch {
								window.alert(
									language === "ar"
										? "فشل استيراد الملف."
										: "Could not import this file.",
								);
							} finally {
								event.target.value = "";
							}
						}}
						ref={fileInputRef}
						type="file"
					/>
				</div>
			</header>

			<section className="hero">
				<div className="hero-inner">
					<div className="hero-panel">
						<div aria-hidden="true" className="hero-ornament">
							✺
						</div>
						{language === "ar" ? (
							<h1 className="hero-title-ar">
								شجرة عائلة
								<br />
								<em>أحمد هيكل</em> &amp; <em>وهيبة</em>
							</h1>
						) : (
							<h1 className="hero-title-main">
								The Family of
								<br />
								<em>Ahmed Hekal</em> &amp; <em>Waheeba</em>
							</h1>
						)}
						<div className="hero-rule">
							<span />
							<i>✦</i>
							<span />
						</div>
						<p className="hero-title-en">
							{language === "ar"
								? "The Family of Ahmed Hekal & Waheeba"
								: "A living family archive to explore, preserve, and keep growing"}
						</p>
						<p className="hero-sub">
							{language === "ar"
								? "اضغط على أي اسم لعرض التفاصيل، واسحب للتحريك، واستخدم الأزرار للتكبير. ولو أردت تجربة كاملة افتح وضع الاستكشاف."
								: "Select any name to open the details, drag to pan, use the controls to zoom, and open Explore mode for the full experience."}
						</p>

						<div className="hero-meta">
							<div className="hero-stat">
								<strong>{scene.totalPeople}</strong>
								<span>{language === "ar" ? "فرد" : "People"}</span>
							</div>
							<div className="hero-stat">
								<strong>{scene.generations}</strong>
								<span>{language === "ar" ? "أجيال" : "Generations"}</span>
							</div>
							<div className="hero-stat">
								<strong>{language === "ar" ? "محلي" : "Local"}</strong>
								<span>
									{language === "ar"
										? "التعديلات تحفظ على جهازك"
										: "Edits stay on your device"}
								</span>
							</div>
							<button
								className="hero-explore"
								onClick={() => setIsExploreOpen(true)}
								type="button"
							>
								{language === "ar" ? "افتح وضع الاستكشاف" : "Open Explore Mode"}
							</button>
						</div>
					</div>
				</div>
			</section>

			<TreeViewport
				allowWheelZoom={false}
				data={data}
				language={language}
				mode="preview"
				onSelect={handleSelectPerson}
				ref={viewportRef}
				scene={scene}
				selectedId={selectedId}
			/>

			{isExploreOpen ? (
				<div className="explore-overlay">
					<button
						aria-label={language === "ar" ? "إغلاق وضع الاستكشاف" : "Close explore mode"}
						className="explore-backdrop"
						onClick={() => setIsExploreOpen(false)}
						type="button"
					/>

					<div className="explore-shell">
						<div className="explore-toolbar">
							<div className="explore-copy">
								<strong>
									{language === "ar" ? "وضع الاستكشاف" : "Explore Mode"}
								</strong>
								<span>
									{language === "ar"
										? "هنا فقط يمكنك استخدام عجلة الماوس للتكبير مع السحب بحرية."
										: "Only here the mouse wheel zoom is enabled, along with free panning."}
								</span>
							</div>

							<div className="explore-actions">
								<button
									className="btn ghost"
									onClick={() => exploreViewportRef.current?.zoomOut()}
									type="button"
								>
									−
								</button>
								<button
									className="btn ghost"
									onClick={() => exploreViewportRef.current?.zoomIn()}
									type="button"
								>
									+
								</button>
								<button
									className="btn ghost"
									onClick={() => exploreViewportRef.current?.fit()}
									type="button"
								>
									{language === "ar" ? "ملاءمة" : "Fit"}
								</button>
								<button
									className="btn primary"
									onClick={() => setIsExploreOpen(false)}
									type="button"
								>
									{language === "ar" ? "إغلاق" : "Close"}
								</button>
							</div>
						</div>

						<TreeViewport
							allowWheelZoom
							data={data}
							language={language}
							mode="explore"
							onSelect={handleSelectPerson}
							ref={exploreViewportRef}
							scene={scene}
							selectedId={selectedId}
						/>
					</div>
				</div>
			) : null}

			<DetailDrawer
				data={data}
				isEditing={isEditing}
				language={language}
				onClose={() => {
					setSelectedId(null);
					setIsEditing(false);
				}}
				onSelect={handleSelectPerson}
				onToggleEditing={() => setIsEditing((current) => !current)}
				onUpdatePerson={updatePerson}
				personId={selectedId}
				key={selectedId ?? "drawer-empty"}
			/>

			<footer className="legend">
				<span className="legend-item">
					<i className="swatch male" />
					<span>{language === "ar" ? "ذكر" : "Male"}</span>
				</span>
				<span className="legend-item">
					<i className="swatch female" />
					<span>{language === "ar" ? "أنثى" : "Female"}</span>
				</span>
				<span className="legend-sep">·</span>
				<span className="legend-stats">
					{language === "ar"
						? `${scene.totalPeople} فرد · ${scene.generations} أجيال`
						: `${scene.totalPeople} people · ${scene.generations} generations`}
				</span>
				{selectedPerson ? (
					<>
						<span className="legend-sep">·</span>
						<span className="legend-selected">
							{getDisplayName(selectedPerson, language)}
						</span>
					</>
				) : null}
			</footer>
		</div>
	);
};

export default FamilyTree;
