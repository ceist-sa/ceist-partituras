// Notion and GitHub are slow next to a page load, and what they hold changes a few times a week. Each
// answer is kept for a few minutes; after that the old one is still served while a new one is fetched, and
// it stays in use when the fetch fails. Whoever asks while a fetch is under way waits for that same fetch:
// a page asks for the list of files once per piece, and GitHub allows few requests an hour.

interface Entry<T> {
	value?: T;
	/** When the value was fetched; 0 while there is none */
	at: number;
	loading?: Promise<T>;
	/** The last failure when there is no value, and when it happened */
	failed?: { error: unknown; at: number };
}

const entries = new Map<string, Entry<unknown>>();
const FRESH = 5 * 60 * 1000;
const RETRY = 60 * 1000;

export function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
	let entry = entries.get(key) as Entry<T> | undefined;
	if (!entry) {
		entry = { at: 0 };
		entries.set(key, entry);
	}
	const current = entry;

	if (current.failed && Date.now() - current.failed.at < RETRY) {
		return Promise.reject(current.failed.error);
	}
	if (!current.loading && Date.now() - current.at > FRESH) {
		current.loading = load()
			.then((value) => {
				current.value = value;
				current.at = Date.now();
				current.failed = undefined;
				return value;
			})
			.catch((error) => {
				if (current.at === 0) {
					// Nothing to fall back on: whoever asks within a minute gets the error, then it is tried again
					current.failed = { error, at: Date.now() };
					throw error;
				}
				console.error(`Could not refresh ${key}:`, error);
				// Keep the old value, and try again in a minute rather than on every request
				current.at = Date.now() - FRESH + RETRY;
				return current.value as T;
			})
			.finally(() => {
				current.loading = undefined;
			});
	}
	return current.at > 0 ? Promise.resolve(current.value as T) : current.loading!;
}
