import { error } from '@sveltejs/kit';
import { downloadZip } from 'client-zip';
import { instrumentById, voiceName } from '$lib/parts';
import { getLibrary, partsFor } from '$lib/server/library';
import type { RequestHandler } from './$types';

// /programas/<program>/violino.zip: every part of the program for one instrument (violino-2.zip for one of
// its voices), or for all of them with "tudo". The archive is put together as it is sent, so nothing is kept on the server.
export const GET: RequestHandler = async ({ params }) => {
	const [, instrument, number] = params.file.match(/^([a-z]+)(?:-([1-6]))?\.zip$/) ?? [];
	const voice = number ? Number(number) : undefined;
	const chosen = instrumentById(instrument);
	const label = instrument === 'tudo' && !voice ? 'Todas as partes' : chosen && (voice ? voiceName(chosen, voice) : chosen.name);
	if (!label) {
		error(404, 'Instrumento desconhecido');
	}
	const program = (await getLibrary()).flatMap((season) => season.programs).find((candidate) => candidate.id === params.id);
	if (!program) {
		error(404, 'Programa não encontrado');
	}

	// Names that are safe as files on any system
	const safe = (name: string) => name.replace(/[\\/:*?"<>|^]/g, '-').trim();
	// For one instrument the files go side by side, since their names already say the piece; a name used
	// twice, or the whole program, gets one folder per piece
	const wanted = program.pieces.flatMap((piece) =>
		partsFor(piece.parts, instrument, voice).map((part) => ({
			folder: safe([piece.composer, piece.name].filter(Boolean).join(' - ')),
			file: safe(part.file),
			source: part.source
		}))
	);
	const times = (file: string) => wanted.filter((other) => other.file.toLowerCase() === file.toLowerCase()).length;
	const files = wanted.map(({ folder, file, source }) => ({
		name: instrument === 'tudo' || times(file) > 1 ? `${folder}/${file}` : file,
		source
	}));
	if (files.length === 0) {
		error(404, 'Este programa não tem partes para este instrumento');
	}

	async function* contents() {
		for (const file of files) {
			const response = await fetch(file.source);
			if (!response.ok) {
				throw new Error(`GitHub answered ${response.status} for ${file.name}`);
			}
			yield { name: file.name, input: response };
		}
	}

	const name = safe(`CEIST - ${program.name} ${program.season} - ${label}`);
	return new Response(downloadZip(contents()).body, {
		headers: {
			'Content-Type': 'application/zip',
			'Content-Disposition': `attachment; filename="partituras.zip"; filename*=UTF-8''${encodeURIComponent(name)}.zip`,
			'Cache-Control': 'no-store'
		}
	});
};
