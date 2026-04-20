import { useEffect, useState } from "react";
import type { FamilyData, Language, Person } from "../../../types/family";
import {
	getChildrenOf,
	getCouplesOf,
	getDisplayName,
	getLifeLine,
	getParentsOf,
	getPerson,
	getPersonInitials,
	isMarriedIn,
} from "../lib/tree";

interface DetailDrawerProps {
	data: FamilyData;
	language: Language;
	personId: string | null;
	isEditing: boolean;
	onClose: () => void;
	onSelect: (personId: string) => void;
	onToggleEditing: () => void;
	onUpdatePerson: (personId: string, updates: Partial<Person>) => void;
}

interface PersonDraft {
	ar: string;
	en: string;
	gender: "m" | "f";
	birth: string;
	death: string;
	location: string;
	branch: string;
	notes: string;
}

const toDraft = (person: Person | undefined): PersonDraft => ({
	ar: person?.ar ?? "",
	en: person?.en ?? "",
	gender: person?.gender === "f" ? "f" : "m",
	birth: person?.birth ?? "",
	death: person?.death ?? "",
	location: person?.location ?? "",
	branch: person?.branch ?? "",
	notes: person?.notes ?? person?.note ?? person?.bio ?? "",
});

const getRelationLabel = (
	type: "parent" | "spouse" | "child",
	personGender: "m" | "f" | undefined,
	language: Language,
) => {
	if (type === "spouse") {
		return language === "ar" ? "الشريك" : "Spouse";
	}

	if (type === "parent") {
		if (language === "ar") {
			return personGender === "f" ? "الأم" : "الأب";
		}

		return personGender === "f" ? "Mother" : "Father";
	}

	if (language === "ar") {
		return personGender === "f" ? "الابنة" : "الابن";
	}

	return personGender === "f" ? "Daughter" : "Son";
};

const DetailDrawer = ({
	data,
	language,
	personId,
	isEditing,
	onClose,
	onSelect,
	onToggleEditing,
	onUpdatePerson,
}: DetailDrawerProps) => {
	const person = personId ? getPerson(data, personId) : undefined;
	const [draft, setDraft] = useState<PersonDraft>(() => toDraft(person));

	useEffect(() => {
		if (!personId) {
			return;
		}

		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				onClose();
			}
		};

		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [onClose, personId]);

	if (!personId || !person) {
		return null;
	}

	const parents = getParentsOf(data, personId);
	const spouses = getCouplesOf(data, personId)
		.map((couple) => (couple.a === personId ? couple.b : couple.a))
		.filter(Boolean) as string[];
	const children = getChildrenOf(data, personId);
	const lifeLine = getLifeLine(person, language);
	const notes = person.notes || person.note || person.bio || "";
	const hasUnsavedChanges =
		draft.ar !== (person.ar ?? "") ||
		draft.en !== (person.en ?? "") ||
		draft.gender !== (person.gender === "f" ? "f" : "m") ||
		draft.birth !== (person.birth ?? "") ||
		draft.death !== (person.death ?? "") ||
		draft.location !== (person.location ?? "") ||
		draft.branch !== (person.branch ?? "") ||
		draft.notes !== (person.notes ?? person.note ?? person.bio ?? "");

	const updateDraft = <K extends keyof PersonDraft>(key: K, value: PersonDraft[K]) => {
		setDraft((current) => ({ ...current, [key]: value }));
	};

	const saveDraft = () => {
		onUpdatePerson(personId, {
			ar: draft.ar.trim(),
			en: draft.en.trim(),
			gender: draft.gender,
			birth: draft.birth.trim(),
			death: draft.death.trim(),
			location: draft.location.trim(),
			branch: draft.branch.trim(),
			notes: draft.notes.trim(),
			note: draft.notes.trim(),
			bio: draft.notes.trim(),
		});
		onToggleEditing();
	};

	const cancelDraft = () => {
		setDraft(toDraft(person));
		if (isEditing) {
			onToggleEditing();
		}
	};

	const renderTextField = (
		labelAr: string,
		labelEn: string,
		value: string,
		onChange: (nextValue: string) => void,
		placeholderAr: string,
		placeholderEn: string,
		multiline = false,
	) => (
		<div className="dr-field">
			<label>{language === "ar" ? labelAr : labelEn}</label>
			{isEditing ? (
				multiline ? (
					<textarea
						className="dr-input dr-textarea"
						onChange={(event) => onChange(event.target.value)}
						placeholder={language === "ar" ? placeholderAr : placeholderEn}
						rows={4}
						value={value}
					/>
				) : (
					<input
						className="dr-input"
						onChange={(event) => onChange(event.target.value)}
						placeholder={language === "ar" ? placeholderAr : placeholderEn}
						type="text"
						value={value}
					/>
				)
			) : (
				<div className={`val${value ? "" : " empty"}`}>
					{value ||
						(language === "ar" ? "غير متاح" : "Not set")}
				</div>
			)}
		</div>
	);

	return (
		<aside className="drawer">
			<button
				aria-label={language === "ar" ? "إغلاق" : "Close"}
				className="drawer-scrim"
				onClick={onClose}
				type="button"
			/>

			<div className="drawer-card">
				<button
					aria-label={language === "ar" ? "إغلاق" : "Close"}
					className="drawer-close"
					onClick={onClose}
					type="button"
				>
					×
				</button>

				<div className="drawer-body">
					<div className="dr-header">
						<div className="dr-avatar" data-gender={person.gender ?? "m"}>
							{getPersonInitials(person, language)}
						</div>

						<div>
							<h2 className="dr-name-ar">{person.ar || "—"}</h2>
							<div className="dr-name-en">{person.en || "—"}</div>
						</div>

						<div className="dr-chip-row">
							{isMarriedIn(data, personId) ? (
								<span className="dr-chip">
									{language === "ar" ? "زواج" : "Married-in"}
								</span>
							) : null}

							{lifeLine ? <span className="dr-chip">{lifeLine}</span> : null}
						</div>

						<div className="dr-actions">
							<button className="btn ghost" onClick={onToggleEditing} type="button">
								{isEditing
									? language === "ar"
										? "عرض"
										: "View"
									: language === "ar"
										? "تعديل"
										: "Edit"}
							</button>

							{isEditing ? (
								<>
									<button className="btn ghost" onClick={cancelDraft} type="button">
										{language === "ar" ? "إلغاء" : "Cancel"}
									</button>
									<button
										className="btn primary"
										disabled={!hasUnsavedChanges}
										onClick={saveDraft}
										type="button"
									>
										{language === "ar" ? "حفظ" : "Save"}
									</button>
								</>
							) : null}
						</div>

						{isEditing ? (
							<p className="dr-edit-note">
								{language === "ar"
									? "التعديلات تتحفظ محليًا على جهازك، وتقدر تصدر الملف بعد التحديث."
									: "Edits are saved locally on this device, and you can export the updated JSON afterward."}
							</p>
						) : null}
					</div>

					<div className="dr-section">
						<h4>{language === "ar" ? "البيانات" : "Details"}</h4>

						{renderTextField(
							"الاسم بالعربية",
							"Arabic name",
							isEditing ? draft.ar : person.ar || "",
							(nextValue) => updateDraft("ar", nextValue),
							"اكتب الاسم بالعربية",
							"Enter the Arabic name",
						)}

						{renderTextField(
							"الاسم بالإنجليزية",
							"English name",
							isEditing ? draft.en : person.en || "",
							(nextValue) => updateDraft("en", nextValue),
							"اكتب الاسم بالإنجليزية",
							"Enter the English name",
						)}

						<div className="dr-field">
							<label>{language === "ar" ? "النوع" : "Gender"}</label>
							{isEditing ? (
								<select
									className="dr-input"
									onChange={(event) =>
										updateDraft("gender", event.target.value as "m" | "f")
									}
									value={draft.gender}
								>
									<option value="m">{language === "ar" ? "ذكر" : "Male"}</option>
									<option value="f">{language === "ar" ? "أنثى" : "Female"}</option>
								</select>
							) : (
								<div className="val">
									{person.gender === "f"
										? language === "ar"
											? "أنثى"
											: "Female"
										: language === "ar"
											? "ذكر"
											: "Male"}
								</div>
							)}
						</div>

						{renderTextField(
							"تاريخ الميلاد",
							"Birth date",
							isEditing ? draft.birth : person.birth || "",
							(nextValue) => updateDraft("birth", nextValue),
							"مثال: 12-05-1988",
							"Example: 12-05-1988",
						)}

						{renderTextField(
							"تاريخ الوفاة",
							"Death date",
							isEditing ? draft.death : person.death || "",
							(nextValue) => updateDraft("death", nextValue),
							"اكتب التاريخ لو موجود",
							"Enter a date if applicable",
						)}

						{renderTextField(
							"المكان",
							"Location",
							isEditing ? draft.location : person.location || "",
							(nextValue) => updateDraft("location", nextValue),
							"مثال: القاهرة",
							"Example: Cairo",
						)}

						{renderTextField(
							"الفرع",
							"Branch",
							isEditing ? draft.branch : person.branch || "",
							(nextValue) => updateDraft("branch", nextValue),
							"مثال: فرع محمد",
							"Example: Mohamed branch",
						)}

						{renderTextField(
							"ملاحظات",
							"Notes",
							isEditing ? draft.notes : notes,
							(nextValue) => updateDraft("notes", nextValue),
							"اكتب أي ملحوظة مفيدة",
							"Add any helpful note",
							true,
						)}
					</div>

					{parents.length > 0 ? (
						<div className="dr-section">
							<h4>{language === "ar" ? "الوالدان" : "Parents"}</h4>
							<div className="dr-relations">
								{parents.map((relativeId) => {
									const relative = getPerson(data, relativeId);
									return (
										<button
											className="dr-rel"
											key={relativeId}
											onClick={() => onSelect(relativeId)}
											type="button"
										>
											<div className="rel-av" data-g={relative?.gender ?? "m"}>
												{getPersonInitials(relative, language)}
											</div>

											<div className="rel-copy">
												<div className="rel-role">
													{getRelationLabel("parent", relative?.gender, language)}
												</div>
												<div className="rel-name">
													{getDisplayName(relative, language)}
												</div>
											</div>
										</button>
									);
								})}
							</div>
						</div>
					) : null}

					{spouses.length > 0 ? (
						<div className="dr-section">
							<h4>{language === "ar" ? "الزوج أو الزوجة" : "Spouse"}</h4>
							<div className="dr-relations">
								{spouses.map((relativeId) => {
									const relative = getPerson(data, relativeId);
									return (
										<button
											className="dr-rel"
											key={relativeId}
											onClick={() => onSelect(relativeId)}
											type="button"
										>
											<div className="rel-av" data-g={relative?.gender ?? "m"}>
												{getPersonInitials(relative, language)}
											</div>

											<div className="rel-copy">
												<div className="rel-role">
													{getRelationLabel("spouse", relative?.gender, language)}
												</div>
												<div className="rel-name">
													{getDisplayName(relative, language)}
												</div>
											</div>
										</button>
									);
								})}
							</div>
						</div>
					) : null}

					{children.length > 0 ? (
						<div className="dr-section">
							<h4>{language === "ar" ? "الأبناء" : "Children"}</h4>
							<div className="dr-relations">
								{children.map((relativeId) => {
									const relative = getPerson(data, relativeId);
									return (
										<button
											className="dr-rel"
											key={relativeId}
											onClick={() => onSelect(relativeId)}
											type="button"
										>
											<div className="rel-av" data-g={relative?.gender ?? "m"}>
												{getPersonInitials(relative, language)}
											</div>

											<div className="rel-copy">
												<div className="rel-role">
													{getRelationLabel("child", relative?.gender, language)}
												</div>
												<div className="rel-name">
													{getDisplayName(relative, language)}
												</div>
											</div>
										</button>
									);
								})}
							</div>
						</div>
					) : null}
				</div>
			</div>
		</aside>
	);
};

export default DetailDrawer;
