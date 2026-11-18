import { env } from '$env/dynamic/private';
import type { Piece, Program } from '$lib/types';
import sample from './sample.json';

// The programs and the repertoire live in Notion: each piece of "Repertório" is related to the programs it
// was played in and has the link to its sheet music. Without a token, the sample repertoire is used.

const API = 'https://api.notion.com/v1';

/* eslint-disable @typescript-eslint/no-explicit-any */
async function query(database: string): Promise<any[]> {
	const pages: any[] = [];
	let cursor: string | undefined;
	do {
		const response = await fetch(`${API}/databases/${database}/query`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${env.NOTION_TOKEN}`,
				'Notion-Version': '2022-06-28',
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ page_size: 100, start_cursor: cursor })
		});
		if (!response.ok) {
			const hint = response.status === 404 ? ' (is the database shared with the integration?)' : '';
			throw new Error(`Notion answered ${response.status} for database ${database}${hint}`);
		}
		const body = await response.json();
		pages.push(...body.results);
		cursor = body.has_more ? body.next_cursor : undefined;
	} while (cursor);
	return pages;
}

const id = (value: string) => value.replace(/-/g, '');
const text = (property: any): string =>
	(property?.title ?? property?.rich_text ?? []).map((part: any) => part.plain_text).join('').trim();
const related = (property: any): string[] => (property?.relation ?? []).map((item: any) => id(item.id));

export async function fetchRepertoire(): Promise<{ programs: Program[]; pieces: Piece[] }> {
	if (!env.NOTION_TOKEN) {
		return sample;
	}
	if (!env.NOTION_PROGRAMS_DB || !env.NOTION_REPERTOIRE_DB) {
		throw new Error('NOTION_PROGRAMS_DB and NOTION_REPERTOIRE_DB must be set');
	}
	const [programPages, piecePages] = await Promise.all([query(env.NOTION_PROGRAMS_DB), query(env.NOTION_REPERTOIRE_DB)]);

	const pieces: Piece[] = piecePages.map((page) => ({
		id: id(page.id),
		name: text(page.properties['Nome']),
		composer: page.properties['Compositor']?.select?.name ?? '',
		link: page.properties['Partituras']?.url ?? ''
	}));

	const programs: Program[] = programPages.map((page) => {
		const programId = id(page.id);
		// The order comes from the program's side of the relation; the piece's side is the one that counts
		// for belonging, as it is never cut short by Notion
		const ordered = related(page.properties['Repertório']);
		const members = piecePages.filter((piece) => related(piece.properties['Programas']).includes(programId)).map((piece) => id(piece.id));
		const position = (piece: string) => (ordered.includes(piece) ? ordered.indexOf(piece) : ordered.length);
		return {
			id: programId,
			name: text(page.properties['Nome']),
			season: page.properties['Temporada']?.select?.name ?? '',
			start: page.properties['Início']?.date?.start?.slice(0, 10) ?? '',
			end: page.properties['Fim']?.date?.start?.slice(0, 10) ?? '',
			pieces: [...new Set([...ordered.filter((piece) => members.includes(piece)), ...members])].sort((a, b) => position(a) - position(b))
		};
	});

	return { programs, pieces };
}
