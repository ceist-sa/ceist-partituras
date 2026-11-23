<script lang="ts">
	import { dateRange, fileSize } from '$lib/format';

	let { data } = $props();

	type Piece = (typeof data.programs)[number]['pieces'][number];

	/** Keeps the season when the instrument changes, and the other way around */
	const link = (change: Record<string, string>) => {
		const query = new URLSearchParams({ temporada: data.season, ...change });
		return `/?${query}`;
	};
	const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
</script>

<!-- A part as its first page, with its name underneath. The page stays blank if it can't be drawn. -->
{#snippet sheet(part: Piece['parts'][number])}
	<li>
		<a href={part.href} target="_blank" rel="noopener" class="group block">
			<span class="block aspect-[210/297] overflow-hidden rounded-md bg-white shadow-sm ring-1 ring-ink/15 transition-shadow group-hover:shadow-md group-hover:ring-ink/40">
				<img
					src={part.thumb}
					alt=""
					loading="lazy"
					decoding="async"
					class="h-full w-full object-cover object-top"
					onerror={(event) => (event.currentTarget as HTMLImageElement).remove()}
				/>
			</span>
			<span class="mt-2 block text-sm leading-snug {part.mine ? 'font-bold' : ''}">{part.name}</span>
		</a>
	</li>
{/snippet}

{#snippet sheets(parts: Piece['parts'])}
	<ul class="grid grid-cols-[repeat(auto-fill,minmax(6.5rem,1fr))] gap-x-4 gap-y-5 sm:grid-cols-[repeat(auto-fill,minmax(8rem,1fr))]">
		{#each parts as part (part.href)}
			{@render sheet(part)}
		{/each}
	</ul>
{/snippet}

<!-- The parts of a piece: the member's own and the full score in sight, the rest folded away -->
{#snippet piece(item: Piece)}
	{@const mine = item.parts.filter((part) => part.mine)}
	{@const shown = [...mine, ...item.parts.filter((part) => part.score && !part.mine)]}
	<li class="border-t border-ink/15 py-5">
		<h3 class="text-lg leading-snug font-bold">{item.name}</h3>
		<p class="opacity-70">{item.composer}</p>
		<div class="mt-3">
			{#if item.parts.length === 0}
				{#if item.elsewhere}
					<a href={item.elsewhere} target="_blank" rel="noopener" class="chip">Abrir a pasta das partituras</a>
				{:else}
					<p class="opacity-60">Ainda sem partituras.</p>
				{/if}
			{:else if data.instrument}
				{#if mine.length === 0}
					<p class="mb-3 opacity-60">Sem parte de {data.instrument.name.toLowerCase()} nesta obra.</p>
				{/if}
				{#if shown.length > 0}
					{@render sheets(shown)}
				{/if}
				{#if item.parts.length > shown.length}
					<details class="mt-3">
						<summary class="label cursor-pointer py-1 text-xs opacity-70">
							{shown.length > 0 ? 'Outras partes' : 'Todas as partes'} ({item.parts.length - shown.length})
						</summary>
						<div class="mt-3">
							{@render sheets(item.parts.filter((part) => !part.mine && !part.score))}
						</div>
					</details>
				{/if}
			{:else}
				{@render sheets(item.parts)}
			{/if}
		</div>
	</li>
{/snippet}

<!-- Full page loads: the choice is a cookie set on the way, which a navigation to the same address would miss -->
{#snippet instruments()}
	<ul class="flex flex-wrap gap-2">
		{#each data.instruments as instrument (instrument.id)}
			<li>
				<a href={link({ instrumento: instrument.id })} class="chip" aria-current={data.instrument?.id === instrument.id ? 'true' : undefined} data-sveltekit-reload>
					{instrument.name}
				</a>
			</li>
		{/each}
	</ul>
{/snippet}

{#if data.instrument}
	<details class="group rounded-2xl bg-sand/40 px-4 py-3">
		<summary class="flex cursor-pointer list-none items-center gap-3 [&::-webkit-details-marker]:hidden">
			<span>A mostrar as partes de <strong>{data.instrument.name.toLowerCase()}</strong></span>
			<span class="label ml-auto text-sm underline underline-offset-4 group-open:hidden">Mudar</span>
		</summary>
		<div class="mt-3 pb-1">
			{@render instruments()}
			<a href={link({ instrumento: '' })} class="label mt-3 inline-block text-sm underline underline-offset-4" data-sveltekit-reload>Mostrar todos os instrumentos</a>
		</div>
	</details>
{:else}
	<section class="rounded-2xl bg-sand/40 px-4 py-5 sm:px-6">
		<h1 class="text-2xl font-bold sm:text-3xl">Que instrumento tocas?</h1>
		<p class="mt-1 mb-4 max-w-prose opacity-70">Escolhe-o para veres primeiro as tuas partes e descarregares de uma vez as de cada programa.</p>
		{@render instruments()}
	</section>
{/if}

{#if data.seasons.length > 1}
	<nav class="label mt-8 flex gap-x-5 gap-y-1 overflow-x-auto text-sm whitespace-nowrap" aria-label="Temporadas">
		{#each data.seasons as season (season)}
			<a href={link({ temporada: season })} class="py-2 {season === data.season ? 'underline underline-offset-8' : 'opacity-60'}" aria-current={season === data.season ? 'page' : undefined} data-sveltekit-noscroll>
				{season}
			</a>
		{/each}
	</nav>
{/if}

{#if data.programs.length === 0 && data.loose.length === 0}
	<p class="mt-8 opacity-70">Ainda não há programas com repertório.</p>
{/if}

{#each data.programs as program (program.id)}
	<section class="mt-8">
		<header class="rounded-2xl px-4 py-4 sm:px-6 {program.current ? 'bg-sage' : 'bg-ink/5'}">
			{#if program.current}
				<p class="label text-xs">Em ensaio</p>
			{/if}
			<h2 class="text-2xl font-bold [overflow-wrap:anywhere]">{program.name}</h2>
			<p class="text-sm opacity-70">{dateRange(program.start, program.end)}</p>
			{#if program.downloads.length > 0}
				<!-- Every download looks the same, however many voices the instrument has -->
				<div class="mt-4 flex flex-wrap items-center gap-2 border-t border-ink/15 pt-3">
					<span class="label mr-1 text-xs">Descarregar em ZIP</span>
					{#each program.downloads as download (download.file)}
						<a
							href="/programas/{program.id}/{download.file}.zip"
							class="chip chip-solid text-sm"
							title="{count(download.files, 'PDF', 'PDF')}, {fileSize(download.size)}"
							download
							data-sveltekit-reload
						>
							{download.name}
							<span class="text-xs opacity-70">{download.files} PDF</span>
						</a>
					{/each}
				</div>
			{/if}
		</header>
		<ul class="mt-2 px-1 sm:px-6 [&>li:first-child]:border-t-0">
			{#each program.pieces as item (item.id)}
				{@render piece(item)}
			{/each}
		</ul>
	</section>
{/each}

{#if data.loose.length > 0}
	<section class="mt-8">
		<header class="rounded-2xl bg-ink/5 px-4 py-4 sm:px-6">
			<h2 class="text-2xl font-bold">Fora de programa</h2>
			<p class="text-sm opacity-70">Obras com partituras que não entraram em nenhum programa</p>
		</header>
		<ul class="mt-2 px-1 sm:px-6 [&>li:first-child]:border-t-0">
			{#each data.loose as item (item.id)}
				{@render piece(item)}
			{/each}
		</ul>
	</section>
{/if}
