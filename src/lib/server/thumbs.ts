import { execFile } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { mkdir, readFile, rename, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { promisify } from 'node:util';

// Pictures of the first page of each PDF, made with poppler's pdftoppm the first time they are asked for
// and kept on disk under the hash git gives the file, which changes whenever the file does.

const run = promisify(execFile);
const FOLDER = join(tmpdir(), 'ceist-partituras-miniaturas');
/** Wide enough for the largest card on a screen with two pixels per point */
const WIDTH = 440;
/** How many PDFs are fetched and drawn at the same time */
const AT_ONCE = 3;

const making = new Map<string, Promise<Buffer>>();
let busy = 0;
const waiting: (() => void)[] = [];

async function turn<T>(work: () => Promise<T>): Promise<T> {
	if (busy >= AT_ONCE) {
		await new Promise<void>((resolve) => waiting.push(resolve));
	}
	busy++;
	try {
		return await work();
	} finally {
		busy--;
		waiting.shift()?.();
	}
}

async function make(source: string, sha: string): Promise<Buffer> {
	const picture = join(FOLDER, `${sha}.jpg`);
	try {
		return await readFile(picture);
	} catch {
		// Not made yet
	}
	return turn(async () => {
		await mkdir(FOLDER, { recursive: true });
		const pdf = join(FOLDER, `${sha}.pdf`);
		const draft = join(FOLDER, `${sha}.draft`);
		try {
			const response = await fetch(source);
			if (!response.ok || !response.body) {
				throw new Error(`GitHub answered ${response.status} for ${source}`);
			}
			await pipeline(Readable.fromWeb(response.body as unknown as import('node:stream/web').ReadableStream), createWriteStream(pdf));
			// Writes <draft>.jpg, which only takes its final name once it is whole
			await run('pdftoppm', ['-f', '1', '-l', '1', '-singlefile', '-jpeg', '-jpegopt', 'quality=82', '-scale-to-x', String(WIDTH), '-scale-to-y', '-1', pdf, draft], {
				timeout: 60_000
			});
			await rename(`${draft}.jpg`, picture);
			return await readFile(picture);
		} finally {
			await rm(pdf, { force: true });
			await rm(`${draft}.jpg`, { force: true });
		}
	});
}

/** The first page of a PDF as a JPEG. Fails when the PDF can't be fetched or drawn. */
export function thumbnail(source: string, sha: string): Promise<Buffer> {
	let pending = making.get(sha);
	if (!pending) {
		pending = make(source, sha).finally(() => making.delete(sha));
		making.set(sha, pending);
	}
	return pending;
}
