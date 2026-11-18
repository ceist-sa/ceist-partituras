import { error } from '@sveltejs/kit';
import { getLibrary } from '$lib/server/library';
import type { RequestHandler } from './$types';

// Hands out a PDF of the repository as something the browser opens in place: straight from GitHub it
// comes as a download with no file type. Only the parts listed on the site are served.
export const GET: RequestHandler = async ({ url, request }) => {
	const seasons = await getLibrary();
	const pieces = seasons.flatMap((season) => [...season.programs.flatMap((program) => program.pieces), ...season.loose]);
	const part = pieces.flatMap((piece) => piece.parts).find((candidate) => candidate.href === url.pathname);
	if (!part) {
		error(404, 'Partitura não encontrada');
	}

	// Phones ask for the pages of a PDF in ranges
	const range = request.headers.get('range');
	const upstream = await fetch(part.source, { headers: range ? { Range: range } : {} });
	if (!upstream.ok || !upstream.body) {
		error(502, 'Não foi possível ir buscar a partitura');
	}

	const headers = new Headers({
		'Content-Type': 'application/pdf',
		'Content-Disposition': `${url.searchParams.has('descarregar') ? 'attachment' : 'inline'}; filename*=UTF-8''${encodeURIComponent(part.file)}`,
		'Cache-Control': 'public, max-age=300',
		'Accept-Ranges': 'bytes'
	});
	for (const name of ['content-length', 'content-range', 'etag']) {
		const value = upstream.headers.get(name);
		if (value) headers.set(name, value);
	}
	return new Response(upstream.body, { status: upstream.status, headers });
};
