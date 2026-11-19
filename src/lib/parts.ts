// Reading the file names of the parts. The convention of the sheet music repository is
// `INSTRUMENT - Composer - Work.pdf`, with the instrument in capitals and in English, roman numerals for
// the desks (VIOLIN II) and, in brackets, who else the part is for: `FRENCH HORN I (CLARINET Bb)` is the
// horn part written out for a clarinet. Older files put the instrument last, use Portuguese names, or join
// everything with hyphens; all of those are read too.

export interface Instrument {
	id: string;
	name: string;
	/** Matched against the label in capitals and without accents */
	pattern: RegExp;
}

/**
 * In the order the parts of a piece are listed: the full score, then strings, woodwinds and brass from high
 * to low, percussion, keyboards and choir
 */
export const INSTRUMENTS: Instrument[] = [
	{ id: 'geral', name: 'Maestro', pattern: /GERAL|CONDUCTOR|SCORE/ },
	{ id: 'violino', name: 'Violino', pattern: /VIOLIN/ },
	{ id: 'viola', name: 'Viola', pattern: /VIOLA/ },
	{ id: 'violoncelo', name: 'Violoncelo', pattern: /CELL|VIOLONCEL/ },
	{ id: 'contrabaixo', name: 'Contrabaixo', pattern: /\bBASS\b|CONTRABAIX/ },
	{ id: 'flauta', name: 'Flauta', pattern: /FLUT|FLAUT|PICCOLO/ },
	{ id: 'oboe', name: 'Oboé', pattern: /OBOE|ENGLISH HORN|CORNE/ },
	{ id: 'clarinete', name: 'Clarinete', pattern: /CLARINET/ },
	{ id: 'fagote', name: 'Fagote', pattern: /BASSOON|BASSON|FAGOTE/ },
	{ id: 'trompete', name: 'Trompete', pattern: /TRUMPET|TROMPETE/ },
	{ id: 'trompa', name: 'Trompa', pattern: /FRENCH HORN|TROMPA/ },
	{ id: 'trombone', name: 'Trombone', pattern: /TROMBONE/ },
	{ id: 'eufonio', name: 'Eufónio', pattern: /EUFONIO|EUPHONIUM/ },
	{ id: 'percussao', name: 'Percussão', pattern: /PANDEIRETA|PERCUS|TIMPAN/ },
	{ id: 'teclas', name: 'Piano e cravo', pattern: /PIANO|CRAVO|HARPSICHORD/ },
	{ id: 'coro', name: 'Coro', pattern: /\bCORO\b|CHOIR/ }
];

const STRINGS = ['violino', 'viola', 'violoncelo', 'contrabaixo'];

export function instrumentById(id: string | undefined): Instrument | undefined {
	return INSTRUMENTS.find((instrument) => instrument.id === id);
}

/** Capitals without accents, with `VIOLINO1` and `Bb_Clarinet` split into words */
function plain(text: string): string {
	return text
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toUpperCase()
		.replace(/_/g, ' ')
		.replace(/([A-Z]{2,})(\d)/g, '$1 $2')
		.replace(/\s+/g, ' ')
		.trim();
}

/**
 * What a file name says besides the composer and the work, which are the name of the folder of the piece:
 * `VIOLA (VIOLIN - TRANSPOSED)` for `Grieg - Suite Holberg - VIOLA (VIOLIN - TRANSPOSED).pdf` in the
 * folder `Grieg - Suite Holberg`. Empty when the file is named after the work alone.
 */
export function partLabel(file: string, folder: string): string {
	const base = file.replace(/(\.pdf)+$/i, '').trim();
	const known = folder.split(' - ').map(plain);

	if (base.includes(' - ')) {
		// Brackets may hold " - " too, so the cuts are only made outside them
		const pieces: string[] = [];
		let depth = 0;
		let current = '';
		for (let i = 0; i < base.length; i++) {
			if (base[i] === '(') depth++;
			if (base[i] === ')') depth = Math.max(0, depth - 1);
			if (depth === 0 && base.startsWith(' - ', i)) {
				pieces.push(current);
				current = '';
				i += 2;
			} else {
				current += base[i];
			}
		}
		pieces.push(current);

		return pieces
			.map((piece) => piece.trim())
			.map((piece) => {
				const name = plain(piece);
				for (const part of known) {
					// The work, whole or cut short ("Brandenburg " for "Brandenburg 2")
					if (name === part || (name.length >= 4 && part.startsWith(name))) return '';
					// The work with something stuck to it ("…violoncelos-Harpsichord")
					if (part.length >= 4 && name.startsWith(part)) return piece.slice(part.length).replace(/^[\s-]+/, '');
				}
				return piece;
			})
			.filter(Boolean)
			.join(' - ');
	}

	if (base.includes('-')) {
		// `VIOLINO1-COM-OBOE3-Oratoria-de-Natal…`: the words in capitals that come first
		const words = base.split('-');
		const lead: string[] = [];
		for (const word of words) {
			const capitals = word === word.toUpperCase() && /\p{Lu}/u.test(word);
			if (capitals || (lead.length > 0 && /^\d+$/.test(word))) lead.push(word);
			else break;
		}
		if (lead.length > 0) return lead.join(' ');
		// `inverno_arranjo_ceist-Bb_Clarinet`: MuseScore's export, with the part last
		return words[words.length - 1].replace(/_/g, ' ').trim();
	}

	return '';
}

/**
 * The instruments a part is for: every one its label names, in or out of brackets. A file without a label
 * is the full score.
 */
export function instrumentsOf(label: string): string[] {
	const text = plain(label);
	if (!text) return ['geral'];
	// In the order the label names them: the part is first of all for the first one
	const found = INSTRUMENTS.map((instrument) => ({ id: instrument.id, at: text.search(instrument.pattern) }))
		.filter((match) => match.at >= 0)
		.sort((a, b) => a.at - b.at)
		.map((match) => match.id);
	// "ARCOS" alone is one part for all the strings
	if (/\bARCOS\b|\bSTRINGS\b/.test(text) && !found.some((id) => STRINGS.includes(id))) {
		found.push(...STRINGS);
	}
	return found;
}

const PHRASES: [RegExp, string][] = [
	[/\bDOUBLE BASS\b/g, 'CONTRABAIXO'],
	[/\bFRENCH HORN\b/g, 'TROMPA'],
	[/\bENGLISH HORN\b/g, 'CORNEINGLES'],
	[/\bMEZZOSOPRANO CLEF\b/g, 'CLAVEMEZZO'],
	// MuseScore puts the key and "solo" first
	[/^(BB|EB|SOLO) ([A-Z]+)/, '$2 $1'],
	[/\bV ?(\d)\b/g, 'VERSAO $1']
];

const WORDS: Record<string, string> = {
	VIOLIN: 'Violino',
	VIOLINS: 'Violinos',
	VIOLINO: 'Violino',
	VIOLINOS: 'Violinos',
	VIOLA: 'Viola',
	VIOLAS: 'Violas',
	CELLO: 'Violoncelo',
	CELLI: 'Violoncelos',
	CELLOS: 'Violoncelos',
	VIOLONCELO: 'Violoncelo',
	VIOLONCELLO: 'Violoncelo',
	BASS: 'Contrabaixo',
	CONTRABAIXO: 'Contrabaixo',
	FLUTE: 'Flauta',
	FLUTES: 'Flautas',
	FLAUTA: 'Flauta',
	FLAUTAS: 'Flautas',
	PICCOLO: 'Flautim',
	OBOE: 'Oboé',
	OBOES: 'Oboés',
	CORNEINGLES: 'Corne inglês',
	CLARINET: 'Clarinete',
	CLARINETS: 'Clarinetes',
	CLARINETE: 'Clarinete',
	CLARINETES: 'Clarinetes',
	BASSOON: 'Fagote',
	BASSOONS: 'Fagotes',
	BASSONS: 'Fagotes',
	FAGOTE: 'Fagote',
	FAGOTES: 'Fagotes',
	TROMPA: 'Trompa',
	TRUMPET: 'Trompete',
	TRUMPETS: 'Trompetes',
	TROMBONE: 'Trombone',
	EUFONIO: 'Eufónio',
	EUPHONIUM: 'Eufónio',
	PIANO: 'Piano',
	CRAVO: 'Cravo',
	HARPSICHORD: 'Cravo',
	PANDEIRETA: 'Pandeireta',
	CORO: 'Coro',
	ARCOS: 'Arcos',
	GERAL: 'Partitura geral',
	CONDUCTOR: 'Partitura geral',
	SOLO: 'solo',
	TRANSPOSED: 'transposto',
	CLAVEMEZZO: 'clave de mezzo-soprano',
	VERSAO: 'versão',
	COM: 'com',
	E: 'e',
	BB: 'em Sib',
	EB: 'em Mib',
	I: 'I',
	II: 'II',
	III: 'III',
	IV: 'IV'
};

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI'];

/**
 * The label as shown to the members, in Portuguese whatever the language of the file:
 * "Trompa I (Clarinete em Sib)" for `FRENCH HORN I (CLARINET Bb)`.
 */
export function partName(label: string): string {
	let text = plain(label);
	if (!text) return 'Partitura geral';
	for (const [pattern, replacement] of PHRASES) {
		text = text.replace(pattern, replacement);
	}

	let previous = '';
	const name = text
		.replace(/ - /g, ', ')
		.replace(/(?<=[A-Z])-(?=[A-Z])/g, ' ')
		.replace(/,(?=\S)/g, ', ')
		.replace(/[A-Z]+\d*|\d+/g, (word) => {
			let shown: string;
			if (/^\d+$/.test(word)) {
				// Desks in roman numerals, as the convention asks; versions keep their number
				shown = previous === 'VERSAO' ? word : (ROMAN[Number(word)] ?? word);
			} else if (/^A\d$/.test(word)) {
				shown = word;
			} else {
				shown = WORDS[word] ?? word.charAt(0) + word.slice(1).toLowerCase();
			}
			previous = word;
			return shown;
		})
		.replace(/ & /g, ' e ');
	return name.charAt(0).toUpperCase() + name.slice(1);
}

/**
 * Position of a part in the list of a piece: that of the instrument it is first of all for, so that a horn
 * part written out for clarinet stays with the horns. Parts for no known instrument go last.
 */
export function partOrder(instruments: string[]): number {
	const position = INSTRUMENTS.findIndex((instrument) => instrument.id === instruments[0]);
	return position >= 0 ? position : INSTRUMENTS.length;
}
