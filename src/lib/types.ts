export interface Program {
	id: string;
	name: string;
	/** "2026-2027" */
	season: string;
	/** ISO dates; empty when not set in Notion */
	start: string;
	end: string;
	/** The pieces in the order they have on the program's page in Notion */
	pieces: string[];
}

export interface Piece {
	id: string;
	name: string;
	composer: string;
	/** Where the sheet music is, as written in Notion: a folder of the GitHub repository, or anything else */
	link: string;
}

export interface Part {
	/** Shown to the members: "Violino II" */
	name: string;
	/** The file name, for downloads */
	file: string;
	/** Address of the PDF on this site */
	href: string;
	/** Ids of the instruments the part is for */
	instruments: string[];
	/** For the instruments the part gives a voice of: `{ flauta: [1, 2] }` for "Flauta I e II" */
	voices: Record<string, number[]>;
	size: number;
}
