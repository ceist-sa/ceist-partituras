const day = new Intl.DateTimeFormat('pt-PT', { day: 'numeric', month: 'long', timeZone: 'UTC' });
const dayAndYear = new Intl.DateTimeFormat('pt-PT', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

/** "19 de outubro a 31 de dezembro de 2026", with the year on both dates when they differ */
export function dateRange(start: string, end: string): string {
	if (!start || !end) return '';
	const from = new Date(`${start}T00:00:00Z`);
	const to = new Date(`${end}T00:00:00Z`);
	const sameYear = start.slice(0, 4) === end.slice(0, 4);
	return `${(sameYear ? day : dayAndYear).format(from)} a ${dayAndYear.format(to)}`;
}

/** "3,4 MB" */
export function fileSize(bytes: number): string {
	const megabytes = bytes / 1_000_000;
	if (megabytes < 0.1) return `${Math.max(1, Math.round(bytes / 1000))} kB`;
	return `${megabytes.toLocaleString('pt-PT', { maximumFractionDigits: megabytes < 10 ? 1 : 0 })} MB`;
}
