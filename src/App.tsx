import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import FamilyTree from "./features/family-tree/ui/FamilyTree";

const FAMILY_GATE_KEY = "hekal_family_gate_v1";

const GATE_CONFIG = {
	promptAr: "ما اسم جدة العائلة زوجة أحمد هيكل؟",
	promptEn: "What is the name of the family matriarch at the root of this branch?",
	acceptedAnswers: ["وهيبة", "waheeba", "wahiba", "waheba"],
};

const normalizeAnswer = (value: string) =>
	value.trim().toLowerCase().replace(/\s+/g, " ");

const App = () => {
	const [answer, setAnswer] = useState("");
	const [isUnlocked, setIsUnlocked] = useState(
		() =>
			typeof window !== "undefined" &&
			window.localStorage.getItem(FAMILY_GATE_KEY) === "open",
	);
	const [isShaking, setIsShaking] = useState(false);
	const [showHint, setShowHint] = useState(false);

	const acceptedAnswers = useMemo(
		() => GATE_CONFIG.acceptedAnswers.map((item) => normalizeAnswer(item)),
		[],
	);

	useEffect(() => {
		if (!isShaking) {
			return;
		}

		const timeoutId = window.setTimeout(() => setIsShaking(false), 450);
		return () => window.clearTimeout(timeoutId);
	}, [isShaking]);

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		const normalized = normalizeAnswer(answer);
		if (!acceptedAnswers.includes(normalized)) {
			setIsShaking(true);
			return;
		}

		window.localStorage.setItem(FAMILY_GATE_KEY, "open");
		setIsUnlocked(true);
	};

	const handleLock = () => {
		window.localStorage.removeItem(FAMILY_GATE_KEY);
		setAnswer("");
		setShowHint(false);
		setIsUnlocked(false);
	};

	if (isUnlocked) {
		return <FamilyTree onLock={handleLock} />;
	}

	return (
		<div className="gate-shell">
			<div aria-hidden="true" className="gate-backdrop" />

			<div className="gate-panel-wrap">
				<section className={`gate-panel${isShaking ? " is-shaking" : ""}`}>
					<div className="gate-crest">
						<svg aria-hidden="true" viewBox="0 0 40 40">
							<g fill="none" stroke="currentColor" strokeWidth="1.2">
								<circle cx="20" cy="20" r="18" />
								<circle cx="20" cy="20" r="12" />
								<path d="M20 2 L38 20 L20 38 L2 20 Z" />
								<path d="M20 8 L32 20 L20 32 L8 20 Z" />
							</g>
						</svg>
					</div>

					<p className="gate-kicker">Private Family Invitation</p>
					<h1 className="gate-title">The Hekal Family Archive</h1>
					<p className="gate-copy">
						مساحة خاصة للعائلة للدخول إلى الشجرة التفاعلية والذكريات المشتركة
					</p>

					<div className="gate-question">
						<strong>{GATE_CONFIG.promptAr}</strong>
						<span>{GATE_CONFIG.promptEn}</span>
					</div>

					<form className="gate-form" onSubmit={handleSubmit}>
						<input
							autoComplete="off"
							className="gate-input"
							onChange={(event) => setAnswer(event.target.value)}
							placeholder="اكتب الإجابة أو الاسم السري"
							type="text"
							value={answer}
						/>

						<button className="gate-submit" type="submit">
							Enter the Tree
						</button>
					</form>

					<div className="gate-footer">
						<button
							className="gate-hint"
							onClick={() => setShowHint((current) => !current)}
							type="button"
						>
							{showHint ? "Hide family hint" : "Need a family hint?"}
						</button>

						{showHint ? (
							<p className="gate-hint-copy">
								الإجابة هي اسم الجدة الكبرى المكتوب في بداية الشجرة.
							</p>
						) : null}
					</div>
				</section>
			</div>
		</div>
	);
};

export default App;
