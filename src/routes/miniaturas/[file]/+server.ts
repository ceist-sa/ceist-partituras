import { error } from '@sveltejs/kit';
import { getLibrary } from '$lib/server/library';
import { thumbnail } from '$lib/server/thumbs';
import type { RequestHandler } from './$types';

// /miniaturas/<hash>.jpg: the first page of a part. The address has the hash of the file, so the picture
// behind it never changes and browsers may keep it for good.
export const GET: RequestHandler = async ({ params }) => {
	const sha = params.file.replace(/\.jpg$/, '');
	const seasons = await getLibrary();
	const pieces = seasons.flatMap((season) => [...season.programs.flatMap((program) => program.pieces), ...season.loose]);
	const part = pieces.flatMap((piece) => piece.parts).find((candidate) => candidate.sha === sha);
	if (!params.file.endsWith('.jpg') || !part) {
		error(404, 'Partitura não encontrada');
	}

	let picture: Buffer;
	try {
		picture = await thumbnail(part.source, part.sha);
	} catch (cause) {
		console.error(`Could not draw ${part.file}:`, cause);
		error(502, 'Não foi possível desenhar a partitura');
	}
	return new Response(new Uint8Array(picture), {
		headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=31536000, immutable' }
	});
};
