import { redirect } from '@sveltejs/kit';
import { INSTRUMENTS, instrumentById, voiceName } from '$lib/parts';
import { currentProgram, getLibrary, partsFor } from '$lib/server/library';
import type { PageServerLoad } from './$types';

const COOKIE = 'instrumento';

export const load: PageServerLoad = async ({ url, cookies }) => {
	// Choosing an instrument is a plain link, remembered for a year on this device
	const chosen = url.searchParams.get('instrumento');
	if (chosen !== null) {
		if (instrumentById(chosen)) {
			cookies.set(COOKIE, chosen, { path: '/', maxAge: 60 * 60 * 24 * 365, httpOnly: true, sameSite: 'lax', secure: url.protocol === 'https:' });
		} else {
			cookies.delete(COOKIE, { path: '/' });
		}
		const rest = new URLSearchParams(url.searchParams);
		rest.delete('instrumento');
		redirect(303, `/${rest.size > 0 ? `?${rest}` : ''}`);
	}
	const instrument = instrumentById(cookies.get(COOKIE));

	const library = await getLibrary();
	const current = currentProgram(library);
	const season = library.find((candidate) => candidate.season === url.searchParams.get('temporada')) ?? library.find((candidate) => candidate.season === current?.season) ?? library[0];

	const withParts = new Set(
		library.flatMap((candidate) => [...candidate.programs.flatMap((program) => program.pieces), ...candidate.loose]).flatMap((item) => item.parts.flatMap((part) => part.instruments))
	);

	const piece = (item: (typeof library)[number]['loose'][number]) => ({
		id: item.id,
		name: item.name,
		composer: item.composer,
		elsewhere: item.elsewhere,
		parts: item.parts.map(({ name, href, instruments, size }) => ({
			name,
			href,
			mine: instrument ? instruments.includes(instrument.id) : false,
			// The full score is of use to everyone, so it is never folded away with the other parts
			score: instruments.includes('geral'),
			size
		}))
	});

	return {
		// Only the instruments there is sheet music for, the players first and the conductor last
		instruments: [...INSTRUMENTS.filter(({ id }) => id !== 'geral'), ...INSTRUMENTS.filter(({ id }) => id === 'geral')]
			.filter(({ id }) => withParts.has(id) || id === instrument?.id)
			.map(({ id, name }) => ({ id, name })),
		instrument: instrument ? { id: instrument.id, name: instrument.name } : null,
		seasons: library.map((candidate) => candidate.season),
		season: season?.season ?? '',
		programs: (season?.programs ?? []).map((program) => {
			const all = (voice?: number) => {
				const parts = program.pieces.flatMap((item) => partsFor(item.parts, instrument?.id ?? 'tudo', voice));
				return { files: parts.length, size: parts.reduce((sum, part) => sum + part.size, 0) };
			};
			// Someone who plays second violin in the whole program can take just those parts
			const voices = instrument ? [...new Set(program.pieces.flatMap((item) => item.parts.flatMap((part) => part.voices[instrument.id] ?? [])))].sort() : [];
			return {
				id: program.id,
				name: program.name,
				start: program.start,
				end: program.end,
				current: program.id === current?.id,
				pieces: program.pieces.map(piece),
				// One ZIP for the instrument and, when it has more than one voice in the program, one for each
				downloads: (!instrument
					? [{ file: 'tudo', name: 'Todas as partes', ...all() }]
					: voices.length > 1
						? [
								{ file: instrument.id, name: 'Todas as vozes', ...all() },
								...voices.map((voice) => ({ file: `${instrument.id}-${voice}`, name: voiceName(instrument, voice), ...all(voice) }))
							]
						: [{ file: instrument.id, name: instrument.name, ...all() }]
				).filter((download) => download.files > 0)
			};
		}),
		loose: (season?.loose ?? []).map(piece)
	};
};
