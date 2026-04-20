export type Gender = "m" | "f";
export type Language = "ar" | "en";

export interface Person {
	ar?: string;
	en?: string;
	gender?: Gender;
	birth?: string;
	death?: string;
	note?: string;
	photo?: string;
	bio?: string;
	location?: string;
	branch?: string;
	notes?: string;
}

export interface Couple {
	id: string;
	a: string | null;
	b: string | null;
	children?: string[];
}

export interface FamilyData {
	root: [string, string];
	people: Record<string, Person>;
	couples: Couple[];
}
