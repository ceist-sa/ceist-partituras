import { env } from '$env/dynamic/private';
import { cached } from './cache';

// The PDFs are in a public GitHub repository. Its whole list of files comes in one request, which is all
// the site asks of GitHub's API; the PDFs themselves are fetched from raw.githubusercontent.com.

/** Only repositories of this owner are read, whatever the links in Notion say */
const OWNER = 'ceist-sa';

export interface Folder {
	owner: string;
	repo: string;
	branch: string;
	path: string;
}

export interface RepoFile {
	path: string;
	size: number;
	sha: string;
}

/** A link such as https://github.com/ceist-sa/Repertorio/tree/main/2026-2027/Fauré%20-%20Pavane/partes */
export function parseFolder(link: string): Folder | undefined {
	const match = link.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)\/tree\/([^/]+)\/([^?#]+)/);
	if (!match || match[1].toLowerCase() !== OWNER) return undefined;
	try {
		return { owner: OWNER, repo: match[2], branch: match[3], path: decodeURIComponent(match[4]).replace(/\/+$/, '') };
	} catch {
		return undefined;
	}
}

/** Every file of a repository. A repository that was renamed is still found under its old name. */
export function listFiles(repo: string, branch: string): Promise<RepoFile[]> {
	return cached(`github:${repo}:${branch}`, async () => {
		const response = await fetch(
			`https://api.github.com/repos/${OWNER}/${encodeURIComponent(repo)}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
			{
				headers: {
					Accept: 'application/vnd.github+json',
					'User-Agent': 'ceist-partituras',
					...(env.GITHUB_TOKEN ? { Authorization: `Bearer ${env.GITHUB_TOKEN}` } : {})
				}
			}
		);
		if (!response.ok) {
			throw new Error(`GitHub answered ${response.status} for ${repo}`);
		}
		const body = await response.json();
		return (body.tree as { type: string; path: string; size?: number; sha: string }[])
			.filter((item) => item.type === 'blob')
			.map((item) => ({ path: item.path, size: item.size ?? 0, sha: item.sha }));
	});
}

/** Accented names come composed from Notion and sometimes decomposed from a Mac's file system */
const same = (a: string, b: string) => a.normalize('NFC').toLowerCase() === b.normalize('NFC').toLowerCase();

/**
 * The PDFs of a folder: the ones directly in it or, when the link is to the folder of the piece, the ones
 * in its "partes".
 */
export async function listPdfs(folder: Folder): Promise<RepoFile[]> {
	const files = await listFiles(folder.repo, folder.branch);
	const inside = (directory: string) =>
		files.filter((file) => {
			const cut = file.path.lastIndexOf('/');
			return /\.pdf$/i.test(file.path) && same(file.path.slice(0, cut), directory);
		});
	const direct = inside(folder.path);
	return direct.length > 0 ? direct : inside(`${folder.path}/partes`);
}

export function rawUrl(folder: Pick<Folder, 'repo' | 'branch'>, path: string): string {
	return `https://raw.githubusercontent.com/${OWNER}/${encodeURIComponent(folder.repo)}/${encodeURIComponent(folder.branch)}/${path.split('/').map(encodeURIComponent).join('/')}`;
}
