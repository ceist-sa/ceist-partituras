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
 * to low, percussion, harp, keyboards and choir. Each family includes its relatives (the piccolo with the
 * flutes, the bass clarinet with the clarinets), which the same players take.
 */
export const INSTRUMENTS: Instrument[] = [
	{ id: 'geral', name: 'Maestro', pattern: /GERAL|CONDUCTOR|SCORE|MAESTRO/ },
	{ id: 'violino', name: 'Violino', pattern: /VIOLIN/ },
	{ id: 'viola', name: 'Viola', pattern: /VIOLA/ },
	{ id: 'violoncelo', name: 'Violoncelo', pattern: /CELL|VIOLONCEL/ },
	{ id: 'contrabaixo', name: 'Contrabaixo', pattern: /\bBASS(?:ES)?\b|CONTRABAIX|CONTRABASS\b/ },
	{ id: 'flauta', name: 'Flauta', pattern: /FLUT|FLAUT|PICCOLO/ },
	{ id: 'oboe', name: 'Oboé', pattern: /OBOE|CORNEINGLES/ },
	{ id: 'clarinete', name: 'Clarinete', pattern: /CLARINET|CORNODEBASSETO/ },
	{ id: 'fagote', name: 'Fagote', pattern: /BASSOON|BASSON|FAGOTE/ },
	{ id: 'trompete', name: 'Trompete', pattern: /TRUMPET|TROMPETE|CORNET/ },
	{ id: 'trompa', name: 'Trompa', pattern: /\bHORNS?\b|TROMPA/ },
	{ id: 'trombone', name: 'Trombone', pattern: /TROMBONE/ },
	{ id: 'eufonio', name: 'Eufónio', pattern: /EUFONIO|EUPHONIUM/ },
	{ id: 'tuba', name: 'Tuba', pattern: /\bTUBAS?\b/ },
	{
		id: 'percussao',
		name: 'Percussão',
		pattern: /PERCUS|TIMPAN|TIMBAL|DRUM|BOMBO|\bCAIXA\b|CYMBAL|\bPRATOS?\b|TRIANG|PANDEIRETA|TAMBOURINE|GLOCKENSPIEL|XYLOPHON|XILOFONE|MARIMBA|VIBRAPHON|VIBRAFONE|\bGONG\b|TAM-?TAM|\bBELLS\b|\bSINOS\b/
	},
	{ id: 'harpa', name: 'Harpa', pattern: /\bHARPS?\b|HARPA/ },
	{ id: 'teclas', name: 'Piano e cravo', pattern: /PIANO|CRAVO|HARPSICHORD|ORGAN|ORGAO|CELEST/ },
	{ id: 'coro', name: 'Coro', pattern: /\bCORO\b|CHOIR|CHORUS/ }
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
	const text = canonical(label);
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

/** Names of more than one word, made into one so that "BASS CLARINET" is not read as a double bass */
const PHRASES: [RegExp, string][] = [
	[/\b(?:DOUBLE BASSOON|CONTRA ?BASSOON|CONTRA FAGOTE)S?\b/g, 'CONTRAFAGOTE'],
	[/\bDOUBLE BASS(?:ES)?\b/g, 'CONTRABAIXO'],
	[/\bBASS CLARINET\b|\bCLARINETE BAIXO\b/g, 'CLARINETEBAIXO'],
	[/\bBASS TROMBONE\b|\bTROMBONE BAIXO\b/g, 'TROMBONEBAIXO'],
	[/\bBASS DRUM\b/g, 'BOMBO'],
	[/\bSNARE DRUM\b/g, 'CAIXA'],
	[/\bBASSET HORNS?\b/g, 'CORNODEBASSETO'],
	[/\bENGLISH HORN\b|\bCOR ANGLAIS\b|\bCORNE INGLES\b/g, 'CORNEINGLES'],
	[/\bFRENCH HORN/g, 'HORN'],
	[/\bMEZZOSOPRANO CLEF\b/g, 'CLAVEMEZZO'],
	// MuseScore puts the key and "solo" first, and writes "Clarinet in Bb"
	[/^(BB|EB|SOLO) ([A-Z]+)/, '$2 $1'],
	[/\bIN (?=(?:BB|EB|A|F)\b)/g, ''],
	[/\bV ?(\d)\b/g, 'VERSAO $1']
];

/** The label in capitals and without accents, with the names of more than one word made into one */
function canonical(label: string): string {
	let text = plain(label);
	for (const [pattern, replacement] of PHRASES) {
		text = text.replace(pattern, replacement);
	}
	return text;
}

const NUMERALS: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4 };
const VOICE = '(?:IV|I{1,3}|[1-6])';

/**
 * Which voices of an instrument a part is for: 1 and 2 for `FLUTE I & II` and the flute. None when the part
 * doesn't say, as in `VIOLA` or in `VIOLA (VIOLIN - TRANSPOSED)` for the violin: such a part is for everyone
 * who plays the instrument.
 */
export function voicesOf(label: string, id: string): number[] {
	const instrument = instrumentById(id);
	if (!instrument) return [];
	const numbered = new RegExp(
		`(?:${instrument.pattern.source})[A-Z]*(?: (?:BB|EB|A|F))? (${VOICE}(?:(?: ?[&,] ?| E | AND )${VOICE})*)(?![A-Z0-9])`,
		'g'
	);
	const voices = new Set<number>();
	for (const match of canonical(label).matchAll(numbered)) {
		for (const numeral of match[1].match(/IV|I{1,3}|[1-6]/g) ?? []) {
			voices.add(NUMERALS[numeral] ?? Number(numeral));
		}
	}
	return [...voices].sort();
}

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
	TROMPAS: 'Trompas',
	HORN: 'Trompa',
	HORNS: 'Trompas',
	TROMPETE: 'Trompete',
	TROMPETES: 'Trompetes',
	CORNET: 'Cornetim',
	TROMBONES: 'Trombones',
	TROMBONEBAIXO: 'Trombone baixo',
	TUBA: 'Tuba',
	CLARINETEBAIXO: 'Clarinete baixo',
	CORNODEBASSETO: 'Corno de basseto',
	CONTRAFAGOTE: 'Contrafagote',
	FLAUTIM: 'Flautim',
	SAXOPHONE: 'Saxofone',
	SAXOFONE: 'Saxofone',
	BASSES: 'Contrabaixos',
	CONTRABAIXOS: 'Contrabaixos',
	CONTRABASS: 'Contrabaixo',
	HARP: 'Harpa',
	HARPA: 'Harpa',
	ORGAN: 'Órgão',
	ORGAO: 'Órgão',
	CELESTA: 'Celesta',
	CELESTE: 'Celesta',
	TIMPANI: 'Tímpanos',
	TIMPANOS: 'Tímpanos',
	PERCUSSION: 'Percussão',
	PERCUSSAO: 'Percussão',
	BOMBO: 'Bombo',
	CAIXA: 'Caixa',
	CYMBALS: 'Pratos',
	PRATOS: 'Pratos',
	TRIANGLE: 'Triângulo',
	TRIANGULO: 'Triângulo',
	TAMBOURINE: 'Pandeireta',
	GLOCKENSPIEL: 'Glockenspiel',
	XYLOPHONE: 'Xilofone',
	XILOFONE: 'Xilofone',
	CHOIR: 'Coro',
	CHORUS: 'Coro',
	STRINGS: 'Arcos',
	SCORE: 'Partitura geral',
	MAESTRO: 'Partitura geral',
	AND: 'e',
	A: 'em Lá',
	F: 'em Fá',
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

/** "Violino II" for the second voice of the violins */
export function voiceName(instrument: Instrument, voice: number): string {
	return `${instrument.name} ${ROMAN[voice] ?? voice}`;
}

/**
 * The label as shown to the members, in Portuguese whatever the language of the file:
 * "Trompa I (Clarinete em Sib)" for `FRENCH HORN I (CLARINET Bb)`.
 */
export function partName(label: string): string {
	const text = canonical(label);
	if (!text) return 'Partitura geral';

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
