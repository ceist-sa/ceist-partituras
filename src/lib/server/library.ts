import { instrumentsOf, partLabel, partName, partOrder, voicesOf } from '$lib/parts';
import type { Part } from '$lib/types';
import { cached } from './cache';
import { listPdfs, parseFolder, rawUrl } from './github';
import { fetchRepertoire } from './notion';

// The library as the site shows it: seasons, their programs, the pieces of each program and the parts of
// each piece, put together from Notion (what is played when) and GitHub (the files).

export interface LibraryPart extends Part {
	/** Where the file itself is */
	source: string;
}

export interface LibraryPiece {
	id: string;
	name: string;
	composer: string;
	parts: LibraryPart[];
	/** The link from Notion when the sheet music is not in the repository (a shared folder, say) */
	elsewhere: string;
}

export interface LibraryProgram {
	id: string;
	name: string;
	season: string;
	start: string;
	end: string;
	pieces: LibraryPiece[];
}

export interface LibrarySeason {
	season: string;
	/** Newest first */
	programs: LibraryProgram[];
	/** Pieces with sheet music in the season's folder that are in no program */
	loose: LibraryPiece[];
}

const collator = new Intl.Collator('pt', { numeric: true });

export async function getLibrary(): Promise<LibrarySeason[]> {
	const { programs, pieces } = await cached('notion', fetchRepertoire);

	const seasonOfFolder = new Map<string, string>();
	const built = new Map<string, LibraryPiece>();
	await Promise.all(
		pieces.map(async (piece) => {
			const folder = parseFolder(piece.link);
			let parts: LibraryPart[] = [];
			let elsewhere = folder ? '' : piece.link;
			if (folder) {
				try {
					const files = await listPdfs(folder);
					// The folder of the piece is the one named "Composer - Work", above "partes"
					const levels = folder.path.split('/').filter((level) => level.toLowerCase() !== 'partes');
					const work = levels[levels.length - 1];
					if (/^\d{4}-\d{4}$/.test(levels[0])) seasonOfFolder.set(piece.id, levels[0]);
					parts = files
						.map((file) => {
							const name = file.path.slice(file.path.lastIndexOf('/') + 1);
							const label = partLabel(name, work);
							const instruments = instrumentsOf(label);
							return {
								name: partName(label),
								file: name,
								href: `/pdf/${[folder.repo, folder.branch, ...file.path.split('/')].map(encodeURIComponent).join('/')}`,
								instruments,
								voices: Object.fromEntries(instruments.map((id) => [id, voicesOf(label, id)]).filter(([, voices]) => voices.length > 0)),
								size: file.size,
								source: rawUrl(folder, file.path)
							};
						})
						.sort((a, b) => partOrder(a.instruments) - partOrder(b.instruments) || collator.compare(a.name, b.name));
				} catch (error) {
					// GitHub out of reach: the members can still follow the link
					console.error(`Could not list the parts of ${piece.name}:`, error);
					elsewhere = piece.link;
				}
			}
			built.set(piece.id, { id: piece.id, name: piece.name, composer: piece.composer, parts, elsewhere });
		})
	);

	const inPrograms = new Set(programs.flatMap((program) => program.pieces));
	const seasons = [...new Set([...programs.map((program) => program.season), ...seasonOfFolder.values()])].filter(Boolean);

	return seasons
		.sort()
		.reverse()
		.map((season) => ({
			season,
			programs: programs
				.filter((program) => program.season === season && program.pieces.length > 0)
				.sort((a, b) => b.start.localeCompare(a.start))
				.map((program) => ({
					id: program.id,
					name: program.name,
					season: program.season,
					start: program.start,
					end: program.end,
					pieces: program.pieces.map((piece) => built.get(piece)).filter((piece) => piece !== undefined)
				})),
			loose: pieces
				.filter((piece) => !inPrograms.has(piece.id) && seasonOfFolder.get(piece.id) === season)
				.map((piece) => built.get(piece.id)!)
				.filter((piece) => piece.parts.length > 0)
		}))
		.filter((season) => season.programs.length > 0 || season.loose.length > 0);
}

/** Today's date in Lisbon, as in Notion's dates */
export function today(): string {
	return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Lisbon' }).format(new Date());
}

/** The program being rehearsed: the one whose dates include today, else the last one to have started */
export function currentProgram(seasons: LibrarySeason[]): LibraryProgram | undefined {
	const now = today();
	const started = seasons
		.flatMap((season) => season.programs)
		.filter((program) => program.start && program.start <= now)
		.sort((a, b) => b.start.localeCompare(a.start));
	return started.find((program) => !program.end || program.end >= now) ?? started[0];
}

/**
 * The parts of a piece for an instrument; all of them for "tudo". With a voice, the parts of that voice and
 * the ones that are for every voice.
 */
export function partsFor<T extends Part>(parts: T[], instrument: string, voice?: number): T[] {
	if (instrument === 'tudo') return parts;
	return parts.filter((part) => {
		if (!part.instruments.includes(instrument)) return false;
		const voices = part.voices[instrument];
		return !voice || !voices || voices.includes(voice);
	});
}
