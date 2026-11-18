import { redirect } from '@sveltejs/kit';
import { INSTRUMENTS, instrumentById } from '$lib/parts';
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

	const piece = (item: (typeof library)[number]['loose'][number]) => ({
		id: item.id,
		name: item.name,
		composer: item.composer,
		elsewhere: item.elsewhere,
		parts: item.parts.map(({ name, href, instruments, size }) => ({ name, href, mine: instrument ? instruments.includes(instrument.id) : false, size }))
	});

	return {
		instruments: INSTRUMENTS.map(({ id, name }) => ({ id, name })),
		instrument: instrument ? { id: instrument.id, name: instrument.name } : null,
		seasons: library.map((candidate) => candidate.season),
		season: season?.season ?? '',
		programs: (season?.programs ?? []).map((program) => {
			const wanted = program.pieces.flatMap((item) => partsFor(item.parts, instrument?.id ?? 'tudo'));
			return {
				id: program.id,
				name: program.name,
				start: program.start,
				end: program.end,
				current: program.id === current?.id,
				pieces: program.pieces.map(piece),
				download: { files: wanted.length, size: wanted.reduce((sum, part) => sum + part.size, 0) }
			};
		}),
		loose: (season?.loose ?? []).map(piece)
	};
};
